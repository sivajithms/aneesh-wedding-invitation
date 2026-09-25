import type { CSSProperties } from 'react';

/** Joins truthy class names. */
export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/** Typed helper for inline CSS custom properties, e.g. cssVars({ '--delay': '120ms' }). */
export const cssVars = (vars: Record<`--${string}`, string | number>): CSSProperties =>
  vars as CSSProperties;
