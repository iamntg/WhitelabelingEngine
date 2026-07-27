import { z } from 'zod';
import { Id, RoleEnum, Slug, VerticalEnum } from './common.js';

export const Tenant = z
  .object({
    id: Id,
    slug: Slug,
    name: z.string().min(1),
    vertical: VerticalEnum,
    createdAt: z.string().datetime(),
  })
  .strict();
export type Tenant = z.infer<typeof Tenant>;

/** The brand-list row. Everything the table renders, computed server-side. */
export const TenantSummary = Tenant.extend({
  role: RoleEnum,
  /** 'live' once a version exists, otherwise 'draft'. Drives the status pill. */
  status: z.enum(['live', 'draft']),
  liveVersion: z.number().int().positive().nullable(),
  /** Three swatches for the theme cell: primary, secondary, accent. */
  swatches: z.array(z.string()).length(3),
  /** Font pairing label, shown as the theme name. */
  themeName: z.string(),
  draftUpdatedAt: z.string().datetime().nullable(),
  draftUpdatedBy: z.string().nullable(),
  /** True when the draft differs from the live version — drives "unpublished changes". */
  hasUnpublishedChanges: z.boolean(),
}).strict();
export type TenantSummary = z.infer<typeof TenantSummary>;

export const ListTenantsResponse = z.object({ tenants: z.array(TenantSummary) }).strict();
export type ListTenantsResponse = z.infer<typeof ListTenantsResponse>;

export const CreateTenantBody = z
  .object({
    name: z.string().trim().min(1).max(60),
    vertical: VerticalEnum,
    /** Optional — derived from the name when omitted. */
    slug: Slug.optional(),
    /** Which preset to start from. Defaults to the vertical's suggested preset. */
    presetId: z.string().min(1).optional(),
  })
  .strict();
export type CreateTenantBody = z.infer<typeof CreateTenantBody>;

export const CreateTenantResponse = z.object({ tenant: Tenant }).strict();
export type CreateTenantResponse = z.infer<typeof CreateTenantResponse>;

export const TenantIdParams = z.object({ id: Id }).strict();
export const TenantSlugParams = z.object({ slug: Slug }).strict();
