import { COLOR_SWATCHES, checkContrast, type ContrastResult, type ThemeTokens } from '@wl/theme';
import { useMemo } from 'react';

/**
 * Colour: four channels, five quick picks each, plus a custom picker.
 *
 * Contrast warnings appear here, inline, the instant a bad pair is set — the
 * same `checkContrast` the server re-runs on publish, so the browser can never
 * show a verdict the API disagrees with.
 *
 * The design showed at most one warning via if/else. With seven pairs several
 * can fail together, so they stack: failures first, capped at three visible.
 */

type Channel = 'primary' | 'secondary' | 'accent' | 'background';

const CHANNELS: ReadonlyArray<{ id: Channel; label: string }> = [
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'accent', label: 'Accent' },
  { id: 'background', label: 'Background' },
];

const MAX_VISIBLE_ISSUES = 3;

export function ColorSection({
  tokens,
  onChange,
}: {
  tokens: ThemeTokens;
  onChange: (next: ThemeTokens, coalesceKey?: string) => void;
}) {
  const issues = useMemo(() => {
    return (
      checkContrast(tokens)
        .filter((r) => r.level !== 'pass')
        // Advisory pairs are deliberately not shown to the owner. They are a
        // regression guard for layouts that do not exist yet — and in practice
        // `secondary-on-primary` fails for all six shipped presets, because
        // those two colours simply never touch. Surfacing it would mean every
        // new tenant opens the editor to a warning they cannot act on, which is
        // how a contrast checker teaches people to ignore contrast warnings.
        // It is still returned by checkContrast and still visible to the API.
        .filter((r) => r.blocking)
        .sort((a, b) => {
          if (a.level !== b.level) return a.level === 'fail' ? -1 : 1;
          return a.ratio - b.ratio;
        })
    );
  }, [tokens]);

  const setColor = (channel: Channel, value: string) => {
    onChange({ ...tokens, colors: { ...tokens.colors, [channel]: value } }, `color:${channel}`);
  };

  const visible = issues.slice(0, MAX_VISIBLE_ISSUES);
  const hidden = issues.length - visible.length;

  return (
    <div className="flex flex-col gap-[15px]">
      {CHANNELS.map((channel) => (
        <ColorRow
          key={channel.id}
          label={channel.label}
          value={tokens.colors[channel.id]}
          swatches={COLOR_SWATCHES[channel.id]}
          onPick={(hex) => setColor(channel.id, hex)}
        />
      ))}

      {visible.map((issue) => (
        <ContrastCard
          key={issue.pairId}
          issue={issue}
          onFix={
            issue.suggestion
              ? () => setColor(issue.fixTarget, issue.suggestion as string)
              : undefined
          }
        />
      ))}

      {hidden > 0 ? (
        <div className="text-11-5 text-ink-hint">
          {hidden} more contrast {hidden === 1 ? 'issue' : 'issues'} — fixing these usually clears
          them too.
        </div>
      ) : null}
    </div>
  );
}

function ColorRow({
  label,
  value,
  swatches,
  onPick,
}: {
  label: string;
  value: string;
  swatches: readonly string[];
  onPick: (hex: string) => void;
}) {
  return (
    <div>
      <div className="mb-[7px] flex items-center justify-between">
        <span className="text-11-5 font-medium text-ink-label">{label}</span>
        <span className="font-mono text-11 text-ink-faint uppercase">{value}</span>
      </div>

      <div className="flex items-center gap-[7px]">
        <div role="radiogroup" aria-label={`${label} presets`} className="flex items-center gap-[7px]">
          {swatches.map((hex) => {
            const selected = hex.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label} ${hex}`}
                title={hex}
                onClick={() => onPick(hex)}
                style={{
                  background: hex,
                  // The double ring reads on both light and dark swatches,
                  // which a single outline does not.
                  boxShadow: selected ? '0 0 0 2px #ffffff, 0 0 0 3.5px #18181a' : undefined,
                }}
                className="focus-ring h-[26px] w-[26px] rounded-7 border border-black/10 p-0 transition-transform duration-100 hover:scale-108"
              />
            );
          })}
        </div>

        <div className="mx-0.5 h-5 w-px bg-divider" aria-hidden="true" />

        <label className="focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(120,120,220,0.13)] relative flex h-[26px] cursor-pointer items-center gap-1.5 rounded-7 border border-control bg-surface pr-2.5 pl-[7px] transition-colors hover:border-border-hover">
          <span
            style={{ background: value }}
            className="h-3.5 w-3.5 rounded-4 border border-black/10"
            aria-hidden="true"
          />
          <span className="text-11-5 text-ink-body">Custom</span>
          <input
            type="color"
            value={value}
            aria-label={`Custom ${label.toLowerCase()} colour`}
            onChange={(event) => onPick(event.target.value.toLowerCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * The contrast card, in two tones.
 *
 * `fail` blocks publish, so it gets the firmer treatment; `warn` keeps the
 * design's amber. Both lead with the consequence — what will be hard to read —
 * rather than with the WCAG rule, because the owner is choosing a colour, not
 * auditing a spec.
 */
function ContrastCard({ issue, onFix }: { issue: ContrastResult; onFix?: (() => void) | undefined }) {
  const failing = issue.level === 'fail';

  const tone = failing
    ? {
        wrapper: 'border-fail-border bg-fail-bg',
        icon: 'bg-fail-icon',
        title: 'text-fail-title',
        body: 'text-fail-body',
        button: 'border-fail-btn-border text-fail-title hover:bg-fail-btn-hover',
      }
    : {
        wrapper: 'border-warn-border bg-warn-bg',
        icon: 'bg-warn-icon',
        title: 'text-warn-title',
        body: 'text-warn-body',
        button: 'border-warn-btn-border text-warn-title hover:bg-warn-btn-hover',
      };

  return (
    <div className={`flex gap-2.5 rounded-8 border px-[11px] py-2.5 ${tone.wrapper}`}>
      <span
        className={`mt-px flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full text-10 font-bold text-white ${tone.icon}`}
        aria-hidden="true"
      >
        !
      </span>
      <div className="min-w-0">
        <div className={`text-12 leading-[1.4] font-medium ${tone.title}`}>
          {issue.label}: {issue.ratio.toFixed(1)}:1
          {issue.blocking ? '' : ' (advisory)'}
        </div>
        <div className={`mt-0.5 text-11-5 leading-[1.45] ${tone.body}`}>{issue.message}</div>

        {onFix && issue.suggestion ? (
          <button
            type="button"
            onClick={onFix}
            className={`focus-ring mt-[7px] flex h-6 items-center gap-1.5 rounded-6 border bg-surface px-2.5 text-11-5 font-medium transition-colors ${tone.button}`}
          >
            <span
              style={{ background: issue.suggestion }}
              className="h-2.5 w-2.5 rounded-[3px] border border-black/10"
              aria-hidden="true"
            />
            Use suggested colour
          </button>
        ) : null}
      </div>
    </div>
  );
}
