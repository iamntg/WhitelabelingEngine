import { formatMoney, type PublicThemeResponse } from '@wl/api-client';
import { resolveTheme, type ResolvedTheme } from '@wl/theme';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { FONT_MAP, rnFontFamily } from './src/fonts.js';
import { loadTheme, tenantSlug } from './src/theme-cache.js';

/**
 * Scaffold only — one screen, whose job is to prove the theme contract works
 * end to end.
 *
 * What it demonstrates:
 *   1. Fetches the published theme from /public/v1/tenants/:slug/theme
 *   2. Caches it in AsyncStorage, so a cold offline launch still renders
 *   3. Applies resolveTheme() — the *same* function the web preview runs
 *   4. Honours the device's light/dark setting, since the scheme is render-time
 *
 * Deliberately no navigation, no further screens. Those come later; this exists
 * so a contract break surfaces here rather than in a customer's app.
 */

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; payload: PublicThemeResponse; fromCache: boolean; staleReason?: string }
  | { kind: 'error'; message: string };

export default function App() {
  const [fontsLoaded] = useFonts(FONT_MAP);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const scheme = useColorScheme() ?? 'light';

  useEffect(() => {
    let cancelled = false;

    loadTheme()
      .then((result) => {
        if (cancelled) return;
        setStatus({
          kind: 'ready',
          payload: result.theme,
          fromCache: result.fromCache,
          ...(result.staleReason !== undefined ? { staleReason: result.staleReason } : {}),
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Could not load the theme',
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
  const theme = resolveTheme(status.payload.tokens, { scheme });

  return <ThemedScreen theme={theme} payload={status.payload} status={status} />;
}

function ThemedScreen({
  theme,
  payload,
  status,
}: {
  theme: ResolvedTheme;
  payload: PublicThemeResponse;
  status: Extract<Status, { kind: 'ready' }>;
}) {
  const display = (weight?: number) => ({
    fontFamily: rnFontFamily(theme, 'display', weight),
    color: theme.text.primary,
  });
  const body = (weight?: number) => ({
    fontFamily: rnFontFamily(theme, 'body', weight),
    color: theme.text.primary,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 64, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: theme.radius.logo,
              backgroundColor: theme.primary.base,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: rnFontFamily(theme, 'body', theme.typography.body.weights.bold),
                fontSize: 14,
                color: theme.primary.on,
              }}
            >
              {theme.brand.initials.slice(0, 1)}
            </Text>
          </View>
          <Text style={{ ...display(), fontSize: 18, letterSpacing: -0.2 }}>
            {theme.brand.businessName}
          </Text>
        </View>

        <View>
          <Text
            style={{
              ...display(),
              fontSize: theme.typography.display.sizes.md,
              lineHeight: theme.typography.display.sizes.md * theme.typography.display.lineHeight,
            }}
          >
            The theme contract works
          </Text>
          <Text
            style={{
              ...body(),
              color: theme.text.secondary,
              fontSize: theme.typography.body.sizes.md,
              marginTop: 6,
            }}
          >
            v{payload.version} · {payload.tenant.vertical} · {theme.scheme} ·{' '}
            {status.fromCache ? 'from cache' : 'live'}
          </Text>
        </View>

        <View
          style={{
            height: 132,
            borderRadius: theme.radius.md,
            backgroundColor: theme.placeholder.fill,
            justifyContent: 'flex-end',
            padding: 12,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.accent.base,
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: theme.radius.full,
            }}
          >
            <Text
              style={{
                fontFamily: rnFontFamily(theme, 'body', theme.typography.body.weights.bold),
                fontSize: 10.5,
                letterSpacing: 0.4,
                color: theme.accent.on,
              }}
            >
              ACCENT ON PRIMARY
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 12,
              backgroundColor: theme.button.background,
              borderWidth: 1,
              borderColor: theme.button.border,
              borderRadius: theme.radius.md,
            }}
          >
            <Text
              style={{
                fontFamily: rnFontFamily(theme, 'body', theme.typography.body.weights.semibold),
                fontSize: theme.typography.body.sizes.base,
                color: theme.button.foreground,
              }}
            >
              {theme.meta.buttonStyle} button
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: theme.surface.border,
              borderRadius: theme.radius.md,
            }}
          >
            <Text style={{ ...body(), fontSize: theme.typography.body.sizes.base }}>Secondary</Text>
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.surface.border,
            borderRadius: theme.radius.md,
            padding: 14,
            gap: 8,
            backgroundColor: theme.surface.elevated,
          }}
        >
          <Row theme={theme} label="Font pairing" value={theme.meta.pairingId} />
          <Row theme={theme} label="Corners" value={`${theme.meta.radiusScale} · ${theme.radius.md}px`} />
          <Row theme={theme} label="Schema" value={`v${payload.schemaVersion}`} />
          <Row
            theme={theme}
            label="Sample price"
            value={formatMoney({ amount: 2600, currency: 'USD' })}
          />
        </View>

        {status.staleReason ? (
          <Text style={{ ...body(), color: theme.text.tertiary, fontSize: 11.5 }}>
            Showing the last saved theme — {status.staleReason}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ theme, label, value }: { theme: ResolvedTheme; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          fontFamily: rnFontFamily(theme, 'body'),
          fontSize: theme.typography.body.sizes.md,
          color: theme.text.secondary,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: rnFontFamily(theme, 'body', theme.typography.body.weights.medium),
          fontSize: theme.typography.body.sizes.md,
          color: theme.text.primary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  errorTitle: { fontSize: 15, fontWeight: '600' },
  errorBody: { fontSize: 13, opacity: 0.6, textAlign: 'center' },
});
