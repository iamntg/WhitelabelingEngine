/**
 * The font pairing registry.
 *
 * FIXED SET — exactly five. Adding or removing an entry is a breaking change
 * for every tenant that has published against it, so changes here require a
 * schema version bump and a migration.
 *
 * Every family is a Google Font with static weights, so the same files can be
 * bundled into the Expo app via `@expo-google-fonts/*` and served to the web
 * preview from the same source of truth. `rnPackage` and `rnExports` record the
 * exact bundling identifiers — apps/mobile reads them rather than hardcoding.
 */

export type PairingId = 'modern' | 'editorial' | 'technical' | 'grand' | 'bold';

export const PAIRING_IDS = ['modern', 'editorial', 'technical', 'grand', 'bold'] as const;

export interface FontFace {
  readonly family: string;
  /** Applied verbatim on web; RN resolves via `rnExports`. */
  readonly fallback: string;
  readonly weight: number;
}

export interface BodyFace extends FontFace {
  readonly regular: number;
  readonly medium: number;
  readonly semibold: number;
  readonly bold: number;
}

export interface FontPairing {
  readonly id: PairingId;
  readonly label: string;
  readonly display: FontFace;
  readonly body: BodyFace;
  /**
   * Optical size multiplier applied to display sizes only. Serif display faces
   * carry more visual weight per em, so they need a nudge to sit level with a
   * grotesque at the same nominal size.
   */
  readonly scale: number;
  /**
   * Added to the base display tracking, in em. Tight negative tracking suits a
   * grotesque and ruins a high-contrast serif.
   */
  readonly trackingAdjust: number;
  readonly rnPackage: { readonly display: string; readonly body: string };
  /** Font-family strings to register with Expo, keyed by `${family}-${weight}`. */
  readonly rnExports: Readonly<Record<string, string>>;
}

const SANS_FALLBACK = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const SERIF_FALLBACK = 'Georgia, Times New Roman, serif';

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'modern',
    label: 'Modern',
    display: { family: 'Inter', fallback: SANS_FALLBACK, weight: 600 },
    body: {
      family: 'Inter',
      fallback: SANS_FALLBACK,
      weight: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    scale: 1,
    trackingAdjust: 0,
    rnPackage: { display: '@expo-google-fonts/inter', body: '@expo-google-fonts/inter' },
    rnExports: {
      'Inter-400': 'Inter_400Regular',
      'Inter-500': 'Inter_500Medium',
      'Inter-600': 'Inter_600SemiBold',
      'Inter-700': 'Inter_700Bold',
    },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    display: { family: 'Fraunces', fallback: SERIF_FALLBACK, weight: 600 },
    body: {
      family: 'Inter',
      fallback: SANS_FALLBACK,
      weight: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    scale: 1.02,
    trackingAdjust: 0.008,
    rnPackage: { display: '@expo-google-fonts/fraunces', body: '@expo-google-fonts/inter' },
    rnExports: {
      'Fraunces-600': 'Fraunces_600SemiBold',
      'Inter-400': 'Inter_400Regular',
      'Inter-500': 'Inter_500Medium',
      'Inter-600': 'Inter_600SemiBold',
      'Inter-700': 'Inter_700Bold',
    },
  },
  {
    id: 'technical',
    label: 'Technical',
    display: { family: 'Space Grotesk', fallback: SANS_FALLBACK, weight: 600 },
    body: {
      family: 'IBM Plex Sans',
      fallback: SANS_FALLBACK,
      weight: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    scale: 1,
    trackingAdjust: 0,
    rnPackage: {
      display: '@expo-google-fonts/space-grotesk',
      body: '@expo-google-fonts/ibm-plex-sans',
    },
    rnExports: {
      'Space Grotesk-600': 'SpaceGrotesk_600SemiBold',
      'IBM Plex Sans-400': 'IBMPlexSans_400Regular',
      'IBM Plex Sans-500': 'IBMPlexSans_500Medium',
      'IBM Plex Sans-600': 'IBMPlexSans_600SemiBold',
      'IBM Plex Sans-700': 'IBMPlexSans_700Bold',
    },
  },
  {
    id: 'grand',
    label: 'Grand',
    display: { family: 'DM Serif Display', fallback: SERIF_FALLBACK, weight: 400 },
    body: {
      family: 'DM Sans',
      fallback: SANS_FALLBACK,
      weight: 400,
      regular: 400,
      medium: 500,
      // DM Sans ships 500 and 700 as reliable statics; 600 is skipped rather
      // than risk a synthesised weight that only shows up on device.
      semibold: 700,
      bold: 700,
    },
    scale: 1.06,
    trackingAdjust: 0.006,
    rnPackage: {
      display: '@expo-google-fonts/dm-serif-display',
      body: '@expo-google-fonts/dm-sans',
    },
    rnExports: {
      'DM Serif Display-400': 'DMSerifDisplay_400Regular',
      'DM Sans-400': 'DMSans_400Regular',
      'DM Sans-500': 'DMSans_500Medium',
      'DM Sans-700': 'DMSans_700Bold',
    },
  },
  {
    id: 'bold',
    label: 'Bold',
    display: { family: 'Archivo', fallback: SANS_FALLBACK, weight: 700 },
    body: {
      family: 'Archivo',
      fallback: SANS_FALLBACK,
      weight: 400,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    scale: 0.98,
    trackingAdjust: -0.002,
    rnPackage: { display: '@expo-google-fonts/archivo', body: '@expo-google-fonts/archivo' },
    rnExports: {
      'Archivo-400': 'Archivo_400Regular',
      'Archivo-500': 'Archivo_500Medium',
      'Archivo-600': 'Archivo_600SemiBold',
      'Archivo-700': 'Archivo_700Bold',
    },
  },
];

export function getPairing(id: PairingId): FontPairing {
  const found = FONT_PAIRINGS.find((p) => p.id === id);
  // Unreachable via the schema, but the registry is also read from seed data
  // and migrations where the id is only as good as whoever typed it.
  if (!found) throw new Error(`Unknown font pairing: ${id}`);
  return found;
}

/**
 * Base type scale, in px, before the pairing's optical multiplier.
 * Half-pixel values are deliberate — they are what makes the design's
 * information density read as dense rather than cramped.
 */
export const BASE_TYPE_SCALE = {
  display: { xs: 14, sm: 16, md: 21, lg: 24, xl: 30 },
  body: { xs: 10.5, sm: 11.5, md: 12.5, base: 13, lg: 14, xl: 17 },
} as const;

/** Tracking in em, before the pairing's adjustment. */
export const BASE_DISPLAY_TRACKING = {
  xs: -0.01,
  sm: -0.01,
  md: -0.015,
  lg: -0.02,
  xl: -0.022,
} as const;

export const LINE_HEIGHT = {
  display: 1.18,
  body: 1.45,
  bodyRelaxed: 1.5,
} as const;

export type DisplaySizeKey = keyof typeof BASE_TYPE_SCALE.display;
export type BodySizeKey = keyof typeof BASE_TYPE_SCALE.body;
