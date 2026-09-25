import { useEffect } from 'react';
import 'lenis/dist/lenis.css';
import { gsap, loadScrollTrigger } from '../lib/gsap';
import { usePrefersReducedMotion } from './useMediaQuery';

/**
 * Eased, momentum scrolling for the page once the card is open (Lenis), driven from GSAP's
 * ticker so scroll-scrubbed animations stay in lockstep with it. Touch keeps native scrolling.
 */
export function useSmoothScroll(enabled: boolean): void {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    let cancelled = false;
    let teardown = () => {};

    void Promise.all([import('lenis'), loadScrollTrigger()]).then(([{ default: Lenis }, ScrollTrigger]) => {
      if (cancelled) return;
      const lenis = new Lenis({
        anchors: true,
        lerp: 0.09,
        // Popups scroll on their own.
        prevent: (node) => !!node.closest?.('dialog'),
      });
      const raf = (time: number) => lenis.raf(time * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      ScrollTrigger.refresh();
      teardown = () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, reducedMotion]);
}
