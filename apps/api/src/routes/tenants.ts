import type { Prisma } from '@prisma/client';
import {
  CreateTenantBody,
  CreateTenantResponse,
  ListTenantsResponse,
} from '@wl/api-client';
import { defaultTokens, diffTokens, getPreset } from '@wl/theme';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CONTENT_BY_VERTICAL } from '../../prisma/fixtures/content.js';
import { badRequest, unauthorized } from '../errors.js';
import { parseStoredTokens, swatchesOf, themeNameOf, uniqueSlug } from '../lib/theme-service.js';

export default async function tenantRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/v1/tenants',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['tenants'],
        summary: 'List brands the signed-in user can edit',
        response: { 200: ListTenantsResponse },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw unauthorized();

      const memberships = await app.prisma.membership.findMany({
        where: { userId: user.id },
        include: {
          tenant: {
            include: {
              draft: true,
              versions: { orderBy: { version: 'desc' }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const tenants = memberships.map((membership) => {
        const { tenant } = membership;
        const live = tenant.versions[0] ?? null;

        // Prefer the draft for the swatch strip: the brand list should show
        // what the owner is working on, not what they last shipped.
        const source = tenant.draft?.tokens ?? live?.tokens ?? null;
        const tokens = source
          ? parseStoredTokens(source, `tenant ${tenant.id}`)
          : defaultTokens(tenant.name, tenant.vertical);

        const liveTokens = live
          ? parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`)
          : null;

        return {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          vertical: tenant.vertical,
          createdAt: tenant.createdAt.toISOString(),
          role: membership.role,
          status: live ? ('live' as const) : ('draft' as const),
          liveVersion: live?.version ?? null,
          swatches: swatchesOf(tokens),
          themeName: themeNameOf(tokens),
          draftUpdatedAt: tenant.draft?.updatedAt.toISOString() ?? null,
          draftUpdatedBy: tenant.draft?.updatedBy ?? null,
          hasUnpublishedChanges: liveTokens ? diffTokens(liveTokens, tokens).count > 0 : true,
        };
      });

      return { tenants };
    },
  );

  server.post(
    '/v1/tenants',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['tenants'],
        summary: 'Create a brand and seed its draft theme and preview content',
        body: CreateTenantBody,
        response: { 201: CreateTenantResponse },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) throw unauthorized();

      const { name, vertical, presetId } = request.body;

      // A new tenant never lands on a blank editor — it starts from a preset,
      // which is asserted publishable in the theme package's tests.
      let tokens;
      try {
        tokens = presetId
          ? { ...getPreset(presetId).tokens, brand: { businessName: name, logoUrl: null, logoAspect: 1 } }
          : defaultTokens(name, vertical);
      } catch {
        throw badRequest(`Unknown preset "${presetId}"`);
      }

      const slug = request.body.slug ?? (await uniqueSlug(app.prisma, name));

      const tenant = await app.prisma.tenant.create({
        data: {
          slug,
          name,
          vertical,
          memberships: { create: { userId: user.id, role: 'owner' } },
          draft: {
            create: {
              tokens: tokens as unknown as Prisma.InputJsonValue,
              updatedBy: user.id,
            },
          },
          sampleContent: {
            create: {
              vertical,
              payload: CONTENT_BY_VERTICAL[vertical] as unknown as Prisma.InputJsonValue,
            },
          },
        },
      });

      reply.code(201);
      return {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          vertical: tenant.vertical,
          createdAt: tenant.createdAt.toISOString(),
        },
      };
    },
  );

}
