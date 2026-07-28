import { writeFile } from 'node:fs/promises';
import type { SampleContent } from '@wl/api-client';
import { FONT_PAIRINGS, PRESETS, resolveTheme, type ThemeTokens } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { StyleSheet } from 'react-native';

import {
  PhoneApp,
  PHONE_CONTAINER_CSS,
  type PreviewScreen,
} from '../src/features/preview/PhoneApp.jsx';
import { RESTAURANT, SALON, STUDIO } from '@wl/api-client/fixtures';

/**
 * Renders every preview screen for every brand, in both schemes, then writes
 * one static page.
 *
 * This exists so the preview can be inspected without a browser automation
 * stack, and so a reviewer sees all 24 combinations side by side rather than
 * clicking through them. What it renders is `PhoneApp` — the same tree the
 * admin tool mounts, which is the same `@wl/ui` components the Expo app builds
 * from. A proof sheet drawn by its own code would prove nothing.
 *
 * With the API up it uses the live tokens and content. Without it, it falls
 * back to the shipped presets and the test fixtures and says so on the page —
 * the layout and the resolver are just as testable offline, and a proof sheet
 * you cannot generate without Postgres running is a proof sheet nobody looks at.
 *
 * Run through vite-node, not tsx: it needs the `react-native` →
 * `react-native-web` alias from vite.config.ts, without which the import
 * resolves to React Native's Flow source and the script dies on the first line
 * of `@wl/ui`.
 *
 * Usage: pnpm --filter @wl/web preview:render [outfile]
 */

const API = process.env['API_BASE'] ?? 'http://localhost:4000';
const AUTH = { authorization: `Bearer dev:${process.env['SEED_USER_ID'] ?? 'demo-user'}` };

const webStyleSheet = StyleSheet as unknown as {
  getSheet: () => { id: string; textContent: string };
};

const SCREENS: Array<[label: string, screen: PreviewScreen]> = [
  ['Home', 'home'],
  ['Catalog', 'catalog'],
  ['Detail', 'item'],
  ['Checkout', 'checkout'],
];

interface Brand {
  name: string;
  vertical: string;
  tokens: ThemeTokens;
  content: SampleContent;
}

function fontsHref(): string {
  const weights = new Map<string, Set<number>>();
  const add = (family: string, weight: number) => {
    const set = weights.get(family) ?? new Set<number>();
    set.add(weight);
    weights.set(family, set);
  };
  for (const p of FONT_PAIRINGS) {
    add(p.display.family, p.display.weight);
    for (const w of [p.body.regular, p.body.medium, p.body.semibold, p.body.bold]) {
      add(p.body.family, w);
    }
  }
  const families = [...weights.entries()]
    .map(([f, s]) => `family=${f.replace(/ /g, '+')}:wght@${[...s].sort((a, b) => a - b).join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

async function fromApi(): Promise<Brand[]> {
  const tenantsRes = await fetch(`${API}/v1/tenants`, { headers: AUTH });
  if (!tenantsRes.ok) throw new Error(`GET /v1/tenants → ${tenantsRes.status}`);

  const { tenants } = (await tenantsRes.json()) as {
    tenants: Array<{ id: string; slug: string; name: string; vertical: string }>;
  };

  return Promise.all(
    tenants.map(async (tenant) => {
      const [draftRes, contentRes] = await Promise.all([
        fetch(`${API}/v1/tenants/${tenant.id}/theme/draft`, { headers: AUTH }),
        fetch(`${API}/public/v1/tenants/${tenant.slug}/content`),
      ]);

      const { tokens } = (await draftRes.json()) as { tokens: ThemeTokens };
      const { content } = (await contentRes.json()) as { content: SampleContent };

      return { name: tenant.name, vertical: tenant.vertical, tokens, content };
    }),
  );
}

/** One brand per vertical, from the shipped presets and the test fixtures. */
function fromFixtures(): Brand[] {
  const byVertical: Array<[SampleContent['vertical'], SampleContent]> = [
    ['restaurant', RESTAURANT],
    ['salon', SALON],
    ['studio', STUDIO],
  ];

  return byVertical.map(([vertical, content]) => {
    const preset = PRESETS.find((p) => p.vertical === vertical) ?? PRESETS[0];
    if (!preset) throw new Error('No presets are registered');
    return { name: preset.label, vertical, tokens: preset.tokens, content };
  });
}

async function main() {
  let brands: Brand[];
  let source: string;

  try {
    brands = await fromApi();
    source = `live API at ${API}`;
  } catch (error) {
    brands = fromFixtures();
    source = `shipped presets and test fixtures — the API at ${API} was unreachable (${
      error instanceof Error ? error.message : 'unknown error'
    })`;
  }

  const sections: string[] = [];

  for (const brand of brands) {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = resolveTheme(brand.tokens, { scheme });

      const phones = SCREENS.map(([label, screen]) => {
        const body = renderToStaticMarkup(
          <PhoneApp theme={theme} content={brand.content} screen={screen} />,
        );
        return `<figure class="phone">
  <div class="bezel"><div class="screen">${body}</div></div>
  <figcaption>${label}</figcaption>
</figure>`;
      }).join('\n');

      const swatch = (role: 'primary' | 'secondary' | 'accent') =>
        `<span style="background:${theme[role].base}"></span>`;

      sections.push(`<section>
  <h2>${brand.name} <span class="meta">${brand.vertical} · ${scheme} · ${theme.typography.display.family}/${theme.typography.body.family} · ${theme.meta.radiusScale} · ${theme.meta.buttonStyle}</span></h2>
  <div class="swatches">
    ${swatch('primary')}${swatch('secondary')}${swatch('accent')}
    <code>${brand.tokens.colors.primary} ${brand.tokens.colors.secondary} ${brand.tokens.colors.accent} ${brand.tokens.colors.background}</code>
  </div>
  <div class="row">${phones}</div>
</section>`);
    }
  }

  // Read after rendering: react-native-web registers rules as components
  // render, so an empty sheet here would mean an unstyled page. This is the
  // same handoff `PhoneFrame` performs into the preview iframe.
  const { textContent } = webStyleSheet.getSheet();

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Theme preview — all brands, all screens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsHref()}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<style>${textContent}</style>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:28px;background:#f4f4f3;color:#18181a;font-family:Inter,sans-serif}
  h1{font-size:19px;letter-spacing:-.02em;margin:0 0 4px}
  .lede{font-size:12.5px;color:#85858b;margin:0 0 24px}
  section{margin-bottom:36px}
  h2{font-size:14px;letter-spacing:-.01em;margin:0 0 6px;display:flex;gap:10px;align-items:baseline}
  .meta{font-family:ui-monospace,monospace;font-size:11px;color:#9a9aa0;font-weight:400;letter-spacing:0}
  .swatches{display:flex;align-items:center;gap:6px;margin-bottom:12px}
  .swatches span{width:13px;height:13px;border-radius:4px;border:1px solid rgba(0,0,0,.09)}
  .swatches code{font-size:11px;color:#9a9aa0;margin-left:4px}
  .row{display:flex;gap:16px;flex-wrap:wrap}
  .phone{margin:0}
  .bezel{padding:7px;background:#232326;border-radius:38px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.07)}
  /* The same container declaration the editor's iframe uses. This sheet is
     supposed to catch layout bugs, so it must not be laid out by rules of its
     own — it did once, and the bug it hid was the tab bar falling off Home. */
  .screen{${PHONE_CONTAINER_CSS}border-radius:31px}
  figcaption{font-size:11px;color:#a3a3a8;text-align:center;margin-top:7px;font-family:ui-monospace,monospace}
</style></head><body>
<h1>Theme preview — every brand, every screen, both schemes</h1>
<p class="lede">Rendered through resolveTheme() and the @wl/ui components, from ${source}. The same computation and the same components the Expo app runs.</p>
${sections.join('\n')}
</body></html>`;

  const out = process.argv[2] ?? 'preview-proof.html';
  await writeFile(out, html, 'utf8');
  console.log(`Wrote ${out} — ${brands.length} brands × 2 schemes × ${SCREENS.length} screens`);
}

void main();
