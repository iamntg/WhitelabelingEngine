import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PublicContentResponse,
  PublicThemeResponse,
  createClient,
  type PublicContentResponse as PublicContent,
  type PublicThemeResponse as PublicTheme,
} from '@wl/api-client';

/**
 * Just enough of a Zod schema to validate a cached payload.
 *
 * Structural rather than `ZodType`, so the app does not take a direct
 * dependency on zod for one type import — the schemas arrive from
 * `@wl/api-client`, which is where the wire contract is defined and the only
 * place this app should be reading it from.
 */
interface Parser<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

/**
 * Fetching and the offline cache, for both halves of what the app renders.
 *
 * A branded app must open correctly with no connectivity, so the last good
 * payload is written to AsyncStorage and used immediately on launch. The
 * network fetch then revalidates with the stored ETag, so an unchanged theme
 * costs a 304 rather than a full payload.
 *
 * Cached payloads are re-parsed through their schema on read. A cache written
 * by an older build must never reach the renderer unchecked — that is exactly
 * how a schema change turns into a blank screen on a customer's phone.
 *
 * Theme and content are cached under separate keys and revalidated
 * independently. They change on different clocks: an owner republishes a theme
 * deliberately and rarely, where content moves whenever the menu does.
 */

const THEME_KEY = 'wl.theme.v1';
const CONTENT_KEY = 'wl.content.v1';

interface CacheEntry<T> {
  data: T;
  etag: string | null;
  fetchedAt: string;
}

/** What the caller gets back: a payload, and whether it came off the network. */
interface Loaded<T> {
  data: T;
  fromCache: boolean;
  staleReason?: string;
}

export interface AppData {
  theme: PublicTheme;
  content: PublicContent;
  /** True when *anything* rendered came from disk rather than the network. */
  fromCache: boolean;
  /** Present when the network failed but a cached copy was available. */
  staleReason?: string;
}

interface FetchResult<T> {
  data: T;
  etag: string | null;
  notModified: boolean;
}

function apiBaseUrl(): string {
  return process.env['EXPO_PUBLIC_API_BASE_URL'] ?? 'http://localhost:4000';
}

export function tenantSlug(): string {
  return process.env['EXPO_PUBLIC_TENANT_SLUG'] ?? 'olive-ash-kitchen';
}

export const client = createClient({ baseUrl: apiBaseUrl() });

async function readCache<T>(key: string, schema: Parser<T>): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: unknown; etag: string | null; fetchedAt: string };
    const result = schema.safeParse(parsed.data);
    if (!result.success) {
      // A cache the current build cannot understand is worse than no cache.
      await AsyncStorage.removeItem(key);
      return null;
    }

    return { data: result.data, etag: parsed.etag ?? null, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // A full disk must not stop the app rendering; the payload is already in
    // memory and the next launch simply refetches.
  }
}

/** Prefers fresh, but never fails while a cached copy exists. */
async function loadCached<T>(
  key: string,
  schema: Parser<T>,
  fetcher: (cached: { data: T; etag: string | null } | null) => Promise<FetchResult<T>>,
): Promise<Loaded<T>> {
  const cached = await readCache(key, schema);

  try {
    const result = await fetcher(cached ? { data: cached.data, etag: cached.etag } : null);

    if (!result.notModified) {
      await writeCache(key, {
        data: result.data,
        etag: result.etag,
        fetchedAt: new Date().toISOString(),
      });
    }

    return { data: result.data, fromCache: false };
  } catch (error) {
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        staleReason: error instanceof Error ? error.message : 'Offline',
      };
    }
    throw error;
  }
}

export async function loadTheme(slug = tenantSlug()): Promise<Loaded<PublicTheme>> {
  return loadCached(THEME_KEY, PublicThemeResponse, (cached) => client.public.theme(slug, cached));
}

export async function loadContent(slug = tenantSlug()): Promise<Loaded<PublicContent>> {
  return loadCached(CONTENT_KEY, PublicContentResponse, (cached) =>
    client.public.content(slug, cached),
  );
}

/**
 * Everything the app needs to render, fetched together.
 *
 * Both requests go out at once rather than in sequence: on a cold launch over a
 * slow connection, serialising them doubles the time to first paint for no
 * reason — neither depends on the other.
 */
export async function loadApp(slug = tenantSlug()): Promise<AppData> {
  const [theme, content] = await Promise.all([loadTheme(slug), loadContent(slug)]);

  const staleReason = theme.staleReason ?? content.staleReason;

  return {
    theme: theme.data,
    content: content.data,
    fromCache: theme.fromCache || content.fromCache,
    ...(staleReason !== undefined ? { staleReason } : {}),
  };
}
