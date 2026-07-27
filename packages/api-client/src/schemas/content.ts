import { z } from 'zod';
import { Id, Money, VerticalEnum } from './common.js';

/**
 * Sample content for the preview.
 *
 * Deliberately one shape across all three verticals rather than a union: the
 * four preview screens have the same skeleton everywhere, and only the words,
 * prices and icons change. A union would mean three renderers that can drift.
 *
 * Every string in a seeded payload is real — plausible dish names, real service
 * durations, actual class times. Never lorem ipsum, never "Item 1 / $0.00": an
 * owner judging their own brand against placeholder text cannot tell whether
 * the theme is working.
 *
 * Images are honest labelled placeholders (`imageLabel: "hero image 1200×800"`)
 * rather than stock photography, exactly as the design export does — a fake
 * photo flatters the theme and hides contrast problems.
 */

export const SampleCategory = z.object({ id: Id, name: z.string().min(1) }).strict();

export const SampleItem = z
  .object({
    id: Id,
    categoryId: Id,
    name: z.string().min(1),
    description: z.string().min(1),
    price: Money,
    /** Accent-coloured tag, e.g. "Chef's pick", "Most booked". Null for most items. */
    tag: z.string().min(1).nullable(),
    /** Secondary line, e.g. "45 min · with Priya". Null when not applicable. */
    meta: z.string().min(1).nullable(),
    imageLabel: z.string().min(1),
  })
  .strict();

export const SampleHome = z
  .object({
    /** Accent pill over the hero, e.g. "Tuesday · 2 for 1 pasta". */
    promoLabel: z.string().min(1),
    heroImageLabel: z.string().min(1),
    headline: z.string().min(1),
    subline: z.string().min(1),
    primaryActionLabel: z.string().min(1),
    secondaryActionLabel: z.string().min(1),
    listTitle: z.string().min(1),
    listLinkLabel: z.string().min(1),
    /** Two items featured on the home screen. */
    featuredItemIds: z.array(Id).min(1).max(3),
  })
  .strict();

export const SampleCatalog = z
  .object({
    title: z.string().min(1),
    categories: z.array(SampleCategory).min(2).max(6),
    /** Which category renders as selected in the preview. */
    activeCategoryId: Id,
    cartBarLabel: z.string().min(1),
  })
  .strict();

export const SampleDetail = z
  .object({
    itemId: Id,
    eyebrow: z.string().min(1),
    ratingValue: z.number().min(0).max(5),
    ratingCount: z.number().int().nonnegative(),
    ratingNoun: z.string().min(1),
    imageLabel: z.string().min(1),
    addOnsTitle: z.string().min(1),
    addOns: z
      .array(z.object({ id: Id, name: z.string().min(1), price: Money }).strict())
      .min(1)
      .max(4),
    primaryActionLabel: z.string().min(1),
  })
  .strict();

export const SampleCheckout = z
  .object({
    title: z.string().min(1),
    subline: z.string().min(1),
    lines: z
      .array(z.object({ qty: z.number().int().positive(), name: z.string().min(1), price: Money }).strict())
      .min(1)
      .max(4),
    /** Basis points, so tax is computed identically everywhere it is shown. */
    taxRateBps: z.number().int().nonnegative().max(10000),
    taxLabel: z.string().min(1),
    tipOptions: z.array(z.object({ label: z.string().min(1), bps: z.number().int().nonnegative() }).strict()),
    selectedTipIndex: z.number().int().nonnegative(),
    loyaltyLabel: z.string().min(1),
    payActionPrefix: z.string().min(1),
    footnote: z.string().min(1),
  })
  .strict();

export const SampleTab = z
  .object({
    id: Id,
    label: z.string().min(1),
    /** Material Symbols glyph name; mirrored by @expo/vector-icons on mobile. */
    icon: z.string().min(1),
  })
  .strict();

export const SampleContent = z
  .object({
    vertical: VerticalEnum,
    currency: z.string().length(3).toUpperCase(),
    locale: z.string().min(2),
    home: SampleHome,
    catalog: SampleCatalog,
    items: z.array(SampleItem).min(3).max(12),
    detail: SampleDetail,
    checkout: SampleCheckout,
    tabs: z.array(SampleTab).length(4),
  })
  .strict()
  .superRefine((content, ctx) => {
    const itemIds = new Set(content.items.map((i) => i.id));
    const categoryIds = new Set(content.catalog.categories.map((c) => c.id));

    for (const id of content.home.featuredItemIds) {
      if (!itemIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['home', 'featuredItemIds'],
          message: `Featured item "${id}" is not in items`,
        });
      }
    }
    if (!itemIds.has(content.detail.itemId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['detail', 'itemId'],
        message: `Detail item "${content.detail.itemId}" is not in items`,
      });
    }
    if (!categoryIds.has(content.catalog.activeCategoryId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['catalog', 'activeCategoryId'],
        message: `Active category "${content.catalog.activeCategoryId}" is not in categories`,
      });
    }
    for (const item of content.items) {
      if (!categoryIds.has(item.categoryId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: `Item "${item.id}" references unknown category "${item.categoryId}"`,
        });
      }
    }
    if (content.checkout.selectedTipIndex >= content.checkout.tipOptions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkout', 'selectedTipIndex'],
        message: 'Selected tip index is out of range',
      });
    }
  });

export type SampleContent = z.infer<typeof SampleContent>;
export type SampleItem = z.infer<typeof SampleItem>;
export type SampleCategory = z.infer<typeof SampleCategory>;
export type SampleTab = z.infer<typeof SampleTab>;

export interface CheckoutTotals {
  subtotal: Money;
  tax: Money;
  total: Money;
}

/**
 * Totals are computed, never stored, so the number under "Total" can never
 * disagree with the lines above it.
 */
export function checkoutTotals(checkout: z.infer<typeof SampleCheckout>, currency: string): CheckoutTotals {
  const subtotal = checkout.lines.reduce((sum, line) => sum + line.price.amount * line.qty, 0);
  const tax = Math.round((subtotal * checkout.taxRateBps) / 10000);
  return {
    subtotal: { amount: subtotal, currency },
    tax: { amount: tax, currency },
    total: { amount: subtotal + tax, currency },
  };
}
