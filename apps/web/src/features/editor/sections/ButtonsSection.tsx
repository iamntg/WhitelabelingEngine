import { resolveTheme, type ButtonStyle, type ThemeTokens } from '@wl/theme';
import { useMemo } from 'react';

/**
 * Buttons: three styles, each previewed in the tenant's real colours.
 *
 * The chips are rendered through `resolveTheme` with the candidate style, so
 * each one shows exactly what that choice produces — including the derived
 * "on" colour and the soft fill's ink, which are the parts an owner cannot
 * predict from a name like "Soft".
 */

const STYLES: ReadonlyArray<{ id: ButtonStyle; label: string }> = [
  { id: 'filled', label: 'Filled' },
  { id: 'outline', label: 'Outline' },
  { id: 'soft', label: 'Soft' },
];

export function ButtonsSection({
  tokens,
  onChange,
}: {
  tokens: ThemeTokens;
  onChange: (next: ThemeTokens) => void;
}) {
  const previews = useMemo(
    () =>
      STYLES.map((style) => ({
        ...style,
        button: resolveTheme({ ...tokens, buttons: { style: style.id } }).button,
        radius: resolveTheme(tokens).radius.md,
      })),
    [tokens],
  );

  return (
    <div role="radiogroup" aria-label="Button style" className="flex flex-col gap-2">
      {previews.map((style) => {
        const selected = style.id === tokens.buttons.style;
        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange({ ...tokens, buttons: { style: style.id } })}
            className={`focus-ring flex items-center justify-between gap-3 rounded-9 border px-3 py-2.5 transition-colors ${
              selected
                ? 'border-ink bg-subtle'
                : 'border-trough bg-surface hover:border-border-hover-strong'
            }`}
          >
            <span className="text-12 font-medium text-ink-heading">{style.label}</span>
            <span
              style={{
                background: style.button.background,
                color: style.button.foreground,
                borderColor: style.button.border,
                borderRadius: `${style.radius}px`,
              }}
              className="border px-3.5 py-[7px] text-12 font-semibold"
            >
              Add to order
            </span>
          </button>
        );
      })}
    </div>
  );
}
