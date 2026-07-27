import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance, isDarkColor } from '../src/color/contrast.js';
import {
  ColorParseError,
  hexToOklch,
  mixOklch,
  normalizeHex,
  oklchToHex,
  scaleChroma,
  shiftLightness,
} from '../src/color/convert.js';
import { ensureMinRatio, nudgeToRatio } from '../src/color/nudge.js';
import { INK, PAPER, pickOn } from '../src/color/pick.js';
import { colorGrid } from './helpers.js';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Published reference pairs.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
    expect(contrastRatio('#ff0000', '#ffffff')).toBeCloseTo(3.998, 2);
    expect(contrastRatio('#0000ff', '#ffffff')).toBeCloseTo(8.59, 1);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#b4472b', '#fffbf2')).toBeCloseTo(
      contrastRatio('#fffbf2', '#b4472b'),
      10,
    );
  });

  it('computes relative luminance at the endpoints', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
  });

  it('identifies dark colours', () => {
    expect(isDarkColor('#141416')).toBe(true);
    expect(isDarkColor('#1c1c1f')).toBe(true);
    expect(isDarkColor('#ffffff')).toBe(false);
    expect(isDarkColor('#f3efe7')).toBe(false);
  });
});

describe('convert', () => {
  it('round-trips hex through OKLCH without drift', () => {
    for (const hex of ['#b4472b', '#2f4a3f', '#a8710c', '#fffbf2', '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it('normalises shorthand and casing', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#B4472B')).toBe('#b4472b');
  });

  it('throws a typed error on unparseable input', () => {
    expect(() => normalizeHex('not-a-colour')).toThrow(ColorParseError);
  });

  it('mixes at the endpoints exactly', () => {
    expect(mixOklch('#b4472b', '#ffffff', 0)).toBe('#b4472b');
    expect(mixOklch('#b4472b', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixes perceptually, not by naive sRGB channel averaging', () => {
    // The classic failure case: blending blue and yellow in sRGB produces a
    // desaturated grey. In OKLCH the midpoint keeps its chroma.
    const mid = mixOklch('#0000ff', '#ffff00', 0.5);
    expect(hexToOklch(mid).c).toBeGreaterThan(0.05);
  });

  it('keeps the chromatic hue when mixing with a neutral', () => {
    const mixed = mixOklch('#b4472b', '#808080', 0.5);
    expect(Math.abs(hexToOklch(mixed).h - hexToOklch('#b4472b').h)).toBeLessThan(1);
  });

  it('shifts lightness monotonically', () => {
    const lighter = shiftLightness('#b4472b', 0.2);
    const darker = shiftLightness('#b4472b', -0.1);
    expect(hexToOklch(lighter).l).toBeGreaterThan(hexToOklch('#b4472b').l);
    expect(hexToOklch(darker).l).toBeLessThan(hexToOklch('#b4472b').l);
  });

  it('clamps lightness at the extremes rather than wrapping', () => {
    expect(shiftLightness('#ffffff', 0.5)).toBe('#ffffff');
    expect(shiftLightness('#000000', -0.5)).toBe('#000000');
  });

  it('fully desaturates at factor 0', () => {
    const grey = scaleChroma('#b4472b', 0);
    expect(hexToOklch(grey).c).toBeLessThan(0.005);
  });

  it('never produces an out-of-gamut hex', () => {
    for (const hex of colorGrid()) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('pickOn', () => {
  it('picks the candidate that actually measures highest', () => {
    expect(pickOn('#ffffff')).toBe(INK);
    expect(pickOn('#141416')).toBe(PAPER);
  });

  it('picks near-black on mid-tone amber, where a fixed white threshold fails', () => {
    // The design export's 3.6:1-against-white rule chose white here; near-black
    // measures 10.9:1 against this amber and white measures 1.9:1.
    expect(pickOn('#f5c518')).toBe(INK);
    expect(contrastRatio(INK, '#f5c518')).toBeGreaterThan(contrastRatio(PAPER, '#f5c518'));
  });

  it('always returns the better of the two candidates', () => {
    for (const hex of colorGrid()) {
      const chosen = pickOn(hex);
      const other = chosen === INK ? PAPER : INK;
      expect(contrastRatio(chosen, hex)).toBeGreaterThanOrEqual(contrastRatio(other, hex));
    }
  });
});

describe('nudgeToRatio', () => {
  it('returns the input untouched when it already passes', () => {
    expect(nudgeToRatio('#141416', '#ffffff', 4.5)).toBe('#141416');
  });

  it('produces a colour that genuinely meets the target', () => {
    const fixed = nudgeToRatio('#f5c518', '#ffffff', 4.5);
    expect(fixed).not.toBeNull();
    expect(contrastRatio(fixed as string, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('preserves hue while changing lightness', () => {
    const original = hexToOklch('#f5c518');
    const fixed = hexToOklch(nudgeToRatio('#f5c518', '#ffffff', 4.5) as string);
    expect(Math.abs(fixed.h - original.h)).toBeLessThan(6);
    expect(fixed.l).toBeLessThan(original.l);
  });

  it('lightens rather than darkens against a dark background', () => {
    const original = hexToOklch('#2a4a7b');
    const fixed = hexToOklch(nudgeToRatio('#2a4a7b', '#141416', 4.5) as string);
    expect(fixed.l).toBeGreaterThan(original.l);
  });

  it('meets the target for every colour on every background it can reach', () => {
    const backgrounds = ['#ffffff', '#fffbf2', '#f3efe7', '#141416', '#1c1c1f', '#808080'];
    for (const bg of backgrounds) {
      for (const fg of colorGrid(90)) {
        const fixed = nudgeToRatio(fg, bg, 4.5);
        if (fixed === null) continue;
        expect(
          contrastRatio(fixed, bg),
          `nudge(${fg} on ${bg}) produced ${fixed}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('returns null when no lightness on that hue can reach the target', () => {
    // Nothing can hit 21:1 against mid-grey.
    expect(nudgeToRatio('#808080', '#808080', 21)).toBeNull();
  });
});

describe('ensureMinRatio', () => {
  it('never returns a colour below the target, for any input', () => {
    const backgrounds = ['#ffffff', '#fffbf2', '#141416', '#808080', '#2a4a7b'];
    for (const bg of backgrounds) {
      for (const fg of colorGrid(90)) {
        const result = ensureMinRatio(fg, bg, 3);
        expect(
          contrastRatio(result, bg),
          `ensureMinRatio(${fg} on ${bg}) produced ${result}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('falls back to the best extreme when the target is unreachable', () => {
    const result = ensureMinRatio('#808080', '#808080', 21);
    expect([INK, PAPER]).toContain(result);
  });
});
