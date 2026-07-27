/**
 * @wl/theme — the one theme token contract.
 *
 * Consumed unchanged by:
 *  - apps/web       the admin tool's phone preview (the same resolver, not a mock)
 *  - apps/mobile    the Expo app that renders the published theme
 *  - apps/api       server-side validation on publish
 *
 * No DOM, no Node, no React Native imports. Anything that cannot run in all
 * three environments does not belong in this package.
 */

export {
  SCHEMA_VERSION,
  HexColor,
  ThemeTokens,
  ThemeTokensPatch,
  BrandTokens,
  ColorTokens,
  TypographyTokens,
  ShapeTokens,
  ButtonTokens,
  ButtonStyleEnum,
  PairingIdEnum,
  RadiusScaleEnum,
  applyPatch,
  type ButtonStyle,
} from './schema.js';

export {
  resolveTheme,
  resolveThemeSchemes,
  initialsFrom,
  type ResolvedTheme,
  type ResolveOptions,
  type ColorScheme,
  type ColorRole,
  type ResolvedSurface,
  type ResolvedText,
  type ResolvedButton,
  type ResolvedFace,
  type ResolvedTypography,
} from './resolve.js';

export {
  checkContrast,
  validateForPublish,
  levelForRatio,
  thresholdsFor,
  CONTRAST_THRESHOLDS,
  TEXT_THRESHOLDS,
  NON_TEXT_THRESHOLDS,
  type ContrastResult,
  type ContrastLevel,
  type ContrastPairId,
  type ContrastThresholds,
  type CheckContrastOptions,
  type PublishValidation,
  type FixTarget,
} from './check.js';

export {
  FONT_PAIRINGS,
  PAIRING_IDS,
  getPairing,
  BASE_TYPE_SCALE,
  BASE_DISPLAY_TRACKING,
  LINE_HEIGHT,
  type PairingId,
  type FontPairing,
  type FontFace,
  type BodyFace,
  type DisplaySizeKey,
  type BodySizeKey,
} from './fonts.js';

export {
  RADIUS_SCALES,
  RADIUS_SCALE_IDS,
  getRadiusScale,
  type RadiusScale,
  type RadiusSet,
  type RadiusOption,
} from './radii.js';

export {
  PRESETS,
  COLOR_SWATCHES,
  getPreset,
  defaultTokens,
  type ThemePreset,
  type Vertical,
} from './presets.js';

export {
  diffTokens,
  describeChangeCount,
  type ThemeChange,
  type ChangeSummary,
  type ChangeKind,
} from './diff.js';

export {
  contrastRatio,
  relativeLuminance,
  roundRatio,
  isDarkColor,
} from './color/contrast.js';

export {
  hexToOklch,
  oklchToHex,
  mixOklch,
  shiftLightness,
  scaleChroma,
  withLightness,
  normalizeHex,
  ColorParseError,
  type Oklch,
} from './color/convert.js';

export { nudgeToRatio, ensureMinRatio } from './color/nudge.js';
export { pickOn, INK, PAPER } from './color/pick.js';
