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
import { useEffect, useState } from 'react';
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

/**
 * The app.
 *
 * Every pixel below `ThemeProvider` comes from `@wl/ui` — the same components
 * the admin tool's phone preview renders through react-native-web. This file
 * owns only the things a host owns: fetching, the font bundle, the device's
 * colour scheme, and the safe area.
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

  if (!fontsLoaded || status.kind === 'loading') {
    return (
      <View style={styles.centre}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status.kind === 'error') {
    return (
      <View style={styles.centre}>
        <Text style={styles.errorTitle}>Could not load {tenantSlug()}</Text>
        <Text style={styles.errorBody}>{status.message}</Text>
      </View>
    );
  }

  // Recomputed from tokens rather than read from `payload.resolved`, which is
  // the stronger proof: it shows this binary's resolver and the server's agree.
  // A production build would read `resolved` directly for a faster cold start.
  const theme = resolveTheme(status.data.theme.tokens, { scheme });
  const content = status.data.content.content;

  return (
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
        width={width}
        insets={{ top: insets.top, bottom: insets.bottom }}
      >
        <Screen screen={screen} content={content} />
      </AppShell>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  errorTitle: { fontSize: 15, fontWeight: '600' },
  errorBody: { fontSize: 13, opacity: 0.6, textAlign: 'center' },
});
