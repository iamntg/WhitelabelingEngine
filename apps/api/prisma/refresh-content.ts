import { PrismaClient, type Prisma } from '@prisma/client';
import { SampleContent } from '@wl/api-client';
import { CONTENT_BY_VERTICAL } from './fixtures/content.js';

/**
 * Rewrites every tenant's sample content from the current fixtures.
 *
 * Sample content is seed data: both the seeder and `POST /tenants` copy the
 * fixture for the vertical verbatim, and nothing in the product edits it
 * afterwards. So when the content *shape* changes — a new field, a renamed one
 * — existing rows go stale and `SampleContent.safeParse` starts rejecting them
 * at read time, which surfaces as "this app has no usable content yet" and an
 * empty preview.
 *
 * `db:reset` and `db:seed` also fix that, but both delete the tenants and take
 * every published version and draft edit with them. This touches nothing but
 * the content rows, so a database someone has been working in survives.
 *
 * Usage: pnpm --filter @wl/api db:refresh-content
 */

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tenants = await prisma.tenant.findMany({ include: { sampleContent: true } });
  let written = 0;

  for (const tenant of tenants) {
    const payload = CONTENT_BY_VERTICAL[tenant.vertical];

    // The fixtures are parsed on import, but parse again here: this script is
    // the one place that writes content the API will later read back, and a
    // silent write of an unparseable payload just moves the 404 to runtime.
    SampleContent.parse(payload);

    const wasUsable = tenant.sampleContent
      ? SampleContent.safeParse(tenant.sampleContent.payload).success
      : false;

    await prisma.sampleContent.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        vertical: tenant.vertical,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      update: {
        vertical: tenant.vertical,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    written += 1;
    console.log(`  ${tenant.slug} — ${wasUsable ? 'refreshed' : 'was unusable, now valid'}`);
  }

  console.log(`Rewrote sample content for ${written} tenant${written === 1 ? '' : 's'}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
