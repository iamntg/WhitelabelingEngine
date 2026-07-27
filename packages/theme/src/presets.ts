import { SCHEMA_VERSION, type ThemeTokens } from './schema.js';

/**
 * Starting points, so a new tenant never sees a blank editor.
 *
 * Two different things live here and they are not interchangeable:
 *
 *  - `COLOR_SWATCHES` — the per-channel quick picks shown beside each colour
 *    row. Lifted verbatim from the design export. These are *suggestions*, and
 *    some combinations of them will legitimately trip a contrast warning; that
 *    is the guardrail doing its job, not a bug in the swatch list.
 *
 *  - `PRESETS` — complete, publishable themes. Every one of these is asserted
 *    to produce zero contrast failures in `test/presets.test.ts`. A preset that
 *    a new owner cannot publish is worse than no preset at all.
 */

export const COLOR_SWATCHES = {
  primary: ['#e23d28', '#1c7c54', '#1f5fd0', '#7b3fa0', '#111114'],
  secondary: ['#0f5a54', '#8a4b1f', '#243b6b', '#6b2b45', '#4a4a50'],
  accent: ['#b8860b', '#1f8a63', '#c2521f', '#5d55a8', '#5f6670'],
  background: ['#ffffff', '#fffbf2', '#faf8f4', '#f6f5f2', '#f3efe7'],
} as const;

export type Vertical = 'restaurant' | 'salon' | 'studio';

export interface ThemePreset {
  id: string;
  label: string;
  /** One line for the preset picker. */
  description: string;
  /** Which vertical this reads best for. Used to order the picker, not to gate it. */
  suggestedFor: Vertical;
  tokens: ThemeTokens;
}

function preset(
  id: string,
  label: string,
  description: string,
  suggestedFor: Vertical,
  businessName: string,
  colors: ThemeTokens['colors'],
  pairingId: ThemeTokens['typography']['pairingId'],
  radiusScale: ThemeTokens['shape']['radiusScale'],
  buttonStyle: ThemeTokens['buttons']['style'],
): ThemePreset {
  return {
    id,
    label,
    description,
    suggestedFor,
    tokens: {
      brand: { businessName, logoUrl: null, logoAspect: 1 },
      colors,
      typography: { pairingId },
      shape: { radiusScale },
      buttons: { style: buttonStyle },
      schemaVersion: SCHEMA_VERSION,
    },
  };
}

export const PRESETS: readonly ThemePreset[] = [
  preset(
    'ember',
    'Ember',
    'Warm and appetising. Built for menus.',
    'restaurant',
    'Your Restaurant',
    { primary: '#b4472b', secondary: '#2f4a3f', accent: '#a8710c', background: '#fffbf2' },
    'editorial',
    'rounded',
    'filled',
  ),
  preset(
    'grove',
    'Grove',
    'Calm greens with plenty of air.',
    'studio',
    'Your Studio',
    { primary: '#1f5e4a', secondary: '#37456b', accent: '#2f7d63', background: '#ffffff' },
    'modern',
    'subtle',
    'filled',
  ),
  preset(
    'graphite',
    'Graphite',
    'Near-black and confident. Lets photography carry the app.',
    'salon',
    'Your Salon',
    { primary: '#1c1c1f', secondary: '#4a4a50', accent: '#5f6670', background: '#ffffff' },
    'bold',
    'sharp',
    'outline',
  ),
  preset(
    'harbour',
    'Harbour',
    'Cool, technical and precise.',
    'studio',
    'Your Studio',
    { primary: '#2a4a7b', secondary: '#37456b', accent: '#b25c2a', background: '#f6f5f2' },
    'technical',
    'subtle',
    'filled',
  ),
  preset(
    'plum',
    'Plum',
    'Rich and considered. Suits salons and treatment menus.',
    'salon',
    'Your Salon',
    { primary: '#6b3f8c', secondary: '#5a3a46', accent: '#8a5aa8', background: '#faf8f4' },
    'grand',
    'rounded',
    'soft',
  ),
  preset(
    'clay',
    'Clay',
    'Soft terracotta and sand. Friendly without being loud.',
    'restaurant',
    'Your Café',
    { primary: '#b6522f', secondary: '#7a5c3e', accent: '#96700f', background: '#f3efe7' },
    'modern',
    'pill',
    'soft',
  ),
];

export function getPreset(id: string): ThemePreset {
  const found = PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown preset: ${id}`);
  return found;
}

/** The theme a brand-new tenant starts on, before they pick anything. */
export function defaultTokens(businessName: string, vertical: Vertical): ThemeTokens {
  const match = PRESETS.find((p) => p.suggestedFor === vertical) ?? PRESETS[0];
  if (!match) throw new Error('PRESETS is empty');
  return {
    ...match.tokens,
    brand: { ...match.tokens.brand, businessName },
  };
}
