import { SCHEMA_VERSION, type ThemeTokens } from './schema.js';

/**
 * Starting points, so a new tenant never sees a blank editor.
 *
 * Two different things live here and they are not interchangeable:
 *
 *  - `COLOR_SWATCHES` — the per-channel quick picks shown beside each colour
 *    row. Lifted verbatim from the design export, saturation and all. These are
 *    *suggestions*: four of the five accents sit under 3:1 on white and will
 *    trip the accent guardrail on the spot, which is the guardrail doing its
 *    job — the owner gets the warning plus a one-click nudge to the nearest
 *    passing shade of the same hue, rather than a palette pre-dulled on their
 *    behalf.
 *
 *  - `PRESETS` — complete, publishable themes. Every one of these is asserted
 *    to produce zero contrast failures in `test/registry.test.ts`. A preset that
 *    a new owner cannot publish is worse than no preset at all.
 *
 *    Each preset draws its colours from the swatch list above, with accents
 *    taken to the darkest point on the same hue that still clears 3:1 against
 *    that preset's background (via `nudgeToRatio`, the same function behind the
 *    editor's "use suggested colour"). `ember` is the design export's own
 *    default theme, accent included.
 */

export const COLOR_SWATCHES = {
  primary: ['#e23d28', '#1c7c54', '#1f5fd0', '#7b3fa0', '#111114'],
  secondary: ['#0f5a54', '#8a4b1f', '#243b6b', '#6b2b45', '#4a4a50'],
  accent: ['#f5c518', '#37c08a', '#ff7a45', '#8e86c4', '#bfc4c9'],
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
    'Hot vermillion and gold. Built for menus.',
    'restaurant',
    'Your Restaurant',
    // The design export's own default theme, accent nudged from #f5c518 to the
    // deepest gold that still separates from white.
    { primary: '#e23d28', secondary: '#0f5a54', accent: '#ae8a00', background: '#ffffff' },
    'editorial',
    'rounded',
    'filled',
  ),
  preset(
    'grove',
    'Grove',
    'Deep green and lilac, with plenty of air.',
    'studio',
    'Your Studio',
    { primary: '#1c7c54', secondary: '#243b6b', accent: '#8e86c4', background: '#ffffff' },
    'modern',
    'subtle',
    'filled',
  ),
  preset(
    'graphite',
    'Graphite',
    'Near-black and confident, cut with emerald.',
    'salon',
    'Your Salon',
    { primary: '#111114', secondary: '#4a4a50', accent: '#00a270', background: '#ffffff' },
    'bold',
    'sharp',
    'outline',
  ),
  preset(
    'harbour',
    'Harbour',
    'Electric blue against a warm orange. Cool and precise.',
    'studio',
    'Your Studio',
    { primary: '#1f5fd0', secondary: '#8a4b1f', accent: '#e25f28', background: '#f6f5f2' },
    'technical',
    'subtle',
    'filled',
  ),
  preset(
    'plum',
    'Plum',
    'Rich purple and old gold. Suits salons and treatment menus.',
    'salon',
    'Your Salon',
    { primary: '#7b3fa0', secondary: '#6b2b45', accent: '#a88600', background: '#faf8f4' },
    'grand',
    'rounded',
    'soft',
  ),
  preset(
    'clay',
    'Clay',
    'Terracotta and sand, with a green that wakes it up.',
    'restaurant',
    'Your Café',
    { primary: '#8a4b1f', secondary: '#0f5a54', accent: '#009768', background: '#f3efe7' },
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
