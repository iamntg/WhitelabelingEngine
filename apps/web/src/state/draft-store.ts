import type { ThemeTokensPatch } from '@wl/api-client';
import type { ThemeTokens } from '@wl/theme';
import { create } from 'zustand';

/**
 * The token draft.
 *
 * Undo/redo operates over whole token objects rather than a command log.
 * The object is tiny — nine fields — so snapshotting it is cheaper than
 * maintaining inverse operations, and it cannot desynchronise.
 */

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'publishing' | 'published';

const HISTORY_LIMIT = 100;

interface DraftStore {
  tenantId: string | null;
  tokens: ThemeTokens | null;
  /** Last value the server confirmed. The revert target when a PATCH fails. */
  serverTokens: ThemeTokens | null;
  past: ThemeTokens[];
  future: ThemeTokens[];
  saveState: SaveState;
  saveError: string | null;
  liveVersion: number | null;
  nextVersion: number;

  hydrate: (input: {
    tenantId: string;
    tokens: ThemeTokens;
    liveVersion: number | null;
    nextVersion: number;
  }) => void;

  /**
   * Applies a token change optimistically. `coalesceKey` merges consecutive
   * edits to the same control into one undo step — dragging a colour picker
   * should be one undo, not two hundred.
   */
  apply: (next: ThemeTokens, coalesceKey?: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  markSaving: () => void;
  markSaved: (tokens: ThemeTokens, liveVersion: number | null, nextVersion: number) => void;
  markSaveFailed: (message: string) => void;
  /** Discards the optimistic value and returns to what the server last confirmed. */
  revert: () => void;
  markPublishing: () => void;
  markPublished: (version: number) => void;
}

let lastCoalesceKey: string | null = null;

export const useDraftStore = create<DraftStore>((set, get) => ({
  tenantId: null,
  tokens: null,
  serverTokens: null,
  past: [],
  future: [],
  saveState: 'clean',
  saveError: null,
  liveVersion: null,
  nextVersion: 1,

  hydrate: ({ tenantId, tokens, liveVersion, nextVersion }) => {
    lastCoalesceKey = null;
    set({
      tenantId,
      tokens,
      serverTokens: tokens,
      past: [],
      future: [],
      saveState: 'clean',
      saveError: null,
      liveVersion,
      nextVersion,
    });
  },

  apply: (next, coalesceKey) => {
    const { tokens, past } = get();
    if (!tokens) return;

    const shouldCoalesce = coalesceKey !== undefined && coalesceKey === lastCoalesceKey;
    lastCoalesceKey = coalesceKey ?? null;

    set({
      tokens: next,
      past: shouldCoalesce ? past : [...past, tokens].slice(-HISTORY_LIMIT),
      // Any new edit invalidates the redo stack, as in every editor.
      future: [],
      saveState: 'dirty',
      saveError: null,
    });
  },

  undo: () => {
    const { past, future, tokens } = get();
    const previous = past[past.length - 1];
    if (!previous || !tokens) return;
    lastCoalesceKey = null;
    set({
      tokens: previous,
      past: past.slice(0, -1),
      future: [tokens, ...future].slice(0, HISTORY_LIMIT),
      saveState: 'dirty',
    });
  },

  redo: () => {
    const { past, future, tokens } = get();
    const next = future[0];
    if (!next || !tokens) return;
    lastCoalesceKey = null;
    set({
      tokens: next,
      past: [...past, tokens].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      saveState: 'dirty',
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  markSaving: () => set({ saveState: 'saving' }),

  markSaved: (tokens, liveVersion, nextVersion) =>
    set((state) => ({
      serverTokens: tokens,
      liveVersion,
      nextVersion,
      // A newer edit may have landed while the request was in flight; do not
      // claim "saved" over the top of work the user has already done.
      saveState: state.saveState === 'saving' ? 'saved' : state.saveState,
      saveError: null,
    })),

  markSaveFailed: (message) => set({ saveState: 'error', saveError: message }),

  revert: () =>
    set((state) => ({
      tokens: state.serverTokens,
      saveState: 'clean',
      saveError: null,
    })),

  markPublishing: () => set({ saveState: 'publishing' }),

  markPublished: (version) =>
    set({ saveState: 'published', liveVersion: version, nextVersion: version + 1 }),
}));

/**
 * Computes the smallest patch that turns `from` into `to`.
 *
 * Sending only what changed keeps autosave cheap and means two people editing
 * different sections do not clobber each other's fields.
 */
export function patchBetween(from: ThemeTokens, to: ThemeTokens): ThemeTokensPatch {
  const patch: ThemeTokensPatch = {};

  const brand: Record<string, unknown> = {};
  if (from.brand.businessName !== to.brand.businessName) brand['businessName'] = to.brand.businessName;
  if (from.brand.logoUrl !== to.brand.logoUrl) brand['logoUrl'] = to.brand.logoUrl;
  if (from.brand.logoAspect !== to.brand.logoAspect) brand['logoAspect'] = to.brand.logoAspect;
  if (Object.keys(brand).length > 0) patch.brand = brand as ThemeTokensPatch['brand'];

  const colors: Record<string, unknown> = {};
  for (const key of ['primary', 'secondary', 'accent', 'background'] as const) {
    if (from.colors[key] !== to.colors[key]) colors[key] = to.colors[key];
  }
  if (Object.keys(colors).length > 0) patch.colors = colors as ThemeTokensPatch['colors'];

  if (from.typography.pairingId !== to.typography.pairingId) {
    patch.typography = { pairingId: to.typography.pairingId };
  }
  if (from.shape.radiusScale !== to.shape.radiusScale) {
    patch.shape = { radiusScale: to.shape.radiusScale };
  }
  if (from.buttons.style !== to.buttons.style) {
    patch.buttons = { style: to.buttons.style };
  }

  return patch;
}

export function isEmptyPatch(patch: ThemeTokensPatch): boolean {
  return Object.keys(patch).length === 0;
}
