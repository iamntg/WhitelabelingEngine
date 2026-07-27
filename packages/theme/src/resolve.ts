import { contrastRatio, isDarkColor } from './color/contrast.js';
import {
  hexToOklch,
  mixOklch,
  oklchToHex,
  scaleChroma,
  shiftLightness,
} from './color/convert.js';
import { ensureMinRatio } from './color/nudge.js';
import { INK, PAPER, pickOn } from './color/pick.js';
import {
  BASE_DISPLAY_TRACKING,
  BASE_TYPE_SCALE,
  LINE_HEIGHT,
  getPairing,
  type BodySizeKey,
  type DisplaySizeKey,
  type PairingId,
} from './fonts.js';
import { getRadiusScale, type RadiusScale, type RadiusSet } from './radii.js';
import type { ButtonStyle, ThemeTokens } from './schema.js';

/**
 * The render-time theme.
 *
 * This is the only object the web preview, the Expo app, and any future surface
 * are allowed to read colours from. It is plain JSON — hex strings and numbers,
 * no CSS units, no functions — because it is persisted by the API and handed to
 * both platforms verbatim. If a screen needs a colour that isn't here, the fix
 * is to add it here, not to hand-style the screen.
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorRole {
  base: string;
  hover: string;
  pressed: string;
  disabled: string;
  /** Low-emphasis wash of the colour — chips, selected rows, soft buttons. */
  subtleFill: string;
  /** Legible on `base`. */
  on: string;
  /** Legible on `subtleFill`. */
  onSubtle: string;
}

export interface ResolvedSurface {
  base: string;
  elevated: string;
  sunken: string;
  border: string;
  borderStrong: string;
  overlay: string;
}

export interface ResolvedText {
  primary: string;
  secondary: string;
  tertiary: string;
  inverse: string;
}

export interface ResolvedButton {
  style: ButtonStyle;
  background: string;
  foreground: string;
  border: string;
  hoverBackground: string;
  pressedBackground: string;
  disabledBackground: string;
  disabledForeground: string;
  disabledBorder: string;
}

export interface ResolvedFace {
  family: string;
  /** Web-ready stack. RN ignores this and resolves via the pairing registry. */
  fontFamily: string;
  fallback: string;
  weight: number;
  lineHeight: number;
}

export interface ResolvedTypography {
  pairingId: PairingId;
  display: ResolvedFace & {
    sizes: Record<DisplaySizeKey, number>;
    /** Tracking in em. Multiply by font size for RN's `letterSpacing`. */
    tracking: Record<DisplaySizeKey, number>;
  };
  body: ResolvedFace & {
    sizes: Record<BodySizeKey, number>;
    weights: { regular: number; medium: number; semibold: number; bold: number };
  };
}

export interface ResolvedTheme {
  schemaVersion: number;
  scheme: ColorScheme;
  brand: {
    businessName: string;
    initials: string;
    logoUrl: string | null;
    logoAspect: number;
  };
  surface: ResolvedSurface;
  text: ResolvedText;
  primary: ColorRole;
  secondary: ColorRole;
  accent: ColorRole;
  button: ResolvedButton;
  radius: RadiusSet;
  typography: ResolvedTypography;
  /** Image placeholders. Brand-independent by design — see the design export. */
  placeholder: { fill: string; ink: string; chip: string };
  meta: {
    pairingId: PairingId;
    radiusScale: RadiusScale;
    buttonStyle: ButtonStyle;
  };
}

export interface ResolveOptions {
  scheme?: ColorScheme;
}

/* -------------------------------------------------------------------------- */
/* Tuning constants — every magic number in the resolver lives here.           */
/* -------------------------------------------------------------------------- */

const TUNING = {
  /** Lightness of the machine-derived dark surface. */
  darkSurfaceLightness: 0.175,
  /** How much of the primary's chroma bleeds into that surface. */
  darkSurfaceTintRatio: 0.18,
  darkSurfaceMaxChroma: 0.022,

  surfaceLift: { light: 0.025, dark: 0.035 },
  surfaceDrop: { light: 0.03, dark: 0.02 },
  /** Above this lightness there is no headroom to lift, so we only drop. */
  surfaceCeiling: 0.97,

  borderMix: 0.14,
  borderStrongMix: 0.28,

  textSecondaryMix: 0.42,
  textTertiaryMix: 0.58,

  roleHoverShift: 0.05,
  rolePressedShift: 0.1,
  roleDisabledMix: 0.62,
  roleDisabledChroma: 0.45,
  subtleFillMix: { light: 0.88, dark: 0.82 },

  placeholderMix: { light: 0.12, dark: 0.1 },

  /** Minimum ratios the resolver guarantees. */
  min: {
    textPrimary: 4.5,
    textSecondary: 4.5,
    textTertiary: 3,
    onColor: 4.5,
    onSubtle: 4.5,
    /** Dark-scheme brand colours against the derived dark surface. */
    darkBrandLarge: 3,
    darkBrandText: 4.5,
  },
} as const;

/* -------------------------------------------------------------------------- */

function deriveDarkSurface(primary: string): string {
  const p = hexToOklch(primary);
  return oklchToHex({
    l: TUNING.darkSurfaceLightness,
    c: Math.min(p.c * TUNING.darkSurfaceTintRatio, TUNING.darkSurfaceMaxChroma),
    h: p.h,
  });
}

function resolveSurface(tokens: ThemeTokens, scheme: ColorScheme): { base: string } {
  const background = tokens.colors.background;
  if (scheme === 'light') return { base: background };
  // In dark mode we never reuse a light background — but if the owner already
  // chose a dark background, honour it rather than substituting our own.
  return { base: isDarkColor(background) ? background : deriveDarkSurface(tokens.colors.primary) };
}

function resolveText(surfaceBase: string): ResolvedText {
  const primary = ensureMinRatio(pickOn(surfaceBase), surfaceBase, TUNING.min.textPrimary);
  const secondary = ensureMinRatio(
    mixOklch(primary, surfaceBase, TUNING.textSecondaryMix),
    surfaceBase,
    TUNING.min.textSecondary,
  );
  const tertiary = ensureMinRatio(
    mixOklch(primary, surfaceBase, TUNING.textTertiaryMix),
    surfaceBase,
    TUNING.min.textTertiary,
  );
  return { primary, secondary, tertiary, inverse: pickOn(primary) };
}

function resolveSurfaceSet(
  base: string,
  textPrimary: string,
  scheme: ColorScheme,
): ResolvedSurface {
  const baseL = hexToOklch(base).l;
  const lift = TUNING.surfaceLift[scheme];
  const drop = TUNING.surfaceDrop[scheme];

  // Elevated surfaces move away from the text colour. On a pure-white
  // background there is nowhere to go, so elevation is carried by the border
  // and shadow instead and `elevated` stays equal to `base` — which is exactly
  // what the design does with white cards on an off-white canvas.
  const elevated = baseL > TUNING.surfaceCeiling ? base : shiftLightness(base, lift);

  return {
    base,
    elevated,
    sunken: shiftLightness(base, -drop),
    border: mixOklch(base, textPrimary, TUNING.borderMix),
    borderStrong: mixOklch(base, textPrimary, TUNING.borderStrongMix),
    overlay: scheme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(20, 20, 22, 0.28)',
  };
}

function resolveRole(
  input: string,
  surfaceBase: string,
  scheme: ColorScheme,
  minRatioInDark: number,
): ColorRole {
  // Light mode leaves the owner's colour exactly as chosen and warns instead —
  // they picked the background too, so a warning is actionable. Dark mode is
  // machine-derived, so a warning there would be unactionable and we correct.
  const base = scheme === 'dark' ? ensureMinRatio(input, surfaceBase, minRatioInDark) : input;

  // Interaction states move *away* from the surface so they always read as a
  // deepening, whether the surface is lighter or darker than the colour.
  const direction = hexToOklch(surfaceBase).l > hexToOklch(base).l ? -1 : 1;

  const subtleFill = mixOklch(base, surfaceBase, TUNING.subtleFillMix[scheme]);

  return {
    base,
    hover: shiftLightness(base, direction * TUNING.roleHoverShift),
    pressed: shiftLightness(base, direction * TUNING.rolePressedShift),
    disabled: scaleChroma(
      mixOklch(base, surfaceBase, TUNING.roleDisabledMix),
      TUNING.roleDisabledChroma,
    ),
    subtleFill,
    on: ensureMinRatio(pickOn(base), base, TUNING.min.onColor),
    onSubtle: ensureMinRatio(base, subtleFill, TUNING.min.onSubtle),
  };
}

function resolveButton(
  style: ButtonStyle,
  primary: ColorRole,
  surface: ResolvedSurface,
): ResolvedButton {
  switch (style) {
    case 'filled':
      return {
        style,
        background: primary.base,
        foreground: primary.on,
        border: primary.base,
        hoverBackground: primary.hover,
        pressedBackground: primary.pressed,
        disabledBackground: primary.disabled,
        disabledForeground: pickOn(primary.disabled),
        disabledBorder: primary.disabled,
      };
    case 'outline':
      return {
        style,
        background: 'transparent',
        foreground: primary.base,
        border: primary.base,
        hoverBackground: primary.subtleFill,
        pressedBackground: mixOklch(primary.subtleFill, primary.base, 0.14),
        disabledBackground: 'transparent',
        disabledForeground: primary.disabled,
        disabledBorder: primary.disabled,
      };
    case 'soft':
      return {
        style,
        background: primary.subtleFill,
        foreground: primary.onSubtle,
        border: 'transparent',
        hoverBackground: mixOklch(primary.subtleFill, primary.base, 0.12),
        pressedBackground: mixOklch(primary.subtleFill, primary.base, 0.2),
        disabledBackground: mixOklch(primary.subtleFill, surface.base, 0.4),
        disabledForeground: primary.disabled,
        disabledBorder: 'transparent',
      };
  }
}

/** Half-pixel steps are part of the design; round to 0.5, never to whole px. */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function resolveTypography(pairingId: PairingId): ResolvedTypography {
  const pairing = getPairing(pairingId);

  const displaySizes = {} as Record<DisplaySizeKey, number>;
  const tracking = {} as Record<DisplaySizeKey, number>;
  for (const key of Object.keys(BASE_TYPE_SCALE.display) as DisplaySizeKey[]) {
    displaySizes[key] = roundHalf(BASE_TYPE_SCALE.display[key] * pairing.scale);
    tracking[key] = Number(
      (BASE_DISPLAY_TRACKING[key] + pairing.trackingAdjust).toFixed(4),
    );
  }

  const bodySizes = {} as Record<BodySizeKey, number>;
  for (const key of Object.keys(BASE_TYPE_SCALE.body) as BodySizeKey[]) {
    bodySizes[key] = BASE_TYPE_SCALE.body[key];
  }

  return {
    pairingId,
    display: {
      family: pairing.display.family,
      fontFamily: `"${pairing.display.family}", ${pairing.display.fallback}`,
      fallback: pairing.display.fallback,
      weight: pairing.display.weight,
      lineHeight: LINE_HEIGHT.display,
      sizes: displaySizes,
      tracking,
    },
    body: {
      family: pairing.body.family,
      fontFamily: `"${pairing.body.family}", ${pairing.body.fallback}`,
      fallback: pairing.body.fallback,
      weight: pairing.body.weight,
      lineHeight: LINE_HEIGHT.body,
      sizes: bodySizes,
      weights: {
        regular: pairing.body.regular,
        medium: pairing.body.medium,
        semibold: pairing.body.semibold,
        bold: pairing.body.bold,
      },
    },
  };
}

export function initialsFrom(businessName: string): string {
  const words = businessName
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.slice(0, 2).map((w) => [...w][0] ?? '');
  return letters.join('').toUpperCase();
}

/**
 * Computes the full render-time set from the owner's tokens.
 *
 * Pure and deterministic: same tokens plus same scheme always produce the same
 * object. That is what makes the web preview trustworthy — it is not an
 * approximation of the phone, it is the identical computation.
 */
export function resolveTheme(tokens: ThemeTokens, options: ResolveOptions = {}): ResolvedTheme {
  const scheme = options.scheme ?? 'light';

  const { base: surfaceBase } = resolveSurface(tokens, scheme);
  const text = resolveText(surfaceBase);
  const surface = resolveSurfaceSet(surfaceBase, text.primary, scheme);

  const primary = resolveRole(
    tokens.colors.primary,
    surfaceBase,
    scheme,
    TUNING.min.darkBrandLarge,
  );
  const secondary = resolveRole(
    tokens.colors.secondary,
    surfaceBase,
    scheme,
    TUNING.min.darkBrandText,
  );
  const accent = resolveRole(
    tokens.colors.accent,
    surfaceBase,
    scheme,
    TUNING.min.darkBrandLarge,
  );

  return {
    schemaVersion: tokens.schemaVersion,
    scheme,
    brand: {
      businessName: tokens.brand.businessName,
      initials: initialsFrom(tokens.brand.businessName),
      logoUrl: tokens.brand.logoUrl,
      logoAspect: tokens.brand.logoAspect,
    },
    surface,
    text,
    primary,
    secondary,
    accent,
    button: resolveButton(tokens.buttons.style, primary, surface),
    radius: getRadiusScale(tokens.shape.radiusScale).values,
    typography: resolveTypography(tokens.typography.pairingId),
    placeholder: {
      fill: mixOklch(surfaceBase, text.primary, TUNING.placeholderMix[scheme]),
      ink: text.tertiary,
      chip: scheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.82)',
    },
    meta: {
      pairingId: tokens.typography.pairingId,
      radiusScale: tokens.shape.radiusScale,
      buttonStyle: tokens.buttons.style,
    },
  };
}

/**
 * Both schemes at once. This is the shape the public endpoint serves, so the
 * Expo app can honour the device's appearance setting without a second request
 * and without shipping the resolver's tuning constants to the client.
 */
export function resolveThemeSchemes(tokens: ThemeTokens): {
  light: ResolvedTheme;
  dark: ResolvedTheme;
} {
  return {
    light: resolveTheme(tokens, { scheme: 'light' }),
    dark: resolveTheme(tokens, { scheme: 'dark' }),
  };
}

export { contrastRatio, isDarkColor, INK, PAPER };
