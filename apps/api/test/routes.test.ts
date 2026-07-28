import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  asUser,
  buildTestApp,
  freshState,
  OTHER_USER,
  TENANT_ID,
  TENANT_SLUG,
  TEST_USER,
  testTokens,
  type StubState,
} from './harness.js';

let app: FastifyInstance;
let state: StubState;

beforeEach(async () => {
  state = freshState();
  ({ app } = await buildTestApp(state));
});

afterEach(async () => {
  await app.close();
});

describe('auth', () => {
  it('refuses an unauthenticated request', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tenants' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('unauthorized');
  });

  it('refuses a malformed authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tenants',
      headers: { authorization: 'Basic abc123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a dev token outside production', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/tenants', headers: asUser(TEST_USER) });
    expect(res.statusCode).toBe(200);
  });
});

describe('membership guard', () => {
  it('lets a member read their own draft', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(TEST_USER),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tokens.colors.primary).toBe(testTokens().colors.primary);
  });

  it('refuses a non-member', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(OTHER_USER),
    });
    expect(res.statusCode).toBe(403);
  });

  it('does not disclose whether an unknown tenant exists', async () => {
    // A 404 here would let anyone enumerate valid tenant ids.
    const res = await app.inject({
      method: 'GET',
      url: '/v1/tenants/tenant_does_not_exist/theme/draft',
      headers: asUser(TEST_USER),
    });
    expect(res.statusCode).toBe(403);
  });

  it('guards every tenant-scoped route, not just the read', async () => {
    const routes: Array<[string, 'GET' | 'POST' | 'PATCH', unknown]> = [
      [`/v1/tenants/${TENANT_ID}/theme/draft`, 'PATCH', { colors: { primary: '#123456' } }],
      [`/v1/tenants/${TENANT_ID}/theme/validate`, 'POST', {}],
      [`/v1/tenants/${TENANT_ID}/theme/publish`, 'POST', { acknowledgedIssues: [] }],
      [`/v1/tenants/${TENANT_ID}/theme/versions`, 'GET', undefined],
      [`/v1/tenants/${TENANT_ID}/theme/rollback`, 'POST', { version: 1 }],
    ];

    for (const [url, method, payload] of routes) {
      const res = await app.inject({
        method,
        url,
        headers: asUser(OTHER_USER),
        payload: payload as never,
      });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
  });
});

describe('PATCH draft', () => {
  it('merges a partial update and leaves the rest alone', async () => {
    const before = testTokens();
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(TEST_USER),
      payload: { colors: { primary: '#123456' } },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tokens.colors.primary).toBe('#123456');
    expect(body.tokens.colors.secondary).toBe(before.colors.secondary);
    expect(body.tokens.typography.pairingId).toBe(before.typography.pairingId);
  });

  it('rejects an unknown token key rather than dropping it', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(TEST_USER),
      payload: { colors: { tertiary: '#123456' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid colour', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(TEST_USER),
      payload: { colors: { primary: 'rebeccapurple' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('reports the diff against the live version', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/tenants/${TENANT_ID}/theme/draft`,
      headers: asUser(TEST_USER),
      payload: { shape: { radiusScale: 'sharp' } },
    });

    const body = res.json();
    expect(body.changeSummary.count).toBe(1);
    expect(body.changeSummary.changes[0].summary).toBe('Corners: Rounded → Sharp');
    expect(body.nextVersion).toBe(2);
  });
});

describe('publish', () => {
  it('refuses a theme with a contrast failure that was never confirmed', async () => {
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ accent: '#f5c518', background: '#ffffff' });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/publish`,
      headers: asUser(TEST_USER),
      payload: { acknowledgedIssues: [] },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('confirmation_required');
    expect(res.json().error.details[0].path).toBe('accent-on-background');
    expect(state.versions).toHaveLength(1);
  });

  it('publishes that same theme once the failure is confirmed', async () => {
    // The owner's call to make. What the server will not accept is making it
    // by omission — the check is re-run against the stored draft, so the
    // acknowledgement has to name the problem that actually exists.
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ accent: '#f5c518', background: '#ffffff' });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/publish`,
      headers: asUser(TEST_USER),
      payload: { acknowledgedIssues: ['accent-on-background'] },
    });

    expect(res.statusCode).toBe(201);
    expect(state.versions).toHaveLength(2);
  });

  it('does not accept an acknowledgement for a different pair', async () => {
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ accent: '#f5c518', background: '#ffffff' });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/publish`,
      headers: asUser(TEST_USER),
      payload: { acknowledgedIssues: ['text-on-surface'] },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('confirmation_required');
    expect(state.versions).toHaveLength(1);
  });

  it('snapshots the draft and bumps the version', async () => {
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ primary: '#123456' });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/publish`,
      headers: asUser(TEST_USER),
      payload: { acknowledgedIssues: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().version.version).toBe(2);
    expect(state.versions).toHaveLength(2);

    // The snapshot is immutable: the previous version keeps its own tokens.
    const v1 = state.versions.find((v) => v.version === 1);
    expect((v1?.tokens as { colors: { primary: string } }).colors.primary).not.toBe('#123456');
  });

  it('records a human-readable change summary on the version', async () => {
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ primary: '#123456' });

    await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/publish`,
      headers: asUser(TEST_USER),
      payload: { acknowledgedIssues: [] },
    });

    const v2 = state.versions.find((v) => v.version === 2);
    const summary = v2?.changeSummary as { changes: Array<{ summary: string }> };
    expect(summary.changes.map((c) => c.summary)).toContain('Primary colour changed');
  });
});

describe('rollback', () => {
  it('republishes an old version forward rather than deleting history', async () => {
    state.versions.push({
      id: 'v2',
      tenantId: TENANT_ID,
      version: 2,
      tokens: testTokens({ primary: '#123456' }),
      publishedAt: new Date(),
      publishedBy: TEST_USER,
      changeSummary: { count: 1, changes: [] },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/rollback`,
      headers: asUser(TEST_USER),
      payload: { version: 1 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().version.version).toBe(3);
    expect(state.versions).toHaveLength(3);
    expect(state.versions.map((v) => v.version).sort()).toEqual([1, 2, 3]);
  });

  it('refuses to roll back to the version that is already live', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/rollback`,
      headers: asUser(TEST_USER),
      payload: { version: 1 },
    });
    expect(res.statusCode).toBe(409);
  });

  it('refuses a version that does not exist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/tenants/${TENANT_ID}/theme/rollback`,
      headers: asUser(TEST_USER),
      payload: { version: 99 },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('public theme endpoint', () => {
  it('needs no authentication', async () => {
    const res = await app.inject({ method: 'GET', url: `/public/v1/tenants/${TENANT_SLUG}/theme` });
    expect(res.statusCode).toBe(200);
  });

  it('serves both resolved schemes so the device can pick', async () => {
    const res = await app.inject({ method: 'GET', url: `/public/v1/tenants/${TENANT_SLUG}/theme` });
    const body = res.json();
    expect(body.resolved.light.scheme).toBe('light');
    expect(body.resolved.dark.scheme).toBe('dark');
    expect(body.resolved.light.surface.base).not.toBe(body.resolved.dark.surface.base);
  });

  it('serves tokens alongside resolved, so a newer client can recompute', async () => {
    const body = (await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` })).json();
    expect(body.tokens.colors.primary).toBeDefined();
    expect(body.schemaVersion).toBe(1);
  });

  it('sets the agreed cache headers', async () => {
    const res = await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` });
    expect(res.headers['cache-control']).toBe(
      'public, max-age=300, stale-while-revalidate=86400',
    );
    expect(res.headers['etag']).toMatch(/^"[\w-]+"$/);
  });

  it('answers 304 when the caller already has the current version', async () => {
    const first = await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` });
    const etag = first.headers['etag'] as string;

    const second = await app.inject({
      url: `/public/v1/tenants/${TENANT_SLUG}/theme`,
      headers: { 'if-none-match': etag },
    });

    expect(second.statusCode).toBe(304);
    expect(second.body).toBe('');
  });

  it('changes the ETag when the theme is republished', async () => {
    const before = (await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` })).headers['etag'];

    state.versions.push({
      id: 'v2',
      tenantId: TENANT_ID,
      version: 2,
      tokens: testTokens({ primary: '#123456' }),
      publishedAt: new Date(),
      publishedBy: TEST_USER,
      changeSummary: { count: 1, changes: [] },
    });

    const after = (await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` })).headers['etag'];
    expect(after).not.toBe(before);
  });

  it('never serves an unpublished draft to the public', async () => {
    // Serving the draft here would put unreviewed work on real phones.
    state.versions = [];
    const res = await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/theme` });
    expect(res.statusCode).toBe(404);
  });

  it('404s an unknown slug', async () => {
    const res = await app.inject({ url: '/public/v1/tenants/nope-nope/theme' });
    expect(res.statusCode).toBe(404);
  });
});

describe('public content endpoint', () => {
  it('serves vertical-appropriate content with real values', async () => {
    const body = (await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/content` })).json();
    expect(body.content.vertical).toBe('restaurant');
    expect(body.content.items[0].name).toBe('Ash-Roasted Half Chicken');
    expect(body.content.items[0].price).toEqual({ amount: 2600, currency: 'USD' });
  });

  it('caches like the theme endpoint', async () => {
    const res = await app.inject({ url: `/public/v1/tenants/${TENANT_SLUG}/content` });
    expect(res.headers['cache-control']).toContain('stale-while-revalidate=86400');
  });
});

describe('catalog', () => {
  it('serves exactly the five pairings the schema accepts', async () => {
    const res = await app.inject({ url: '/v1/catalog/font-pairings', headers: asUser(TEST_USER) });
    expect(res.json().pairings).toHaveLength(5);
  });

  it('does not leak React Native bundling detail to clients', async () => {
    const body = (await app.inject({ url: '/v1/catalog/font-pairings', headers: asUser(TEST_USER) })).json();
    expect(body.pairings[0].rnExports).toBeUndefined();
  });

  it('serves presets that are all publishable', async () => {
    const res = await app.inject({ url: '/v1/catalog/presets', headers: asUser(TEST_USER) });
    const { presets } = res.json();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.every((p: { tokens: unknown }) => p.tokens)).toBe(true);
  });
});

describe('brand list', () => {
  it('returns the row data the table renders, computed server-side', async () => {
    const res = await app.inject({ url: '/v1/tenants', headers: asUser(TEST_USER) });
    const [tenant] = res.json().tenants;

    expect(tenant.name).toBe('Olive & Ash Kitchen');
    expect(tenant.status).toBe('live');
    expect(tenant.liveVersion).toBe(1);
    expect(tenant.swatches).toHaveLength(3);
    expect(tenant.themeName).toBe('Editorial');
    expect(tenant.hasUnpublishedChanges).toBe(false);
  });

  it('flags unpublished changes when the draft has moved on', async () => {
    const draft = state.drafts[0];
    if (draft) draft.tokens = testTokens({ primary: '#123456' });

    const res = await app.inject({ url: '/v1/tenants', headers: asUser(TEST_USER) });
    expect(res.json().tenants[0].hasUnpublishedChanges).toBe(true);
  });

  it('shows nothing for a user with no memberships', async () => {
    const res = await app.inject({ url: '/v1/tenants', headers: asUser(OTHER_USER) });
    expect(res.json().tenants).toEqual([]);
  });
});

describe('openapi', () => {
  it('generates a document covering every public and authenticated route', async () => {
    const document = app.swagger() as { paths: Record<string, unknown> };
    const paths = Object.keys(document.paths);

    for (const expected of [
      '/v1/tenants',
      '/v1/tenants/{id}/theme/draft',
      '/v1/tenants/{id}/theme/validate',
      '/v1/tenants/{id}/theme/publish',
      '/v1/tenants/{id}/theme/versions',
      '/v1/tenants/{id}/theme/rollback',
      '/v1/tenants/{id}/assets/logo',
      '/v1/catalog/font-pairings',
      '/v1/catalog/presets',
      '/public/v1/tenants/{slug}/theme',
      '/public/v1/tenants/{slug}/content',
    ]) {
      expect(paths, `missing ${expected}`).toContain(expected);
    }
  });
});
