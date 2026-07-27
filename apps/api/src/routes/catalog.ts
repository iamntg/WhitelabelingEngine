import { ListFontPairingsResponse, ListPresetsResponse } from '@wl/api-client';
import { FONT_PAIRINGS, PRESETS } from '@wl/theme';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

/**
 * The catalog is served rather than bundled so the editor can never offer a
 * pairing or preset the server would reject. `rnPackage` / `rnExports` are
 * stripped — they are build-time bundling detail, not something a client needs.
 */
export default async function catalogRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    '/v1/catalog/font-pairings',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['catalog'],
        summary: 'The five available font pairings',
        response: { 200: ListFontPairingsResponse },
      },
    },
    async () => ({
      pairings: FONT_PAIRINGS.map((p) => ({
        id: p.id,
        label: p.label,
        display: { family: p.display.family, fallback: p.display.fallback, weight: p.display.weight },
        body: {
          family: p.body.family,
          fallback: p.body.fallback,
          weight: p.body.weight,
          regular: p.body.regular,
          medium: p.body.medium,
          semibold: p.body.semibold,
          bold: p.body.bold,
        },
        scale: p.scale,
        trackingAdjust: p.trackingAdjust,
      })),
    }),
  );

  server.get(
    '/v1/catalog/presets',
    {
      preHandler: app.requireAuth,
      schema: {
        tags: ['catalog'],
        summary: 'Starting themes for a new brand',
        response: { 200: ListPresetsResponse },
      },
    },
    async () => ({
      presets: PRESETS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description,
        suggestedFor: p.suggestedFor,
        tokens: p.tokens,
      })),
    }),
  );
}
