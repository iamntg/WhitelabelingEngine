import { z } from 'zod';

export const VerticalEnum = z.enum(['restaurant', 'salon', 'studio']);
export type Vertical = z.infer<typeof VerticalEnum>;

export const RoleEnum = z.enum(['owner', 'admin']);
export type Role = z.infer<typeof RoleEnum>;

export const Id = z.string().min(1);

/**
 * Slugs appear in the public URL every phone hits, so they are locked down:
 * lowercase, no leading/trailing or doubled hyphens, and long enough not to
 * collide across tenants.
 */
export const Slug = z
  .string()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

/**
 * Money is integer minor units plus a currency code — never a float. A theme
 * preview that renders "$26.000000000000004" undermines the whole product.
 */
export const Money = z
  .object({
    amount: z.number().int(),
    currency: z.string().length(3).toUpperCase(),
  })
  .strict();
export type Money = z.infer<typeof Money>;

export function formatMoney(money: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount / 100);
}

/** "+$4.00" for add-ons, where the sign carries meaning. */
export function formatMoneyDelta(money: Money, locale = 'en-US'): string {
  const formatted = formatMoney({ ...money, amount: Math.abs(money.amount) }, locale);
  return money.amount < 0 ? `−${formatted}` : `+${formatted}`;
}

export const ApiErrorBody = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      /** Field-level detail for 400s, keyed by dotted path. */
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }),
  })
  .strict();
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
