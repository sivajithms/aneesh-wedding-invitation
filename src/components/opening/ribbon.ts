/**
 * Satin ribbon geometry, in the card's own (unscaled) pixels. The bow is redrawn every frame
 * while it's being pulled, so these are small pure functions returning SVG path data.
 */

export type Vec = [number, number];

export interface RibbonGeometry {
  /** Ribbon width. */
  rw: number;
  /** Where the band runs across the card, and where the knot sits on it. */
  bandY: number;
  knot: Vec;
  loopLength: number;
  /** Loop directions, in degrees clockwise from pointing right (SVG's y points down). */
  loopAngles: [left: number, right: number];
  /** The tail left hanging, and the one the guest pulls. */
  tailFixed: Vec;
  tailPulled: Vec;
  /** Unit vector from the knot out along the pulled tail: the direction of a good tug. */
  pullDirection: Vec;
}

const fromAngle = (degrees: number, length: number): Vec => {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians) * length, Math.sin(radians) * length];
};

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];

const fmt = (n: number) => n.toFixed(1);

/**
 * The band runs across the front cover and the bow sits centred on it, in the blank space
 * between the monograms and the names printed lower down.
 */
export function ribbonGeometry(width: number, height: number): RibbonGeometry {
  const rw = Math.min(Math.max(width * 0.05, 12), 26);
  const bandY = height * 0.34;
  const knot: Vec = [width / 2, bandY];
  const tailLength = width * 0.25;
  const tailPulled = add(knot, fromAngle(64, tailLength * 1.1));
  const along: Vec = [tailPulled[0] - knot[0], tailPulled[1] - knot[1]];
  const length = Math.hypot(along[0], along[1]);

  return {
    rw,
    bandY,
    knot,
    loopLength: width * 0.18,
    loopAngles: [197, -17],
    tailFixed: add(knot, fromAngle(114, tailLength)),
    tailPulled,
    pullDirection: [along[0] / length, along[1] / length],
  };
}

/**
 * One loop of the bow, pointing along +x from the knot. The inner path is the far side of the
 * ribbon seen through the loop, painted darker so the loop reads as a fold rather than a flat blob.
 */
export function loopPaths(length: number, rw: number): { outer: string; inner: string } {
  if (length < 0.5) return { outer: '', inner: '' };
  const l = length;
  const neck = rw * 0.45;
  const outer = `M0 ${fmt(-neck)} C${fmt(l * 0.3)} ${fmt(-l * 0.62)} ${fmt(l * 1.04)} ${fmt(-l * 0.52)} ${fmt(l)} 0 C${fmt(l * 1.04)} ${fmt(l * 0.52)} ${fmt(l * 0.3)} ${fmt(l * 0.62)} 0 ${fmt(neck)}Z`;
  const inner = `M${fmt(l * 0.24)} ${fmt(-neck * 0.25)} C${fmt(l * 0.42)} ${fmt(-l * 0.34)} ${fmt(l * 0.86)} ${fmt(-l * 0.3)} ${fmt(l * 0.83)} 0 C${fmt(l * 0.86)} ${fmt(l * 0.3)} ${fmt(l * 0.42)} ${fmt(l * 0.34)} ${fmt(l * 0.24)} ${fmt(neck * 0.25)}Z`;
  return { outer, inner };
}

/** A tail: a gently curved strip from the knot to its end, finished with a V-notch cut. */
export function tailPath(from: Vec, to: Vec, bend: number, rw: number): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const control: Vec = [(from[0] + to[0]) / 2 + (-dy / length) * bend, (from[1] + to[1]) / 2 + (dx / length) * bend];

  const steps = 10;
  const left: Vec[] = [];
  const right: Vec[] = [];
  let tangent: Vec = [dx / length, dy / length];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const point: Vec = [
      u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
    ];
    const d: Vec = [2 * u * (control[0] - from[0]) + 2 * t * (to[0] - control[0]), 2 * u * (control[1] - from[1]) + 2 * t * (to[1] - control[1])];
    const dl = Math.hypot(d[0], d[1]) || 1;
    tangent = [d[0] / dl, d[1] / dl];
    // Satin narrows slightly as it hangs away from the knot.
    const half = rw * (0.5 - 0.05 * t);
    left.push([point[0] - tangent[1] * half, point[1] + tangent[0] * half]);
    right.push([point[0] + tangent[1] * half, point[1] - tangent[0] * half]);
  }
  const notch: Vec = [to[0] - tangent[0] * rw * 0.55, to[1] - tangent[1] * rw * 0.55];
  const outline = [...left, notch, ...right.reverse()];
  return `M${outline.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`;
}
