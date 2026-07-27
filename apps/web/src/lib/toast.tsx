import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Toasts exist for one job the spec calls out: telling the owner that an
 * optimistic change did not stick, after we have already reverted it. Anything
 * that succeeds silently should stay silent.
 */

export interface Toast {
  id: number;
  message: string;
  tone: 'neutral' | 'error';
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId++;
      setToasts((current) => [...current, { ...toast, id }]);
      // Errors with an action stay until dismissed; there is no point offering
      // "Retry" on a toast that disappears before it can be read.
      if (!toast.action) window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-9 border px-3 py-2.5 shadow-popover ${
            toast.tone === 'error'
              ? 'border-fail-border bg-fail-bg'
              : 'border-raised bg-surface'
          }`}
        >
          <span
            className={`text-12-5 ${toast.tone === 'error' ? 'text-fail-title' : 'text-ink-body'}`}
          >
            {toast.message}
          </span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="focus-ring h-6 rounded-6 border border-fail-btn-border bg-surface px-2 text-11-5 font-medium text-fail-title transition-colors hover:bg-fail-btn-hover"
            >
              {toast.action.label}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="focus-ring rounded-6 px-1 text-12 text-ink-faint transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
