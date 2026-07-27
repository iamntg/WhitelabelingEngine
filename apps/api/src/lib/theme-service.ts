import type { Prisma, PrismaClient, ThemeVersion } from '@prisma/client';
import type { ChangeSummary, ThemeTokens as ThemeTokensType } from '@wl/theme';
import {
  defaultTokens,
  diffTokens,
  getPairing,
  ThemeTokens,
  validateForPublish,
} from '@wl/theme';
import { badRequest, conflict, notFound, unprocessable } from '../errors.js';

/**
 * Theme persistence and the publish lifecycle.
 *
 * Publish is: validate the draft → snapshot into an immutable theme_version →
 * bump the version. Rollback copies an older version's tokens into a *new*
 * version rather than deleting anything, so history stays append-only and
 * "what was live last Tuesday" always has an answer.
 */

export type Vertical = 'restaurant' | 'salon' | 'studio';

/**
 * Tokens are stored as JSON, so every read back out is re-parsed. A row written
 * by an older schema version, or by hand, must not reach the resolver unchecked.
 */
export function parseStoredTokens(value: Prisma.JsonValue, context: string): ThemeTokensType {
  const parsed = ThemeTokens.safeParse(value);
  if (!parsed.success) {
    throw badRequest(
      `Stored theme for ${context} does not match the current schema`,
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return parsed.data;
}

export function swatchesOf(tokens: ThemeTokensType): [string, string, string] {
  return [tokens.colors.primary, tokens.colors.secondary, tokens.colors.accent];
}

export function themeNameOf(tokens: ThemeTokensType): string {
  return getPairing(tokens.typography.pairingId).label;
}

export async function getLiveVersion(
  prisma: PrismaClient,
  tenantId: string,
): Promise<ThemeVersion | null> {
  return prisma.themeVersion.findFirst({
    where: { tenantId },
    orderBy: { version: 'desc' },
  });
}

/**
 * A tenant always has a draft. If one is somehow missing (a tenant created
 * before drafts existed, a partially-failed create), we materialise it from the
 * live version, or from the vertical's default preset — never an empty editor.
 */
export async function getOrCreateDraft(
  prisma: PrismaClient,
  tenant: { id: string; name: string; vertical: Vertical },
  userId: string | null,
) {
  const existing = await prisma.themeDraft.findUnique({ where: { tenantId: tenant.id } });
  if (existing) return existing;

  const live = await getLiveVersion(prisma, tenant.id);
  const tokens = live
    ? parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`)
    : defaultTokens(tenant.name, tenant.vertical);

  return prisma.themeDraft.create({
    data: {
      tenantId: tenant.id,
      tokens: tokens as unknown as Prisma.InputJsonValue,
      updatedBy: userId,
    },
  });
}

export interface DraftView {
  tokens: ThemeTokensType;
  liveTokens: ThemeTokensType | null;
  updatedAt: Date;
  updatedBy: string | null;
  liveVersion: number | null;
  nextVersion: number;
  changeSummary: ChangeSummary;
}

export async function buildDraftView(
  prisma: PrismaClient,
  tenant: { id: string; name: string; vertical: Vertical },
  userId: string | null,
): Promise<DraftView> {
  const [draft, live] = await Promise.all([
    getOrCreateDraft(prisma, tenant, userId),
    getLiveVersion(prisma, tenant.id),
  ]);

  const tokens = parseStoredTokens(draft.tokens, `draft of tenant ${tenant.id}`);
  const liveTokens = live
    ? parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`)
    : null;

  return {
    tokens,
    liveTokens,
    updatedAt: draft.updatedAt,
    updatedBy: draft.updatedBy,
    liveVersion: live?.version ?? null,
    nextVersion: (live?.version ?? 0) + 1,
    // With nothing published yet there is no meaningful "before", so the first
    // publish reports no changes rather than diffing against an invented base.
    changeSummary: liveTokens ? diffTokens(liveTokens, tokens) : { count: 0, changes: [] },
  };
}

export interface PublishResult {
  version: ThemeVersion;
  changeSummary: ChangeSummary;
}

/**
 * Validates and snapshots the draft.
 *
 * The contrast check here is the same `validateForPublish` the browser runs —
 * re-run rather than trusted, because the client can be edited, replayed, or
 * simply out of date.
 */
export async function publishDraft(
  prisma: PrismaClient,
  tenant: { id: string; name: string; vertical: Vertical },
  userId: string | null,
  acknowledgedWarnings: readonly string[],
): Promise<PublishResult> {
  const draft = await getOrCreateDraft(prisma, tenant, userId);
  const tokens = parseStoredTokens(draft.tokens, `draft of tenant ${tenant.id}`);

  const validation = validateForPublish(tokens, acknowledgedWarnings);

  if (validation.blockers.length > 0) {
    throw unprocessable(
      'contrast_blocked',
      'This theme has contrast problems that must be fixed before publishing.',
      validation.blockers.map((b) => ({ path: b.pairId, message: b.message })),
    );
  }

  if (validation.unacknowledged.length > 0) {
    throw unprocessable(
      'warnings_unacknowledged',
      'Confirm the contrast warnings before publishing.',
      validation.unacknowledged.map((w) => ({ path: w.pairId, message: w.message })),
    );
  }

  const live = await getLiveVersion(prisma, tenant.id);
  const liveTokens = live
    ? parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`)
    : null;

  const changeSummary = liveTokens ? diffTokens(liveTokens, tokens) : { count: 0, changes: [] };
  const nextVersion = (live?.version ?? 0) + 1;

  try {
    const version = await prisma.themeVersion.create({
      data: {
        tenantId: tenant.id,
        version: nextVersion,
        tokens: tokens as unknown as Prisma.InputJsonValue,
        publishedBy: userId,
        changeSummary: changeSummary as unknown as Prisma.InputJsonValue,
      },
    });
    return { version, changeSummary };
  } catch (error) {
    // The @@unique([tenantId, version]) constraint is the concurrency guard:
    // two simultaneous publishes compute the same next version and exactly one
    // wins, rather than both silently writing.
    if (isUniqueViolation(error)) {
      throw conflict('Someone else published while you were working. Reload and try again.');
    }
    throw error;
  }
}

/** Rollback is a forward publish of an older snapshot, never a deletion. */
export async function rollbackToVersion(
  prisma: PrismaClient,
  tenant: { id: string },
  userId: string | null,
  targetVersion: number,
): Promise<PublishResult> {
  const [target, live] = await Promise.all([
    prisma.themeVersion.findUnique({
      where: { tenantId_version: { tenantId: tenant.id, version: targetVersion } },
    }),
    getLiveVersion(prisma, tenant.id),
  ]);

  if (!target) throw notFound(`Version ${targetVersion} does not exist`);
  if (!live) throw notFound('This brand has never been published');
  if (live.version === targetVersion) {
    throw conflict(`Version ${targetVersion} is already live`);
  }

  const tokens = parseStoredTokens(target.tokens, `tenant ${tenant.id} v${targetVersion}`);
  const liveTokens = parseStoredTokens(live.tokens, `tenant ${tenant.id} v${live.version}`);

  const diff = diffTokens(liveTokens, tokens);
  const changeSummary: ChangeSummary = {
    count: diff.count,
    changes: [
      {
        field: 'version',
        label: 'Rolled back',
        kind: 'choice',
        from: String(live.version),
        to: String(targetVersion),
        fromText: `v${live.version}`,
        toText: `v${targetVersion}`,
        summary: `Rolled back to v${targetVersion}`,
      },
      ...diff.changes,
    ],
  };

  const nextVersion = live.version + 1;

  try {
    const [version] = await prisma.$transaction([
      prisma.themeVersion.create({
        data: {
          tenantId: tenant.id,
          version: nextVersion,
          tokens: tokens as unknown as Prisma.InputJsonValue,
          publishedBy: userId,
          changeSummary: changeSummary as unknown as Prisma.InputJsonValue,
        },
      }),
      // The draft follows the rollback, so the editor opens on what is actually
      // live rather than on the theme that was just rolled away from.
      prisma.themeDraft.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          tokens: tokens as unknown as Prisma.InputJsonValue,
          updatedBy: userId,
        },
        update: { tokens: tokens as unknown as Prisma.InputJsonValue, updatedBy: userId },
      }),
    ]);

    return { version, changeSummary };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Someone else published while you were working. Reload and try again.');
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

/** `Olive & Ash Kitchen` → `olive-ash-kitchen`, de-duplicated against the table. */
export async function uniqueSlug(prisma: PrismaClient, name: string): Promise<string> {
  const base =
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'brand';

  const padded = base.length >= 3 ? base : `${base}-app`;

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? padded : `${padded}-${attempt + 1}`;
    const taken = await prisma.tenant.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  return `${padded}-${Date.now().toString(36)}`;
}
