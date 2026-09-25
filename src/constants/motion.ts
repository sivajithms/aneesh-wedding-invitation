/**
 * The opening sequence: sealed envelope → take the card out → untie the ribbon → unfold the flap →
 * lift the card to the page. Distances are in viewport heights of scrolling unless noted.
 */
export const OPENING = {
  /** Scrolling it takes to slide the card out of the envelope. */
  slideScreens: 1.2,
  /** Scrolling it takes to lift the unfolded card up to reading size. */
  takeOutScreens: 0.8,
  /** How closely the scrubbed scene follows the scroll, per second (higher is snappier). */
  scrubResponse: 7,
  /** Share of a touch swipe's release speed carried on as momentum, in seconds. */
  swipeMomentum: 0.22,

  /** Ribbon: pull needed to slip the knot, as a share of the viewport's shorter side, in px. */
  pullShare: 0.3,
  pullMin: 90,
  pullMax: 190,
  /** Let go past this share of the pull and the knot slips anyway. */
  untieCommit: 0.72,

  /** Flap: let go past this angle, or flick faster than this, and it falls open. */
  unfoldCommitDeg: 95,
  unfoldFlickDegPerSec: 320,

  /** After a step starts waiting, scroll attempts nudge its hint at most this often. */
  nudgeIntervalMs: 700,

  /** Reduced motion: the envelope simply fades away. */
  reducedFadeMs: 600,
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
