import { z } from 'zod';
import { PAIRING_IDS } from './fonts.js';
import { RADIUS_SCALE_IDS } from './radii.js';

/**
 * The one theme token contract.
 *
 * Every field here is something a non-technical owner explicitly chooses.
 * Everything else — hover shades, text colours, borders, "on" colours — is
 * derived by `resolveTheme`. The constrained input surface is the product: an
 * owner who can set a hover shade is an owner who can ship an unreadable app.
 */

export const SCHEMA_VERSION = 1;

export const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour, e.g. #b4472b')
  .transform((s) => s.toLowerCase());

export const ButtonStyleEnum = z.enum(['filled', 'outline', 'soft']);
export type ButtonStyle = z.infer<typeof ButtonStyleEnum>;

export const PairingIdEnum = z.enum(PAIRING_IDS);
export const RadiusScaleEnum = z.enum(RADIUS_SCALE_IDS);

export const BrandTokens = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required').max(60),
    logoUrl: z.string().url().nullable(),
    /**
     * width / height of the uploaded logo. Written by the API on upload, never
     * by the client — see `POST /v1/tenants/:id/assets/logo`.
     */
    logoAspect: z.number().positive().finite().max(10),
  })
  .strict();

export const ColorTokens = z
  .object({
    primary: HexColor,
    secondary: HexColor,
    accent: HexColor,
    background: HexColor,
  })
  .strict();

export const TypographyTokens = z.object({ pairingId: PairingIdEnum }).strict();
export const ShapeTokens = z.object({ radiusScale: RadiusScaleEnum }).strict();
export const ButtonTokens = z.object({ style: ButtonStyleEnum }).strict();

export const ThemeTokens = z
  .object({
    brand: BrandTokens,
    colors: ColorTokens,
    typography: TypographyTokens,
    shape: ShapeTokens,
    buttons: ButtonTokens,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export type ThemeTokens = z.infer<typeof ThemeTokens>;

/**
 * Partial update body for autosave. Each group is optional but, once present,
 * is validated strictly — an unknown key is a 400, not a silent drop, because a
 * silently dropped key is how the web preview and the phone start to disagree.
 */
export const ThemeTokensPatch = z
  .object({
    brand: BrandTokens.partial().strict().optional(),
    colors: ColorTokens.partial().strict().optional(),
    typography: TypographyTokens.partial().strict().optional(),
    shape: ShapeTokens.partial().strict().optional(),
    buttons: ButtonTokens.partial().strict().optional(),
  })
  .strict();

export type ThemeTokensPatch = z.infer<typeof ThemeTokensPatch>;

/** Applies a patch and re-validates the whole object. */
export function applyPatch(base: ThemeTokens, patch: ThemeTokensPatch): ThemeTokens {
  return ThemeTokens.parse({
    brand: { ...base.brand, ...patch.brand },
    colors: { ...base.colors, ...patch.colors },
    typography: { ...base.typography, ...patch.typography },
    shape: { ...base.shape, ...patch.shape },
    buttons: { ...base.buttons, ...patch.buttons },
    schemaVersion: base.schemaVersion,
  });
}
