/**
 * The opening, played by scrolling: each chapter is a span on one timeline (in timeline units),
 * and the whole timeline is stretched over `screens` viewport heights of scroll. Scrolling back
 * up plays it in reverse. Gaps between chapters are small rests so each moment reads on its own.
 */
export const OPENING = {
  screens: 6,
  chapters: {
    /** The wax seal lifts, then drops away. */
    seal: [0, 0.9],
    /** The envelope's flap swings open. */
    flap: [0.3, 1.6],
    /** The card slides out, the envelope drops away and the card settles, tied with its ribbon. */
    slide: [1.8, 4],
    /** The ribbon's tail draws through the knot until the bow slips... */
    untie: [4.3, 5.5],
    /** ...and the loose ribbon slides off and falls. */
    fall: [5.2, 6.5],
    /** The card's flap swings down around its fold, and the card re-centres. */
    unfold: [6.6, 8.3],
    /** The card lifts to reading size, landing exactly on the page's card. */
    lift: [8.7, 10.4],
  },
  /** The timeline's total length; a short rest after the lift. */
  total: 10.6,

  /** How long a pause (ms) before "Keep scrolling" appears. */
  idleCueMs: 1600,
  /** "Play it for me" glides through the rest of the opening at this many seconds per screen. */
  autoplaySecondsPerScreen: 1.6,
  /** Scroll speed (progress per second) that tilts the card back by a degree. */
  leanPerSpeed: 14,
  leanMaxDeg: 5,

  /** Reduced motion: a cross-fade over this much scroll. */
  reducedScreens: 0.8,
} as const;

/** Scroll-scrubbed reveals on the page: how far behind the scroll they trail, in seconds. */
export const SCRUB_LAG = 0.6;

/** Pointer tilt on the invitation frame — kept subtle so the card still reads as paper. */
export const TILT_MAX_DEGREES = 4;

export const COUNTDOWN_TICK_MS = 1000;

/** Heart drawing on the blessing panel. */
export const REVEAL_OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.15,
  rootMargin: '0px 0px -8% 0px',
};
