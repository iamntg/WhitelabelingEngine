import { PrismaClient, type Prisma, type Vertical } from '@prisma/client';
import {
  diffTokens,
  getPreset,
  validateForPublish,
  type ThemeTokens,
} from '@wl/theme';
import { CONTENT_BY_VERTICAL } from './fixtures/content.js';

/**
 * Seeds three demo brands, one per vertical, each with a distinct published
 * theme and matching preview content.
 *
 * Each brand is deliberately in a different lifecycle state, because the states
 * are what the admin UI has to render correctly:
 *
 *   olive-ash    published v1, then edited → live with unpublished changes
 *   fern-fold    published twice → live and clean, with rollback history
 *   palmetto     never published → draft only, drives the "Draft" pill
 */

const prisma = new PrismaClient();
const SEED_USER_ID = process.env['SEED_USER_ID'] ?? 'demo-user';

interface SeedBrand {
  slug: string;
  name: string;
  vertical: Vertical;
  presetId: string;
  /** Applied on top of the preset so each brand looks genuinely its own. */
  overrides: Partial<ThemeTokens['colors']> & {
    pairingId?: ThemeTokens['typography']['pairingId'];
    radiusScale?: ThemeTokens['shape']['radiusScale'];
    buttonStyle?: ThemeTokens['buttons']['style'];
  };
  /** How many times to publish before the final draft edit. */
  publishCount: number;
  /** Edits applied after publishing, leaving unpublished changes behind. */
  draftEdits?: Partial<ThemeTokens['colors']> & {
    pairingId?: ThemeTokens['typography']['pairingId'];
    radiusScale?: ThemeTokens['shape']['radiusScale'];
  };
}

const BRANDS: SeedBrand[] = [
  {
    slug: 'olive-ash-kitchen',
    name: 'Olive & Ash Kitchen',
    vertical: 'restaurant',
    presetId: 'ember',
    overrides: { primary: '#b4472b', secondary: '#2f4a3f', accent: '#a8710c' },
    publishCount: 1,
    // Leaves the brand list showing "unpublished changes" and the editor
    // showing a non-empty diff in the publish modal.
    draftEdits: { accent: '#96700f', radiusScale: 'pill' },
  },
  {
    slug: 'fern-fold-studio',
    name: 'Fern & Fold Studio',
    vertical: 'studio',
    presetId: 'grove',
    overrides: {
      primary: '#1f5e4a',
      secondary: '#37456b',
      accent: '#2f7d63',
      pairingId: 'modern',
      radiusScale: 'subtle',
    },
    publishCount: 2,
  },
  {
    slug: 'palmetto-nail-bar',
    name: 'Palmetto Nail Bar',
    vertical: 'salon',
    presetId: 'plum',
    overrides: {
      primary: '#6b3f8c',
      secondary: '#5a3a46',
      accent: '#8a5aa8',
      pairingId: 'grand',
      buttonStyle: 'soft',
    },
    publishCount: 0,
  },
];

function buildTokens(brand: SeedBrand): ThemeTokens {
  const preset = getPreset(brand.presetId);
  const { pairingId, radiusScale, buttonStyle, ...colors } = brand.overrides;

  return {
    ...preset.tokens,
    brand: { businessName: brand.name, logoUrl: null, logoAspect: 1 },
    colors: { ...preset.tokens.colors, ...colors },
    typography: { pairingId: pairingId ?? preset.tokens.typography.pairingId },
    shape: { radiusScale: radiusScale ?? preset.tokens.shape.radiusScale },
    buttons: { style: buttonStyle ?? preset.tokens.buttons.style },
  };
}

function applyEdits(tokens: ThemeTokens, edits: NonNullable<SeedBrand['draftEdits']>): ThemeTokens {
  const { pairingId, radiusScale, ...colors } = edits;
  return {
    ...tokens,
    colors: { ...tokens.colors, ...colors },
    typography: { pairingId: pairingId ?? tokens.typography.pairingId },
    shape: { radiusScale: radiusScale ?? tokens.shape.radiusScale },
  };
}

const asJson = (value: unknown) => value as unknown as Prisma.InputJsonValue;

async function seedBrand(brand: SeedBrand): Promise<void> {
  const published = buildTokens(brand);

  // A seed that ships an unpublishable theme would make the publish button
  // look broken on a fresh database.
  const validation = validateForPublish(published);
  if (validation.blockers.length > 0) {
    throw new Error(
      `Seed theme for ${brand.slug} has contrast blockers: ` +
        validation.blockers.map((b) => `${b.pairId} (${b.ratio}:1)`).join(', '),
    );
  }

  await prisma.tenant.deleteMany({ where: { slug: brand.slug } });

  const tenant = await prisma.tenant.create({
    data: {
      slug: brand.slug,
      name: brand.name,
      vertical: brand.vertical,
      memberships: { create: { userId: SEED_USER_ID, role: 'owner' } },
      sampleContent: {
        create: {
          vertical: brand.vertical,
          payload: asJson(CONTENT_BY_VERTICAL[brand.vertical]),
        },
      },
    },
  });

  let previous: ThemeTokens | null = null;

  for (let version = 1; version <= brand.publishCount; version++) {
    // The first published version is a plainer variant, so the second publish
    // has a real diff and the version history is not a list of identical rows.
    const tokens: ThemeTokens =
      version < brand.publishCount
        ? { ...published, buttons: { style: 'outline' }, shape: { radiusScale: 'sharp' } }
        : published;

    await prisma.themeVersion.create({
      data: {
        tenantId: tenant.id,
        version,
        tokens: asJson(tokens),
        publishedBy: SEED_USER_ID,
        changeSummary: asJson(
          previous ? diffTokens(previous, tokens) : { count: 0, changes: [] },
        ),
      },
    });

    previous = tokens;
  }

  const draftTokens = brand.draftEdits
    ? applyEdits(previous ?? published, brand.draftEdits)
    : (previous ?? published);

  await prisma.themeDraft.create({
    data: {
      tenantId: tenant.id,
      tokens: asJson(draftTokens),
      updatedBy: SEED_USER_ID,
    },
  });

  const state =
    brand.publishCount === 0
      ? 'draft only'
      : brand.draftEdits
        ? `live v${brand.publishCount}, unpublished changes`
        : `live v${brand.publishCount}, clean`;

  console.log(`  ${brand.slug.padEnd(20)} ${brand.vertical.padEnd(11)} ${state}`);
}

async function main(): Promise<void> {
  console.log(`Seeding demo brands for user "${SEED_USER_ID}"\n`);
  for (const brand of BRANDS) await seedBrand(brand);
  console.log('\nDone. Sign in locally with: Authorization: Bearer dev:' + SEED_USER_ID);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
