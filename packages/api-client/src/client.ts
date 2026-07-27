import type { z } from 'zod';
import { ApiError, NetworkError } from './errors.js';
import {
  CreateTenantBody,
  CreateTenantResponse,
  DraftResponse,
  ListFontPairingsResponse,
  ListPresetsResponse,
  ListTenantsResponse,
  ListVersionsResponse,
  LogoUploadBody,
  LogoUploadResponse,
  PatchDraftBody,
  PublicContentResponse,
  PublicThemeResponse,
  PublishBody,
  PublishResponse,
  RollbackBody,
  ValidateResponse,
} from './schemas/index.js';

/**
 * Typed fetch client shared by apps/web and apps/mobile.
 *
 * Responses are parsed against the same schemas the API validates with, so a
 * server that starts returning a subtly different shape fails loudly at the
 * boundary instead of producing `undefined` three components deep.
 */

export interface ClientOptions {
  baseUrl: string;
  /** Called before every authenticated request. Return null when signed out. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Injectable for tests and for React Native's fetch. */
  fetch?: typeof fetch;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  /** Conditional GET for the public endpoints. */
  ifNoneMatch?: string;
}

export interface Cached<T> {
  data: T;
  etag: string | null;
  /** True when the server answered 304 and `data` came from the caller's cache. */
  notModified: boolean;
}

export function createClient(options: ClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function raw(path: string, init: RequestOptions = {}): Promise<Response> {
    const headers: Record<string, string> = { accept: 'application/json' };

    if (init.body !== undefined) headers['content-type'] = 'application/json';
    if (init.ifNoneMatch) headers['if-none-match'] = init.ifNoneMatch;

    if (init.auth !== false && options.getAccessToken) {
      const token = await options.getAccessToken();
      if (token) headers['authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        ...(init.signal ? { signal: init.signal } : {}),
      });
    } catch (cause) {
      // Preserve AbortError so callers can distinguish a cancelled autosave
      // from a genuinely unreachable server.
      if (cause instanceof Error && cause.name === 'AbortError') throw cause;
      throw new NetworkError(cause);
    }

    return response;
  }

  async function request<T extends z.ZodTypeAny>(
    schema: T,
    path: string,
    init: RequestOptions = {},
  ): Promise<z.infer<T>> {
    const response = await raw(path, init);
    if (!response.ok) throw await ApiError.fromResponse(response);
    return schema.parse(await response.json()) as z.infer<T>;
  }

  async function requestCached<T extends z.ZodTypeAny>(
    schema: T,
    path: string,
    cached: { data: z.infer<T>; etag: string | null } | null,
  ): Promise<Cached<z.infer<T>>> {
    const response = await raw(path, {
      auth: false,
      ...(cached?.etag ? { ifNoneMatch: cached.etag } : {}),
    });

    if (response.status === 304 && cached) {
      return { data: cached.data, etag: cached.etag, notModified: true };
    }
    if (!response.ok) throw await ApiError.fromResponse(response);

    return {
      data: schema.parse(await response.json()) as z.infer<T>,
      etag: response.headers.get('etag'),
      notModified: false,
    };
  }

  return {
    tenants: {
      list: (signal?: AbortSignal) =>
        request(ListTenantsResponse, '/v1/tenants', signal ? { signal } : {}),

      create: (body: CreateTenantBody) =>
        request(CreateTenantResponse, '/v1/tenants', {
          method: 'POST',
          body: CreateTenantBody.parse(body),
        }),
    },

    theme: {
      getDraft: (tenantId: string, signal?: AbortSignal) =>
        request(DraftResponse, `/v1/tenants/${tenantId}/theme/draft`, signal ? { signal } : {}),

      /** Debounced autosave. Pass the signal so a superseded save is cancelled. */
      patchDraft: (tenantId: string, patch: PatchDraftBody, signal?: AbortSignal) =>
        request(DraftResponse, `/v1/tenants/${tenantId}/theme/draft`, {
          method: 'PATCH',
          body: PatchDraftBody.parse(patch),
          ...(signal ? { signal } : {}),
        }),

      validate: (tenantId: string, signal?: AbortSignal) =>
        request(ValidateResponse, `/v1/tenants/${tenantId}/theme/validate`, {
          method: 'POST',
          body: {},
          ...(signal ? { signal } : {}),
        }),

      publish: (tenantId: string, body: PublishBody) =>
        request(PublishResponse, `/v1/tenants/${tenantId}/theme/publish`, {
          method: 'POST',
          body: PublishBody.parse(body),
        }),

      listVersions: (tenantId: string) =>
        request(ListVersionsResponse, `/v1/tenants/${tenantId}/theme/versions`),

      rollback: (tenantId: string, body: RollbackBody) =>
        request(PublishResponse, `/v1/tenants/${tenantId}/theme/rollback`, {
          method: 'POST',
          body: RollbackBody.parse(body),
        }),
    },

    assets: {
      createLogoUpload: (tenantId: string, body: LogoUploadBody) =>
        request(LogoUploadResponse, `/v1/tenants/${tenantId}/assets/logo`, {
          method: 'POST',
          body: LogoUploadBody.parse(body),
        }),
    },

    catalog: {
      fontPairings: () => request(ListFontPairingsResponse, '/v1/catalog/font-pairings'),
      presets: () => request(ListPresetsResponse, '/v1/catalog/presets'),
    },

    /** No auth. Consumed by the Expo app. */
    public: {
      theme: (slug: string, cached: { data: PublicThemeResponse; etag: string | null } | null = null) =>
        requestCached(PublicThemeResponse, `/public/v1/tenants/${slug}/theme`, cached),

      content: (
        slug: string,
        cached: { data: PublicContentResponse; etag: string | null } | null = null,
      ) => requestCached(PublicContentResponse, `/public/v1/tenants/${slug}/content`, cached),
    },
  };
}

export type ApiClient = ReturnType<typeof createClient>;
