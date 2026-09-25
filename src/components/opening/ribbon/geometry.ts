import { RIBBON } from './config';

/** A point in the card's own (unscaled) pixels. */
export type Vec = [number, number];

/** Where the ribbon sits on the closed card, tied. */
export interface RibbonGeometry {
  /** Ribbon width. */
  rw: number;
  /** The band runs across the card here, and the knot sits on it. */
  bandY: number;
  knot: Vec;
  loopLength: number;
  /** Loop directions, in degrees clockwise from pointing right (y points down). */
  loopAngles: [left: number, right: number];
  /** Tail ends: the one left hanging, and the one drawn out as the bow unties. */
  tailFixed: Vec;
  tailPulled: Vec;
  /** Unit vector from the knot out along the pulled tail. */
  pullDirection: Vec;
}

const fromAngle = (degrees: number, length: number): Vec => {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians) * length, Math.sin(radians) * length];
};

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];

/**
 * The band runs across the front cover and the bow sits centred on it, in the blank space
 * between the monograms and the names printed lower down.
 */
export function ribbonGeometry(width: number, height: number): RibbonGeometry {
  const { widthShare, minWidth, maxWidth, bandAt, loopShare, tailShare, angles } = RIBBON.layout;
  const rw = Math.min(Math.max(width * widthShare, minWidth), maxWidth);
  const bandY = height * bandAt;
  const knot: Vec = [width / 2, bandY];
  const tailLength = width * tailShare;
  const tailPulled = add(knot, fromAngle(angles.pulledTail, tailLength * 1.1));
  const along: Vec = [tailPulled[0] - knot[0], tailPulled[1] - knot[1]];
  const length = Math.hypot(along[0], along[1]);

  return {
    rw,
    bandY,
    knot,
    loopLength: width * loopShare,
    loopAngles: [angles.leftLoop, angles.rightLoop],
    tailFixed: add(knot, fromAngle(angles.fixedTail, tailLength)),
    tailPulled,
    pullDirection: [along[0] / length, along[1] / length],
  };
}
