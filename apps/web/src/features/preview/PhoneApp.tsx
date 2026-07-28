import type { SampleContent } from '@wl/api-client';
import type { ResolvedTheme } from '@wl/theme';
import {
  AppShell,
  Screen,
  screenForTab,
  TAB_FOR_SCREEN,
  ThemeProvider,
  type AppScreen,
} from '@wl/ui';
import { View } from 'react-native';

/**
 * The tenant's app, as the admin tool renders it.
 *
 * Everything below `ThemeProvider` is `@wl/ui` — the same components the Expo
 * app builds from, running here through react-native-web. There is no screen,
 * no icon and no piece of chrome in the preview that the phone does not also
 * draw from this code.
 *
 * The admin tool contributes exactly three facts, and all three are properties
 * of the host rather than of the theme:
 *
 *   `fonts="css"`      the preview loads the families from Google Fonts under
 *                      their real names, where the Expo app loads weight-named
 *                      faces it bundles. See `FontStrategy`.
 *   `width`            the iframe is 372pt; `Dimensions` would report the
 *                      browser window. See `viewport.tsx`.
 *   `statusBar`        there is no OS status bar in an iframe, so the shell
 *                      draws the 9:41 stand-in.
 *
 * Extracted from the canvas so the tests render the same tree the tool does. A
 * test that composed its own would stop testing the thing that ships.
 */

/** The preview iframe's viewport, in pt. `PhoneFrame` draws the same number. */
export const PHONE_WIDTH = 372;
export const PHONE_HEIGHT = 764;

/**
 * The CSS the container holding a `PhoneApp` must carry.
 *
 * `AppShell`'s root is a React Native `View` with `flex: 1`, which
 * react-native-web writes as `flex-grow:1; flex-shrink:1; flex-basis:0%`. In a
 * `display: block` parent that means nothing at all: the root falls back to
 * `height: auto` and sizes to its content. A tall screen then pushes the tab
 * bar past the bottom of the frame, and a short one stops early and lets the
 * bezel show through. Both look like screen bugs and neither is.
 *
 * Exported because two places mount this tree — the editor's iframe and the
 * proof-sheet script — and they had drifted. The proof sheet declared the flex
 * container, the iframe did not, so the sheet rendered correctly while the
 * actual preview was broken, and the thing built to catch that class of problem
 * was the reason it went unnoticed. One definition now.
 */
export const PHONE_CONTAINER_CSS = `
  height: ${PHONE_HEIGHT}px;
  width: ${PHONE_WIDTH}px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export type PreviewScreen = AppScreen;

export function PhoneApp({
  theme,
  content,
  screen,
  onScreenChange,
}: {
  theme: ResolvedTheme;
  content: SampleContent | null;
  screen: AppScreen;
  onScreenChange?: ((next: AppScreen) => void) | undefined;
}) {
  return (
    <ThemeProvider theme={theme} fonts="css">
      <AppShell
        content={content}
        activeTabId={TAB_FOR_SCREEN[screen]}
        // The preview's tab bar navigates, exactly as the phone's does. An
        // owner checking "does my Menu tab look right" should be able to press
        // it, and the screen switcher above the phone stays in sync because
        // both drive the same piece of state.
        onTabPress={onScreenChange ? (tabId) => onTabPress(tabId, onScreenChange) : undefined}
        width={PHONE_WIDTH}
        statusBar="simulated"
      >
        {content ? <Screen screen={screen} content={content} /> : <ContentSkeleton />}
      </AppShell>
    </ThemeProvider>
  );
}

/** Ignores a tab with nothing behind it rather than blanking the screen. */
function onTabPress(tabId: string, onScreenChange: (next: AppScreen) => void) {
  const next = screenForTab(tabId);
  if (next) onScreenChange(next);
}

/**
 * Shown while preview content loads. Deliberately neutral grey rather than
 * brand-tinted: a skeleton in the tenant's colours would look like a rendered
 * theme, and the owner would judge it as one.
 */
function ContentSkeleton() {
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <View style={{ height: 30, width: '55%', borderRadius: 8, backgroundColor: BAR_STRONG }} />
      <View style={{ height: 148, borderRadius: 12, backgroundColor: BAR }} />
      <View style={{ height: 18, width: '70%', borderRadius: 6, backgroundColor: BAR_STRONG }} />
      <View style={{ height: 14, width: '45%', borderRadius: 6, backgroundColor: BAR }} />
    </View>
  );
}

const BAR_STRONG = 'rgba(127,127,127,0.14)';
const BAR = 'rgba(127,127,127,0.10)';
