import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/color/contrast.js';
import {
  checkContrast,
  levelForRatio,
  NON_TEXT_THRESHOLDS,
  TEXT_THRESHOLDS,
  validateForPublish,
  type ContrastPairId,
} from '../src/check.js';
import { applyPatch } from '../src/schema.js';
import { colorGrid, tokens } from './helpers.js';

const ALL_PAIRS: ContrastPairId[] = [
  'primary-on-background',
  'text-on-surface',
  'on-primary-on-primary',
  'accent-on-background',
  'secondary-on-background',
  'secondary-on-primary',
  'accent-ink-on-accent-soft',
];

function byId(results: ReturnType<typeof checkContrast>, id: ContrastPairId) {
  const found = results.find((r) => r.pairId === id);
  if (!found) throw new Error(`Missing result for ${id}`);
  return found;
}

describe('checkContrast — coverage', () => {
  it('reports every pair that can appear in the app, every time', () => {
    const results = checkContrast(tokens());
    expect(results.map((r) => r.pairId).sort()).toEqual([...ALL_PAIRS].sort());
  });

  it('reports results for the light scheme by default', () => {
    expect(checkContrast(tokens()).every((r) => r.scheme === 'light')).toBe(true);
  });

  it('measures the ratio it reports', () => {
    for (const result of checkContrast(tokens({ primary: '#f5c518' }))) {
      expect(result.ratio).toBeCloseTo(
        contrastRatio(result.foreground, result.background),
        1,
      );
    }
  });
});

describe('checkContrast — levels', () => {
  it('applies the text bar to text pairs and the non-text bar to fills', () => {
    const results = checkContrast(tokens());
    expect(byId(results, 'text-on-surface').thresholds).toEqual(TEXT_THRESHOLDS);
    expect(byId(results, 'on-primary-on-primary').thresholds).toEqual(TEXT_THRESHOLDS);
    expect(byId(results, 'primary-on-background').thresholds).toEqual(NON_TEXT_THRESHOLDS);
    expect(byId(results, 'accent-on-background').thresholds).toEqual(NON_TEXT_THRESHOLDS);
  });

  it('fails below 3.0, warns between 3.0 and 4.5, passes at 4.5', () => {
    expect(levelForRatio(2.99)).toBe('fail');
    expect(levelForRatio(3)).toBe('warn');
    expect(levelForRatio(4.49)).toBe('warn');
    expect(levelForRatio(4.5)).toBe('pass');
  });

  it('has no warn band for graphical pairs — 3:1 is the whole requirement', () => {
    expect(levelForRatio(2.99, NON_TEXT_THRESHOLDS)).toBe('fail');
    expect(levelForRatio(3, NON_TEXT_THRESHOLDS)).toBe('pass');
  });

  it('flags a pale accent on a white background as a failure', () => {
    // This is the design export's own default, and it is genuinely unpublishable:
    // a #f5c518 chip on white has no discernible edge.
    const result = byId(
      checkContrast(tokens({ accent: '#f5c518', background: '#ffffff' })),
      'accent-on-background',
    );
    expect(result.level).toBe('fail');
    expect(result.ratio).toBeLessThan(3);
  });

  it('passes a well-separated palette cleanly', () => {
    const results = checkContrast(
      tokens({
        primary: '#b4472b',
        secondary: '#2f4a3f',
        accent: '#a8710c',
        background: '#fffbf2',
      }),
    );
    expect(results.filter((r) => r.level === 'fail' && r.blocking)).toEqual([]);
  });
});

describe('checkContrast — suggestions', () => {
  it('omits a suggestion when the pair already passes', () => {
    const passing = checkContrast(tokens()).filter((r) => r.level === 'pass');
    expect(passing.length).toBeGreaterThan(0);
    expect(passing.every((r) => r.suggestion === undefined)).toBe(true);
  });

  it('offers a suggestion for a failing pair', () => {
    const result = byId(
      checkContrast(tokens({ accent: '#f5c518', background: '#ffffff' })),
      'accent-on-background',
    );
    expect(result.suggestion).toMatch(/^#[0-9a-f]{6}$/);
    expect(result.fixTarget).toBe('accent');
  });

  it('GUARANTEE: applying a suggestion actually resolves that pair', () => {
    // A one-click fix that does not fix anything is worse than no fix at all.
    const backgrounds = ['#ffffff', '#fffbf2', '#f3efe7', '#141416'];
    let exercised = 0;

    for (const background of backgrounds) {
      for (const color of colorGrid(90)) {
        const base = tokens({
          primary: color,
          secondary: color,
          accent: color,
          background,
        });

        for (const result of checkContrast(base)) {
          if (result.level === 'pass' || result.suggestion === undefined) continue;

          const patched = applyPatch(base, {
            colors: { [result.fixTarget]: result.suggestion },
          });
          const after = checkContrast(patched).find((r) => r.pairId === result.pairId);

          expect(
            after?.level,
            `${result.pairId}: ${result.foreground} on ${result.background} ` +
              `(${result.ratio}:1) → suggested ${result.suggestion} for ${result.fixTarget}, ` +
              `got ${after?.ratio}:1`,
          ).toBe('pass');
          exercised++;
        }
      }
    }

    expect(exercised).toBeGreaterThan(50);
  });
});

describe('validateForPublish', () => {
  it('allows a clean theme through', () => {
    const validation = validateForPublish(tokens());
    expect(validation.ok).toBe(true);
    expect(validation.blockers).toEqual([]);
  });

  it('blocks on a hard failure regardless of acknowledgement', () => {
    const validation = validateForPublish(
      tokens({ accent: '#f5c518', background: '#ffffff' }),
      ALL_PAIRS,
    );
    expect(validation.ok).toBe(false);
    expect(validation.blockers.map((b) => b.pairId)).toContain('accent-on-background');
  });

  it('refuses an unacknowledged warning but allows an acknowledged one', () => {
    // A secondary that is readable but low-contrast: warn, not fail.
    const t = tokens({ secondary: '#7d7d85', background: '#ffffff' });
    const before = validateForPublish(t);
    expect(before.warnings.map((w) => w.pairId)).toContain('secondary-on-background');
    expect(before.ok).toBe(false);

    const after = validateForPublish(t, ['secondary-on-background']);
    expect(after.unacknowledged).toEqual([]);
    expect(after.ok).toBe(true);
  });

  it('never blocks on an advisory pair', () => {
    // Secondary and primary nearly identical: the advisory pair fails, but the
    // combination never renders, so publish must still be possible.
    const t = tokens({ primary: '#b4472b', secondary: '#b4472b' });
    const validation = validateForPublish(t);
    const advisory = validation.results.find((r) => r.pairId === 'secondary-on-primary');
    expect(advisory?.level).toBe('fail');
    expect(validation.blockers.map((b) => b.pairId)).not.toContain('secondary-on-primary');
  });

  it('is deterministic — the server reaches the same verdict as the client', () => {
    const t = tokens({ accent: '#f5c518', background: '#ffffff' });
    expect(validateForPublish(t)).toEqual(validateForPublish(t));
  });
});
