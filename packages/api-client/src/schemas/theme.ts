import { ThemeTokens, ThemeTokensPatch } from '@wl/theme';
import { z } from 'zod';

/**
 * Theme wire contract.
 *
 * `ThemeTokens` and `ThemeTokensPatch` come straight from `@wl/theme` rather
 * than being restated here. The API validates with the same schema the resolver
 * consumes, so there is no seam where the wire format and the render format can
 * drift apart.
 *
 * `resolved` and `contrast` are typed loosely on the wire (`unknown` / passthrough)
 * on purpose: they are *outputs* of `@wl/theme`, and the compile-time types are
 * re-exported from there. Restating a 60-field resolver output as a Zod schema
 * would create exactly the duplicate contract this package exists to avoid.
 */

export { ThemeTokens, ThemeTokensPatch };

export const ContrastLevelEnum = z.enum(['pass', 'warn', 'fail']);

export const ContrastResultWire = z
  .object({
    pairId: z.string(),
    label: z.string(),
    scheme: z.enum(['light', 'dark']),
    ratio: z.number(),
    level: ContrastLevelEnum,
    criterion: z.enum(['text', 'non-text']),
    thresholds: z.object({ fail: z.number(), pass: z.number() }),
    message: z.string(),
    suggestion: z.string().optional(),
    fixTarget: z.enum(['primary', 'secondary', 'accent', 'background']),
    foreground: z.string(),
    background: z.string(),
    blocking: z.boolean(),
  })
  .strict();

export const ThemeChangeWire = z
  .object({
    field: z.string(),
    label: z.string(),
    kind: z.enum(['color', 'choice', 'text', 'asset']),
    from: z.string().nullable(),
    to: z.string().nullable(),
    fromText: z.string(),
    toText: z.string(),
    summary: z.string(),
  })
  .strict();

export const ChangeSummaryWire = z
  .object({ count: z.number().int().nonnegative(), changes: z.array(ThemeChangeWire) })
  .strict();

export const DraftResponse = z
  .object({
    tokens: ThemeTokens,
    updatedAt: z.string().datetime(),
    updatedBy: z.string().nullable(),
    /** Highest published version, or null if never published. */
    liveVersion: z.number().int().positive().nullable(),
    /**
     * The tokens currently live, so the publish modal can render a real
     * before/after through the same resolver rather than approximating it.
     * Null until the first publish.
     */
    liveTokens: ThemeTokens.nullable(),
    /** The version this draft would become on publish. */
    nextVersion: z.number().int().positive(),
    /** Diff against the live version — drives the header pill and the modal. */
    changeSummary: ChangeSummaryWire,
  })
  .strict();
export type DraftResponse = z.infer<typeof DraftResponse>;

export const PatchDraftBody = ThemeTokensPatch;
export type PatchDraftBody = z.infer<typeof PatchDraftBody>;

export const ValidateResponse = z
  .object({
    results: z.array(ContrastResultWire),
    blockers: z.array(ContrastResultWire),
    warnings: z.array(ContrastResultWire),
    /** False when a blocker exists. The publish button reads this, not the array length. */
    canPublish: z.boolean(),
    changeSummary: ChangeSummaryWire,
  })
  .strict();
export type ValidateResponse = z.infer<typeof ValidateResponse>;

export const PublishBody = z
  .object({
    /** Pair ids the owner explicitly ticked in the modal. */
    acknowledgedWarnings: z.array(z.string()).default([]),
  })
  .strict();
export type PublishBody = z.infer<typeof PublishBody>;

export const ThemeVersionSummary = z
  .object({
    version: z.number().int().positive(),
    publishedAt: z.string().datetime(),
    publishedBy: z.string().nullable(),
    changeSummary: ChangeSummaryWire,
    swatches: z.array(z.string()).length(3),
    isLive: z.boolean(),
  })
  .strict();
export type ThemeVersionSummary = z.infer<typeof ThemeVersionSummary>;

export const PublishResponse = z.object({ version: ThemeVersionSummary }).strict();
export type PublishResponse = z.infer<typeof PublishResponse>;

export const ListVersionsResponse = z
  .object({ versions: z.array(ThemeVersionSummary) })
  .strict();
export type ListVersionsResponse = z.infer<typeof ListVersionsResponse>;

export const RollbackBody = z.object({ version: z.number().int().positive() }).strict();
export type RollbackBody = z.infer<typeof RollbackBody>;

export const LogoUploadBody = z
  .object({
    filename: z.string().min(1).max(200),
    contentType: z.enum(['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']),
    bytes: z.number().int().positive().max(5 * 1024 * 1024),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export type LogoUploadBody = z.infer<typeof LogoUploadBody>;

export const LogoUploadResponse = z
  .object({
    assetId: z.string(),
    /** PUT the file here. */
    uploadUrl: z.string().url(),
    /** Where it will be readable once uploaded — written into the draft tokens. */
    publicUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  })
  .strict();
export type LogoUploadResponse = z.infer<typeof LogoUploadResponse>;
