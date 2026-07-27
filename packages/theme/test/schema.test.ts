import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, ThemeTokens, ThemeTokensPatch, applyPatch } from '../src/schema.js';
import { tokens } from './helpers.js';

describe('ThemeTokens', () => {
  it('accepts a well-formed token object', () => {
    expect(() => ThemeTokens.parse(tokens())).not.toThrow();
  });

  it('normalises hex to lowercase', () => {
    const parsed = ThemeTokens.parse(tokens({ primary: '#B4472B' }));
    expect(parsed.colors.primary).toBe('#b4472b');
  });

  it('rejects shorthand hex — the wire format is unambiguous', () => {
    expect(() => ThemeTokens.parse(tokens({ primary: '#abc' as string }))).toThrow();
  });

  it('rejects colours with an alpha channel', () => {
    expect(() => ThemeTokens.parse(tokens({ primary: '#b4472bff' as string }))).toThrow();
  });

  it('rejects an unknown font pairing', () => {
    expect(() => ThemeTokens.parse(tokens({ pairingId: 'comic' as never }))).toThrow();
  });

  it('rejects "soft" as a radius scale — the id is "subtle"', () => {
    expect(() => ThemeTokens.parse(tokens({ radiusScale: 'soft' as never }))).toThrow();
  });

  it('rejects unknown keys rather than dropping them silently', () => {
    // A silently dropped key is how the web preview and the phone start to
    // disagree about what a theme looks like.
    const withExtra = { ...tokens(), rogueKey: true };
    expect(() => ThemeTokens.parse(withExtra)).toThrow();

    const withExtraNested = tokens() as unknown as Record<string, Record<string, unknown>>;
    withExtraNested['colors'] = { ...withExtraNested['colors'], tertiary: '#ffffff' };
    expect(() => ThemeTokens.parse(withExtraNested)).toThrow();
  });

  it('requires the current schema version', () => {
    expect(() => ThemeTokens.parse({ ...tokens(), schemaVersion: 99 })).toThrow();
    expect(ThemeTokens.parse(tokens()).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('requires a non-empty business name and trims it', () => {
    expect(() => ThemeTokens.parse(tokens({ businessName: '   ' }))).toThrow();
    expect(ThemeTokens.parse(tokens({ businessName: '  Rowan  ' })).brand.businessName).toBe(
      'Rowan',
    );
  });

  it('allows a null logo but rejects a non-URL string', () => {
    expect(() => ThemeTokens.parse(tokens({ logoUrl: null }))).not.toThrow();
    expect(() => ThemeTokens.parse(tokens({ logoUrl: 'not-a-url' }))).toThrow();
  });

  it('rejects a non-positive logo aspect', () => {
    expect(() => ThemeTokens.parse(tokens({ logoAspect: 0 }))).toThrow();
    expect(() => ThemeTokens.parse(tokens({ logoAspect: -1 }))).toThrow();
  });
});

describe('ThemeTokensPatch', () => {
  it('accepts a single-field update', () => {
    expect(() => ThemeTokensPatch.parse({ colors: { primary: '#123456' } })).not.toThrow();
  });

  it('accepts an empty patch', () => {
    expect(() => ThemeTokensPatch.parse({})).not.toThrow();
  });

  it('rejects an unknown group', () => {
    expect(() => ThemeTokensPatch.parse({ spacing: { md: 8 } })).toThrow();
  });

  it('rejects an unknown key inside a known group', () => {
    expect(() => ThemeTokensPatch.parse({ colors: { tertiary: '#123456' } })).toThrow();
  });

  it('rejects an invalid value inside a valid group', () => {
    expect(() => ThemeTokensPatch.parse({ shape: { radiusScale: 'squishy' } })).toThrow();
  });
});

describe('applyPatch', () => {
  it('merges a partial update and leaves everything else untouched', () => {
    const base = tokens();
    const next = applyPatch(base, { colors: { primary: '#123456' } });
    expect(next.colors.primary).toBe('#123456');
    expect(next.colors.secondary).toBe(base.colors.secondary);
    expect(next.typography).toEqual(base.typography);
  });

  it('re-validates the merged result', () => {
    expect(() =>
      applyPatch(tokens(), { colors: { primary: 'rebeccapurple' as string } }),
    ).toThrow();
  });

  it('preserves the schema version', () => {
    expect(applyPatch(tokens(), {}).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('does not mutate the input', () => {
    const base = tokens();
    const snapshot = JSON.parse(JSON.stringify(base)) as typeof base;
    applyPatch(base, { colors: { primary: '#123456' } });
    expect(base).toEqual(snapshot);
  });
});
