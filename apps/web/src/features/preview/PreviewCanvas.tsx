import type { SampleContent } from '@wl/api-client';
import { resolveTheme, type ColorScheme, type ThemeTokens } from '@wl/theme';
import { useMemo } from 'react';
import { Icon, Segmented } from '../../components/chrome.js';
import { PhoneApp, type PreviewScreen } from './PhoneApp.jsx';
import { PhoneFrame } from './PhoneFrame.jsx';

/**
 * The preview canvas.
 *
 * `resolveTheme` runs here — the same function the API stores output from and
 * the Expo app renders with. And what it feeds is `@wl/ui`, the same component
 * library the Expo app renders. This is not a hand-styled mock of the phone; it
 * is the phone, in an iframe.
 */

export type { PreviewScreen };

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
          <PhoneApp
            theme={theme}
            content={content}
            screen={screen}
            onScreenChange={onScreenChange}
          />
        </PhoneFrame>
      </div>
    </div>
  );
}
