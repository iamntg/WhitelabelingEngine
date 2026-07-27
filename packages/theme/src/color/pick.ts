import { contrastRatio } from './contrast.js';

/**
 * The two "on" colours we ever place on top of a brand colour. Near-black
 * rather than pure black: #141416 reads as intentional rather than as a
 * rendering default, and matches the near-black used throughout the design.
 */
export const INK = '#141416';
export const PAPER = '#ffffff';

/**
 * Picks whichever candidate actually scores highest against `background`.
 *
 * The design export used a fixed 3.6:1 threshold against white, which chooses
 * white on mid-tone oranges and ambers where near-black measurably wins. We
 * measure both and take the winner instead of guessing at a cutoff.
 */
export function pickOn(background: string, candidates: readonly string[] = [INK, PAPER]): string {
  let best = candidates[0] ?? INK;
  let bestRatio = -1;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return best;
}
