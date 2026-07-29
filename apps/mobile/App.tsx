import { resolveTheme } from '@wl/theme';
import {
  AppShell,
  Screen,
  screenForTab,
  TAB_FOR_SCREEN,
  ThemeProvider,
  type AppScreen,
} from '@wl/ui';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_MAP } from './src/fonts.js';
import { loadApp, tenantSlug, type AppData } from './src/cache.js';
import { PhoneShell, useDeviceFrame } from './src/PhoneShell.js';

/**
 * The app.
 *
 * Every pixel below `ThemeProvider` comes from `@wl/ui` — the same components
 * the admin tool's phone preview renders through react-native-web. This file
 * owns only the things a host owns: fetching, the font bundle, the device's
 * colour scheme, the safe area, and — on the `web` target — whether there is a
 * device to draw around all of it.
 *
 * That division is the point. When an owner changes a colour and looks at the
 * preview, they are looking at this screen; there is no second implementation
 * that could quietly disagree with it.
 */

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; data: AppData }
  | { kind: 'error'; message: string };

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const [fontsLoaded] = useFonts(FONT_MAP);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [screen, setScreen] = useState<AppScreen>('home');
  const scheme = useColorScheme() ?? 'light';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Non-null only in a desktop browser. On a device, and on a phone's browser,
  // the window is the phone and everything below behaves exactly as it did.
  const frame = useDeviceFrame();

  useEffect(() => {
    let cancelled = false;

    loadApp()
      .then((data) => {
        if (!cancelled) setStatus({ kind: 'ready', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not load the app',
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Framing happens once, around whatever the app currently is. Loading and
  // failing inside the device too is the honest version: those are states a
  // customer's phone can be in, and a desktop visitor should see them there.
  const host = (node: ReactNode) =>
    frame ? (
      <PhoneShell frame={frame} scheme={scheme}>
        {node}
      </PhoneShell>
    ) : (
      node
    );

  if (!fontsLoaded || status.kind === 'loading') {
    return host(
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>,
    );
  }

  if (status.kind === 'error') {
    return host(
      <View style={styles.centre}>
        <Text style={styles.errorTitle}>Could not load {tenantSlug()}</Text>
        <Text style={styles.errorBody}>{status.message}</Text>
      </View>,
    );
  }

  // Recomputed from tokens rather than read from `payload.resolved`, which is
  // the stronger proof: it shows this binary's resolver and the server's agree.
  // A production build would read `resolved` directly for a faster cold start.
  const theme = resolveTheme(status.data.theme.tokens, { scheme });
  const content = status.data.content.content;

  return host(
    // `bundled`: expo-font registers each weight as its own family, so the
    // family name carries the weight. The preview loads the same faces from
    // Google under their real names and passes `css`. See `FontStrategy`.
    <ThemeProvider theme={theme} fonts="bundled">
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <AppShell
        content={content}
        activeTabId={TAB_FOR_SCREEN[screen]}
        // A tab with no screen behind it — `account` — leaves the current one
        // up rather than navigating somewhere blank. `screenForTab` owns that
        // decision, and the admin preview's tab bar makes the same one.
        onTabPress={(tabId) => {
          const next = screenForTab(tabId);
          if (next) setScreen(next);
        }}
        // The three facts that change inside a drawn device. The width is the
        // frame's, not the window's, or `@wl/ui` would resolve its card grid to
        // a desktop column width and overflow the screen it sits in. The insets
        // belong to a real device and are zero here; the 9:41 stand-in takes
        // their place, the same one the admin preview draws.
        width={frame ? frame.width : width}
        insets={frame ? { top: 0, bottom: 0 } : { top: insets.top, bottom: insets.bottom }}
        statusBar={frame ? 'simulated' : 'device'}
      >
        <Screen screen={screen} content={content} />
      </AppShell>
    </ThemeProvider>,
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  errorTitle: { fontSize: 15, fontWeight: '600' },
  errorBody: { fontSize: 13, opacity: 0.6, textAlign: 'center' },
});
