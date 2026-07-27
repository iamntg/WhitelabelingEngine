import { z } from 'zod';

/**
 * Environment is parsed once, at boot, and the process refuses to start if
 * anything required is missing. A server that boots with a broken config and
 * fails on the first request is far harder to diagnose.
 */

/** Env vars are always strings; treat "true"/"1" as true and anything else as false. */
const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? fallback : v.toLowerCase() === 'true' || v === '1'));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    CORS_ORIGINS: z.string().default('http://localhost:5173'),

    SUPABASE_JWT_SECRET: z.string().optional(),
    SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),

    DEV_AUTH_ENABLED: bool(false),
    SEED_USER_ID: z.string().default('demo-user'),

    ASSET_PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000/static/assets'),
    ASSET_UPLOAD_BASE_URL: z.string().url().default('http://localhost:4000/static/uploads'),
    ASSET_UPLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(900),

    PUBLIC_CACHE_MAX_AGE: z.coerce.number().int().nonnegative().default(300),
    PUBLIC_CACHE_STALE_WHILE_REVALIDATE: z.coerce.number().int().nonnegative().default(86400),
  })
  .superRefine((env, ctx) => {
    const devAuthUsable = env.DEV_AUTH_ENABLED && env.NODE_ENV !== 'production';
    if (!env.SUPABASE_JWT_SECRET && !devAuthUsable) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_JWT_SECRET'],
        message:
          'SUPABASE_JWT_SECRET is required unless DEV_AUTH_ENABLED=true outside production',
      });
    }
  });

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = EnvSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;

  return {
    ...env,
    isProduction: env.NODE_ENV === 'production',
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    /**
     * Dev auth is refused in production even if the flag is set, so a
     * misconfigured deploy cannot accidentally accept `Bearer dev:anyone`.
     */
    devAuthEnabled: env.DEV_AUTH_ENABLED && env.NODE_ENV !== 'production',
    publicCacheControl: `public, max-age=${env.PUBLIC_CACHE_MAX_AGE}, stale-while-revalidate=${env.PUBLIC_CACHE_STALE_WHILE_REVALIDATE}`,
  };
}
