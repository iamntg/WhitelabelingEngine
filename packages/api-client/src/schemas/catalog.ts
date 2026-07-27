import { ThemeTokens } from '@wl/theme';
import { z } from 'zod';
import { VerticalEnum } from './common.js';

/**
 * Catalog endpoints exist so the web app and the Expo app read the font
 * registry and presets from one place at runtime, rather than each bundling its
 * own copy that can fall out of step with what the server will accept.
 */

export const FontPairingWire = z
  .object({
    id: z.string(),
    label: z.string(),
    display: z.object({ family: z.string(), fallback: z.string(), weight: z.number() }),
    body: z.object({
      family: z.string(),
      fallback: z.string(),
      weight: z.number(),
      regular: z.number(),
      medium: z.number(),
      semibold: z.number(),
      bold: z.number(),
    }),
    scale: z.number(),
    trackingAdjust: z.number(),
  })
  .strict();

export const ListFontPairingsResponse = z
  .object({ pairings: z.array(FontPairingWire) })
  .strict();
export type ListFontPairingsResponse = z.infer<typeof ListFontPairingsResponse>;

export const PresetWire = z
  .object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    suggestedFor: VerticalEnum,
    tokens: ThemeTokens,
  })
  .strict();

export const ListPresetsResponse = z.object({ presets: z.array(PresetWire) }).strict();
export type ListPresetsResponse = z.infer<typeof ListPresetsResponse>;

export const RadiusScaleWire = z
  .object({
    id: z.string(),
    label: z.string(),
    previewRadius: z.number(),
    values: z.object({
      none: z.number(),
      sm: z.number(),
      md: z.number(),
      lg: z.number(),
      full: z.number(),
      logo: z.number(),
    }),
  })
  .strict();

export const ListRadiusScalesResponse = z.object({ scales: z.array(RadiusScaleWire) }).strict();
export type ListRadiusScalesResponse = z.infer<typeof ListRadiusScalesResponse>;
