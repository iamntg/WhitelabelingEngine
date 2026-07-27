import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicThemeResponse, createClient, type PublicThemeResponse as PublicTheme } from '@wl/api-client';

/**
 * Theme fetching and offline cache.
 *
 * A branded app must open correctly with no connectivity, so the last good
 * theme is written to AsyncStorage and used immediately on launch. The network
 * fetch then revalidates in the background with the stored ETag, so an unchanged
 * theme costs a 304 rather than a full payload.
 *
 * The cached payload is re-parsed through `PublicThemeResponse` on read. A cache
 * written by an older build must never reach the renderer unchecked — that is
 * exactly how a schema change turns into a blank screen on a customer's phone.
 */

const CACHE_KEY = 'wl.theme.v1';

export interface CachedTheme {
  data: PublicTheme;
  etag: string | null;
  fetchedAt: string;
}

export interface ThemeLoadResult {
  theme: PublicTheme;
  /** True when this came from disk rather than the network. */
  fromCache: boolean;
  /** Present when the network failed but a cached theme was available. */
  staleReason?: string;
}

function apiBaseUrl(): string {
  return process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
}

export function tenantSlug(): string {
  return process.env['EXPO_PUBLIC_TENANT_SLUG'] ?? 'olive-ash-kitchen';
}

export const client = createClient({ baseUrl: apiBaseUrl() });

export async function readCache(): Promise<CachedTheme | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: unknown; etag: string | null; fetchedAt: string };
    const result = PublicThemeResponse.safeParse(parsed.data);
    if (!result.success) {
      // A cache the current build cannot understand is worse than no cache.
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }

    return { data: result.data, etag: parsed.etag ?? null, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

export async function writeCache(entry: CachedTheme): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // A full disk must not stop the app rendering; the theme is already in
    // memory and the next launch simply refetches.
  }
}

/**
 * Returns the theme to render, preferring fresh but never failing when a cached
 * copy exists.
 */
export async function loadTheme(slug = tenantSlug()): Promise<ThemeLoadResult> {
  const cached = await readCache();

  try {
    const result = await client.public.theme(
      slug,
      cached ? { data: cached.data, etag: cached.etag } : null,
    );

    if (!result.notModified) {
      await writeCache({
        data: result.data,
        etag: result.etag,
        fetchedAt: new Date().toISOString(),
      });
    }

    return { theme: result.data, fromCache: false };
  } catch (error) {
    if (cached) {
      return {
        theme: cached.data,
        fromCache: true,
        staleReason: error instanceof Error ? error.message : 'Offline',
      };
    }
    throw error;
  }
}
