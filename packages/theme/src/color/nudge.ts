import { contrastRatio } from './contrast.js';
import { hexToOklch, oklchToHex, clamp01 } from './convert.js';
import { pickOn } from './pick.js';

/**
 * Moves a foreground colour along the OKLCH lightness axis until it reaches a
 * target contrast ratio against a fixed background, preserving hue and as much
 * chroma as the sRGB gamut allows.
 *
 * This backs two separate product behaviours:
 *  - `suggestion` on a failing ContrastResult ("use suggested colour")
 *  - the resolver's guarantee that machine-derived dark-mode surfaces are legible
 *
 * Contrast against a fixed background is monotone in lightness on either side
 * of that background's own luminance — but gamut mapping perturbs it near the
 * extremes, so we coarse-scan for a bracket first and only then bisect. That
 * costs a few dozen conversions and removes a whole class of "the suggestion
 * doesn't actually pass" bug.
 */

const COARSE_STEP = 0.01;
const BISECT_ITERATIONS = 14;

export interface NudgeOptions {
  /** Overshoot the target slightly so rounding for display can't drop below it. */
  readonly margin?: number;
}

type Direction = 'lighten' | 'darken';

function candidateAt(base: ReturnType<typeof hexToOklch>, l: number): string {
  return oklchToHex({ l: clamp01(l), c: base.c, h: base.h });
}

function searchDirection(
  fg: string,
  bg: string,
  target: number,
  direction: Direction,
): { hex: string; deltaL: number } | null {
  const base = hexToOklch(fg);
  const limit = direction === 'lighten' ? 1 : 0;
  const span = Math.abs(limit - base.l);
  if (span < COARSE_STEP) return null;

  const sign = direction === 'lighten' ? 1 : -1;
  const steps = Math.ceil(span / COARSE_STEP);

  let bracketLow = base.l;
  let bracketHigh: number | null = null;

  for (let i = 1; i <= steps; i++) {
    const l = clamp01(base.l + sign * i * COARSE_STEP);
    if (contrastRatio(candidateAt(base, l), bg) >= target) {
      bracketHigh = l;
      break;
    }
    bracketLow = l;
  }

  if (bracketHigh === null) return null;

  // Bisect between the last failing lightness and the first passing one.
  let lo = bracketLow;
  let hi = bracketHigh;
  for (let i = 0; i < BISECT_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(candidateAt(base, mid), bg) >= target) hi = mid;
    else lo = mid;
  }

  const hex = candidateAt(base, hi);
  // Guard against gamut mapping nudging us back below target at the boundary.
  if (contrastRatio(hex, bg) < target) return null;
  return { hex, deltaL: Math.abs(hi - base.l) };
}

/**
 * Returns the nearest colour to `fg` (in perceptual lightness) that meets
 * `target` against `bg`, or `null` if no lightness along that hue can reach it.
 */
export function nudgeToRatio(
  fg: string,
  bg: string,
  target: number,
  options: NudgeOptions = {},
): string | null {
  const goal = target + (options.margin ?? 0.05);
  if (contrastRatio(fg, bg) >= goal) return fg;

  const darker = searchDirection(fg, bg, goal, 'darken');
  const lighter = searchDirection(fg, bg, goal, 'lighten');

  if (darker && lighter) return darker.deltaL <= lighter.deltaL ? darker.hex : lighter.hex;
  return (darker ?? lighter)?.hex ?? null;
}

/**
 * Like `nudgeToRatio` but never fails: falls back to whichever of near-black or
 * white scores highest. Used where the resolver must produce *something*
 * legible with no opportunity to ask the user (dark mode, "on" colours).
 */
export function ensureMinRatio(fg: string, bg: string, target: number): string {
  if (contrastRatio(fg, bg) >= target) return fg;
  return nudgeToRatio(fg, bg, target) ?? pickOn(bg);
}
