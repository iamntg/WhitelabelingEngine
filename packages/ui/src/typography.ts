import { getPairing, type BodySizeKey, type DisplaySizeKey, type ResolvedTheme } from '@wl/theme';
import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { useFontStrategy, useTheme, type FontStrategy } from './theme-context.js';

/**
 * The single adapter from resolved type tokens to a React Native `TextStyle`.
 *
 * The resolver emits unitless numbers and tracking in em, because the resolved
 * theme is stored as JSON and handed to both hosts unchanged. Everything that
 * turns those into a renderable style happens here — screens never read
 * `theme.typography` directly, so there is exactly one place where a size, a
 * line height or a font family can be got wrong.
 */

export type BodyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextStyleOptions {
  color?: string;
}

export interface BodyStyleOptions extends TextStyleOptions {
  weight?: BodyWeight;
}

/**
 * Resolves the family, and the weight when the host expects one. See
 * `FontStrategy` for why the two hosts need different answers.
 */
export function fontFor(
  theme: ResolvedTheme,
  role: 'display' | 'body',
  weight: number | undefined,
  strategy: FontStrategy,
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  const pairing = getPairing(theme.typography.pairingId);
  const face = role === 'display' ? pairing.display : pairing.body;
  const resolved = weight ?? face.weight;

  if (strategy === 'css') {
    const resolvedFace = role === 'display' ? theme.typography.display : theme.typography.body;
    return {
      fontFamily: resolvedFace.fontFamily,
      fontWeight: String(resolved) as TextStyle['fontWeight'],
    };
  }

  // Falls back to the face's own weight when an exact match is not bundled —
  // DM Sans, for instance, maps semibold onto 700 rather than shipping a 600
  // that Google does not reliably provide as a static.
  const family =
    pairing.rnExports[`${face.family}-${resolved}`] ??
    pairing.rnExports[`${face.family}-${face.weight}`] ??
    'System';

  return { fontFamily: family };
}

export function displayStyle(
  theme: ResolvedTheme,
  size: DisplaySizeKey,
  strategy: FontStrategy,
  options: TextStyleOptions = {},
): TextStyle {
  const { display } = theme.typography;
  const fontSize = display.sizes[size];
  return {
    ...fontFor(theme, 'display', undefined, strategy),
    fontSize,
    lineHeight: fontSize * display.lineHeight,
    // Tracking is em on the token; RN's letterSpacing is absolute.
    letterSpacing: fontSize * display.tracking[size],
    color: options.color ?? theme.text.primary,
  };
}

export function bodyStyle(
  theme: ResolvedTheme,
  size: BodySizeKey,
  strategy: FontStrategy,
  options: BodyStyleOptions = {},
): TextStyle {
  const { body } = theme.typography;
  const fontSize = body.sizes[size];
  return {
    ...fontFor(theme, 'body', body.weights[options.weight ?? 'regular'], strategy),
    fontSize,
    lineHeight: fontSize * body.lineHeight,
    color: options.color ?? theme.text.primary,
  };
}

export interface TextStyles {
  display: (size: DisplaySizeKey, options?: TextStyleOptions) => TextStyle;
  body: (size: BodySizeKey, options?: BodyStyleOptions) => TextStyle;
}

/** What components actually call. */
export function useTextStyles(): TextStyles {
  const theme = useTheme();
  const strategy = useFontStrategy();

  return useMemo(
    () => ({
      display: (size, options) => displayStyle(theme, size, strategy, options),
      body: (size, options) => bodyStyle(theme, size, strategy, options),
    }),
    [theme, strategy],
  );
}
