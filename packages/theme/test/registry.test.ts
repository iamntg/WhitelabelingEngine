import { describe, expect, it } from 'vitest';
import { checkContrast, validateForPublish } from '../src/check.js';
import { FONT_PAIRINGS, PAIRING_IDS, getPairing } from '../src/fonts.js';
import { RADIUS_SCALES, RADIUS_SCALE_IDS, getRadiusScale } from '../src/radii.js';
import { COLOR_SWATCHES, PRESETS, defaultTokens, getPreset } from '../src/presets.js';
import { resolveTheme } from '../src/resolve.js';
import { ThemeTokens } from '../src/schema.js';

describe('FONT_PAIRINGS', () => {
  it('has exactly five entries — the set is fixed', () => {
    expect(FONT_PAIRINGS).toHaveLength(5);
  });

  it('has unique ids that match the exported id list', () => {
    const ids = FONT_PAIRINGS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...PAIRING_IDS].sort());
  });

  it('declares a bundleable RN export for every family and weight it uses', () => {
    for (const pairing of FONT_PAIRINGS) {
      const required = new Set<string>([
        `${pairing.display.family}-${pairing.display.weight}`,
        `${pairing.body.family}-${pairing.body.regular}`,
        `${pairing.body.family}-${pairing.body.medium}`,
        `${pairing.body.family}-${pairing.body.semibold}`,
        `${pairing.body.family}-${pairing.body.bold}`,
      ]);
      for (const key of required) {
        expect(pairing.rnExports[key], `${pairing.id} is missing ${key}`).toBeDefined();
      }
    }
  });

  it('uses only static weights that Google Fonts ships', () => {
    const allowed = new Set([400, 500, 600, 700]);
    for (const pairing of FONT_PAIRINGS) {
      expect(allowed.has(pairing.display.weight)).toBe(true);
      for (const w of [pairing.body.regular, pairing.body.medium, pairing.body.semibold, pairing.body.bold]) {
        expect(allowed.has(w)).toBe(true);
      }
    }
  });

  it('orders body weights monotonically', () => {
    for (const p of FONT_PAIRINGS) {
      expect(p.body.regular).toBeLessThanOrEqual(p.body.medium);
      expect(p.body.medium).toBeLessThanOrEqual(p.body.semibold);
      expect(p.body.semibold).toBeLessThanOrEqual(p.body.bold);
    }
  });

  it('throws on an unknown id rather than silently falling back', () => {
    // A silent fallback here means a tenant's published theme quietly changes
    // typeface after a bad migration.
    expect(() => getPairing('nope' as never)).toThrow(/Unknown font pairing/);
  });
});

describe('RADIUS_SCALES', () => {
  it('has exactly four entries matching the exported id list', () => {
    expect(RADIUS_SCALES).toHaveLength(4);
    expect(RADIUS_SCALES.map((r) => r.id)).toEqual([...RADIUS_SCALE_IDS]);
  });

  it('increases monotonically from sharp to pill', () => {
    const md = RADIUS_SCALES.map((r) => r.values.md);
    expect(md).toEqual([...md].sort((a, b) => a - b));
  });

  it('orders sm ≤ md ≤ lg within each scale', () => {
    for (const scale of RADIUS_SCALES) {
      expect(scale.values.sm).toBeLessThanOrEqual(scale.values.md);
      expect(scale.values.md).toBeLessThanOrEqual(scale.values.lg);
    }
  });

  it('throws on an unknown id', () => {
    expect(() => getRadiusScale('squishy' as never)).toThrow(/Unknown radius scale/);
  });
});

describe('COLOR_SWATCHES', () => {
  it('offers five quick picks per channel', () => {
    for (const [channel, list] of Object.entries(COLOR_SWATCHES)) {
      expect(list, channel).toHaveLength(5);
    }
  });

  it('contains only normalised lowercase hex', () => {
    for (const list of Object.values(COLOR_SWATCHES)) {
      for (const hex of list) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe('PRESETS', () => {
  it('provides between four and six starting themes', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(PRESETS.length).toBeLessThanOrEqual(6);
  });

  it('has unique ids', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all three verticals', () => {
    const verticals = new Set(PRESETS.map((p) => p.suggestedFor));
    expect(verticals).toEqual(new Set(['restaurant', 'salon', 'studio']));
  });

  it('validates against the schema', () => {
    for (const preset of PRESETS) {
      expect(() => ThemeTokens.parse(preset.tokens), preset.id).not.toThrow();
    }
  });

  it('GUARANTEE: every preset is publishable with no failures and no warnings', () => {
    // A preset an owner cannot publish is worse than no preset at all.
    for (const preset of PRESETS) {
      const results = checkContrast(preset.tokens);
      const problems = results.filter((r) => r.level !== 'pass' && r.blocking);
      expect(
        problems.map((p) => `${p.pairId} ${p.ratio}:1`),
        `preset "${preset.id}" has contrast problems`,
      ).toEqual([]);
      expect(validateForPublish(preset.tokens).ok, preset.id).toBe(true);
    }
  });

  it('renders every preset in dark mode without a single illegible pair', () => {
    for (const preset of PRESETS) {
      const problems = checkContrast(preset.tokens, { scheme: 'dark' }).filter(
        (r) => r.level === 'fail' && r.blocking,
      );
      expect(problems.map((p) => p.pairId), `preset "${preset.id}" in dark mode`).toEqual([]);
    }
  });

  it('resolves every preset in both schemes without throwing', () => {
    for (const preset of PRESETS) {
      for (const scheme of ['light', 'dark'] as const) {
        expect(() => resolveTheme(preset.tokens, { scheme }), `${preset.id}/${scheme}`).not.toThrow();
      }
    }
  });

  it('uses a distinct pairing across the set so the picker feels varied', () => {
    const pairings = new Set(PRESETS.map((p) => p.tokens.typography.pairingId));
    expect(pairings.size).toBeGreaterThanOrEqual(4);
  });

  it('throws on an unknown preset id', () => {
    expect(() => getPreset('nope')).toThrow(/Unknown preset/);
  });
});

describe('defaultTokens', () => {
  it('gives a new tenant a publishable theme, never a blank editor', () => {
    for (const vertical of ['restaurant', 'salon', 'studio'] as const) {
      const t = defaultTokens('Rowan Barbers', vertical);
      expect(t.brand.businessName).toBe('Rowan Barbers');
      expect(validateForPublish(t).ok, vertical).toBe(true);
    }
  });

  it('picks a preset suggested for the tenant’s vertical', () => {
    const t = defaultTokens('Fern & Fold', 'studio');
    const matching = PRESETS.filter((p) => p.suggestedFor === 'studio');
    expect(matching.some((p) => p.tokens.colors.primary === t.colors.primary)).toBe(true);
  });
});
