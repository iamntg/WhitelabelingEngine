import { converter, formatHex, clampChroma } from 'culori';

/**
 * Colour conversion primitives. Everything downstream derives shades in OKLCH,
 * never in sRGB or HSL — naive channel interpolation produces muddy mid-tones
 * and unpredictable perceived lightness, which is exactly the class of bug that
 * only surfaces once a customer's app is already live.
 */

const toOklch = converter('oklch');
const toRgb = converter('rgb');

export interface Oklch {
  /** Perceptual lightness, 0 (black) – 1 (white). */
  l: number;
  /** Chroma. Unbounded in theory; sRGB tops out around 0.37. */
  c: number;
  /** Hue angle in degrees, 0–360. */
  h: number;
}

export class ColorParseError extends Error {
  constructor(public readonly input: string) {
    super(`Not a parseable colour: ${JSON.stringify(input)}`);
    this.name = 'ColorParseError';
  }
}

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export function hexToOklch(hex: string): Oklch {
  const parsed = toOklch(hex);
  if (!parsed) throw new ColorParseError(hex);
  return {
    l: clamp01(parsed.l),
    c: Math.max(0, parsed.c),
    // Achromatic colours (pure greys) have an undefined hue; 0 is a safe anchor
    // because chroma is 0 anyway, so the hue never affects the rendered value.
    h: parsed.h ?? 0,
  };
}

export function oklchToHex(color: Oklch): string {
  const gamutMapped = clampChroma(
    { mode: 'oklch', l: clamp01(color.l), c: Math.max(0, color.c), h: normalizeHue(color.h) },
    'oklch',
    'rgb',
  );
  const hex = formatHex(gamutMapped);
  if (!hex) throw new ColorParseError(JSON.stringify(color));
  return hex.toLowerCase();
}

export function normalizeHue(h: number): number {
  if (!Number.isFinite(h)) return 0;
  const wrapped = h % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Normalises `#ABC` / `#AABBCC` / named colours to lowercase 6-digit hex. */
export function normalizeHex(input: string): string {
  const rgb = toRgb(input);
  if (!rgb) throw new ColorParseError(input);
  const hex = formatHex(rgb);
  if (!hex) throw new ColorParseError(input);
  return hex.toLowerCase();
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** sRGB channels in the 0–1 range. */
export function hexToRgb(hex: string): Rgb {
  const parsed = toRgb(hex);
  if (!parsed) throw new ColorParseError(hex);
  return { r: clamp01(parsed.r), g: clamp01(parsed.g), b: clamp01(parsed.b) };
}

/**
 * Perceptual mix in OKLCH. `amount` is how far to travel from `from` to `to`,
 * 0 = `from`, 1 = `to`. Hue is interpolated the short way round the wheel, and
 * we fall back to the chromatic endpoint's hue when one side is achromatic so
 * that mixing grey into a colour doesn't swing it towards red.
 */
export function mixOklch(from: string, to: string, amount: number): string {
  const t = clamp01(amount);
  const a = hexToOklch(from);
  const b = hexToOklch(to);

  const l = a.l + (b.l - a.l) * t;
  const c = a.c + (b.c - a.c) * t;

  let h: number;
  if (a.c < 1e-4 && b.c < 1e-4) h = 0;
  else if (a.c < 1e-4) h = b.h;
  else if (b.c < 1e-4) h = a.h;
  else h = interpolateHue(a.h, b.h, t);

  return oklchToHex({ l, c, h });
}

function interpolateHue(a: number, b: number, t: number): number {
  const from = normalizeHue(a);
  const to = normalizeHue(b);
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeHue(from + delta * t);
}

/** Shifts perceptual lightness by `delta`, preserving hue and chroma intent. */
export function shiftLightness(hex: string, delta: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, l: clamp01(c.l + delta) });
}

/** Scales chroma by `factor` (0 = fully desaturated, 1 = unchanged). */
export function scaleChroma(hex: string, factor: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, c: Math.max(0, c.c * factor) });
}

export function withLightness(hex: string, l: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, l: clamp01(l) });
}
