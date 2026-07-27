import { describeChangeCount } from '@wl/theme';
import { Button, DisabledTooltip } from '../../components/chrome.js';
import type { SaveState } from '../../state/draft-store.js';

/**
 * The editor header.
 *
 * The design's pill counted changes ("Draft · 6 changes"); the spec requires it
 * to reflect real save state. Both matter, so the pill shows save state as the
 * primary signal and folds the change count in once the draft is settled —
 * "Draft saved · 6 changes" answers both "did my work stick?" and "how far am I
 * from what customers see?" in one glance.
 */

interface PillAppearance {
  dot: string;
  text: string;
  pulse: boolean;
}

function pillFor(state: SaveState, changeCount: number, liveVersion: number | null): PillAppearance {
  const changes = changeCount > 0 ? ` · ${describeChangeCount(changeCount)}` : '';

  switch (state) {
    case 'saving':
      return { dot: 'bg-idle-dot', text: 'Saving…', pulse: true };
    case 'error':
      return { dot: 'bg-fail-icon', text: 'Not saved', pulse: false };
    case 'publishing':
      return { dot: 'bg-idle-dot', text: 'Publishing…', pulse: true };
    case 'published':
      return { dot: 'bg-live-dot', text: `Live · v${liveVersion ?? 1}`, pulse: false };
    case 'dirty':
      return { dot: 'bg-idle-dot', text: `Unsaved${changes}`, pulse: false };
    case 'saved':
      return { dot: 'bg-idle-dot', text: `Draft saved${changes}`, pulse: false };
    case 'clean':
    default:
      return liveVersion !== null && changeCount === 0
        ? { dot: 'bg-live-dot', text: `Live · v${liveVersion}`, pulse: false }
        : { dot: 'bg-idle-dot', text: `Draft${changes}`, pulse: false };
  }
}

export function Header({
  businessName,
  saveState,
  changeCount,
  liveVersion,
  publishBlockedReason,
  onPublish,
  onRetrySave,
}: {
  businessName: string;
  saveState: SaveState;
  changeCount: number;
  liveVersion: number | null;
  /** Non-null disables publish and explains why, per the spec. */
  publishBlockedReason: string | null;
  onPublish: () => void;
  onRetrySave: () => void;
}) {
  const pill = pillFor(saveState, changeCount, liveVersion);

  return (
    <header className="flex h-[56px] flex-none items-center justify-between border-b border-hairline bg-surface pr-4 pl-5">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2">
          <div className="h-[18px] w-[18px] rounded-5 bg-ink" aria-hidden="true" />
          <span className="text-13 font-semibold tracking-[-0.01em]">Counter</span>
        </div>
        <div className="h-5 w-px bg-hairline" aria-hidden="true" />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-13">
          <a href="/" className="focus-ring rounded-4 text-ink-muted transition-colors hover:text-ink">
            Brands
          </a>
          <span className="text-ink-chevron" aria-hidden="true">
            /
          </span>
          <span className="font-medium">{businessName}</span>
          <span className="text-ink-chevron" aria-hidden="true">
            /
          </span>
          <span className="text-ink-muted" aria-current="page">
            Theme
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <div
          className="flex h-[26px] items-center gap-[7px] rounded-[13px] border border-hairline bg-subtle pr-2.5 pl-2"
          role="status"
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${pill.dot} ${pill.pulse ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
          <span className="text-12 tracking-[-0.005em] text-ink-body">{pill.text}</span>
          {saveState === 'error' ? (
            <button
              type="button"
              onClick={onRetrySave}
              className="focus-ring rounded-4 text-12 font-medium text-fail-title underline underline-offset-2"
            >
              Retry
            </button>
          ) : null}
        </div>

        <Button>Preview</Button>

        <DisabledTooltip reason={publishBlockedReason}>
          <Button
            variant="primary"
            onClick={onPublish}
            disabled={publishBlockedReason !== null}
            aria-describedby={publishBlockedReason ? 'publish-blocked' : undefined}
          >
            Publish
          </Button>
        </DisabledTooltip>
      </div>
    </header>
  );
}
