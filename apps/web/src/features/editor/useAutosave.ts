import { ApiError, NetworkError } from '@wl/api-client';
import type { ThemeTokens } from '@wl/theme';
import { useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { isEmptyPatch, patchBetween, useDraftStore } from '../../state/draft-store.js';

const DEBOUNCE_MS = 600;

/**
 * Debounced autosave.
 *
 * Token changes are optimistic: the store — and therefore the preview — updates
 * immediately, and the PATCH follows. If it fails the draft reverts to the last
 * server-confirmed value and a toast explains why, rather than leaving the
 * owner editing a theme the server never accepted.
 *
 * Only the delta is sent, so two people editing different sections do not
 * overwrite each other's fields.
 */
export function useAutosave(): { flush: () => void } {
  const { push } = useToast();
  const timer = useRef<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const save = useRef<(immediate: boolean) => void>(() => undefined);

  useEffect(() => {
    save.current = (immediate: boolean) => {
      const { tenantId, tokens, serverTokens } = useDraftStore.getState();
      if (!tenantId || !tokens || !serverTokens) return;

      const patch = patchBetween(serverTokens, tokens);
      if (isEmptyPatch(patch)) return;

      const run = async () => {
        // A superseded request is cancelled rather than allowed to land out of
        // order and resurrect an older draft.
        inFlight.current?.abort();
        const controller = new AbortController();
        inFlight.current = controller;

        const attempted = tokens;
        useDraftStore.getState().markSaving();

        try {
          const result = await api.theme.patchDraft(tenantId, patch, controller.signal);
          useDraftStore
            .getState()
            .markSaved(result.tokens as ThemeTokens, result.liveVersion, result.nextVersion);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;

          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof NetworkError
                ? 'Could not reach the server.'
                : 'Something went wrong saving your change.';

          useDraftStore.getState().markSaveFailed(message);
          useDraftStore.getState().revert();

          push({
            tone: 'error',
            message: `${message} Your last change was undone.`,
            action: {
              label: 'Try again',
              onClick: () => {
                useDraftStore.getState().apply(attempted);
                save.current(true);
              },
            },
          });
        }
      };

      if (immediate) {
        void run();
        return;
      }

      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void run(), DEBOUNCE_MS);
    };
  }, [push]);

  useEffect(() => {
    const unsubscribe = useDraftStore.subscribe((state, previous) => {
      if (state.tokens !== previous.tokens && state.saveState === 'dirty') {
        save.current(false);
      }
    });

    return () => {
      unsubscribe();
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // A pending save must not be lost to a tab close or a navigation.
  useEffect(() => {
    const onHide = () => {
      if (useDraftStore.getState().saveState === 'dirty') save.current(true);
    };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  return { flush: () => save.current(true) };
}

/** Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z over the token object. */
export function useUndoRedoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;

      // Let the browser handle undo inside a text field; the owner means the
      // characters they just typed, not the whole theme.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      event.preventDefault();
      const store = useDraftStore.getState();
      if (event.shiftKey) store.redo();
      else store.undo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
