import { formatMoney, type SampleContent, type SampleItem } from '@wl/api-client';

/** Content lookups the screens share. No theme involved — just the payload. */

export function itemById(content: SampleContent, id: string): SampleItem | undefined {
  return content.items.find((item) => item.id === id);
}

/**
 * An item's position in the payload, which is what picks its illustration —
 * so the same dish draws the same thing on the list, the card and the detail.
 */
export function itemIndex(content: SampleContent, id: string): number {
  return Math.max(
    0,
    content.items.findIndex((item) => item.id === id),
  );
}

export function money(content: SampleContent, amount: number): string {
  return formatMoney({ amount, currency: content.currency }, content.locale);
}

/** The featured items, in payload order, skipping ids that no longer resolve. */
export function featuredItems(content: SampleContent): SampleItem[] {
  return content.home.featuredItemIds
    .map((id) => itemById(content, id))
    .filter((item): item is SampleItem => item !== undefined);
}
