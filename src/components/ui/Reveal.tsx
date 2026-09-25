import { useEffect, useRef, type ReactNode } from 'react';
import { SCRUB_LAG } from '../../constants/motion';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { gsap, loadScrollTrigger } from '../../lib/gsap';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** `flip` turns over like the card's back; `up` rises into place. */
  variant?: 'flip' | 'up';
}

const FROM: Record<NonNullable<RevealProps['variant']>, gsap.TweenVars> = {
  flip: { rotationY: -55, scale: 0.94, autoAlpha: 0, transformPerspective: 1600 },
  up: { y: 48, autoAlpha: 0 },
};

/**
 * Tied to the scroll position rather than played once, so the element moves exactly as far
 * as the guest scrolls, and back again if they scroll up. Reduced motion: a plain fade.
 */
export function Reveal({ children, className, variant = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    let context: gsap.Context | undefined;

    void loadScrollTrigger().then(() => {
      const element = ref.current;
      if (cancelled || !element) return;
      context = gsap.context(() => {
        if (reducedMotion) {
          gsap.from(element, { autoAlpha: 0, duration: 0.6, scrollTrigger: { trigger: element, start: 'top 85%' } });
          return;
        }
        gsap.fromTo(element, FROM[variant], {
          rotationY: 0,
          scale: 1,
          y: 0,
          autoAlpha: 1,
          ease: 'power1.out',
          scrollTrigger: { trigger: element, start: 'top bottom', end: 'top 30%', scrub: SCRUB_LAG },
        });
      });
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
  }, [variant, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
