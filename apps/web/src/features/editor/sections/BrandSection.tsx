import type { ThemeTokens } from '@wl/theme';
import { useRef } from 'react';
import { FieldHint, FieldLabel, TextInput } from '../../../components/chrome.js';

/**
 * Brand: logo and business name.
 *
 * The upload is still local-only (FileReader → data URL), matching the design.
 * Wiring it to the signed-URL endpoint is a later step; the empty and filled
 * states, and the copy, are ported exactly.
 */
export function BrandSection({
  tokens,
  onChange,
}: {
  tokens: ThemeTokens;
  onChange: (next: ThemeTokens, coalesceKey?: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const setLogo = (logoUrl: string | null, logoAspect = 1) => {
    onChange({ ...tokens, brand: { ...tokens.brand, logoUrl, logoAspect } });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const image = new Image();
      // Aspect is measured here so the preview can letterbox correctly; on the
      // real upload path the server measures it instead and the client never
      // sets it.
      image.onload = () => setLogo(url, image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1);
      image.onerror = () => setLogo(url, 1);
      image.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>Logo</FieldLabel>

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = '';
          }}
        />

        {tokens.brand.logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-8 border border-hairline bg-subtle">
              <img
                src={tokens.brand.logoUrl}
                alt="Your logo"
                className="block max-h-full max-w-full"
              />
            </div>
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="focus-ring h-[26px] rounded-6 border border-control bg-surface px-2.5 text-12 font-medium text-ink-strong transition-colors hover:bg-hover"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setLogo(null)}
                className="focus-ring rounded-4 pl-0.5 text-12 text-ink-helper transition-colors hover:text-ink"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="focus-ring flex w-full flex-col items-center gap-1.5 rounded-9 border border-dashed border-dashed bg-subtle-2 px-3.5 py-[18px] transition-[border-color,background-color] duration-[120ms] hover:border-accent-soft hover:bg-accent-bg"
          >
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-7 border border-raised bg-surface text-13 text-ink-hint">
              +
            </span>
            <span className="text-12-5 font-medium text-ink-heading">Upload your logo</span>
            <span className="font-mono text-11 text-ink-hint">SVG or PNG · square · min 512px</span>
          </button>
        )}
      </div>

      <div>
        <label>
          <FieldLabel>Business name</FieldLabel>
          <TextInput
            value={tokens.brand.businessName}
            onChange={(event) =>
              onChange(
                { ...tokens, brand: { ...tokens.brand, businessName: event.target.value } },
                'businessName',
              )
            }
          />
        </label>
        <FieldHint>Shown in the app header and on receipts.</FieldHint>
      </div>
    </div>
  );
}
