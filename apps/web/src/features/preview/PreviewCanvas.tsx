import type { SampleContent } from '@wl/api-client';
import { resolveTheme, type ColorScheme, type ThemeTokens } from '@wl/theme';
import { useMemo } from 'react';
import { Icon, Segmented } from '../../components/chrome.js';
import { PhoneFrame } from './PhoneFrame.jsx';
import { CatalogScreen } from './screens/CatalogScreen.jsx';
import { CheckoutScreen } from './screens/CheckoutScreen.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { ItemScreen } from './screens/ItemScreen.jsx';
import { StatusBar, TabBar } from './screens/shared.jsx';

/**
 * The preview canvas.
 *
 * `resolveTheme` runs here — the same function the API stores output from and
 * the Expo app renders with. This is not a hand-styled mock of the phone; it is
 * the phone's own computation, which is what makes the preview trustworthy.
 */

export type PreviewScreen = 'home' | 'catalog' | 'item' | 'checkout';

/** Which tab bar entry lights up for each screen. */
const ACTIVE_TAB: Record<PreviewScreen, string> = {
  home: 'home',
  catalog: 'catalog',
  item: 'catalog',
  checkout: 'orders',
};

export function PreviewCanvas({
  tokens,
  content,
  screen,
  onScreenChange,
  scheme,
  onSchemeChange,
}: {
  tokens: ThemeTokens;
  content: SampleContent | null;
  screen: PreviewScreen;
  onScreenChange: (next: PreviewScreen) => void;
  scheme: ColorScheme;
  onSchemeChange: (next: ColorScheme) => void;
}) {
  const theme = useMemo(() => resolveTheme(tokens, { scheme }), [tokens, scheme]);

  // The catalog tab is labelled by the vertical — "Menu", "Services",
  // "Schedule" — so the screen switcher matches what the app actually says.
  const catalogLabel = content?.catalog.title ?? 'Menu';
  const detailLabel = content?.vertical === 'restaurant' ? 'Item Detail' : 'Detail';

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2.5">
        <Segmented
          label="Preview screen"
          value={screen}
          onChange={onScreenChange}
          options={[
            { id: 'home', label: 'Home' },
            { id: 'catalog', label: catalogLabel },
            { id: 'item', label: detailLabel },
            { id: 'checkout', label: 'Checkout' },
          ]}
        />
        <Segmented
          label="Appearance"
          value={scheme}
          onChange={onSchemeChange}
          options={[
            {
              id: 'light',
              title: 'Light appearance',
              label: (
                <>
                  <Icon name="light_mode" className="text-[16px]" />
                  Light
                </>
              ),
            },
            {
              id: 'dark',
              title: 'Dark appearance',
              label: (
                <>
                  <Icon name="dark_mode" className="text-[16px]" />
                  Dark
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-6">
        <PhoneFrame
          title={`${tokens.brand.businessName} preview`}
          label={`iPhone 15 · 393 × 852 · ${scheme}`}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: theme.surface.base,
              fontFamily: theme.typography.body.fontFamily,
              color: theme.text.primary,
            }}
          >
            <StatusBar theme={theme} />

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {content ? (
                <ScreenBody theme={theme} content={content} screen={screen} />
              ) : (
                <ContentSkeleton />
              )}
            </div>

            {content ? (
              <TabBar theme={theme} content={content} activeTabId={ACTIVE_TAB[screen]} />
            ) : null}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

function ScreenBody({
  theme,
  content,
  screen,
}: {
  theme: ReturnType<typeof resolveTheme>;
  content: SampleContent;
  screen: PreviewScreen;
}) {
  switch (screen) {
    case 'home':
      return <HomeScreen theme={theme} content={content} />;
    case 'catalog':
      return <CatalogScreen theme={theme} content={content} />;
    case 'item':
      return <ItemScreen theme={theme} content={content} />;
    case 'checkout':
      return <CheckoutScreen theme={theme} content={content} />;
  }
}

/**
 * Shown while preview content loads. Deliberately neutral grey rather than
 * brand-tinted: a skeleton in the tenant's colours would look like a rendered
 * theme, and the owner would judge it as one.
 */
function ContentSkeleton() {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{ height: '30px', width: '55%', borderRadius: '8px', background: 'rgba(127,127,127,0.14)' }}
      />
      <div style={{ height: '148px', borderRadius: '12px', background: 'rgba(127,127,127,0.10)' }} />
      <div
        style={{ height: '18px', width: '70%', borderRadius: '6px', background: 'rgba(127,127,127,0.14)' }}
      />
      <div
        style={{ height: '14px', width: '45%', borderRadius: '6px', background: 'rgba(127,127,127,0.10)' }}
      />
    </div>
  );
}
