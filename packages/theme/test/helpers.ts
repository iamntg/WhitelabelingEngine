import { oklchToHex } from '../src/color/convert.js';
import { SCHEMA_VERSION, type ThemeTokens } from '../src/schema.js';

export function tokens(overrides: {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  pairingId?: ThemeTokens['typography']['pairingId'];
  radiusScale?: ThemeTokens['shape']['radiusScale'];
  buttonStyle?: ThemeTokens['buttons']['style'];
  businessName?: string;
  logoUrl?: string | null;
  logoAspect?: number;
} = {}): ThemeTokens {
  return {
    brand: {
      businessName: overrides.businessName ?? 'Olive & Ash Kitchen',
      logoUrl: overrides.logoUrl ?? null,
      logoAspect: overrides.logoAspect ?? 1,
    },
    colors: {
      primary: overrides.primary ?? '#b4472b',
      secondary: overrides.secondary ?? '#2f4a3f',
      accent: overrides.accent ?? '#a8710c',
      background: overrides.background ?? '#fffbf2',
    },
    typography: { pairingId: overrides.pairingId ?? 'editorial' },
    shape: { radiusScale: overrides.radiusScale ?? 'rounded' },
    buttons: { style: overrides.buttonStyle ?? 'filled' },
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * A deterministic spread of hues and lightnesses used to assert the resolver's
 * guarantees hold across the whole input space, not just on the happy path.
 * Deterministic rather than random so a failure is reproducible.
 */
export function colorGrid(step = 40): string[] {
  const out: string[] = [];
  for (let h = 0; h < 360; h += step) {
    for (const l of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
      for (const c of [0.02, 0.09, 0.17]) {
        out.push(oklchToHex({ l, c, h }));
      }
    }
  }
  // Extremes that break naive implementations.
  out.push('#000000', '#ffffff', '#808080', '#7f7f7f', '#f5c518', '#00ff00', '#ff00ff');
  return out;
}
