import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify } from 'jose';
import { forbidden, unauthorized } from '../errors.js';

/**
 * Supabase JWT verification, plus the tenant membership guard.
 *
 * The membership check is written once here as a reusable preHandler. Every
 * tenant-scoped route attaches it, so there is no route where "did this user
 * actually have access?" is answered by hand and can be forgotten.
 */

export interface AuthUser {
  id: string;
  email: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    /** Set by `requireMembership` once access is confirmed. */
    membership?: { tenantId: string; role: 'owner' | 'admin' };
  }
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest) => Promise<void>;
    requireMembership: (request: FastifyRequest) => Promise<void>;
  }
}

function bearerFrom(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

export default fp(async function authPlugin(app: FastifyInstance) {
  const secret = app.config.SUPABASE_JWT_SECRET
    ? new TextEncoder().encode(app.config.SUPABASE_JWT_SECRET)
    : null;

  async function verify(token: string): Promise<AuthUser> {
    // Local development escape hatch. `config.devAuthEnabled` is already false
    // in production regardless of the env flag, so this cannot be switched on
    // by a misconfigured deploy.
    if (app.config.devAuthEnabled && token.startsWith('dev:')) {
      const id = token.slice(4).trim();
      if (!id) throw unauthorized('Dev token is missing a user id');
      return { id, email: null };
    }

    if (!secret) throw unauthorized('Authentication is not configured');

    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
        audience: app.config.SUPABASE_JWT_AUDIENCE,
      });

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw unauthorized('Token is missing a subject');
      }

      return {
        id: payload.sub,
        email: typeof payload['email'] === 'string' ? payload['email'] : null,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'HttpError') throw error;
      throw unauthorized('Your session has expired. Sign in again.');
    }
  }

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    const token = bearerFrom(request);
    if (!token) throw unauthorized();
    request.user = await verify(token);
  });

  app.decorate('requireMembership', async (request: FastifyRequest) => {
    if (!request.user) await app.requireAuth(request);
    const user = request.user;
    if (!user) throw unauthorized();

    const params = request.params as { id?: string } | undefined;
    const tenantId = params?.id;
    if (!tenantId) throw forbidden('No brand specified');

    const membership = await app.prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      select: { tenantId: true, role: true },
    });

    // Deliberately 403 rather than 404 for a tenant that exists but isn't
    // theirs, and also for one that doesn't exist — otherwise the response
    // discloses which tenant ids are real.
    if (!membership) throw forbidden();

    request.membership = { tenantId: membership.tenantId, role: membership.role };
  });
});
