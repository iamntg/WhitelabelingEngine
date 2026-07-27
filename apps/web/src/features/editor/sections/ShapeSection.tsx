import { RADIUS_SCALES, type ThemeTokens } from '@wl/theme';
import { FieldHint, FieldLabel } from '../../../components/chrome.js';

/**
 * Shape: the four radius scales.
 *
 * Each cell previews its own radius on a small rectangle, so the choice is made
 * by looking rather than by reading four adjectives.
 */
export function ShapeSection({
  tokens,
  onChange,
}: {
  tokens: ThemeTokens;
  onChange: (next: ThemeTokens) => void;
}) {
  return (
    <div>
      <FieldLabel>Corner radius</FieldLabel>

      <div
        role="radiogroup"
        aria-label="Corner radius"
        className="flex gap-[3px] rounded-9 border border-trough bg-canvas p-[3px]"
      >
        {RADIUS_SCALES.map((scale) => {
          const selected = scale.id === tokens.shape.radiusScale;
          return (
            <button
              key={scale.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...tokens, shape: { radiusScale: scale.id } })}
              className={`focus-ring flex flex-1 flex-col items-center gap-1.5 rounded-7 border px-1 pt-[9px] pb-2 transition-colors ${
                selected
                  ? 'border-dashed bg-surface'
                  : 'border-transparent hover:border-dashed'
              }`}
            >
              <span
                style={{ borderRadius: `${scale.previewRadius}px` }}
                className="h-4 w-[22px] bg-[#d6d6d2]"
                aria-hidden="true"
              />
              <span
                className={`text-10-5 font-medium ${selected ? 'text-ink' : 'text-ink-helper'}`}
              >
                {scale.label}
              </span>
            </button>
          );
        })}
      </div>

      <FieldHint>Applied to cards, images, inputs and buttons together.</FieldHint>
    </div>
  );
}
