import type { SampleContent } from '@wl/api-client';
import { CatalogScreen } from './CatalogScreen.js';
import { CheckoutScreen } from './CheckoutScreen.js';
import { HomeScreen } from './HomeScreen.js';
import { ItemScreen } from './ItemScreen.js';

/**
 * The screen list, and how it lines up with the tab bar.
 *
 * This lives here rather than in either host because both need it and they must
 * agree: if the admin tool lit a different tab for a screen than the phone
 * does, an owner would sign off on a tab bar the customer never sees.
 *
 * Item has no tab of its own — it is reached from the catalogue, so it keeps
 * the catalogue lit, exactly as a stack push does.
 */

export type AppScreen = 'home' | 'catalog' | 'item' | 'checkout';

export const APP_SCREENS: readonly AppScreen[] = ['home', 'catalog', 'item', 'checkout'];

/** Which tab lights up for each screen. */
export const TAB_FOR_SCREEN: Record<AppScreen, string> = {
  home: 'home',
  catalog: 'catalog',
  item: 'catalog',
  checkout: 'orders',
};

/**
 * Where a tab press lands. `account` is deliberately absent: the tab is in the
 * seeded content because a real app has one, and there is no screen behind it
 * yet. Returning null lets the caller leave the current screen up rather than
 * navigate somewhere blank.
 */
export function screenForTab(tabId: string): AppScreen | null {
  switch (tabId) {
    case 'home':
      return 'home';
    case 'catalog':
      return 'catalog';
    case 'orders':
      return 'checkout';
    default:
      return null;
  }
}

export function Screen({ screen, content }: { screen: AppScreen; content: SampleContent }) {
  switch (screen) {
    case 'home':
      return <HomeScreen content={content} />;
    case 'catalog':
      return <CatalogScreen content={content} />;
    case 'item':
      return <ItemScreen content={content} />;
    case 'checkout':
      return <CheckoutScreen content={content} />;
  }
}

export { CatalogScreen, CheckoutScreen, HomeScreen, ItemScreen };
