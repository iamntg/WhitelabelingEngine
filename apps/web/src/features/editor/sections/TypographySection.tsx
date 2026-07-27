import { FONT_PAIRINGS, getPairing, resolveTheme, type ThemeTokens } from '@wl/theme';
import { useEffect, useRef, useState } from 'react';
import { FieldLabel, Icon, TextInput } from '../../../components/chrome.js';

/**
 * Typography: the pairing combobox and a live specimen.
 *
 * Each option renders in its own typeface, which is the entire point — a list
 * of font names in Inter tells an owner nothing. The specimen below is driven
 * by `resolveTheme`, not hand-styled, so what it shows is what the phone shows.
 */
export function TypographySection({
  tokens,
  onChange,
}: {
  tokens: ThemeTokens;
  onChange: (next: ThemeTokens) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState('Ash-Roasted Half Chicken');
  const containerRef = useRef<HTMLDivElement>(null);

  const current = getPairing(tokens.typography.pairingId);
  const resolved = resolveTheme(tokens);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (pairingId: ThemeTokens['typography']['pairingId']) => {
    onChange({ ...tokens, typography: { pairingId } });
    setOpen(false);
  };

  const sampleText = sample.trim() || 'Ash-Roasted Half Chicken';

  return (
    <div className="flex flex-col gap-3">
      <div>
        <FieldLabel>Font pairing</FieldLabel>

        <div className="relative" ref={containerRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`focus-ring flex w-full items-center justify-between gap-2.5 rounded-8 border bg-surface px-2.5 py-2 text-left transition-[border-color,box-shadow] duration-[120ms] hover:border-border-hover ${
              open ? 'border-accent' : 'border-control'
            }`}
          >
            <span className="flex min-w-0 items-baseline gap-2.5">
              <span
                style={{ fontFamily: resolved.typography.display.fontFamily }}
                className="truncate text-15 font-semibold tracking-[-0.01em] text-ink"
              >
                {current.display.family}
              </span>
              <span className="text-10-5 font-medium tracking-[0.04em] whitespace-nowrap text-ink-hint uppercase">
                {current.label}
              </span>
            </span>
            <span className="text-10 text-ink-faint" aria-hidden="true">
              {open ? '▴' : '▾'}
            </span>
          </button>

          {open ? (
            <ul
              role="listbox"
              aria-label="Font pairing"
              className="absolute top-[calc(100%+5px)] right-0 left-0 z-20 max-h-[296px] overflow-y-auto rounded-10 border border-raised bg-surface p-[5px] shadow-popover"
            >
              {FONT_PAIRINGS.map((pairing) => {
                const selected = pairing.id === tokens.typography.pairingId;
                return (
                  <li key={pairing.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => select(pairing.id)}
                      className={`focus-ring flex w-full items-center justify-between gap-2.5 rounded-7 px-2.5 py-2 text-left transition-colors hover:bg-hover ${
                        selected ? 'bg-hover' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          style={{ fontFamily: `"${pairing.display.family}", ${pairing.display.fallback}` }}
                          className="block truncate text-15-5 leading-[1.2] font-semibold tracking-[-0.01em] text-ink"
                        >
                          {pairing.display.family}
                        </span>
                        <span
                          style={{ fontFamily: `"${pairing.body.family}", ${pairing.body.fallback}` }}
                          className="mt-[3px] block truncate text-11 text-ink-helper"
                        >
                          {pairing.body.family === pairing.display.family
                            ? 'Headings and body'
                            : `Body: ${pairing.body.family}`}
                        </span>
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        <span className="text-10 font-medium tracking-[0.04em] text-ink-hint uppercase">
                          {pairing.label}
                        </span>
                        <Icon
                          name="check"
                          className={`text-15 ${selected ? 'text-ink' : 'text-transparent'}`}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      <div>
        <label>
          <FieldLabel>Try your own words</FieldLabel>
          <TextInput
            value={sample}
            placeholder="Type a dish name or headline"
            onChange={(event) => setSample(event.target.value)}
            className="h-8 text-12-5"
          />
        </label>

        <div className="mt-2.5 rounded-9 border border-divider bg-subtle p-3.5">
          <div
            style={{
              fontFamily: resolved.typography.display.fontFamily,
              fontWeight: resolved.typography.display.weight,
              letterSpacing: `${resolved.typography.display.tracking.md}em`,
            }}
            className="text-21 leading-[1.2] break-words text-ink"
          >
            {sampleText}
          </div>
          <div
            style={{ fontFamily: resolved.typography.body.fontFamily }}
            className="mt-1.5 text-12 leading-[1.5] text-ink-muted"
          >
            Body text uses {current.body.family} — “Slow-roasted, charred lemon, salsa verde.
            $26.00.”
          </div>
        </div>
      </div>
    </div>
  );
}
