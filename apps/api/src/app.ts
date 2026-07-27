import type { PrismaClient } from '@prisma/client';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { loadConfig, type Config } from './config.js';
import { HttpError } from './errors.js';
import authPlugin from './plugins/auth.js';
import prismaPlugin from './plugins/prisma.js';
import catalogRoutes from './routes/catalog.js';
import publicRoutes from './routes/public.js';
import tenantRoutes from './routes/tenants.js';
import themeRoutes from './routes/theme.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export interface BuildAppOptions {
  /** Injected Prisma client. Tests supply a stub; production omits it. */
  prisma?: PrismaClient;
  logger?: boolean;
}

export async function buildApp(
  config: Config = loadConfig(),
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === false ? false : { level: config.isProduction ? 'info' : 'info' },
    // Trust the proxy so rate limiting and logging see the real client address.
    trustProxy: config.isProduction,
  });

  app.decorate('config', config);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Whitelabel Theming API',
        description:
          'Stores and serves per-tenant app themes. Contrast validation on publish uses the ' +
          'identical @wl/theme functions the admin UI and the mobile app run, so the three can ' +
          'never disagree about whether a theme is publishable.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      tags: [
        { name: 'tenants', description: 'Brands the signed-in user can edit' },
        { name: 'theme', description: 'Draft, validation, publish and rollback' },
        { name: 'assets', description: 'Logo uploads' },
        { name: 'catalog', description: 'Font pairings and presets' },
        { name: 'public', description: 'Unauthenticated, consumed by the mobile app' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(prismaPlugin, options.prisma ? { client: options.prisma } : {});
  await app.register(authPlugin);

  // Fastify copies the error handler into each child encapsulation context at
  // registration time, so these must be installed *before* the routes. Setting
  // them afterwards silently leaves every route on Fastify's default error
  // shape, which does not match the `ApiErrorBody` contract the client parses.
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.status).send(error.toBody());
    }

    // Request-validation failures surface as ZodError, either directly or
    // wrapped by the type provider on `.cause`.
    const zodError =
      error instanceof ZodError
        ? error
        : error instanceof Error && error.cause instanceof ZodError
          ? error.cause
          : null;

    if (zodError) {
      return reply.code(400).send({
        error: {
          code: 'bad_request',
          message: 'That request was not valid',
          details: zodError.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    if (typeof fastifyError.statusCode === 'number' && fastifyError.statusCode < 500) {
      return reply.code(fastifyError.statusCode).send({
        error: {
          code: fastifyError.code ?? 'bad_request',
          message: fastifyError.message ?? 'That request was not valid',
        },
      });
    }

    // Anything unrecognised is a bug. Log it in full, tell the caller nothing —
    // an internal message can leak table names, file paths or query fragments.
    request.log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({
      error: { code: 'internal_error', message: 'Something went wrong on our end' },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'No such endpoint' } }),
  );


  app.get('/health', { schema: { hide: true } }, async () => ({
    status: 'ok',
    uptime: Math.round(process.uptime()),
  }));

  await app.register(tenantRoutes);
  await app.register(themeRoutes);
  await app.register(catalogRoutes);
  await app.register(publicRoutes);

  return app;
}
