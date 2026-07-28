import {
  resolveTheme,
  type ChangeSummary,
  type ContrastResult,
  type ThemeChange,
  type ThemeTokens,
} from '@wl/theme';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Caption } from '../../components/chrome.js';
import { MiniPhone } from '../preview/MiniPhone.jsx';

/**
 * The publish confirmation.
 *
 * Both the "live now" and "new theme" panes render through `resolveTheme` with
 * different token inputs, so the comparison is genuinely like for like rather
 * than a screenshot next to a render.
 *
 * The change list is *not* diffed here. The server computes it and stores it on
 * the version, so this modal, the version history, and a version opened a year
 * from now all describe the same publish in the same words.
 *
 * This is also where contrast is settled. Failures and warnings both appear as
 * things to tick rather than things to fix — the owner can ship an illegible
 * accent if they mean to, but only after reading what it costs, with the live
 * theme sitting next to it for comparison. The two tones differ in how hard
 * they argue, not in whether they can be overridden.
 */

export function PublishModal({
  open,
  businessName,
  draftTokens,
  liveTokens,
  liveVersion,
  nextVersion,
  changeSummary,
  failures,
  warnings,
  publishing,
  error,
  onPublish,
  onClose,
}: {
  open: boolean;
  businessName: string;
  draftTokens: ThemeTokens;
  liveTokens: ThemeTokens | null;
  liveVersion: number | null;
  nextVersion: number;
  changeSummary: ChangeSummary;
  failures: ContrastResult[];
  warnings: ContrastResult[];
  publishing: boolean;
  error: string | null;
  onPublish: (acknowledgedIssues: string[]) => void;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // Acknowledgement is per-publish. Carrying a tick across a reopen would let
  // an owner confirm a warning they never actually read this time.
  useEffect(() => {
    if (open) setAcknowledged(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !publishing) onClose();
      if (event.key !== 'Tab') return;

      // Focus must not escape a modal — a keyboard user tabbing into the
      // editor behind it has no way back and no idea where they are.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, publishing, onClose]);

  if (!open) return null;

  const issues = [...failures, ...warnings];
  const unacknowledged = issues.filter((issue) => !acknowledged.has(issue.pairId));
  const canPublish = unacknowledged.length === 0 && !publishing;

  const toggle = (pairId: string) =>
    setAcknowledged((current) => {
      const next = new Set(current);
      if (next.has(pairId)) next.delete(pairId);
      else next.add(pairId);
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,24,26,0.28)] p-8 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !publishing) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="flex max-h-full w-[760px] flex-col overflow-hidden rounded-14 border border-raised bg-surface shadow-modal outline-none"
      >
        <div className="flex flex-none items-start justify-between gap-5 px-[22px] pt-5 pb-4">
          <div>
            <h2 id={headingId} className="text-15 font-semibold tracking-[-0.015em]">
              Publish theme to {businessName}
            </h2>
            <p className="mt-1 text-12-5 leading-[1.45] text-ink-helper">
              Everyone using the app will see the new look within about a minute.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            aria-label="Close"
            className="focus-ring h-7 w-7 flex-none rounded-7 border border-transparent text-14 text-ink-helper transition-colors hover:bg-canvas hover:text-ink disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 content-start gap-3.5 px-[22px] pb-5">
            <ComparePane
              label="Live now"
              note={liveVersion !== null ? `Published · v${liveVersion}` : 'Never published'}
              tokens={liveTokens}
              dimmed
            />
            <ComparePane label="New theme" note={`Draft · v${nextVersion}`} tokens={draftTokens} />
          </div>

          {failures.length > 0 ? (
            <Alert
              tone="fail"
              title={
                failures.length === 1
                  ? 'One pair will be hard to read in the app'
                  : `${failures.length} pairs will be hard to read in the app`
              }
            >
              <IssueList
                issues={failures}
                tone="fail"
                acknowledged={acknowledged}
                onToggle={toggle}
              />
            </Alert>
          ) : null}

          {warnings.length > 0 ? (
            <Alert
              tone="warn"
              title={
                warnings.length === 1
                  ? 'One pair is readable but low-contrast'
                  : `${warnings.length} pairs are readable but low-contrast`
              }
            >
              <IssueList
                issues={warnings}
                tone="warn"
                acknowledged={acknowledged}
                onToggle={toggle}
              />
            </Alert>
          ) : null}

          <div className="flex-none border-t border-divider px-[22px] pt-4 pb-[18px]">
            <Caption className="text-11-5">
              {changeSummary.count === 0
                ? 'No changes'
                : changeSummary.count === 1
                  ? '1 change'
                  : `${changeSummary.count} changes`}
            </Caption>

            {changeSummary.count === 0 ? (
              <p className="mt-2.5 text-12-5 text-ink-helper">
                This draft matches what is already live. Publishing will create an identical
                version.
              </p>
            ) : (
              <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1">
                {changeSummary.changes.map((change) => (
                  <ChangeRow key={change.field} change={change} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-none items-center justify-between border-t border-divider bg-subtle px-[22px] py-3.5">
          <span className="text-11-5 text-ink-helper">
            {error ? (
              <span className="text-fail-title">{error}</span>
            ) : liveVersion !== null ? (
              `You can roll back to v${liveVersion} at any time.`
            ) : (
              'This will be the first published version.'
            )}
          </span>
          <div className="flex items-center gap-2.5">
            <Button onClick={onClose} disabled={publishing}>
              Keep editing
            </Button>
            <Button
              variant="primary"
              onClick={() => onPublish([...acknowledged])}
              disabled={!canPublish}
              title={
                unacknowledged.length > 0
                  ? 'Confirm the contrast problems above before publishing'
                  : undefined
              }
            >
              {publishing ? 'Publishing…' : issues.length > 0 ? 'Publish anyway' : 'Publish now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One tickable row per failing pair.
 *
 * The tick is the whole gate, so it says what it costs — "publish anyway" after
 * the consequence, not a bare checkbox next to a ratio. Acknowledgement is by
 * pair id and is re-checked server-side, so ticking here is a statement about
 * this specific problem rather than a blanket override.
 */
function IssueList({
  issues,
  tone,
  acknowledged,
  onToggle,
}: {
  issues: ContrastResult[];
  tone: 'warn' | 'fail';
  acknowledged: Set<string>;
  onToggle: (pairId: string) => void;
}) {
  const styles =
    tone === 'fail'
      ? { body: 'text-fail-body', title: 'text-fail-title', box: 'accent-fail-icon' }
      : { body: 'text-warn-body', title: 'text-warn-title', box: 'accent-warn-icon' };

  return (
    <div className="mt-2 flex flex-col gap-2">
      {issues.map((issue) => (
        <label
          key={issue.pairId}
          className={`flex cursor-pointer items-start gap-2 text-11-5 leading-[1.45] ${styles.body}`}
        >
          <input
            type="checkbox"
            checked={acknowledged.has(issue.pairId)}
            onChange={() => onToggle(issue.pairId)}
            className={`focus-ring mt-[2px] h-3.5 w-3.5 flex-none ${styles.box}`}
          />
          <span>
            <span className={`font-medium ${styles.title}`}>
              {issue.label} · {issue.ratio.toFixed(1)}:1
            </span>{' '}
            — {issue.message} Publish anyway.
          </span>
        </label>
      ))}
    </div>
  );
}

function ComparePane({
  label,
  note,
  tokens,
  dimmed = false,
}: {
  label: string;
  note: string;
  tokens: ThemeTokens | null;
  dimmed?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-11 border border-divider bg-subtle">
      <div className="flex items-center justify-between border-b border-divider bg-surface px-3 py-2.5">
        <Caption className="text-11-5">{label}</Caption>
        <span className="font-mono text-10-5 text-ink-faint">{note}</span>
      </div>
      <div className="flex justify-center px-3.5 pt-3.5">
        {tokens ? (
          <MiniPhone theme={resolveTheme(tokens)} dimmed={dimmed} />
        ) : (
          <div className="flex h-[168px] w-full max-w-[268px] items-center justify-center px-6 text-center text-11-5 leading-[1.5] text-ink-hint">
            Nothing is live yet — this will be the first version customers see.
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({ change }: { change: ThemeChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-row py-1.5">
      <span className="text-12-5 text-ink-body">{change.label}</span>
      {change.kind === 'color' ? (
        <span className="flex items-center gap-[7px]">
          <Swatch hex={change.from} />
          <span className="text-10-5 text-ink-chevron" aria-hidden="true">
            →
          </span>
          <Swatch hex={change.to} />
          <span className="font-mono text-11 text-ink-helper">{change.toText}</span>
        </span>
      ) : (
        <span className="flex items-center gap-[7px] text-12">
          <span className="text-ink-faint line-through">{change.fromText}</span>
          <span className="text-10-5 text-ink-chevron" aria-hidden="true">
            →
          </span>
          <span className="font-medium text-ink">{change.toText}</span>
        </span>
      )}
    </div>
  );
}

function Swatch({ hex }: { hex: string | null }) {
  if (!hex) return null;
  return (
    <span
      style={{ background: hex }}
      className="h-[13px] w-[13px] rounded-4 border border-black/10"
      aria-hidden="true"
    />
  );
}

function Alert({
  tone,
  title,
  children,
}: {
  tone: 'warn' | 'fail';
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === 'fail'
      ? { wrap: 'border-fail-border bg-fail-bg', icon: 'bg-fail-icon', title: 'text-fail-title' }
      : { wrap: 'border-warn-border bg-warn-bg', icon: 'bg-warn-icon', title: 'text-warn-title' };

  return (
    <div className="px-[22px] pb-4">
      <div className={`flex gap-2.5 rounded-9 border px-3 py-2.5 ${styles.wrap}`}>
        <span
          className={`mt-px flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full text-10 font-bold text-white ${styles.icon}`}
          aria-hidden="true"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-12 font-medium ${styles.title}`}>{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
