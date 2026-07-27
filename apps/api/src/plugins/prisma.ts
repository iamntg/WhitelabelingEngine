import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export interface PrismaPluginOptions {
  /**
   * Injected client. Tests pass a stub so route wiring, validation, auth and
   * caching can be exercised without standing up Postgres; production leaves it
   * undefined and gets a real connected client.
   */
  client?: PrismaClient;
}

export default fp<PrismaPluginOptions>(async function prismaPlugin(app, options) {
  if (options.client) {
    app.decorate('prisma', options.client);
    return;
  }

  const prisma = new PrismaClient({ log: ['warn', 'error'] });
  await prisma.$connect();

  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
