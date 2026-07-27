import { describe, expect, it } from 'vitest';
import { validateForPublish } from '../src/check.js';
import { contrastRatio } from '../src/color/contrast.js';
import { hexToOklch } from '../src/color/convert.js';
import { FONT_PAIRINGS } from '../src/fonts.js';
import { RADIUS_SCALES } from '../src/radii.js';
import { initialsFrom, resolveTheme, resolveThemeSchemes } from '../src/resolve.js';
import { colorGrid, tokens } from './helpers.js';

describe('resolveTheme — determinism and shape', () => {
  it('is pure: identical input yields a deeply equal result', () => {
    const t = tokens();
    expect(resolveTheme(t)).toEqual(resolveTheme(t));
  });

  it('produces JSON-safe output only — no functions, no undefined, no CSS units', () => {
    const resolved = resolveTheme(tokens());
    const roundTripped = JSON.parse(JSON.stringify(resolved));
    expect(roundTripped).toEqual(resolved);
  });

  it('emits radii as numbers so React Native can consume them directly', () => {
    const { radius } = resolveTheme(tokens({ radiusScale: 'rounded' }));
    for (const value of Object.values(radius)) {
      expect(typeof value).toBe('number');
    }
    expect(radius.md).toBe(12);
  });

  it('carries the schema version through', () => {
    expect(resolveTheme(tokens()).schemaVersion).toBe(1);
  });

  it('defaults to the light scheme', () => {
    expect(resolveTheme(tokens()).scheme).toBe('light');
  });
});

describe('resolveTheme — light scheme', () => {
  it('uses the chosen background verbatim', () => {
    expect(resolveTheme(tokens({ background: '#fffbf2' })).surface.base).toBe('#fffbf2');
  });

  it('does not silently correct the owner’s colours', () => {
    // Light mode warns rather than fixes: the owner chose the background too,
    // so the warning is actionable.
    const t = tokens({ primary: '#f5c518', background: '#ffffff' });
    expect(resolveTheme(t).primary.base).toBe('#f5c518');
  });

  it('falls back to a border and shadow when the background is pure white', () => {
    const resolved = resolveTheme(tokens({ background: '#ffffff' }));
    expect(resolved.surface.elevated).toBe('#ffffff');
    expect(resolved.surface.border).not.toBe('#ffffff');
    expect(hexToOklch(resolved.surface.sunken).l).toBeLessThan(1);
  });

  it('handles a dark background chosen in the light scheme', () => {
    const resolved = resolveTheme(tokens({ background: '#141416' }));
    expect(resolved.text.primary).toBe('#ffffff');
    expect(contrastRatio(resolved.text.primary, resolved.surface.base)).toBeGreaterThanOrEqual(4.5);
    expect(hexToOklch(resolved.surface.elevated).l).toBeGreaterThan(
      hexToOklch(resolved.surface.base).l,
    );
  });
});

describe('resolveTheme — dark scheme', () => {
  it('derives a near-black surface tinted by the primary hue', () => {
    const resolved = resolveTheme(tokens({ primary: '#2a4a7b' }), { scheme: 'dark' });
    const surface = hexToOklch(resolved.surface.base);
    expect(surface.l).toBeLessThan(0.25);
    expect(surface.c).toBeGreaterThan(0);
    expect(Math.abs(surface.h - hexToOklch('#2a4a7b').h)).toBeLessThan(2);
  });

  it('honours an already-dark background instead of substituting its own', () => {
    const resolved = resolveTheme(tokens({ background: '#101014' }), { scheme: 'dark' });
    expect(resolved.surface.base).toBe('#101014');
  });

  it('lifts brand colours until they are legible on the derived surface', () => {
    const resolved = resolveTheme(tokens({ primary: '#1c1c1f' }), { scheme: 'dark' });
    expect(hexToOklch(resolved.primary.base).l).toBeGreaterThan(hexToOklch('#1c1c1f').l);
  });

  it('GUARANTEE: dark mode is always legible, for every colour combination', () => {
    // Dark mode is machine-derived — the owner never chose that surface, so a
    // warning would be unactionable. The resolver must therefore be correct by
    // construction. This test is the guarantee.
    const samples = colorGrid(120);
    for (const primary of samples) {
      for (const background of ['#ffffff', '#fffbf2', '#f3efe7', '#141416']) {
        const resolved = resolveTheme(tokens({ primary, secondary: primary, accent: primary, background }), {
          scheme: 'dark',
        });
        const s = resolved.surface.base;
        const where = `primary=${primary} bg=${background}`;

        expect(contrastRatio(resolved.text.primary, s), `text ${where}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(resolved.text.secondary, s), `text2 ${where}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(resolved.text.tertiary, s), `text3 ${where}`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(resolved.primary.base, s), `primary ${where}`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(resolved.accent.base, s), `accent ${where}`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(resolved.secondary.base, s), `secondary ${where}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('resolveTheme — derived roles', () => {
  it('GUARANTEE: “on” colours are legible on their own base, always', () => {
    for (const primary of colorGrid(60)) {
      const resolved = resolveTheme(tokens({ primary, secondary: primary, accent: primary }));
      for (const role of ['primary', 'secondary', 'accent'] as const) {
        const r = resolved[role];
        expect(contrastRatio(r.on, r.base), `${role}.on for ${primary}`).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(r.onSubtle, r.subtleFill),
          `${role}.onSubtle for ${primary}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('moves hover and pressed away from the surface, deepening the colour', () => {
    const light = resolveTheme(tokens({ primary: '#b4472b', background: '#ffffff' }));
    expect(hexToOklch(light.primary.hover).l).toBeLessThan(hexToOklch(light.primary.base).l);
    expect(hexToOklch(light.primary.pressed).l).toBeLessThan(
      hexToOklch(light.primary.hover).l,
    );

    const dark = resolveTheme(tokens({ primary: '#b4472b' }), { scheme: 'dark' });
    expect(hexToOklch(dark.primary.hover).l).toBeGreaterThan(hexToOklch(dark.primary.base).l);
  });

  it('desaturates and flattens the disabled variant', () => {
    const resolved = resolveTheme(tokens({ primary: '#b4472b' }));
    expect(hexToOklch(resolved.primary.disabled).c).toBeLessThan(
      hexToOklch(resolved.primary.base).c,
    );
    expect(
      contrastRatio(resolved.primary.disabled, resolved.surface.base),
    ).toBeLessThan(contrastRatio(resolved.primary.base, resolved.surface.base));
  });

  it('keeps subtleFill close to the surface, not to the brand colour', () => {
    const resolved = resolveTheme(tokens({ primary: '#b4472b', background: '#ffffff' }));
    const distanceToSurface = Math.abs(
      hexToOklch(resolved.primary.subtleFill).l - hexToOklch(resolved.surface.base).l,
    );
    const distanceToBase = Math.abs(
      hexToOklch(resolved.primary.subtleFill).l - hexToOklch(resolved.primary.base).l,
    );
    expect(distanceToSurface).toBeLessThan(distanceToBase);
  });
});

describe('resolveTheme — button styles', () => {
  it('fills with the primary colour', () => {
    const r = resolveTheme(tokens({ buttonStyle: 'filled' }));
    expect(r.button.background).toBe(r.primary.base);
    expect(r.button.foreground).toBe(r.primary.on);
  });

  it('outlines with a transparent fill', () => {
    const r = resolveTheme(tokens({ buttonStyle: 'outline' }));
    expect(r.button.background).toBe('transparent');
    expect(r.button.foreground).toBe(r.primary.base);
    expect(r.button.border).toBe(r.primary.base);
  });

  it('softens onto the subtle fill with legible ink', () => {
    const r = resolveTheme(tokens({ buttonStyle: 'soft' }));
    expect(r.button.background).toBe(r.primary.subtleFill);
    expect(contrastRatio(r.button.foreground, r.button.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('GUARANTEE: a button label is legible on its own fill, for any primary', () => {
    // Filled and soft buttons draw their own background, so the resolver is
    // solely responsible and must be correct by construction.
    for (const style of ['filled', 'soft'] as const) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const primary of colorGrid(90)) {
          const r = resolveTheme(tokens({ primary, buttonStyle: style }), { scheme });
          expect(
            contrastRatio(r.button.foreground, r.button.background),
            `${style}/${scheme} primary=${primary}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('GUARANTEE: an outline button is legible whenever the theme is publishable', () => {
    // An outline button has no fill of its own — its label is the primary
    // colour sitting directly on the background. In light mode the resolver
    // deliberately does not correct that, because the owner chose both colours
    // and a warning is actionable. So the invariant that matters is the
    // agreement between the two halves of this package: every primary the
    // resolver cannot render legibly must be one the contrast engine refuses to
    // publish. If that ever drifts, a customer ships an app with invisible
    // buttons and nothing warned them.
    let blockedCount = 0;
    let legibleCount = 0;

    for (const primary of colorGrid(45)) {
      const t = tokens({ primary, buttonStyle: 'outline' });
      const light = resolveTheme(t, { scheme: 'light' });
      const ratio = contrastRatio(light.button.foreground, light.surface.base);

      if (ratio >= 3) {
        legibleCount++;
      } else {
        expect(
          validateForPublish(t).blockers.map((b) => b.pairId),
          `primary=${primary} renders at ${ratio.toFixed(2)}:1 but nothing blocked publish`,
        ).toContain('primary-on-background');
        blockedCount++;
      }

      // Dark mode is machine-derived, so it is corrected rather than reported
      // and carries no such escape hatch.
      const dark = resolveTheme(t, { scheme: 'dark' });
      expect(
        contrastRatio(dark.button.foreground, dark.surface.base),
        `outline/dark primary=${primary}`,
      ).toBeGreaterThanOrEqual(3);
    }

    // Guard against the assertion silently becoming vacuous.
    expect(blockedCount).toBeGreaterThan(0);
    expect(legibleCount).toBeGreaterThan(0);
  });
});

describe('resolveTheme — typography', () => {
  it('resolves every pairing without throwing', () => {
    for (const pairing of FONT_PAIRINGS) {
      const r = resolveTheme(tokens({ pairingId: pairing.id }));
      expect(r.typography.display.family).toBe(pairing.display.family);
      expect(r.typography.body.family).toBe(pairing.body.family);
    }
  });

  it('applies the optical scale to display sizes only', () => {
    const modern = resolveTheme(tokens({ pairingId: 'modern' })).typography;
    const grand = resolveTheme(tokens({ pairingId: 'grand' })).typography;
    expect(grand.display.sizes.lg).toBeGreaterThan(modern.display.sizes.lg);
    expect(grand.body.sizes.base).toBe(modern.body.sizes.base);
  });

  it('preserves half-pixel steps rather than rounding to whole pixels', () => {
    const sizes = resolveTheme(tokens({ pairingId: 'modern' })).typography.body.sizes;
    expect(sizes.sm).toBe(11.5);
    expect(sizes.md).toBe(12.5);
  });

  it('loosens tracking for serif display faces', () => {
    const modern = resolveTheme(tokens({ pairingId: 'modern' })).typography;
    const editorial = resolveTheme(tokens({ pairingId: 'editorial' })).typography;
    expect(editorial.display.tracking.lg).toBeGreaterThan(modern.display.tracking.lg);
  });
});

describe('resolveTheme — radii', () => {
  it('resolves every scale', () => {
    for (const scale of RADIUS_SCALES) {
      expect(resolveTheme(tokens({ radiusScale: scale.id })).radius).toEqual(scale.values);
    }
  });

  it('keeps the logo radius below the card radius', () => {
    for (const scale of RADIUS_SCALES) {
      const r = resolveTheme(tokens({ radiusScale: scale.id })).radius;
      expect(r.logo).toBeLessThanOrEqual(r.md);
    }
  });

  it('flattens everything at the sharp end', () => {
    const r = resolveTheme(tokens({ radiusScale: 'sharp' })).radius;
    expect(Object.values(r).every((v) => v === 0)).toBe(true);
  });
});

describe('initialsFrom', () => {
  it('takes the first letters of up to two words', () => {
    expect(initialsFrom('Olive & Ash Kitchen')).toBe('OA');
    expect(initialsFrom('Rowan Barbers')).toBe('RB');
    expect(initialsFrom('Counter')).toBe('C');
  });

  it('survives punctuation, accents and non-Latin scripts', () => {
    expect(initialsFrom('Casa Nube ☕ Coffee')).toBe('CN');
    expect(initialsFrom('Élan Studio')).toBe('ÉS');
    expect(initialsFrom('東京 スタジオ')).toBe('東ス');
  });

  it('never returns an empty string', () => {
    expect(initialsFrom('!!!')).toBe('?');
    expect(initialsFrom('   ')).toBe('?');
  });
});

describe('resolveThemeSchemes', () => {
  it('returns both schemes with the right labels', () => {
    const both = resolveThemeSchemes(tokens());
    expect(both.light.scheme).toBe('light');
    expect(both.dark.scheme).toBe('dark');
    expect(both.light.surface.base).not.toBe(both.dark.surface.base);
  });

  it('keeps non-colour tokens identical across schemes', () => {
    const both = resolveThemeSchemes(tokens());
    expect(both.light.radius).toEqual(both.dark.radius);
    expect(both.light.typography).toEqual(both.dark.typography);
    expect(both.light.brand).toEqual(both.dark.brand);
  });
});
