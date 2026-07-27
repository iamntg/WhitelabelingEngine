// @vitest-environment node
// Reads the stylesheet from disk, so it needs real file URLs rather than
// jsdom's http-based import.meta.url.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hexToOklch } from '@wl/theme';

/**
 * Guards the one rule the spec calls non-negotiable: the tool's chrome stays
 * desaturated, and the tenant's brand colours are the only saturated pixels on
 * screen.
 *
 * This is easy to violate by accident — someone adds a "nice" blue for a link,
 * or tints a focus ring with the brand colour "just here". A test is cheaper
 * than a review that has to catch it every time.
 */

const css = readFileSync(fileURLToPath(new URL('./chrome.css', import.meta.url)), 'utf8');

function declaredColors(): Array<{ name: string; hex: string }> {
  const out: Array<{ name: string; hex: string }> = [];
  const pattern = /--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const [, name, hex] = match;
    if (name && hex) out.push({ name, hex });
  }
  return out;
}

/**
 * Two rules, derived from measuring the design export rather than guessed.
 *
 * The tool has exactly three families that may carry colour — the interactive
 * accent, the "published" green and the two contrast-alert hues — and every
 * one of them is muted. Everything else is a neutral. In the export the
 * neutrals top out at 0.011 chroma and the coloured tokens top out at 0.120, so
 * these ceilings sit clear of both without leaving room for a vivid colour: a
 * saturated brand red or blue lands near 0.19.
 */
const STATUS_PREFIXES = ['accent', 'live', 'warn', 'fail', 'idle'];

const NEUTRAL_MAX_CHROMA = 0.015;
const STATUS_MAX_CHROMA = 0.13;

/** A representative saturated brand colour, used to prove the guard bites. */
const VIVID_BRAND_COLORS = ['#e23d28', '#1f5fd0', '#f5c518', '#1c7c54', '#7b3fa0'];

const isStatusToken = (name: string) =>
  STATUS_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}-`));

describe('tool chrome', () => {
  it('declares the tokens the design uses', () => {
    const names = declaredColors().map((c) => c.name);
    for (const required of ['canvas', 'surface', 'ink', 'hairline', 'accent', 'action']) {
      expect(names, `missing --color-${required}`).toContain(required);
    }
  });

  it('keeps every non-status colour neutral', () => {
    for (const { name, hex } of declaredColors()) {
      if (isStatusToken(name)) continue;
      const { c } = hexToOklch(hex);
      expect(
        c,
        `--color-${name} (${hex}) has chroma ${c.toFixed(3)} — the tool's chrome must stay desaturated`,
      ).toBeLessThanOrEqual(NEUTRAL_MAX_CHROMA);
    }
  });

  it('keeps the accent and status hues muted rather than vivid', () => {
    for (const { name, hex } of declaredColors()) {
      if (!isStatusToken(name)) continue;
      const { c } = hexToOklch(hex);
      expect(
        c,
        `--color-${name} (${hex}) is too saturated for the tool's chrome`,
      ).toBeLessThanOrEqual(STATUS_MAX_CHROMA);
    }
  });

  it('would reject a tenant brand colour in either budget', () => {
    // Without this, the two ceilings above could drift loose enough to permit
    // exactly the thing they exist to prevent, and still pass.
    for (const hex of VIVID_BRAND_COLORS) {
      const { c } = hexToOklch(hex);
      expect(c, `${hex} should exceed the neutral ceiling`).toBeGreaterThan(NEUTRAL_MAX_CHROMA);
    }
    const mostVivid = Math.max(...VIVID_BRAND_COLORS.map((hex) => hexToOklch(hex).c));
    expect(mostVivid).toBeGreaterThan(STATUS_MAX_CHROMA);
  });

  it('uses exactly one interactive accent hue', () => {
    // "ONE muted accent for interactive elements only" — if a second hue creeps
    // in, the chrome stops reading as a single neutral system.
    const accents = declaredColors().filter((c) => c.name.startsWith('accent'));
    const hues = accents
      .map((a) => hexToOklch(a.hex))
      .filter((o) => o.c > 0.01)
      .map((o) => o.h);

    expect(hues.length).toBeGreaterThan(0);
    const spread = Math.max(...hues) - Math.min(...hues);
    expect(spread, `accent hues span ${spread.toFixed(1)}°`).toBeLessThan(20);
  });

  it('keeps the primary action near-black, never brand-tinted', () => {
    const action = declaredColors().find((c) => c.name === 'action');
    expect(action).toBeDefined();
    const { l, c } = hexToOklch(action?.hex ?? '#000000');
    expect(l).toBeLessThan(0.3);
    expect(c).toBeLessThan(0.02);
  });

  it('gives every control a visible focus ring', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('focus-ring');
  });
});
