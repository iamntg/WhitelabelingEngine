import { ThemeTokens, type ResolvedTheme } from '@wl/theme';
import { z } from 'zod';
import { VerticalEnum } from './common.js';
import { SampleContent } from './content.js';

/**
 * The public payload — what a phone actually downloads.
 *
 * It carries `tokens` *and* `resolved`, deliberately. `resolved` means a cold
 * start renders correctly with zero computation and no colour library in the
 * bundle; `tokens` means a client on a newer resolver can recompute and pick up
 * improvements without waiting for a republish. `schemaVersion` tells it
 * whether that is safe.
 *
 * Both schemes ship together so the app can honour the device's appearance
 * setting instantly, without a second request when the user flips it.
 */

function resolvedThemeWire() {
  return z.custom<ResolvedTheme>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      'surface' in value &&
      'text' in value &&
      'radius' in value,
    { message: 'Not a resolved theme' },
  );
}

export const PublicAssets = z
  .object({
    logoUrl: z.string().url().nullable(),
    logoWidth: z.number().int().positive().nullable(),
    logoHeight: z.number().int().positive().nullable(),
  })
  .strict();

export const PublicThemeResponse = z
  .object({
    schemaVersion: z.number().int().positive(),
    version: z.number().int().positive(),
    tenant: z.object({ slug: z.string(), name: z.string(), vertical: VerticalEnum }).strict(),
    tokens: ThemeTokens,
    /**
     * `ResolvedTheme` for each scheme.
     *
     * Validated structurally rather than field by field, but typed exactly, so
     * consumers get full autocomplete on `resolved.light.primary.hover` without
     * a 60-field Zod schema restating the resolver's output — which would be a
     * second definition of the contract, free to drift from the first.
     */
    resolved: z.object({
      light: resolvedThemeWire(),
      dark: resolvedThemeWire(),
    }),
    assets: PublicAssets,
    publishedAt: z.string().datetime(),
  })
  .strict();
export type PublicThemeResponse = z.infer<typeof PublicThemeResponse>;

export const PublicContentResponse = z
  .object({
    tenant: z.object({ slug: z.string(), name: z.string(), vertical: VerticalEnum }).strict(),
    content: SampleContent,
  })
  .strict();
export type PublicContentResponse = z.infer<typeof PublicContentResponse>;
