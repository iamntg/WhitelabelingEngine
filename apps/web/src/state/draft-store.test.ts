import { getPreset, type ThemeTokens } from '@wl/theme';
import { beforeEach, describe, expect, it } from 'vitest';
import { isEmptyPatch, patchBetween, useDraftStore } from './draft-store.js';

function tokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return { ...base, colors: { ...base.colors, ...overrides } };
}

function hydrate(): ThemeTokens {
  const initial = tokens();
  useDraftStore.getState().hydrate({
    tenantId: 't1',
    tokens: initial,
    liveTokens: initial,
    liveVersion: 1,
    nextVersion: 2,
    changeSummary: { count: 0, changes: [] },
  });
  return initial;
}

beforeEach(() => {
  hydrate();
});

describe('patchBetween', () => {
  it('sends nothing when nothing changed', () => {
    expect(isEmptyPatch(patchBetween(tokens(), tokens()))).toBe(true);
  });

  it('sends only the field that changed', () => {
    // Sending the whole object would let one person's autosave overwrite a
    // field someone else just edited in a different section.
    const patch = patchBetween(tokens(), tokens({ primary: '#123456' }));
    expect(patch).toEqual({ colors: { primary: '#123456' } });
  });

  it('groups multiple colour changes into one colours patch', () => {
    const patch = patchBetween(tokens(), tokens({ primary: '#123456', accent: '#654321' }));
    expect(patch.colors).toEqual({ primary: '#123456', accent: '#654321' });
    expect(patch.typography).toBeUndefined();
  });

  it('picks up non-colour groups', () => {
    const from = tokens();
    const to: ThemeTokens = {
      ...from,
      typography: { pairingId: 'bold' },
      shape: { radiusScale: 'sharp' },
      buttons: { style: 'outline' },
      brand: { ...from.brand, businessName: 'New Name' },
    };
    const patch = patchBetween(from, to);
    expect(patch.typography).toEqual({ pairingId: 'bold' });
    expect(patch.shape).toEqual({ radiusScale: 'sharp' });
    expect(patch.buttons).toEqual({ style: 'outline' });
    expect(patch.brand).toEqual({ businessName: 'New Name' });
  });
});

describe('undo / redo', () => {
  it('starts with nothing to undo', () => {
    expect(useDraftStore.getState().canUndo()).toBe(false);
    expect(useDraftStore.getState().canRedo()).toBe(false);
  });

  it('steps back and forward through edits', () => {
    const initial = hydrate();
    const store = useDraftStore.getState();

    store.apply(tokens({ primary: '#111111' }));
    store.apply(tokens({ primary: '#222222' }));

    useDraftStore.getState().undo();
    expect(useDraftStore.getState().tokens?.colors.primary).toBe('#111111');

    useDraftStore.getState().undo();
    expect(useDraftStore.getState().tokens?.colors.primary).toBe(initial.colors.primary);
    expect(useDraftStore.getState().canUndo()).toBe(false);

    useDraftStore.getState().redo();
    expect(useDraftStore.getState().tokens?.colors.primary).toBe('#111111');
  });

  it('coalesces consecutive edits to the same control into one step', () => {
    // Dragging a colour picker fires continuously. Without coalescing, undo
    // would step back through two hundred intermediate shades.
    const initial = hydrate();
    const store = useDraftStore.getState();

    for (const hex of ['#111111', '#222222', '#333333', '#444444']) {
      useDraftStore.getState().apply(tokens({ primary: hex }), 'color:primary');
    }
    void store;

    expect(useDraftStore.getState().tokens?.colors.primary).toBe('#444444');
    useDraftStore.getState().undo();
    expect(useDraftStore.getState().tokens?.colors.primary).toBe(initial.colors.primary);
  });

  it('does not coalesce across different controls', () => {
    useDraftStore.getState().apply(tokens({ primary: '#111111' }), 'color:primary');
    useDraftStore.getState().apply(tokens({ primary: '#111111', accent: '#222222' }), 'color:accent');

    useDraftStore.getState().undo();
    expect(useDraftStore.getState().tokens?.colors.accent).not.toBe('#222222');
    expect(useDraftStore.getState().tokens?.colors.primary).toBe('#111111');
  });

  it('drops the redo stack once a new edit is made', () => {
    useDraftStore.getState().apply(tokens({ primary: '#111111' }));
    useDraftStore.getState().undo();
    expect(useDraftStore.getState().canRedo()).toBe(true);

    useDraftStore.getState().apply(tokens({ primary: '#999999' }));
    expect(useDraftStore.getState().canRedo()).toBe(false);
  });
});

describe('save lifecycle', () => {
  it('marks the draft dirty on edit', () => {
    useDraftStore.getState().apply(tokens({ primary: '#111111' }));
    expect(useDraftStore.getState().saveState).toBe('dirty');
  });

  it('reverts to the last server-confirmed value when a save fails', () => {
    const initial = hydrate();
    useDraftStore.getState().apply(tokens({ primary: '#111111' }));
    useDraftStore.getState().markSaving();
    useDraftStore.getState().markSaveFailed('Network down');

    expect(useDraftStore.getState().saveState).toBe('error');

    useDraftStore.getState().revert();
    expect(useDraftStore.getState().tokens?.colors.primary).toBe(initial.colors.primary);
  });

  it('does not claim "saved" over an edit made while the request was in flight', () => {
    // Otherwise the pill reads "Draft saved" while the newest change is still
    // unsent, and the owner closes the tab believing their work is safe.
    const saved = tokens({ primary: '#111111' });
    useDraftStore.getState().apply(saved);
    useDraftStore.getState().markSaving();

    useDraftStore.getState().apply(tokens({ primary: '#222222' }));
    useDraftStore.getState().markSaved({
      tokens: saved,
      liveTokens: saved,
      liveVersion: 1,
      nextVersion: 2,
      changeSummary: { count: 0, changes: [] },
    });

    expect(useDraftStore.getState().saveState).toBe('dirty');
    expect(useDraftStore.getState().tokens?.colors.primary).toBe('#222222');
  });

  it('clears history on hydrate so undo cannot cross brands', () => {
    useDraftStore.getState().apply(tokens({ primary: '#111111' }));
    hydrate();
    expect(useDraftStore.getState().canUndo()).toBe(false);
    expect(useDraftStore.getState().saveState).toBe('clean');
  });
});
