import { useId, useLayoutEffect, useRef, type RefObject } from 'react';
import type { WeddingConfig } from '../../config/types';
import { OPENING } from '../../constants/motion';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { cssVars } from '../../lib/css';
import { BlessingPanel } from '../card/BlessingPanel';
import { FrontCover } from '../card/FrontCover';
import { InvitationPanel } from '../card/InvitationPanel';
import { OpeningScene } from './director';
import styles from './Opening.module.css';
import { WaxSeal } from './WaxSeal';

interface OpeningProps {
  wedding: WeddingConfig;
  /** The invitation on the page; the card lands exactly on it at the end. */
  targetRef: RefObject<HTMLElement | null>;
  /** The page after the opening (cross-faded in under reduced motion). */
  pageRef: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
}

/**
 * The invitation arrives sealed in an envelope, and scrolling opens it: the seal lifts, the card
 * slides out, its ribbon unties and falls away, the flap unfolds, and the card rises to the page.
 * Scrolling back up plays it in reverse. See director.ts for the choreography.
 *
 * The whole scene is decorative (the page below carries the real text), so it's hidden from
 * assistive tech; keyboard users scroll through it as usual or use the skip link.
 */
export function Opening({ wedding, targetRef, pageRef, onOpenChange }: OpeningProps) {
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<OpeningScene | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const svgId = `seal${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const onOpenChangeRef = useRef(onOpenChange);
  useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useLayoutEffect(() => {
    const scene = new OpeningScene(rootRef.current!, {
      reducedMotion,
      target: () => targetRef.current,
      page: () => pageRef.current,
      onOpenChange: (open) => onOpenChangeRef.current(open),
    });
    sceneRef.current = scene;
    return () => scene.destroy();
  }, [reducedMotion, targetRef, pageRef]);

  const screens = reducedMotion ? OPENING.reducedScreens : OPENING.screens;

  return (
    <section
      ref={rootRef}
      className={styles.scene}
      style={cssVars({ '--screens': screens + 1 })}
      data-cue="start"
      aria-hidden="true"
    >
      <div className={styles.stage} data-part="stage">
        <div className={styles.safe} data-part="safe" />

      <div className={styles.rig} data-part="rig">
        <div className={styles.envBack} data-part="env" />

        <div className={styles.envFlap} data-part="envFlap">
          <svg className={styles.envFlapOuter} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0H100L53 97Q50 100 47 97Z" />
          </svg>
          <div className={styles.envFlapLiner} />
        </div>

        {/* Card content is visual only; the page underneath carries the real, accessible text. */}
        <div className={styles.card} data-part="card" aria-hidden="true">
          <div className={styles.sheet} data-part="sheet">
            <InvitationPanel wedding={wedding} decorative />
            <div className={styles.sheetCast} data-part="sheetCast" />
          </div>
          <div className={styles.flapShadow} data-part="flapShadow" />
          <div className={styles.flap} data-part="flap">
            <div className={styles.flapInside}>
              <BlessingPanel wedding={wedding} decorative />
              <div className={styles.shade} data-part="innerShade" />
            </div>
            <div className={styles.flapOutside}>
              <FrontCover wedding={wedding} />
              <div className={styles.shade} data-part="outerShade" />
            </div>
          </div>

          <div className={styles.ribbon} data-part="ribbon">
            <div className={styles.band} />
            <svg className={styles.bow} data-part="bow" overflow="visible">
              <defs>
                <linearGradient id={`${svgId}-loop`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#93613a" />
                  <stop offset="0.3" stopColor="#d4a273" />
                  <stop offset="0.47" stopColor="#f1d2ae" />
                  <stop offset="0.68" stopColor="#c79163" />
                  <stop offset="1" stopColor="#8a5a33" />
                </linearGradient>
                <linearGradient id={`${svgId}-tail`} x1="0" y1="0" x2="1" y2="0.35">
                  <stop offset="0" stopColor="#9c6a3f" />
                  <stop offset="0.4" stopColor="#e3b98f" />
                  <stop offset="0.6" stopColor="#c79163" />
                  <stop offset="1" stopColor="#8f5f37" />
                </linearGradient>
                <filter id={`${svgId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
                  <feColorMatrix in="SourceAlpha" values="0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 0 0.06  0 0 0 0.32 0" />
                  <feGaussianBlur stdDeviation="1.6" />
                  <feOffset dx="1.2" dy="2.6" />
                </filter>
              </defs>
              <use href={`#${svgId}-bow`} filter={`url(#${svgId}-shadow)`} />
              <g id={`${svgId}-bow`}>
                <path data-part="tailFixed" fill={`url(#${svgId}-tail)`} />
                <path data-part="tailPulled" fill={`url(#${svgId}-tail)`} />
                <g data-part="loopL">
                  <path data-part="loopLOuter" fill={`url(#${svgId}-loop)`} className={styles.loopEdge} />
                  <path data-part="loopLInner" className={styles.loopInner} />
                </g>
                <g data-part="loopR">
                  <path data-part="loopROuter" fill={`url(#${svgId}-loop)`} className={styles.loopEdge} />
                  <path data-part="loopRInner" className={styles.loopInner} />
                </g>
                <g data-part="knot">
                  <rect className={styles.knot} fill={`url(#${svgId}-loop)`} />
                </g>
              </g>
            </svg>
          </div>
        </div>

        <div className={styles.envFront} data-part="env">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.pocketSide} d="M0 0L50 38L0 100Z" />
            <path className={styles.pocketSide} d="M100 0L50 38L100 100Z" data-side="right" />
            <path className={styles.pocketBottom} d="M0 100L50 34L100 100Z" />
          </svg>
          <div className={styles.pocketShadow} data-part="flapShadowOnPocket" />
        </div>

        <div className={styles.seal} data-part="seal">
          <WaxSeal letters={wedding.monogram} id={svgId} />
        </div>
      </div>

        {/* A gentle nudge at the start and whenever the guest pauses; tapping it plays the rest. */}
        <div className={styles.cue}>
          <button type="button" tabIndex={-1} className={styles.cueButton} onClick={() => sceneRef.current?.play()}>
            <svg className={styles.cueIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 15l5-5 5 5" />
              <path d="M7 20l5-5 5 5" />
            </svg>
            <span data-text="start">
              <span data-pointer="touch">Swipe up to open</span>
              <span data-pointer="fine">Scroll to open</span>
            </span>
            <span data-text="continue">Keep scrolling</span>
          </button>
        </div>
      </div>
    </section>
  );
}
