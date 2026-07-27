import type { ResolvedTheme } from '@wl/theme';
import type { CSSProperties } from 'react';

/**
 * The web adapter over `ResolvedTheme`.
 *
 * The resolver emits unitless numbers because React Native's `borderRadius`
 * and `fontSize` take numbers and the resolved theme is stored as JSON and
 * handed to both platforms unchanged. This module is the only place that turns
 * them into CSS strings — the screens never hardcode a colour or a radius, they
 * only ever read from here.
 */

export const px = (value: number): string => `${value}px`;

/** Radii above the pill threshold are capped so CSS does not print "999px". */
export const radius = (value: number): string => (value >= 999 ? '9999px' : `${value}px`);

export function displayText(
  theme: ResolvedTheme,
  size: keyof ResolvedTheme['typography']['display']['sizes'],
): CSSProperties {
  const { display } = theme.typography;
  return {
    fontFamily: display.fontFamily,
    fontWeight: display.weight,
    fontSize: px(display.sizes[size]),
    letterSpacing: `${display.tracking[size]}em`,
    lineHeight: display.lineHeight,
    color: theme.text.primary,
  };
}

export function bodyText(
  theme: ResolvedTheme,
  size: keyof ResolvedTheme['typography']['body']['sizes'],
  options: { weight?: keyof ResolvedTheme['typography']['body']['weights']; color?: string } = {},
): CSSProperties {
  const { body } = theme.typography;
  return {
    fontFamily: body.fontFamily,
    fontWeight: body.weights[options.weight ?? 'regular'],
    fontSize: px(body.sizes[size]),
    lineHeight: body.lineHeight,
    color: options.color ?? theme.text.primary,
  };
}

/**
 * The striped placeholder the design uses instead of stock photography.
 * A fake photo flatters the theme and hides exactly the contrast problems the
 * owner needs to see.
 */
export function placeholderSurface(theme: ResolvedTheme): CSSProperties {
  return {
    backgroundColor: theme.placeholder.fill,
    backgroundImage:
      'repeating-linear-gradient(135deg, rgba(127,127,127,0.14) 0 6px, transparent 6px 12px)',
  };
}

export function imageChip(theme: ResolvedTheme): CSSProperties {
  return {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '10px',
    color: theme.placeholder.ink,
    background: theme.placeholder.chip,
    padding: '3px 6px',
    borderRadius: '4px',
  };
}

/** The themed button, resolved for whichever style the owner picked. */
export function buttonSurface(theme: ResolvedTheme): CSSProperties {
  return {
    background: theme.button.background,
    color: theme.button.foreground,
    border: `1px solid ${theme.button.border}`,
    borderRadius: radius(theme.radius.md),
  };
}

export function hairline(theme: ResolvedTheme): string {
  return `1px solid ${theme.surface.border}`;
}
