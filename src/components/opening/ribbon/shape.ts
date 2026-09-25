import { RIBBON } from './config';
import type { RibbonGeometry, Vec } from './geometry';

/**
 * Where every point of the ribbon wants to be, for a given moment of the untying. These are
 * deterministic targets (so scrolling back re-ties the bow exactly); SatinRibbon's springs
 * follow them with inertia, delay and settling.
 */

/** Scroll-driven inputs, each 0 → 1 except `pull` (card px the tail has been drawn out). */
export interface RibbonDrive {
  /** Tension building as the tail is pulled. */
  tension: number;
  /** The bow slipping undone. */
  slip: number;
  /** The loose ribbon sliding off and falling. */
  fall: number;
  pull: number;
}

/** One strand's target at a point: position, height off the card, twist about its length. */
export interface Frame {
  x: number;
  y: number;
  z: number;
  twist: number;
  /** Visible width, as a multiple of the ribbon's width. */
  width: number;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const span = (v: number, from: number, to: number) => clamp01((v - from) / (to - from));

export type StrandKind = 'band' | 'fixedTail' | 'pulledTail' | 'loopLeft' | 'loopRight' | 'knot';

export class RibbonShape {
  private readonly g: RibbonGeometry;
  private readonly w: number;
  private readonly tailLength: number;

  constructor(geometry: RibbonGeometry, cardWidth: number) {
    this.g = geometry;
    this.w = cardWidth;
    this.tailLength = cardWidth * RIBBON.layout.tailShare;
  }

  /** The target for strand `kind` at parameter `u` (0 → 1 along it). */
  frame(kind: StrandKind, u: number, d: RibbonDrive, out: Frame): Frame {
    switch (kind) {
      case 'band':
        return this.band(u, d, out);
      case 'fixedTail':
        return this.tail(u, d, out, false);
      case 'pulledTail':
        return this.tail(u, d, out, true);
      case 'loopLeft':
        return this.loop(u, d, out, 0);
      case 'loopRight':
        return this.loop(u, d, out, 1);
      case 'knot':
        return this.knot(u, d, out);
    }
  }

  /** The band across the card, wrapping round its edges while tied. */
  private band(u: number, d: RibbonDrive, out: Frame): Frame {
    const { rw, bandY, knot, pullDirection } = this.g;
    const { attachDip, attachSpread, slack, fall: fallShape } = RIBBON.motion;
    const w = this.w;
    const overhang = rw * RIBBON.layout.wrapOverhang;
    let x = -overhang + u * (w + 2 * overhang);
    let y = bandY;
    // Never perfectly flat: a faint lift and turn along its length catches the light unevenly.
    let z = 1.5 + RIBBON.lie.lift * Math.sin(u * TAU * 2.3 + 0.4);
    let twist = RIBBON.lie.turn * Math.sin(u * TAU * 3.1 + 1.2);

    // Over the card's edges the band curves down and away out of sight (darkening as it turns),
    // until it starts to slide off.
    const edge = smooth((Math.abs(u - 0.5) * 2 - 0.9) / 0.1);
    const wrapped = 1 - span(d.fall, 0, 0.25);
    z -= edge * rw * 1.4 * wrapped;

    // Tension: the knot drags the band towards the pull, most near the knot.
    const taut = d.tension * (1 - d.slip);
    const near = Math.exp(-(((x - knot[0]) / (attachSpread * w)) ** 2));
    y += taut * attachDip * rw * near;
    x += taut * rw * 0.25 * near * pullDirection[0];

    // Slack: once the bow slips, the band loosens into a sag with a softer ripple.
    const loose = d.slip * (1 - d.fall * 0.4);
    y += loose * rw * (slack.sag * Math.sin(Math.PI * u) + slack.ripple * Math.sin(3 * Math.PI * u + 1.1));
    twist += loose * slack.twist * Math.sin(TAU * 1.2 * u + 0.4);
    z += loose * 4 * Math.sin(Math.PI * u);

    // Fall: the pulled end goes first, the far end follows; it drapes, turns over and slides down.
    const f = clamp01((d.fall - fallShape.lag * (1 - u)) / (1 - fallShape.lag));
    const e = smooth(f);
    y += e * fallShape.drop * w + Math.sin(Math.PI * u) * e * fallShape.drape * w;
    y += fallShape.wave * rw * Math.sin(TAU * (1.5 * u - 2 * d.fall)) * f * (1 - f) * 4;
    x += e * fallShape.drift * w;
    twist += e * fallShape.turn * Math.sin(Math.PI * u * 1.2 + d.fall * 2.2);
    z += e * 10 * Math.sin(Math.PI * u);

    out.x = x;
    out.y = y;
    out.z = z;
    out.twist = twist;
    out.width = 1;
    return out;
  }

  /** How far the band's middle (where the knot sits) has moved from rest. */
  private knotOffset(d: RibbonDrive): Vec {
    const centre = this.band(0.5, d, { x: 0, y: 0, z: 0, twist: 0, width: 1 });
    return [centre.x - this.g.knot[0], centre.y - this.g.bandY];
  }

  private tail(s: number, d: RibbonDrive, out: Frame, pulled: boolean): Frame {
    const { rw, knot, tailPulled, tailFixed, pullDirection } = this.g;
    const { pullWave, pinch } = RIBBON.motion;
    const side = pulled ? 1 : -1;
    const [dx, dy] = this.knotOffset(d);

    // Tails hang from just under the knot; once untied, the loose end hangs more straight down.
    const start: Vec = [knot[0] + side * rw * 0.25, knot[1] + rw * 0.35];
    const hanging: Vec = [knot[0] + side * rw * 0.5, knot[1] + this.tailLength * 1.05];
    const rest = pulled ? tailPulled : tailFixed;
    const end: Vec = pulled
      ? [rest[0] + pullDirection[0] * d.pull, rest[1] + pullDirection[1] * d.pull]
      : [rest[0] + (hanging[0] - rest[0]) * d.slip * 0.6, rest[1] + (hanging[1] - rest[1]) * d.slip * 0.6];

    // A gentle curve that straightens as the ribbon comes under tension.
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]) || 1;
    const nx = -(end[1] - start[1]) / length;
    const ny = (end[0] - start[0]) / length;
    const bend = side * rw * 1.3 * (1 - d.tension * (pulled ? 1 : 0.3));
    const cx = (start[0] + end[0]) / 2 + nx * bend;
    const cy = (start[1] + end[1]) / 2 + ny * bend;
    const t = 1 - s;
    let x = t * t * start[0] + 2 * t * s * cx + s * s * end[0];
    let y = t * t * start[1] + 2 * t * s * cy + s * s * end[1];

    // The pull sends a wave up the tail from its end towards the knot, strongest mid-pull.
    const wave = Math.sin(Math.PI * clamp01(d.tension)) * (1 - d.slip * 0.6) * (pulled ? 1 : 0.35);
    const ripple = pullWave.amplitude * rw * wave * Math.sin(TAU * (pullWave.cycles * s + pullWave.speed * d.tension)) * (0.25 + 0.75 * s);
    x += nx * ripple;
    y += ny * ripple;
    let twist =
      side * pinch * (1 - smooth(s / 0.3)) * (1 - d.slip) +
      pullWave.twist * wave * Math.sin(TAU * (1.2 * s + 2 * d.tension) + 0.6) +
      side * 0.25 * Math.sin(Math.PI * s);
    let z = 1.5 + 3 * Math.sin(Math.PI * s) * (1 - 0.6 * d.tension);

    // Carried by the knot as the band moves; the free end trails behind until the fall ends.
    const trail = 1 - 0.35 * s * (1 - d.fall);
    x += dx * trail;
    y += dy * trail;
    const e = smooth(clamp01((d.fall - 0.3 * s) / 0.7));
    twist += e * 2.2 * Math.sin(Math.PI * s + d.fall * 2.5);
    z += e * 8 * Math.sin(Math.PI * s);

    out.x = x;
    out.y = y;
    out.z = z;
    out.twist = twist;
    out.width = 1;
    return out;
  }

  /** A bow loop: out from the knot, round its tip and back, lifted off the card. */
  private loop(u: number, d: RibbonDrive, out: Frame, index: 0 | 1): Frame {
    const { rw, knot, loopLength, loopAngles } = this.g;
    const side = index === 1 ? 1 : -1;
    // Pulling the right-hand tail draws the right loop in through the knot; the other only tightens.
    const drawnIn = index === 1 ? 0.82 : 0.18;
    const length = loopLength * (1 - drawnIn * d.tension) * (1 - d.slip);
    const angle = ((loopAngles[index] + side * (index === 1 ? 14 : 8) * d.tension) * Math.PI) / 180;
    const [dx, dy] = this.knotOffset(d);

    const phi = Math.PI * u;
    const lx = length * Math.sin(phi);
    const ly = -length * 0.5 * Math.sin(2 * phi);
    out.x = knot[0] + dx + lx * Math.cos(angle) - ly * Math.sin(angle);
    out.y = knot[1] + dy + lx * Math.sin(angle) + ly * Math.cos(angle);
    out.z = 2.5 + length * 0.38 * Math.sin(phi);
    // Gathered tight at the knot, open and flat round the tip.
    out.twist = side * RIBBON.motion.pinch * (1 - Math.sin(phi)) ** 1.5 + 0.3 * Math.sin(2 * phi);
    out.width = smooth(length / (rw * 1.6));
    return out;
  }

  /** The knot: a short wrap round the band, shaded like a small cylinder. */
  private knot(u: number, d: RibbonDrive, out: Frame): Frame {
    const { rw, knot } = this.g;
    const [dx, dy] = this.knotOffset(d);
    const size = 0.4 + 0.6 * (1 - d.slip);
    const angle = ((-8 + 10 * d.tension) * Math.PI) / 180 + Math.PI / 2;
    const along = (u - 0.5) * rw * 1.15 * size;
    out.x = knot[0] + dx + Math.cos(angle) * along;
    out.y = knot[1] + dy + Math.sin(angle) * along;
    out.z = 4;
    out.twist = -1.25 + 2.5 * u;
    out.width = 1.2 * size * (1 - span(d.slip, 0.6, 1));
    return out;
  }
}
