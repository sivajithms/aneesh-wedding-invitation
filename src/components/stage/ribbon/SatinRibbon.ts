import type { QualityProfile } from '../../../lib/quality';
import { RIBBON } from './config';
import type { RibbonGeometry } from './geometry';
import { RibbonShape, type Frame, type RibbonDrive, type StrandKind } from './shape';

/**
 * A satin ribbon drawn on a canvas that sits on the card, so it inherits the card's 3D tilt.
 *
 * Each strand is a subdivided strip. Every point carries a position, a height off the card and a
 * twist about the strip's length; springs pull each point towards the shape's target for the
 * current scroll moment (stiffer near anchors, looser along the length, slightly under-damped),
 * so the fabric lags, follows through and settles. Each segment is lit from its own normal:
 * diffuse light, a satin sheen, a duller reverse side, darker edges and a soft contact shadow.
 */

interface Strand {
  kind: StrandKind;
  count: number;
  /** Targets and spring state: x, y, z (height), twist, per point. */
  target: Float32Array;
  position: Float32Array;
  velocity: Float32Array;
  width: Float32Array;
  stiffness: Float32Array;
  wobble: Float32Array;
  notch: boolean;
  /** Reused every frame: edge points and tangents as seen from the front, and each point's light. */
  left: Float32Array;
  right: Float32Array;
  tangents: Float32Array;
  lit: Float32Array;
  shine: Float32Array;
  turn: Float32Array;
}

export interface RibbonLayout {
  cardWidth: number;
  geometry: RibbonGeometry;
  /** How many screen px one card px occupies while the ribbon is on show. */
  displayScale: number;
  profile: QualityProfile;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

const DRAW_ORDER: StrandKind[] = ['band', 'fixedTail', 'pulledTail', 'loopLeft', 'loopRight', 'knot'];
const STRIDE = 4;

const normalise = (v: readonly number[]) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l) as [number, number, number];
};
const LIGHT = normalise(RIBBON.light.direction);
// Halfway between the light and the viewer (looking straight down +z): where the sheen peaks.
const HALF = normalise([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

const rgbAt = (c: Float32Array, i: number) => `rgb(${Math.min(255, c[i * 3]) | 0} ${Math.min(255, c[i * 3 + 1]) | 0} ${Math.min(255, c[i * 3 + 2]) | 0})`;
const rgb = (c: readonly number[], alpha = 1) =>
  `rgb(${Math.min(255, c[0]) | 0} ${Math.min(255, c[1]) | 0} ${Math.min(255, c[2]) | 0}${alpha < 1 ? ` / ${alpha.toFixed(3)}` : ''})`;

/** How firmly each point follows its target, by position along the strand (0 → 1). */
function stiffnessProfile(kind: StrandKind, u: number): number {
  switch (kind) {
    case 'band':
      return 0.55 + 0.45 * Math.abs(2 * u - 1); // held at the card's edges, freer in the middle
    case 'pulledTail':
      return 0.5 + 0.5 * Math.abs(2 * u - 1); // held at the knot and at the pulled end
    case 'fixedTail':
      return 1 - 0.65 * u; // the free end lags
    case 'knot':
      return 1.2;
    default:
      return 0.8;
  }
}

export class SatinRibbon {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly animate: boolean;
  private shape: RibbonShape | null = null;
  private strands: Strand[] = [];
  private layoutInfo: RibbonLayout | null = null;
  private region = { x: 0, y: 0, w: 1, h: 1 };
  private scale = 1;
  private drive: RibbonDrive = { tension: 0, slip: 0, fall: 0, pull: 0 };
  private moving = false;
  private needsDraw = true;
  private readonly frame: Frame = { x: 0, y: 0, z: 0, twist: 0, width: 1 };
  private lastBounds: Box | null = null;

  constructor(canvas: HTMLCanvasElement, { animate }: { animate: boolean }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.animate = animate;
  }

  layout(layout: RibbonLayout) {
    const { cardWidth: w, geometry, displayScale, profile } = layout;
    this.layoutInfo = layout;
    this.shape = new RibbonShape(geometry, w);
    const { left, width, above, height } = RIBBON.canvas;
    this.region = { x: left * w, y: geometry.bandY - above * w, w: width * w, h: height * w };
    this.scale = Math.min(window.devicePixelRatio || 1, profile.maxDpr) * displayScale;
    Object.assign(this.canvas.style, {
      left: `${this.region.x}px`,
      top: `${this.region.y}px`,
      width: `${this.region.w}px`,
      height: `${this.region.h}px`,
    });
    this.lastBounds = null;
    this.canvas.width = Math.ceil(this.region.w * this.scale);
    this.canvas.height = Math.ceil(this.region.h * this.scale);

    const { band, tail, loop } = profile.ribbonSegments;
    const segments: Record<StrandKind, number> = { band, fixedTail: tail, pulledTail: tail, loopLeft: loop, loopRight: loop, knot: 4 };
    this.strands = DRAW_ORDER.map((kind) => {
      const count = segments[kind] + 1;
      const make = () => new Float32Array(count * STRIDE);
      const stiffness = new Float32Array(count);
      const wobble = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        stiffness[i] = RIBBON.spring.stiffness * stiffnessProfile(kind, i / (count - 1));
        // Fixed, gentle unevenness so the edges look woven rather than drawn.
        wobble[i] = 1 + RIBBON.edgeWobble * Math.sin(i * 2.3 + kind.length) * Math.cos(i * 0.7);
      }
      return { kind, count, target: make(), position: make(), velocity: make(), width: new Float32Array(count), stiffness, wobble, notch: kind.endsWith('Tail'),
        left: new Float32Array(count * 2),
        right: new Float32Array(count * 2),
        tangents: new Float32Array(count * 2),
        lit: new Float32Array(count * 3),
        shine: new Float32Array(count),
        turn: new Float32Array(count),
      };
    });
    this.writeTargets();
    this.snap();
  }

  /** New scroll moment: move the targets; the springs catch up in `update`. */
  setDrive(drive: RibbonDrive) {
    const d = this.drive;
    if (d.tension === drive.tension && d.slip === drive.slip && d.fall === drive.fall && d.pull === drive.pull) return;
    this.drive = { ...drive };
    this.writeTargets();
    if (!this.animate || this.farFromTargets()) this.snap();
    this.moving = true;
    this.needsDraw = true;
  }

  /** Advances the springs by `dt` seconds and redraws if anything moved. */
  update(dt: number) {
    if (this.moving && this.animate) this.moving = this.step(dt);
    if (this.moving || this.needsDraw) {
      this.draw();
      this.needsDraw = false;
    }
  }

  /* ---------- Targets and springs ---------- */

  private writeTargets() {
    if (!this.shape) return;
    for (const strand of this.strands) {
      for (let i = 0; i < strand.count; i++) {
        const f = this.shape.frame(strand.kind, i / (strand.count - 1), this.drive, this.frame);
        const o = i * STRIDE;
        strand.target[o] = f.x;
        strand.target[o + 1] = f.y;
        strand.target[o + 2] = f.z;
        strand.target[o + 3] = f.twist;
        strand.width[i] = f.width;
      }
    }
  }

  private snap() {
    for (const strand of this.strands) {
      strand.position.set(strand.target);
      strand.velocity.fill(0);
    }
    this.needsDraw = true;
  }

  /** A big jump (a skip link, a resize) would send the ribbon flying: jump with it instead. */
  private farFromTargets(): boolean {
    const limit = RIBBON.spring.snap * (this.layoutInfo?.cardWidth ?? 1);
    for (const strand of this.strands) {
      for (let o = 0; o < strand.position.length; o += STRIDE) {
        if (Math.abs(strand.target[o] - strand.position[o]) + Math.abs(strand.target[o + 1] - strand.position[o + 1]) > limit) return true;
      }
    }
    return false;
  }

  /** Semi-implicit Euler, in small steps. Returns whether anything is still moving. */
  private step(dt: number): boolean {
    const { maxStep, damping, restDistance, restSpeed } = RIBBON.spring;
    const steps = Math.max(1, Math.ceil(Math.min(dt, 0.05) / maxStep));
    const h = Math.min(dt, 0.05) / steps;
    let moving = false;
    for (const strand of this.strands) {
      const { target: T, position: P, velocity: V, stiffness } = strand;
      for (let i = 0; i < strand.count; i++) {
        const k = stiffness[i];
        const c = 2 * damping * Math.sqrt(k);
        for (let axis = 0; axis < STRIDE; axis++) {
          const o = i * STRIDE + axis;
          let p = P[o];
          let v = V[o];
          for (let n = 0; n < steps; n++) {
            v += (k * (T[o] - p) - c * v) * h;
            p += v * h;
          }
          // Twist is in radians, not px: scale its rest test so it settles as visibly as position.
          const unit = axis === 3 ? 30 : 1;
          if (Math.abs(T[o] - p) * unit > restDistance || Math.abs(v) * unit > restSpeed) moving = true;
          P[o] = p;
          V[o] = v;
        }
      }
    }
    if (!moving) this.snap();
    return moving;
  }

  /* ---------- Drawing ---------- */

  private draw() {
    const { ctx, scale, region } = this;
    const profile = this.layoutInfo?.profile;
    if (!profile) return;
    ctx.setTransform(scale, 0, 0, scale, -region.x * scale, -region.y * scale);
    ctx.lineJoin = 'round';

    const outlines = this.strands.map((strand) => this.outline(strand));
    // Only clear where the ribbon was and now is: most of the canvas is empty.
    const bounds = this.bounds();
    const clear = this.lastBounds ? union(this.lastBounds, bounds) : { x: region.x, y: region.y, w: region.w, h: region.h };
    ctx.clearRect(clear.x, clear.y, clear.w, clear.h);
    this.lastBounds = bounds;
    // Contact shadows first, all strands, so no strand's shadow falls on top of another strand.
    for (const [strand, outline] of this.strands.map((s, i) => [s, outlines[i]] as const)) {
      if (!outline) continue;
      this.drawShadow(strand, outline, 1, RIBBON.shadow.alpha);
      if (profile.softShadows) this.drawShadow(strand, outline, 2, RIBBON.shadow.softAlpha);
    }
    this.strands.forEach((strand, i) => outlines[i] && this.drawStrand(strand, outlines[i]!, profile.sheen));
  }

  /** Left and right edge points of a strand as it's seen from the front. */
  private outline(strand: Strand) {
    const { rw } = this.layoutInfo!.geometry;
    const { count, position: P, width, wobble } = strand;
    let visible = false;
    const { left, right, tangents } = strand;
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - 1) * STRIDE;
      const b = Math.min(count - 1, i + 1) * STRIDE;
      let tx = P[b] - P[a];
      let ty = P[b + 1] - P[a + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      tangents[i * 2] = tx;
      tangents[i * 2 + 1] = ty;
      // Seen edge-on the strip narrows, but never below the satin's own thickness.
      const half = 0.5 * rw * width[i] * wobble[i] * Math.max(Math.abs(Math.cos(P[i * STRIDE + 3])), RIBBON.thickness);
      if (width[i] > 0.02) visible = true;
      const x = P[i * STRIDE];
      const y = P[i * STRIDE + 1];
      left[i * 2] = x - ty * half;
      left[i * 2 + 1] = y + tx * half;
      right[i * 2] = x + ty * half;
      right[i * 2 + 1] = y - tx * half;
    }
    return visible ? { left, right, tangents } : null;
  }

  /** Everything drawn this frame, shadows included, in card px. */
  private bounds(): Box {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const strand of this.strands) {
      for (const edge of [strand.left, strand.right]) {
        for (let i = 0; i < edge.length; i += 2) {
          if (edge[i] < x0) x0 = edge[i];
          if (edge[i] > x1) x1 = edge[i];
          if (edge[i + 1] < y0) y0 = edge[i + 1];
          if (edge[i + 1] > y1) y1 = edge[i + 1];
        }
      }
    }
    const margin = (this.layoutInfo?.geometry.rw ?? 12) * 1.5;
    return { x: x0 - margin, y: y0 - margin, w: x1 - x0 + margin * 2, h: y1 - y0 + margin * 2 };
  }

  private tracePolygon(strand: Strand, { left, right, tangents }: NonNullable<ReturnType<SatinRibbon['outline']>>, dx = 0, dy = 0) {
    const { ctx } = this;
    const n = strand.count;
    ctx.beginPath();
    ctx.moveTo(left[0] + dx, left[1] + dy);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i * 2] + dx, left[i * 2 + 1] + dy);
    if (strand.notch) {
      // A V-cut at the tail's end, as ribbon is finished.
      const { rw } = this.layoutInfo!.geometry;
      const o = (n - 1) * STRIDE;
      ctx.lineTo(strand.position[o] - tangents[(n - 1) * 2] * rw * 0.55 + dx, strand.position[o + 1] - tangents[(n - 1) * 2 + 1] * rw * 0.55 + dy);
    }
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i * 2] + dx, right[i * 2 + 1] + dy);
    ctx.closePath();
  }

  private drawShadow(strand: Strand, outline: NonNullable<ReturnType<SatinRibbon['outline']>>, spread: number, alpha: number) {
    const { offset, perHeight } = RIBBON.shadow;
    let height = 0;
    for (let i = 0; i < strand.count; i++) height += strand.position[i * STRIDE + 2];
    height /= strand.count;
    // The higher the ribbon lifts off the card, the further its shadow falls from it.
    const dx = (offset[0] + height * perHeight[0]) * spread;
    const dy = (offset[1] + height * perHeight[1]) * spread;
    this.ctx.fillStyle = rgb(RIBBON.colour.shadow, alpha);
    this.tracePolygon(strand, outline, dx, dy);
    this.ctx.fill();
  }

  /** Light at point i, written into the strand's colour, sheen and turn buffers (no allocation). */
  private shade(strand: Strand, i: number, knotX: number, knotY: number) {
    const { position: P, count, kind, tangents, lit, shine: shineOut, turn } = strand;
    const { colour, light } = RIBBON;
    const { rw } = this.layoutInfo!.geometry;
    const o = i * STRIDE;
    const a = Math.max(0, i - 1) * STRIDE;
    const b = Math.min(count - 1, i + 1) * STRIDE;
    const tx = tangents[i * 2];
    const ty = tangents[i * 2 + 1];
    const run = Math.hypot(P[b] - P[a], P[b + 1] - P[a + 1]) || 1;
    const slope = (P[b + 2] - P[a + 2]) / run;
    const twist = P[o + 3];

    // Surface normal: "up" off the card, tilted by the strip's slope, rotated by its twist.
    const upLength = Math.sqrt(slope * slope + 1);
    const ux = (-tx * slope) / upLength;
    const uy = (-ty * slope) / upLength;
    const uz = 1 / upLength;
    const cos = Math.cos(twist);
    const sin = Math.sin(twist);
    let nx = ux * cos - ty * sin;
    let ny = uy * cos + tx * sin;
    let nz = uz * cos;
    const front = nz >= 0;
    if (!front) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
    const facing = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
    const shine = front ? facing ** light.sheenPower * light.sheenStrength + facing ** light.glowPower * light.glowStrength : facing ** 8 * 0.06;

    const lo = front ? colour.shade : colour.backShade;
    const hi = front ? colour.lit : colour.backLit;
    const t = light.ambient + (1 - light.ambient) * diffuse * (front ? 1 : 0.8);
    // Crowded at the knot: a little ambient shadow where strands gather.
    let occlusion = 1;
    if (kind !== 'knot') {
      const mx = P[o] - knotX;
      const my = P[o + 1] - knotY;
      occlusion = 1 - light.occlusion * Math.exp(-(mx * mx + my * my) / (rw * rw * 1.5));
    }
    const glint = Math.min(1, shine);
    for (let c = 0; c < 3; c++) {
      const base = (lo[c] + (hi[c] - lo[c]) * t) * occlusion;
      lit[i * 3 + c] = base + (colour.sheen[c] - base) * glint;
    }
    shineOut[i] = front ? shine : 0;
    turn[i] = sin;
  }

  private drawStrand(strand: Strand, outline: NonNullable<ReturnType<SatinRibbon['outline']>>, sheen: boolean) {
    const { ctx } = this;
    const { left, right, tangents } = outline;
    const { position: P, count } = strand;
    const { rw } = this.layoutInfo!.geometry;
    const knot = this.strands[this.strands.length - 1].position;
    const knotX = knot[2 * STRIDE];
    const knotY = knot[2 * STRIDE + 1];
    for (let i = 0; i < count; i++) this.shade(strand, i, knotX, knotY);
    const { lit, shine: shines, turn } = strand;
    const along = (i: number) => ctx.createLinearGradient(P[i * STRIDE], P[i * STRIDE + 1], P[(i + 1) * STRIDE], P[(i + 1) * STRIDE + 1]);

    // An underlay in the strand's middle tone fills the hairline seams between shaded segments.
    ctx.fillStyle = rgbAt(lit, count >> 1);
    this.tracePolygon(strand, outline);
    ctx.fill();
    for (let i = 0; i < count - 1; i++) {
      // Shaded smoothly from one point's light to the next, as woven satin reads.
      const gradient = along(i);
      gradient.addColorStop(0, rgbAt(lit, i));
      gradient.addColorStop(1, rgbAt(lit, i + 1));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(left[i * 2], left[i * 2 + 1]);
      ctx.lineTo(left[i * 2 + 2], left[i * 2 + 3]);
      if (strand.notch && i === count - 2) {
        // A V-cut at the tail's end, as ribbon is finished.
        const b = (i + 1) * STRIDE;
        ctx.lineTo(P[b] - tangents[(i + 1) * 2] * rw * 0.55, P[b + 1] - tangents[(i + 1) * 2 + 1] * rw * 0.55);
      }
      ctx.lineTo(right[i * 2 + 2], right[i * 2 + 3]);
      ctx.lineTo(right[i * 2], right[i * 2 + 1]);
      ctx.closePath();
      ctx.fill();

      // Satin's sheen runs along the ribbon and slides across its width as the ribbon turns.
      const shine = Math.max(shines[i], shines[i + 1]);
      if (sheen && shine > 0.04) {
        const inner = (t: number, o: number, turn: number) => {
          const at = t + turn * 0.3;
          return [left[o] + (right[o] - left[o]) * at, left[o + 1] + (right[o + 1] - left[o + 1]) * at];
        };
        const [ax, ay] = inner(0.36, i * 2, turn[i]);
        const [bx, by] = inner(0.36, i * 2 + 2, turn[i + 1]);
        const [cx, cy] = inner(0.6, i * 2 + 2, turn[i + 1]);
        const [dx, dy] = inner(0.6, i * 2, turn[i]);
        const glow = along(i);
        glow.addColorStop(0, rgb(RIBBON.colour.sheen, Math.min(0.5, shines[i] * 0.8)));
        glow.addColorStop(1, rgb(RIBBON.colour.sheen, Math.min(0.5, shines[i + 1] * 0.8)));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Its thickness: a fine darker line along the lower edge.
    ctx.strokeStyle = RIBBON.colour.edge;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(right[0], right[1]);
    for (let i = 1; i < count; i++) ctx.lineTo(right[i * 2], right[i * 2 + 1]);
    ctx.stroke();
  }
}
