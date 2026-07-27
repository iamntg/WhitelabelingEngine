import { createHash } from 'node:crypto';
import {
  PublicContentResponse,
  PublicThemeResponse,
  SampleContent,
  TenantSlugParams,
} from '@wl/api-client';
import { resolveThemeSchemes } from '@wl/theme';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { notFound } from '../errors.js';
import { parseStoredTokens } from '../lib/theme-service.js';

/**
 * Public endpoints — no auth, consumed by the Expo app.
 *
 * Both responses are strongly cached with a long stale-while-revalidate window,
 * so a phone with no connectivity still opens on the last good theme and a
 * republish propagates within the max-age. ETags make the revalidation cheap.
 */

function etagOf(payload: unknown): string {
  return `"${createHash('sha256').update(JSON.stringify(payload)).digest('base64url').slice(0, 27)}"`;
}

/** Returns true when the caller's cached copy is still current. */
function applyCaching(
  reply: FastifyReply,
  request: { headers: Record<string, unknown> },
  payload: unknown,
  cacheControl: string,
): boolean {
  const etag = etagOf(payload);
  reply.header('etag', etag);
  reply.header('cache-control', cacheControl);
  reply.header('vary', 'accept-encoding');

  const ifNoneMatch = request.headers['if-none-match'];
  if (typeof ifNoneMatch === 'string' && ifNoneMatch.split(',').some((v) => v.trim() === etag)) {
    reply.code(304).send();
    return true;
  }
  return false;
}

export default async function publicRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/public/v1/tenants/:slug/theme',
    {
      schema: {
        tags: ['public'],
        summary: 'The live theme for a brand',
        params: TenantSlugParams,
        response: { 200: PublicThemeResponse },
      },
    },
    async (request, reply) => {
      const tenant = await app.prisma.tenant.findUnique({
        where: { slug: request.params.slug },
        include: {
          versions: { orderBy: { version: 'desc' }, take: 1 },
          assets: { where: { kind: 'logo' }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (!tenant) throw notFound('No app found for that address');

      const live = tenant.versions[0];
      // An unpublished brand has no public theme at all — serving the draft here
      // would let unreviewed work reach real customers' phones.
      if (!live) throw notFound('This app has not been published yet');

      const tokens = parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`);
      const logo = tenant.assets[0] ?? null;

      const payload = {
        schemaVersion: tokens.schemaVersion,
        version: live.version,
        tenant: { slug: tenant.slug, name: tenant.name, vertical: tenant.vertical },
        tokens,
        // Both schemes ship together so the device can honour its appearance
        // setting instantly, and so a cold start needs no colour maths at all.
        resolved: resolveThemeSchemes(tokens),
        assets: {
          logoUrl: tokens.brand.logoUrl ?? logo?.url ?? null,
          logoWidth: logo?.width ?? null,
          logoHeight: logo?.height ?? null,
        },
        publishedAt: live.publishedAt.toISOString(),
      };

      if (applyCaching(reply, request, payload, app.config.publicCacheControl)) return reply;
      return reply.send(payload);
    },
  );

  server.get(
    '/public/v1/tenants/:slug/content',
    {
      schema: {
        tags: ['public'],
        summary: 'Sample menu / services / schedule content',
        params: TenantSlugParams,
        response: { 200: PublicContentResponse },
      },
    },
    async (request, reply) => {
      const tenant = await app.prisma.tenant.findUnique({
        where: { slug: request.params.slug },
        include: { sampleContent: true },
      });

      if (!tenant) throw notFound('No app found for that address');
      if (!tenant.sampleContent) throw notFound('This app has no content yet');

      const parsed = SampleContent.safeParse(tenant.sampleContent.payload);
      if (!parsed.success) throw notFound('This app has no usable content yet');

      const payload = {
        tenant: { slug: tenant.slug, name: tenant.name, vertical: tenant.vertical },
        content: parsed.data,
      };

      if (applyCaching(reply, request, payload, app.config.publicCacheControl)) return reply;
      return reply.send(payload);
    },
  );
}
