import type { Prisma } from '@prisma/client';
import {
  DraftResponse,
  ListVersionsResponse,
  LogoUploadBody,
  LogoUploadResponse,
  PatchDraftBody,
  PublishBody,
  PublishResponse,
  RollbackBody,
  TenantIdParams,
  ValidateResponse,
} from '@wl/api-client';
import { applyPatch, checkContrast, validateForPublish } from '@wl/theme';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { badRequest, notFound } from '../errors.js';
import {
  buildDraftView,
  getOrCreateDraft,
  parseStoredTokens,
  publishDraft,
  rollbackToVersion,
  swatchesOf,
} from '../lib/theme-service.js';

export default async function themeRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  async function loadTenant(id: string) {
    const tenant = await app.prisma.tenant.findUnique({ where: { id } });
    // The membership guard already ran, so reaching here without a tenant means
    // it was deleted between the two queries.
    if (!tenant) throw notFound('Brand not found');
    return tenant;
  }

  server.get(
    '/v1/tenants/:id/theme/draft',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Read the working draft',
        params: TenantIdParams,
        response: { 200: DraftResponse },
      },
    },
    async (request) => {
      const tenant = await loadTenant(request.params.id);
      const view = await buildDraftView(app.prisma, tenant, request.user?.id ?? null);
      return {
        tokens: view.tokens,
        updatedAt: view.updatedAt.toISOString(),
        updatedBy: view.updatedBy,
        liveVersion: view.liveVersion,
        nextVersion: view.nextVersion,
        changeSummary: view.changeSummary,
      };
    },
  );

  server.patch(
    '/v1/tenants/:id/theme/draft',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Autosave a partial token update',
        params: TenantIdParams,
        body: PatchDraftBody,
        response: { 200: DraftResponse },
      },
    },
    async (request) => {
      const tenant = await loadTenant(request.params.id);
      const userId = request.user?.id ?? null;

      const draft = await getOrCreateDraft(app.prisma, tenant, userId);
      const current = parseStoredTokens(draft.tokens, `draft of tenant ${tenant.id}`);

      // The merged result is re-validated as a whole, so a patch cannot leave
      // the draft in a state the resolver would reject.
      let next;
      try {
        next = applyPatch(current, request.body);
      } catch (error) {
        const issues =
          error instanceof Error && 'issues' in error
            ? (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues
            : [];
        throw badRequest(
          'That change would make the theme invalid',
          issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        );
      }

      await app.prisma.themeDraft.update({
        where: { tenantId: tenant.id },
        data: { tokens: next as unknown as Prisma.InputJsonValue, updatedBy: userId },
      });

      const view = await buildDraftView(app.prisma, tenant, userId);
      return {
        tokens: view.tokens,
        updatedAt: view.updatedAt.toISOString(),
        updatedBy: view.updatedBy,
        liveVersion: view.liveVersion,
        nextVersion: view.nextVersion,
        changeSummary: view.changeSummary,
      };
    },
  );

  server.post(
    '/v1/tenants/:id/theme/validate',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Re-run the contrast engine against the stored draft',
        params: TenantIdParams,
        body: z_empty(),
        response: { 200: ValidateResponse },
      },
    },
    async (request) => {
      const tenant = await loadTenant(request.params.id);
      const view = await buildDraftView(app.prisma, tenant, request.user?.id ?? null);

      // Deliberately re-derived from the *stored* draft, not from anything the
      // client sent. This endpoint exists so the browser can see exactly the
      // verdict publish will reach.
      const validation = validateForPublish(view.tokens);

      return {
        results: checkContrast(view.tokens),
        blockers: validation.blockers,
        warnings: validation.warnings,
        canPublish: validation.blockers.length === 0,
        changeSummary: view.changeSummary,
      };
    },
  );

  server.post(
    '/v1/tenants/:id/theme/publish',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Validate, snapshot and bump the live version',
        params: TenantIdParams,
        body: PublishBody,
        response: { 201: PublishResponse },
      },
    },
    async (request, reply) => {
      const tenant = await loadTenant(request.params.id);

      const { version, changeSummary } = await publishDraft(
        app.prisma,
        tenant,
        request.user?.id ?? null,
        request.body.acknowledgedWarnings,
      );

      const tokens = parseStoredTokens(version.tokens, `tenant ${tenant.id} v${version.version}`);

      reply.code(201);
      return {
        version: {
          version: version.version,
          publishedAt: version.publishedAt.toISOString(),
          publishedBy: version.publishedBy,
          changeSummary,
          swatches: swatchesOf(tokens),
          isLive: true,
        },
      };
    },
  );

  server.get(
    '/v1/tenants/:id/theme/versions',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Publish history, newest first',
        params: TenantIdParams,
        response: { 200: ListVersionsResponse },
      },
    },
    async (request) => {
      const tenantId = request.params.id;
      const rows = await app.prisma.themeVersion.findMany({
        where: { tenantId },
        orderBy: { version: 'desc' },
        take: 50,
      });

      const liveVersion = rows[0]?.version ?? null;

      return {
        versions: rows.map((row) => ({
          version: row.version,
          publishedAt: row.publishedAt.toISOString(),
          publishedBy: row.publishedBy,
          changeSummary: (row.changeSummary as { count: number; changes: [] }) ?? {
            count: 0,
            changes: [],
          },
          swatches: swatchesOf(parseStoredTokens(row.tokens, `tenant ${tenantId} v${row.version}`)),
          isLive: row.version === liveVersion,
        })),
      };
    },
  );

  server.post(
    '/v1/tenants/:id/theme/rollback',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['theme'],
        summary: 'Republish an earlier version as a new version',
        params: TenantIdParams,
        body: RollbackBody,
        response: { 201: PublishResponse },
      },
    },
    async (request, reply) => {
      const tenant = await loadTenant(request.params.id);

      const { version, changeSummary } = await rollbackToVersion(
        app.prisma,
        tenant,
        request.user?.id ?? null,
        request.body.version,
      );

      const tokens = parseStoredTokens(version.tokens, `tenant ${tenant.id} v${version.version}`);

      reply.code(201);
      return {
        version: {
          version: version.version,
          publishedAt: version.publishedAt.toISOString(),
          publishedBy: version.publishedBy,
          changeSummary,
          swatches: swatchesOf(tokens),
          isLive: true,
        },
      };
    },
  );

  server.post(
    '/v1/tenants/:id/assets/logo',
    {
      preHandler: app.requireMembership,
      schema: {
        tags: ['assets'],
        summary: 'Create a signed upload URL for a logo',
        params: TenantIdParams,
        body: LogoUploadBody,
        response: { 201: LogoUploadResponse },
      },
    },
    async (request, reply) => {
      const tenantId = request.params.id;
      const { filename, bytes, width, height } = request.body;

      const asset = await app.prisma.asset.create({
        data: {
          tenantId,
          kind: 'logo',
          url: `${app.config.ASSET_PUBLIC_BASE_URL}/${tenantId}/${Date.now()}-${sanitise(filename)}`,
          width,
          height,
          bytes,
        },
      });

      reply.code(201);
      return {
        assetId: asset.id,
        uploadUrl: `${app.config.ASSET_UPLOAD_BASE_URL}/${asset.id}`,
        publicUrl: asset.url,
        expiresAt: new Date(
          Date.now() + app.config.ASSET_UPLOAD_TTL_SECONDS * 1000,
        ).toISOString(),
      };
    },
  );

}

function sanitise(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80);
}

/** Validate accepts no body; an explicit empty object keeps OpenAPI honest. */
function z_empty() {
  return PublishBody.partial().strict();
}
