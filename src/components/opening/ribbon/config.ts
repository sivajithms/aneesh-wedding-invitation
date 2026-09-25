/**
 * Everything that tunes the satin ribbon: layout on the card, fabric colours and lighting,
 * spring physics, and the shapes of its motion. Distances are shares of the card's width (W)
 * or of the ribbon's width (rw) so the ribbon scales with the card.
 */
export const RIBBON = {
  layout: {
    /** Ribbon width as a share of the card's width, clamped in card pixels. */
    widthShare: 0.05,
    minWidth: 12,
    maxWidth: 26,
    /** Band height on the card, as a share of the card's height. */
    bandAt: 0.34,
    loopShare: 0.18,
    tailShare: 0.25,
    angles: { leftLoop: 197, rightLoop: -17, fixedTail: 114, pulledTail: 64 },
    /** How far past the card's edges the band shows as it curves round them (× rw). */
    wrapOverhang: 0.15,
  },

  /** The canvas covers the region the ribbon moves in before the whole ribbon drops away (× W). */
  canvas: { left: -0.25, width: 1.5, above: 0.45, height: 2.05 },

  /** The card's tan satin (#c79163 lit): shaded face, duller reverse side, and the sheen. */
  colour: {
    lit: [199, 145, 99],
    shade: [120, 76, 42],
    backLit: [176, 126, 86],
    backShade: [104, 66, 38],
    sheen: [246, 220, 188],
    edge: 'rgb(92 56 28 / 0.38)',
    shadow: [60, 40, 15],
  },

  light: {
    /** Towards the light: from the upper left, in front of the card. */
    direction: [-0.35, -0.55, 0.76],
    ambient: 0.28,
    /** Tight highlight for satin, and a broad soft glow around it. */
    sheenPower: 34,
    sheenStrength: 0.55,
    glowPower: 5,
    glowStrength: 0.12,
    /** Darkening where strands crowd together at the knot. */
    occlusion: 0.28,
  },

  /** The strip never goes thinner than this when seen edge-on (× rw): its thickness. */
  thickness: 0.09,
  /** Small fixed wobble in width so edges aren't machine-perfect. */
  edgeWobble: 0.04,
  /** Fabric never lies perfectly flat: a faint lift (card px) and turn (radians) along the band. */
  lie: { lift: 0.7, turn: 0.07 },

  shadow: {
    alpha: 0.18,
    softAlpha: 0.08,
    /** Offset grows with the strip's height off the card (card px per px of height). */
    offset: [0.6, 1.4],
    perHeight: [0.1, 0.2],
  },

  spring: {
    /** Stiffness (s⁻²) at the stiffest point of a strand, and the damping ratio. */
    stiffness: 150,
    damping: 0.55,
    /** Integration step; the frame is split into steps no longer than this. */
    maxStep: 1 / 120,
    /** Positions within this (px) and slower than this (px/s) count as settled. */
    restDistance: 0.03,
    restSpeed: 0.08,
    /** A jump bigger than this (× W), e.g. a skip link, snaps instead of flying across. */
    snap: 0.6,
  },

  motion: {
    /** Pull: a wave travels up the tail from its end; amplitude × rw, cycles along the tail. */
    pullWave: { amplitude: 0.7, cycles: 1.3, speed: 2.2, twist: 0.7 },
    /** The band's tension where the knot pulls on it (× rw), and its spread (× W). */
    attachDip: 0.45,
    attachSpread: 0.16,
    /** Slack once the bow slips: a sag and a ripple (× rw), and how far it twists. */
    slack: { sag: 1.5, ripple: 0.45, twist: 0.5 },
    /** Fall: how much later the far end starts (share of the fall), drop and drape (× W), turn-over. */
    fall: { lag: 0.4, drop: 0.55, drape: 0.18, drift: 0.1, turn: 2.6, wave: 0.8 },
    /** Where the whole ribbon then drops away off screen (share of the fall). */
    dropAwayFrom: 0.45,
    dropAwayTurn: 12,
    /** Pinch at the knot, where the ribbon is gathered (radians of twist). */
    pinch: 1.1,
  },
} as const;
