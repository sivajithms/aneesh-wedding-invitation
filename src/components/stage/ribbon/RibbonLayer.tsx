import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SatinRibbon } from './SatinRibbon';
import { ribbonGeometry, type RibbonGeometry } from './geometry';
import type { QualityProfile } from '../../../lib/quality';
import styles from './RibbonLayer.module.css';

interface RibbonLayerProps {
  cardWidth: number;
  cardHeight: number;
  onUntied: () => void;
  interactive?: boolean;
}

const DEFAULT_PROFILE: QualityProfile = {
  level: 'high',
  maxDpr: 2,
  ribbonSegments: { band: 32, tail: 14, loop: 16 },
  softShadows: true,
  sheen: true,
  lean: true,
  drift: true,
  ambience: true,
  glass: true,
};

export function RibbonLayer({
  cardWidth,
  cardHeight,
  onUntied,
  interactive = true,
}: RibbonLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ribbonRef = useRef<SatinRibbon | null>(null);
  const geomRef = useRef<RibbonGeometry | null>(null);
  const isUntyingRef = useRef(false);
  const [isUntying, setIsUntying] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize and size ribbon canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ribbon = new SatinRibbon(canvas, { animate: true });
    ribbonRef.current = ribbon;

    // The ribbon rotates 90deg to be vertical, so width and height are inverted
    const baseW = cardHeight;
    const baseH = cardWidth;
    const geom = ribbonGeometry(baseW, baseH);
    geomRef.current = geom;

    ribbon.layout({
      cardWidth: baseW,
      geometry: geom,
      displayScale: 1,
      profile: DEFAULT_PROFILE,
    });

    ribbon.setDrive({ tension: 0, slip: 0, fall: 0, pull: 0 });
    ribbon.update(0.016);

    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000) || 0.016;
      lastTime = now;
      if (ribbonRef.current) {
        ribbonRef.current.update(dt);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [cardWidth, cardHeight]);

  // Smooth Silky Untie Animation
  const untie = useCallback(() => {
    if (isUntyingRef.current) return;
    isUntyingRef.current = true;
    setIsUntying(true);

    const startTime = performance.now();
    const duration = 800;

    const animateUntie = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Silky untie physics:
      // First 25% tension snaps knot open, slip rises to 1,
      // loops collapse into free silk strands, then whole ribbon slides down
      const tension = t < 0.2 ? (1 - t / 0.2) : 0;
      const slip = Math.min(1, t / 0.45);
      const fall = t > 0.3 ? (t - 0.3) / 0.7 : 0;
      const pull = Math.min(150, 40 + t * 110);

      ribbonRef.current?.setDrive({ tension, slip, fall, pull });

      if (t < 1) {
        requestAnimationFrame(animateUntie);
      } else {
        setTimeout(onUntied, 80);
      }
    };

    requestAnimationFrame(animateUntie);
  }, [onUntied]);

  // Pointer Handlers for Silky Tactile Drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive || isUntyingRef.current) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current || isUntyingRef.current) return;

    const deltaY = e.clientY - dragStartRef.current.y;
    const deltaX = e.clientX - dragStartRef.current.x;

    // Pulling down or diagonally away stretches the ribbon
    const dragDist = Math.max(0, deltaY + Math.abs(deltaX) * 0.4);
    const prog = Math.min(1, dragDist / 85);
    setPullProgress(prog);

    // Dynamic tactile feedback
    ribbonRef.current?.setDrive({
      tension: Math.min(1, prog * 1.3),
      slip: prog > 0.4 ? (prog - 0.4) / 0.6 : 0,
      fall: 0,
      pull: prog * 65,
    });

    if (prog >= 0.65) {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      untie();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || isUntyingRef.current) return;
    const start = dragStartRef.current;
    isDraggingRef.current = false;
    dragStartRef.current = null;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (start) {
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      // If user tapped or dragged past threshold, untie!
      if (dist < 10 || pullProgress >= 0.6) {
        untie();
        return;
      }
    }

    // Spring back smoothly to rest
    let releaseProgress = pullProgress;
    const releaseStartTime = performance.now();
    const springRelease = (now: number) => {
      if (isUntyingRef.current) return;
      const elapsed = now - releaseStartTime;
      const t = Math.min(1, elapsed / 280);
      const eased = Math.cos(t * Math.PI * 0.5);
      const cur = releaseProgress * eased;
      setPullProgress(cur);

      ribbonRef.current?.setDrive({
        tension: cur * 0.8,
        slip: 0,
        fall: 0,
        pull: cur * 30,
      });

      if (t < 1) {
        requestAnimationFrame(springRelease);
      } else {
        ribbonRef.current?.setDrive({ tension: 0, slip: 0, fall: 0, pull: 0 });
        setPullProgress(0);
      }
    };
    requestAnimationFrame(springRelease);
  };

  return (
    <div
      className={`${styles.ribbonWrapper} ${isUntying ? styles.untying : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={styles.ribbonLayer}
        id="ribbon"
        style={{
          opacity: isUntying ? 0.92 : 1,
          transition: 'opacity 0.6s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          id="ribbonCanvas"
          className={styles.ribbonCanvas}
          aria-hidden="true"
        />
      </div>

      {/* Tail Pull Indicator (un-rotated in card coordinates) */}
      {!isUntying && (
        <div
          className={styles.tailCue}
          title="Pull or tap to untie the ribbon"
          style={{
            transform: pullProgress > 0 ? `translateY(${pullProgress * 25}px)` : undefined,
            transition: isDraggingRef.current ? 'none' : 'transform 0.25s ease',
          }}
        >
          <div className={styles.tailDots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.arrowHead}>∇</span>
          </div>

          <div className={styles.handIndicator}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a4220"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.handIcon}
            >
              <path d="M18 11V6a2 2 0 0 0-4 0v5" />
              <path d="M14 10V4a2 2 0 0 0-4 0v7" />
              <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
