import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './WrapCanvas.module.css';

interface WrapCanvasProps {
  progress: number; // 0 to 1
  onProgressChange: (p: number) => void;
  onComplete: () => void;
  isPeeled: boolean;
  interactive: boolean;
  onAutoTear?: () => void;
  isFalling?: boolean;
}

export function WrapCanvas({
  progress,
  onProgressChange,
  onComplete,
  isPeeled,
  interactive,
  onAutoTear,
  isFalling: externalIsFalling = false,
}: WrapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; initialP: number } | null>(null);
  const [localIsFalling, setLocalIsFalling] = useState(false);

  const isFalling = externalIsFalling || localIsFalling;

  // Trigger silky fabric fall-off when tear reaches 100%
  const triggerFallOff = useCallback(() => {
    if (localIsFalling || externalIsFalling) return;
    setLocalIsFalling(true);
    setTimeout(() => {
      onComplete();
    }, 950);
  }, [localIsFalling, externalIsFalling, onComplete]);

  // Draw wrap onto canvas
  const render = useCallback(
    (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas || isFalling) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
      const W = Math.round(rect.width * dpr);
      const H = Math.round(rect.height * dpr);

      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);

      if (isPeeled || p >= 1) {
        return;
      }

      ctx.save();
      // Rounded corners matching card
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 14 * dpr);
      ctx.clip();

      // 1. Crimson Gift Wrap Base with Radial Lighting
      const bgGrad = ctx.createRadialGradient(
        W * 0.42,
        H * 0.35,
        25 * dpr,
        W * 0.5,
        H * 0.5,
        W * 0.95
      );
      bgGrad.addColorStop(0, '#881f29');
      bgGrad.addColorStop(0.5, '#751821');
      bgGrad.addColorStop(1, '#520e15');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Gold Diamond Lattice Grid
      const dSize = 38 * dpr;
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 205, 135, 0.32)';
      ctx.lineWidth = 1.4 * dpr;

      // Diagonal lattice lines
      for (let x = -H; x < W + H; x += dSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + H, H);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x + H, 0);
        ctx.stroke();
      }

      // Gold Diamond Dots at intersections
      for (let y = 0; y <= H; y += dSize / 2) {
        const offset = y % dSize === 0 ? 0 : dSize / 2;
        for (let x = offset; x <= W; x += dSize) {
          ctx.fillStyle = 'rgba(245, 222, 155, 0.85)';
          ctx.beginPath();
          ctx.arc(x, y, 2.2 * dpr, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 252, 240, 0.98)';
          ctx.beginPath();
          ctx.arc(x, y, 1.0 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 3. Seam Creases & Paper Fold Shading (Gift parcel look)
      ctx.save();
      const inset = 18 * dpr;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 1.8 * dpr;
      ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.0 * dpr;
      ctx.strokeRect(
        inset + 2 * dpr,
        inset + 2 * dpr,
        W - (inset + 2 * dpr) * 2,
        H - (inset + 2 * dpr) * 2
      );

      // Diagonal fold crease shadows from corners
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W / 2, H / 2);
      ctx.moveTo(W, 0);
      ctx.lineTo(W / 2, H / 2);
      ctx.moveTo(0, H);
      ctx.lineTo(W / 2, H / 2);
      ctx.moveTo(W, H);
      ctx.lineTo(W / 2, H / 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();
      ctx.restore();

      // 4. Punch out torn slit exposing card underneath
      const midY = H * 0.485;
      const slitH = 36 * dpr;
      const tearTravel = W - 30 * dpr;
      const xHead = W - p * tearTravel;

      if (p > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        ctx.beginPath();
        ctx.moveTo(W + 10, midY - slitH / 2);

        // Top jagged edge
        for (let x = W; x >= xHead; x -= 4 * dpr) {
          const n =
            Math.sin(x * 0.08) * (3.8 * dpr) +
            Math.cos(x * 0.22) * (2.2 * dpr) +
            (((x * 7) % 7) - 3.5) * (0.8 * dpr);
          ctx.lineTo(x, midY - slitH / 2 + n);
        }

        ctx.lineTo(xHead, midY + slitH / 2);

        // Bottom jagged edge
        for (let x = xHead; x <= W; x += 4 * dpr) {
          const n =
            Math.sin((x + 40) * 0.09) * (3.8 * dpr) +
            Math.cos((x + 20) * 0.19) * (2.2 * dpr) +
            (((x * 11) % 7) - 3.5) * (0.8 * dpr);
          ctx.lineTo(x, midY + slitH / 2 + n);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // White torn paper fibers along top and bottom edges
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 252, 245, 0.96)';
        ctx.lineWidth = 2.4 * dpr;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
        ctx.shadowBlur = 3 * dpr;

        // Top white fiber
        ctx.beginPath();
        ctx.moveTo(W, midY - slitH / 2);
        for (let x = W; x >= xHead; x -= 4 * dpr) {
          const n =
            Math.sin(x * 0.08) * (3.8 * dpr) +
            Math.cos(x * 0.22) * (2.2 * dpr) +
            (((x * 7) % 7) - 3.5) * (0.8 * dpr);
          ctx.lineTo(x, midY - slitH / 2 + n);
        }
        ctx.stroke();

        // Bottom white fiber
        ctx.beginPath();
        ctx.moveTo(xHead, midY + slitH / 2);
        for (let x = xHead; x <= W; x += 4 * dpr) {
          const n =
            Math.sin((x + 40) * 0.09) * (3.8 * dpr) +
            Math.cos((x + 20) * 0.19) * (2.2 * dpr) +
            (((x * 11) % 7) - 3.5) * (0.8 * dpr);
          ctx.lineTo(x, midY + slitH / 2 + n);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Perforated dotted guideline across the path
      if (xHead > 35 * dpr) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.4 * dpr;
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.beginPath();
        ctx.moveTo(35 * dpr, midY);
        ctx.lineTo(xHead, midY);
        ctx.stroke();

        // Arrow head at left
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(25 * dpr, midY);
        ctx.lineTo(38 * dpr, midY - 6 * dpr);
        ctx.lineTo(38 * dpr, midY + 6 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 6. 3D Rolled Paper Curl at xHead (when tear is moving)
      if (p > 0.02 && p < 0.99) {
        ctx.save();
        ctx.translate(xHead + 8 * dpr, midY - 4 * dpr);
        ctx.rotate(-0.58);

        // Shadow underneath curl
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(-3 * dpr, 10 * dpr, 14 * dpr, 24 * dpr, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Paper roll gradient
        const rollGrad = ctx.createLinearGradient(
          -15 * dpr,
          -10 * dpr,
          18 * dpr,
          15 * dpr
        );
        rollGrad.addColorStop(0, '#520e15');
        rollGrad.addColorStop(0.35, '#8c222e');
        rollGrad.addColorStop(0.72, '#fffaf2');
        rollGrad.addColorStop(1, '#d8c29d');

        ctx.fillStyle = rollGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * dpr, 25 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60, 15, 15, 0.45)';
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();

        // Hollow spiral core
        ctx.fillStyle = '#fffdf8';
        ctx.beginPath();
        ctx.ellipse(-3.5 * dpr, 0, 6.5 * dpr, 17 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(40, 10, 10, 0.38)';
        ctx.beginPath();
        ctx.ellipse(-5 * dpr, 0, 3.5 * dpr, 11 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // end clip
    },
    [isFalling, isPeeled]
  );

  useEffect(() => {
    render(progress);
  }, [progress, render]);

  useEffect(() => {
    const handleResize = () => {
      render(progress);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [progress, render]);

  // Pointer drag to tear
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive || isPeeled || isFalling) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      initialP: progress,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const deltaX = dragStartRef.current.startX - moveEv.clientX;
      const pDelta = deltaX / (rect.width * 0.85);
      const nextP = Math.min(1, Math.max(0, dragStartRef.current.initialP + pDelta));

      onProgressChange(nextP);

      if (nextP >= 0.97) {
        handlePointerUp();
        triggerFallOff();
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (progress > 0.4 && progress < 0.97) {
        // Auto-finish remainder
        let currentP = progress;
        const tick = () => {
          currentP += 0.05;
          if (currentP >= 1) {
            onProgressChange(1);
            triggerFallOff();
          } else {
            onProgressChange(currentP);
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Calculate pixel position of the HTML pull tab
  // When p=0, tab sits at right edge (100% - 15px); when p=1, at left edge
  const tabPercent = Math.max(0, Math.min(1, progress));
  const tabRightPos = `calc(${tabPercent * 92}% - 14px)`;

  if (isPeeled) return null;

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapContainer} ${isFalling ? styles.fallingContainer : ''}`}
      id="wrap"
    >
      {/* 1. Tear Canvas (visible while tearing) */}
      {!isFalling && (
        <canvas
          ref={canvasRef}
          id="wrapCanvas"
          className={styles.wrapCanvas}
          onPointerDown={handlePointerDown}
          aria-hidden="true"
        />
      )}

      {/* 2. Top and Bottom Pieces Falling Away like Silky Fabric */}
      {isFalling && (
        <>
          <div className={styles.wrapTopPiece}>
            <div className={styles.wrapFabricPattern} />
            <div className={styles.wrapTopTearEdge} />
          </div>
          <div className={styles.wrapBottomPiece}>
            <div className={styles.wrapFabricPattern} />
            <div className={styles.wrapBottomTearEdge} />
          </div>
        </>
      )}

      {/* 3. HTML Gold Pull Tab (Extends past canvas so it is never clipped!) */}
      {!isFalling && progress < 0.98 && (
        <div
          className={styles.tabWrapper}
          style={{
            right: tabRightPos,
            top: '48.5%',
          }}
          onPointerDown={handlePointerDown}
        >
          {/* Stretchy Cloth Fold Connection */}
          <div className={styles.clothFold} />

          {/* The Gold PULL Button */}
          <button
            type="button"
            className={styles.wrapTab}
            id="wrapTab"
            onClick={onAutoTear}
            aria-label="Pull to tear open the wrap"
          >
            <span>PULL</span>
          </button>

          {/* Pulsing Animated Hand Cue pointing left */}
          {progress < 0.15 && (
            <div className={styles.handCue}>
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
          )}
        </div>
      )}
    </div>
  );
}
