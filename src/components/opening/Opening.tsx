import { memo, useCallback, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { WeddingConfig } from '../../config/types';
import { useMediaQuery, usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { BlessingPanel } from '../card/BlessingPanel';
import { FrontCover } from '../card/FrontCover';
import { InvitationPanel } from '../card/InvitationPanel';
import { OpeningDirector, type OpeningPhase } from './director';
import styles from './Opening.module.css';
import { WaxSeal } from './WaxSeal';

type HintIcon = 'tap' | 'up' | 'pull' | 'down';

/** What each waiting step asks of the guest. The pill itself also performs the step when pressed. */
const HINTS: Partial<Record<OpeningPhase, { touch: string; pointer: string; icon: HintIcon }>> = {
  sealed: { touch: 'Tap the seal to open', pointer: 'Click the seal to open', icon: 'tap' },
  slide: { touch: 'Swipe up to take the card out', pointer: 'Scroll to take the card out', icon: 'up' },
  untie: { touch: 'Pull the ribbon’s end to untie it', pointer: 'Drag the ribbon’s end to untie it', icon: 'pull' },
  unfold: { touch: 'Pull the flap down to unfold it', pointer: 'Drag the flap down to unfold it', icon: 'down' },
  takeout: { touch: 'Swipe up to read the invitation', pointer: 'Scroll to read the invitation', icon: 'up' },
};

const ICON_PATHS: Record<HintIcon, string> = {
  tap: 'M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0',
  up: 'M7 14l5-5 5 5',
  pull: 'M8 8l8 8m0-6v6h-6',
  down: 'M7 10l5 5 5-5',
};

interface OpeningProps {
  wedding: WeddingConfig;
  /** The invitation on the page; the card is handed over onto it at the end. */
  targetRef: RefObject<HTMLElement | null>;
  onOpen: () => void;
  onExited: () => void;
}

/**
 * The invitation arrives sealed in an envelope. The guest breaks the seal, slides the card out,
 * unties its ribbon and unfolds the flap, each step following their finger, then lifts the card
 * up to the page. See director.ts for the choreography.
 */
export function Opening({ wedding, targetRef, onOpen, onExited }: OpeningProps) {
  const rootRef = useRef<HTMLElement>(null);
  const directorRef = useRef<OpeningDirector | null>(null);
  const [phase, setPhase] = useState<OpeningPhase>('loading');
  const reducedMotion = usePrefersReducedMotion();
  const touch = useMediaQuery('(pointer: coarse)');
  const svgId = `seal${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const callbacks = useRef({ onOpen, onExited });
  useLayoutEffect(() => {
    callbacks.current = { onOpen, onExited };
  }, [onOpen, onExited]);

  // The scene keeps its own state across renders; switching reduced motion on mid-way restarts it.
  useLayoutEffect(() => {
    const director = new OpeningDirector(rootRef.current!, {
      reducedMotion,
      target: () => targetRef.current,
      onPhase: setPhase,
      onOpen: () => callbacks.current.onOpen(),
      onExited: () => callbacks.current.onExited(),
    });
    directorRef.current = director;
    return () => director.destroy();
  }, [reducedMotion, targetRef]);

  const openSeal = useCallback(() => directorRef.current?.openSeal(), []);
  const hint = HINTS[phase];
  const { groom, bride } = wedding;

  return (
    <section
      ref={rootRef}
      className={styles.overlay}
      data-phase="loading"
      aria-label={`Wedding invitation from ${groom.name} and ${bride.name}`}
    >
      <div className={styles.safe} data-part="safe" />

      <Scene wedding={wedding} svgId={svgId} onSeal={openSeal} />

      <div className={styles.hints} aria-live="polite">
        <button
          type="button"
          className={styles.hint}
          data-part="hint"
          data-visible={!!hint}
          tabIndex={hint ? 0 : -1}
          onClick={() => directorRef.current?.advance()}
        >
          {hint && (
            <span key={phase} className={styles.hintContent}>
              <svg className={styles.hintIcon} data-icon={hint.icon} viewBox="0 0 24 24" aria-hidden="true">
                <path d={ICON_PATHS[hint.icon]} />
              </svg>
              {touch ? hint.touch : hint.pointer}
              <span className="visually-hidden">, or press here to continue</span>
            </span>
          )}
        </button>
      </div>
    </section>
  );
}

interface SceneProps {
  wedding: WeddingConfig;
  svgId: string;
  onSeal: () => void;
}

/**
 * The envelope, card and ribbon. Static markup that the director animates directly, memoised so
 * a step change (which re-renders the hint) doesn't re-render the whole invitation mid-animation.
 */
const Scene = memo(function Scene({ wedding, svgId, onSeal }: SceneProps) {
  return (
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
            <span className={styles.flapGrab}>
              <svg viewBox="0 0 24 24">
                <path d={ICON_PATHS.down} />
              </svg>
            </span>
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
            <circle className={styles.ring} data-part="ring" />
          </svg>
          <div className={styles.tailHandle} data-part="tailHandle" />
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

      <button
        type="button"
        className={styles.seal}
        data-part="seal"
        onClick={onSeal}
      >
        <WaxSeal letters={wedding.monogram} id={svgId} />
        <span className="visually-hidden">Break the seal and open the envelope</span>
      </button>
    </div>
  );
});
