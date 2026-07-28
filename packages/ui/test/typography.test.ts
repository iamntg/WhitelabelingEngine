import { FONT_PAIRINGS, getPreset, PAIRING_IDS, resolveTheme } from '@wl/theme';
import { describe, expect, it } from 'vitest';
import { bodyStyle, displayStyle, fontFor } from '../src/typography.js';

/**
 * The two hosts name the same typeface differently, and getting it wrong fails
 * silently: the wrong family name renders the system face rather than throwing,
 * only for the pairing nobody tested, only on one of the two hosts.
 */

const themeFor = (pairingId: (typeof PAIRING_IDS)[number]) =>
  resolveTheme({ ...getPreset('ember').tokens, typography: { pairingId } });

describe('the bundled strategy', () => {
  it('only ever names a family the Expo app has registered', () => {
    for (const pairingId of PAIRING_IDS) {
      const theme = themeFor(pairingId);
      const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId);
      const registered = new Set(Object.values(pairing?.rnExports ?? {}));

      const families = [
        fontFor(theme, 'display', undefined, 'bundled').fontFamily,
        ...Object.values(theme.typography.body.weights).map(
          (weight) => fontFor(theme, 'body', weight, 'bundled').fontFamily,
        ),
      ];

      for (const family of families) {
        expect(registered.has(family as string), `${pairingId} asked for ${family}`).toBe(true);
      }
    }
  });

  it('never asks for a numeric weight, which React Native cannot synthesise', () => {
    for (const pairingId of PAIRING_IDS) {
      const theme = themeFor(pairingId);
      expect(fontFor(theme, 'display', undefined, 'bundled').fontWeight).toBeUndefined();
      expect(fontFor(theme, 'body', 700, 'bundled').fontWeight).toBeUndefined();
    }
  });

  it('falls back to the face’s own weight rather than a family nobody bundled', () => {
    // Grand skips a 600 body: DM Sans does not ship a reliable static for it,
    // so semibold maps onto 700 and a request for 600 must land somewhere real.
    const grand = themeFor('grand');
    expect(fontFor(grand, 'body', 600, 'bundled').fontFamily).toBe('DMSans_400Regular');
  });
});

describe('the css strategy', () => {
  it('uses the real family name and carries the weight separately', () => {
    const modern = themeFor('modern');
    const display = fontFor(modern, 'display', undefined, 'css');

    expect(display.fontFamily).toContain('Inter');
    expect(display.fontFamily).not.toContain('_');
    expect(display.fontWeight).toBe('600');
  });

  it('names a family the preview’s Google Fonts request actually loads', () => {
    for (const pairingId of PAIRING_IDS) {
      const theme = themeFor(pairingId);
      const pairing = FONT_PAIRINGS.find((p) => p.id === pairingId);
      expect(fontFor(theme, 'display', undefined, 'css').fontFamily).toContain(
        pairing?.display.family ?? '',
      );
    }
  });
});

describe('the type scale', () => {
  it('converts the resolver’s em tracking into absolute letter spacing', () => {
    const theme = themeFor('modern');
    const style = displayStyle(theme, 'md', 'css');
    const { sizes, tracking } = theme.typography.display;

    expect(style.letterSpacing).toBeCloseTo(sizes.md * tracking.md);
    // The resolver's tracking is negative for display sizes; a unit mix-up here
    // would show up as a wildly loose or tight heading rather than as an error.
    expect(style.letterSpacing).toBeLessThan(0);
  });

  it('turns the unitless line height ratio into pixels', () => {
    const theme = themeFor('modern');
    const style = bodyStyle(theme, 'md', 'css');
    const { sizes, lineHeight } = theme.typography.body;

    expect(style.fontSize).toBe(sizes.md);
    expect(style.lineHeight).toBeCloseTo(sizes.md * lineHeight);
  });

  it('takes its colour from the theme unless one is asked for', () => {
    const theme = themeFor('modern');
    expect(bodyStyle(theme, 'md', 'css').color).toBe(theme.text.primary);
    expect(bodyStyle(theme, 'md', 'css', { color: theme.text.secondary }).color).toBe(
      theme.text.secondary,
    );
  });
});
