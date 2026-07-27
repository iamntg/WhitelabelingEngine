import { describe, expect, it } from 'vitest';
import { describeChangeCount, diffTokens } from '../src/diff.js';
import { tokens } from './helpers.js';

describe('diffTokens', () => {
  it('reports nothing for an identical pair', () => {
    const t = tokens();
    expect(diffTokens(t, t)).toEqual({ count: 0, changes: [] });
  });

  it('describes a colour change with both swatches and a summary', () => {
    const { changes } = diffTokens(tokens(), tokens({ primary: '#123456' }));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      field: 'colors.primary',
      label: 'Primary colour',
      kind: 'color',
      from: '#b4472b',
      to: '#123456',
      toText: '#123456'.toUpperCase(),
      summary: 'Primary colour changed',
    });
  });

  it('resolves choice ids to human labels', () => {
    const { changes } = diffTokens(
      tokens({ pairingId: 'modern' }),
      tokens({ pairingId: 'editorial' }),
    );
    expect(changes[0]?.summary).toBe('Font pairing: Modern → Editorial');
  });

  it('describes a corner change using the label, not the id', () => {
    const { changes } = diffTokens(
      tokens({ radiusScale: 'sharp' }),
      tokens({ radiusScale: 'rounded' }),
    );
    expect(changes[0]?.summary).toBe('Corners: Sharp → Rounded');
  });

  it('describes a button style change', () => {
    const { changes } = diffTokens(
      tokens({ buttonStyle: 'filled' }),
      tokens({ buttonStyle: 'soft' }),
    );
    expect(changes[0]?.summary).toBe('Button style: Filled → Soft');
  });

  it('distinguishes adding, replacing and removing a logo', () => {
    const none = tokens({ logoUrl: null });
    const one = tokens({ logoUrl: 'https://cdn.example.com/a.png' });
    const two = tokens({ logoUrl: 'https://cdn.example.com/b.png' });

    expect(diffTokens(none, one).changes[0]?.summary).toBe('Logo added');
    expect(diffTokens(one, two).changes[0]?.summary).toBe('Logo replaced');
    expect(diffTokens(one, none).changes[0]?.summary).toBe('Logo removed');
  });

  it('reports a business name change with both values', () => {
    const { changes } = diffTokens(
      tokens({ businessName: 'Olive & Ash Kitchen' }),
      tokens({ businessName: 'Olive & Ash' }),
    );
    expect(changes[0]?.summary).toBe('Business name: Olive & Ash Kitchen → Olive & Ash');
  });

  it('counts several changes at once and keeps a stable field order', () => {
    const summary = diffTokens(
      tokens(),
      tokens({
        primary: '#123456',
        accent: '#654321',
        pairingId: 'bold',
        radiusScale: 'sharp',
        buttonStyle: 'outline',
      }),
    );
    expect(summary.count).toBe(5);
    expect(summary.changes.map((c) => c.field)).toEqual([
      'colors.primary',
      'colors.accent',
      'typography.pairingId',
      'shape.radiusScale',
      'buttons.style',
    ]);
  });

  it('is JSON-serialisable — it is persisted on theme_version', () => {
    const summary = diffTokens(tokens(), tokens({ primary: '#123456' }));
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary);
  });
});

describe('describeChangeCount', () => {
  it('pluralises the way the header pill does', () => {
    expect(describeChangeCount(0)).toBe('No changes');
    expect(describeChangeCount(1)).toBe('1 change');
    expect(describeChangeCount(6)).toBe('6 changes');
  });
});
