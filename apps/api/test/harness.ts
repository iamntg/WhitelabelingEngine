import type { PrismaClient } from '@prisma/client';
import { getPreset, type ThemeTokens } from '@wl/theme';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { RESTAURANT_CONTENT } from '../prisma/fixtures/content.js';

/**
 * An in-memory stand-in for the handful of Prisma calls the routes make.
 *
 * This is not a Prisma emulator and does not pretend to be — it exists so the
 * things that break most often in an API (auth wiring, the membership guard,
 * request validation, ETag handling, error mapping) are covered on every run,
 * rather than only when someone remembers to start Postgres.
 */

export const TEST_USER = 'test-user';
export const OTHER_USER = 'someone-else';
export const TENANT_ID = 'tenant_1';
export const TENANT_SLUG = 'olive-ash-kitchen';

export function testTokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return {
    ...base,
    brand: { businessName: 'Olive & Ash Kitchen', logoUrl: null, logoAspect: 1 },
    colors: { ...base.colors, ...overrides },
  };
}

export interface StubState {
  tenants: Array<{
    id: string;
    slug: string;
    name: string;
    vertical: 'restaurant' | 'salon' | 'studio';
    createdAt: Date;
  }>;
  memberships: Array<{ userId: string; tenantId: string; role: 'owner' | 'admin' }>;
  drafts: Array<{ tenantId: string; tokens: unknown; updatedAt: Date; updatedBy: string | null }>;
  versions: Array<{
    id: string;
    tenantId: string;
    version: number;
    tokens: unknown;
    publishedAt: Date;
    publishedBy: string | null;
    changeSummary: unknown;
  }>;
  assets: Array<Record<string, unknown>>;
  sampleContent: Array<{ tenantId: string; vertical: string; payload: unknown }>;
}

export function freshState(): StubState {
  return {
    tenants: [
      {
        id: TENANT_ID,
        slug: TENANT_SLUG,
        name: 'Olive & Ash Kitchen',
        vertical: 'restaurant',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    memberships: [{ userId: TEST_USER, tenantId: TENANT_ID, role: 'owner' }],
    drafts: [
      {
        tenantId: TENANT_ID,
        tokens: testTokens(),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: TEST_USER,
      },
    ],
    versions: [
      {
        id: 'v1',
        tenantId: TENANT_ID,
        version: 1,
        tokens: testTokens(),
        publishedAt: new Date('2026-01-01T12:00:00.000Z'),
        publishedBy: TEST_USER,
        changeSummary: { count: 0, changes: [] },
      },
    ],
    assets: [],
    sampleContent: [
      { tenantId: TENANT_ID, vertical: 'restaurant', payload: RESTAURANT_CONTENT },
    ],
  };
}

export function makePrismaStub(state: StubState): PrismaClient {
  const stub = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $transaction: async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),

    membership: {
      findUnique: async ({ where }: { where: { userId_tenantId: { userId: string; tenantId: string } } }) =>
        state.memberships.find(
          (m) =>
            m.userId === where.userId_tenantId.userId &&
            m.tenantId === where.userId_tenantId.tenantId,
        ) ?? null,

      findMany: async ({ where }: { where: { userId: string } }) =>
        state.memberships
          .filter((m) => m.userId === where.userId)
          .map((m) => {
            const tenant = state.tenants.find((t) => t.id === m.tenantId);
            return {
              ...m,
              createdAt: new Date(),
              tenant: {
                ...tenant,
                draft: state.drafts.find((d) => d.tenantId === m.tenantId) ?? null,
                versions: state.versions
                  .filter((v) => v.tenantId === m.tenantId)
                  .sort((a, b) => b.version - a.version)
                  .slice(0, 1),
              },
            };
          }),
    },

    tenant: {
      findUnique: async ({ where, include }: { where: { id?: string; slug?: string }; include?: Record<string, unknown> }) => {
        const tenant = state.tenants.find(
          (t) => (where.id && t.id === where.id) || (where.slug && t.slug === where.slug),
        );
        if (!tenant) return null;
        if (!include) return tenant;
        return {
          ...tenant,
          versions: state.versions
            .filter((v) => v.tenantId === tenant.id)
            .sort((a, b) => b.version - a.version)
            .slice(0, 1),
          assets: state.assets.filter((a) => a['tenantId'] === tenant.id),
          sampleContent: state.sampleContent.find((c) => c.tenantId === tenant.id) ?? null,
        };
      },
    },

    themeDraft: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        state.drafts.find((d) => d.tenantId === where.tenantId) ?? null,

      update: async ({ where, data }: { where: { tenantId: string }; data: Record<string, unknown> }) => {
        const draft = state.drafts.find((d) => d.tenantId === where.tenantId);
        if (!draft) throw new Error('No draft');
        Object.assign(draft, data, { updatedAt: new Date() });
        return draft;
      },

      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { tenantId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const draft = state.drafts.find((d) => d.tenantId === where.tenantId);
        if (draft) {
          Object.assign(draft, update, { updatedAt: new Date() });
          return draft;
        }
        const row = { updatedAt: new Date(), ...create } as StubState['drafts'][number];
        state.drafts.push(row);
        return row;
      },
    },

    themeVersion: {
      findFirst: async ({ where }: { where: { tenantId: string } }) =>
        state.versions
          .filter((v) => v.tenantId === where.tenantId)
          .sort((a, b) => b.version - a.version)[0] ?? null,

      findMany: async ({ where }: { where: { tenantId: string } }) =>
        state.versions
          .filter((v) => v.tenantId === where.tenantId)
          .sort((a, b) => b.version - a.version),

      findUnique: async ({ where }: { where: { tenantId_version: { tenantId: string; version: number } } }) =>
        state.versions.find(
          (v) =>
            v.tenantId === where.tenantId_version.tenantId &&
            v.version === where.tenantId_version.version,
        ) ?? null,

      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `v${state.versions.length + 1}`,
          publishedAt: new Date(),
          ...data,
        } as StubState['versions'][number];
        if (state.versions.some((v) => v.tenantId === row.tenantId && v.version === row.version)) {
          throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        }
        state.versions.push(row);
        return row;
      },
    },

    asset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `asset_${state.assets.length + 1}`, createdAt: new Date(), ...data };
        state.assets.push(row);
        return row;
      },
    },
  };

  return stub as unknown as PrismaClient;
}

export async function buildTestApp(state: StubState = freshState()): Promise<{
  app: FastifyInstance;
  state: StubState;
}> {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://unused',
    DEV_AUTH_ENABLED: 'true',
    CORS_ORIGINS: 'http://localhost:5173',
  } as NodeJS.ProcessEnv);

  const app = await buildApp(config, { prisma: makePrismaStub(state), logger: false });
  await app.ready();
  return { app, state };
}

export const asUser = (userId: string) => ({ authorization: `Bearer dev:${userId}` });
