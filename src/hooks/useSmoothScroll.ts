import type Lenis from 'lenis';
import { useEffect } from 'react';
import 'lenis/dist/lenis.css';
import { gsap, loadScrollTrigger } from '../lib/gsap';
import { usePrefersReducedMotion } from './useMediaQuery';

let lenis: Lenis | null = null;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function pauseScroll(): void {
  lenis?.stop();
}

export function resumeScroll(): void {
  lenis?.start();
  lenis?.resize();
}

/** Glides the page to `y` over `seconds`: used by "play the opening for me". */
export function smoothScrollTo(y: number, seconds: number): void {
  if (lenis) {
    lenis.scrollTo(y, { duration: seconds, easing: easeInOut, force: true });
  } else {
    const start = window.scrollY;
    const diff = y - start;
    const startTime = performance.now();
    const durationMs = seconds * 1000;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeInOut(progress);
      window.scrollTo(0, start + diff * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
}

/**
 * Eased, momentum scrolling for wheel and trackpad (Lenis), driven from GSAP's ticker so the
 * scroll-scrubbed opening and reveals stay in lockstep with it. Touch keeps native scrolling.
 */
export function useSmoothScroll(enabled: boolean = true): void {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!lenis) return;
    if (enabled) {
      lenis.start();
      lenis.resize();
    } else {
      lenis.stop();
    }
  }, [enabled]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let teardown = () => {};

    void Promise.all([import('lenis'), loadScrollTrigger()]).then(([{ default: Lenis }, ScrollTrigger]) => {
      if (cancelled) return;
      const instance = new Lenis({
        anchors: true,
        lerp: 0.1,
        wheelMultiplier: 1.0,
        smoothWheel: true,
        // Popups scroll on their own.
        prevent: (node) => !!node.closest?.('dialog'),
      });
      const raf = (time: number) => instance.raf(time * 1000);
      instance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      lenis = instance;

      if (!enabled) {
        instance.stop();
      }

      teardown = () => {
        gsap.ticker.remove(raf);
        instance.destroy();
        lenis = null;
      };
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [reducedMotion]);
}
