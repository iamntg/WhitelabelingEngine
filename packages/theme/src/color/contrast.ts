import { hexToRgb } from './convert.js';

/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * Deliberately implemented from the spec rather than pulled from a library:
 * this exact function runs on the client for inline warnings and again on the
 * server to gate publish, and the two must agree bit for bit.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

function linearise(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** Contrast ratio, 1 (identical) – 21 (black on white). Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounded to 2dp for display and for stable equality in stored results. */
export function roundRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.18;
}
