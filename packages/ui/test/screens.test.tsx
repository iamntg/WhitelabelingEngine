import type { SampleContent } from '@wl/api-client';
import { getPreset, resolveTheme, type ResolvedTheme } from '@wl/theme';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../src/components/AppShell.js';
import { RESTAURANT, SALON, STUDIO } from '@wl/api-client/fixtures';
import {
  APP_SCREENS,
  Screen,
  screenForTab,
  TAB_FOR_SCREEN,
  type AppScreen,
} from '../src/screens/index.js';
import { ThemeProvider } from '../src/theme-context.js';

/**
 * The screens are shared, so these are the only tests of them that exist — the
 * admin app no longer has its own copies to test.
 *
 * These mount for real rather than rendering to a string, because what the
 * three ported screens added over Home is *state*: a selected category, a
 * chosen add-on, a tip. Server-rendered markup shows the initial state and
 * nothing about whether pressing anything works.
 */

// Vitest is not running with globals, so Testing Library's automatic cleanup
// never installs itself. Without this, every `getByText` searches the DOM left
// behind by earlier tests and starts failing on duplicates.
afterEach(cleanup);

/** aria-selected on the element itself, or on the pressable that owns it. */
function selectionOf(label: string): string | null {
  const node = screen.getByText(label);
  const owner = node.getAttribute('aria-selected') !== null ? node : node.closest('[aria-selected]');
  return owner?.getAttribute('aria-selected') ?? null;
}

/** The pressable carrying the selection state for a label. */
function selectable(label: string): Element {
  const node = screen.getByText(label);
  const owner = node.getAttribute('aria-selected') !== null ? node : node.closest('[aria-selected]');
  if (!owner) throw new Error(`No selectable ancestor for "${label}"`);
  return owner;
}

const theme = (scheme: 'light' | 'dark' = 'light'): ResolvedTheme =>
  resolveTheme(getPreset('ember').tokens, { scheme });

function mount(content: SampleContent, initial: AppScreen = 'home') {
  return render(
    <ThemeProvider theme={theme()} fonts="css">
      <AppShell content={content} activeTabId={TAB_FOR_SCREEN[initial]} width={372}>
        <Screen screen={initial} content={content} />
      </AppShell>
    </ThemeProvider>,
  );
}

describe('every screen, every vertical', () => {
  const verticals: Array<[string, SampleContent]> = [
    ['restaurant', RESTAURANT],
    ['salon', SALON],
    ['studio', STUDIO],
  ];

  for (const [name, content] of verticals) {
    for (const appScreen of APP_SCREENS) {
      it(`mounts ${appScreen} for ${name} without throwing`, () => {
        const { container } = render(
          <ThemeProvider theme={theme()} fonts="css">
            <AppShell content={content} activeTabId={TAB_FOR_SCREEN[appScreen]} width={372}>
              <Screen screen={appScreen} content={content} />
            </AppShell>
          </ThemeProvider>,
        );
        expect(container.textContent?.length ?? 0).toBeGreaterThan(40);
      });
    }
  }
});

describe('the catalog', () => {
  it('starts on the category the content nominates', () => {
    mount(RESTAURANT, 'catalog');
    const active = RESTAURANT.catalog.categories.find(
      (c) => c.id === RESTAURANT.catalog.activeCategoryId,
    );
    expect(selectionOf(active?.name ?? '')).toBe('true');
  });

  it('moves the selection when another category is pressed', () => {
    mount(RESTAURANT, 'catalog');
    const other = RESTAURANT.catalog.categories.find(
      (c) => c.id !== RESTAURANT.catalog.activeCategoryId,
    );
    expect(selectionOf(other?.name ?? '')).toBe('false');
    fireEvent.click(selectable(other?.name ?? ''));
    expect(selectionOf(other?.name ?? '')).toBe('true');
  });

  it('totals the cart bar from the checkout lines, not a stored figure', () => {
    mount(RESTAURANT, 'catalog');
    const total = RESTAURANT.checkout.lines.reduce((s, l) => s + l.price.amount * l.qty, 0);
    expect(screen.getByText(`$${(total / 100).toFixed(2)}`)).toBeTruthy();
  });
});

describe('the item detail', () => {
  it('pre-selects the first add-on, so the selected treatment is visible at rest', () => {
    mount(RESTAURANT, 'item');
    const first = RESTAURANT.detail.addOns[0];
    expect(selectionOf(first?.name ?? '')).toBe('true');
  });

  it('deselects an add-on when it is pressed again', () => {
    mount(RESTAURANT, 'item');
    const first = RESTAURANT.detail.addOns[0];
    fireEvent.click(selectable(first?.name ?? ''));
    expect(selectionOf(first?.name ?? '')).toBe('false');
  });

  it('steps the quantity up, and never below one', () => {
    mount(RESTAURANT, 'item');
    expect(screen.getByText('1')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Increase quantity'));
    expect(screen.getByText('2')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(screen.getByText('1')).toBeTruthy();
  });
});

describe('checkout', () => {
  it('computes the total from the lines', () => {
    mount(RESTAURANT, 'checkout');
    // The design's checkout shows $31.00 + $2.64 tax = $33.64.
    expect(screen.getByText('$31.00')).toBeTruthy();
    expect(screen.getByText('$2.64')).toBeTruthy();
    expect(screen.getAllByText('$33.64').length).toBeGreaterThan(0);
  });

  it('moves the tip selection when another option is pressed', () => {
    mount(RESTAURANT, 'checkout');
    const options = RESTAURANT.checkout.tipOptions;
    const other = options.findIndex((_, i) => i !== RESTAURANT.checkout.selectedTipIndex);
    const label = options[other]?.label ?? '';

    expect(selectionOf(label)).toBe('false');
    fireEvent.click(selectable(label));
    expect(selectionOf(label)).toBe('true');
  });
});

describe('the shell keeps content off the top edge', () => {
  const topSpacerHeights = (container: HTMLElement): string[] =>
    [...container.querySelectorAll('[style*="height"]')]
      .map((node) => /(?:^|;)height:\s*([\d.]+)px/.exec(node.getAttribute('style') ?? '')?.[1])
      .filter((height): height is string => height !== undefined);

  it('pads the header when the platform reports no inset at all', () => {
    // react-native-safe-area-context reports zero in a browser, which is where
    // the Expo app's `web` target runs. Zero put the logo flush against the
    // top edge.
    const { container } = render(
      <ThemeProvider theme={theme()} fonts="css">
        <AppShell
          content={RESTAURANT}
          activeTabId="home"
          width={372}
          insets={{ top: 0, bottom: 0 }}
        >
          <Screen screen="home" content={RESTAURANT} />
        </AppShell>
      </ThemeProvider>,
    );

    expect(topSpacerHeights(container)).toContain('16');
  });

  it('does not pad a device that already reports one', () => {
    const { container } = render(
      <ThemeProvider theme={theme()} fonts="css">
        <AppShell
          content={RESTAURANT}
          activeTabId="home"
          width={372}
          insets={{ top: 59, bottom: 34 }}
        >
          <Screen screen="home" content={RESTAURANT} />
        </AppShell>
      </ThemeProvider>,
    );

    // 59, not 59 + 16: the inset is clamped, never added to.
    expect(topSpacerHeights(container)).toContain('59');
    expect(topSpacerHeights(container)).not.toContain('75');
  });

  it('draws the stand-in status bar instead when the host has no OS one', () => {
    const { container } = render(
      <ThemeProvider theme={theme()} fonts="css">
        <AppShell content={RESTAURANT} activeTabId="home" width={372} statusBar="simulated">
          <Screen screen="home" content={RESTAURANT} />
        </AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByText('9:41')).toBeTruthy();
    expect(topSpacerHeights(container)).toContain('44');
  });
});

describe('the tab bar and the screens agree', () => {
  it('lights the catalog tab on the item screen, as a stack push would', () => {
    expect(TAB_FOR_SCREEN.item).toBe(TAB_FOR_SCREEN.catalog);
  });

  it('round-trips every tab that has a screen behind it', () => {
    for (const appScreen of APP_SCREENS) {
      const tab = TAB_FOR_SCREEN[appScreen];
      const back = screenForTab(tab);
      // Item is reached from the catalogue rather than from a tab, so it is the
      // one screen a tab press cannot land on.
      expect(back, `${tab} → ${back}`).toBe(appScreen === 'item' ? 'catalog' : appScreen);
    }
  });

  it('leaves a tab with no screen behind it alone', () => {
    expect(screenForTab('account')).toBeNull();
    for (const content of [RESTAURANT, SALON, STUDIO]) {
      // Every seeded tab either navigates or is deliberately inert; none may be
      // a name `screenForTab` has simply never heard of.
      for (const tab of content.tabs) {
        expect(['home', 'catalog', 'orders', 'account']).toContain(tab.id);
      }
    }
  });
});
