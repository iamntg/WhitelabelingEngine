/**
 * Corner radius scales.
 *
 * Values are unitless numbers, not CSS strings: React Native's `borderRadius`
 * takes numbers, and the resolved theme is stored as JSON and handed to both
 * platforms unchanged. The web adapter appends `px`.
 */

export type RadiusScale = 'sharp' | 'subtle' | 'rounded' | 'pill';

export const RADIUS_SCALE_IDS = ['sharp', 'subtle', 'rounded', 'pill'] as const;

export interface RadiusSet {
  readonly none: number;
  /** Tags, small chips, swatches. */
  readonly sm: number;
  /** The workhorse: cards, images, inputs, buttons. */
  readonly md: number;
  /** Sheets, large media. */
  readonly lg: number;
  /** Fully rounded pills — capped, not literally infinite, so RN is happy. */
  readonly full: number;
  /**
   * Logo tile. Capped below `md` because a logo mark inside a 20px-radius
   * container loses its own silhouette.
   */
  readonly logo: number;
}

export interface RadiusOption {
  readonly id: RadiusScale;
  readonly label: string;
  /** Radius of the small demo rectangle in the Shape picker. */
  readonly previewRadius: number;
  readonly values: RadiusSet;
}

export const RADIUS_SCALES: readonly RadiusOption[] = [
  {
    id: 'sharp',
    label: 'Sharp',
    previewRadius: 1,
    values: { none: 0, sm: 0, md: 0, lg: 0, full: 0, logo: 0 },
  },
  {
    id: 'subtle',
    label: 'Subtle',
    previewRadius: 3,
    values: { none: 0, sm: 4, md: 6, lg: 10, full: 8, logo: 6 },
  },
  {
    id: 'rounded',
    label: 'Rounded',
    previewRadius: 6,
    values: { none: 0, sm: 8, md: 12, lg: 18, full: 999, logo: 10 },
  },
  {
    id: 'pill',
    label: 'Pill',
    previewRadius: 8,
    values: { none: 0, sm: 12, md: 20, lg: 28, full: 999, logo: 10 },
  },
];

export function getRadiusScale(id: RadiusScale): RadiusOption {
  const found = RADIUS_SCALES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown radius scale: ${id}`);
  return found;
}
