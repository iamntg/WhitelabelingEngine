import { writeFile } from 'node:fs/promises';
import React from 'react';
import type { SampleContent } from '@wl/api-client';
import { FONT_PAIRINGS, resolveTheme, type ThemeTokens } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';

import { CatalogScreen } from '../src/features/preview/screens/CatalogScreen.jsx';
import { CheckoutScreen } from '../src/features/preview/screens/CheckoutScreen.jsx';
import { HomeScreen } from '../src/features/preview/screens/HomeScreen.jsx';
import { ItemScreen } from '../src/features/preview/screens/ItemScreen.jsx';
import { StatusBar, TabBar } from '../src/features/preview/screens/shared.jsx';

/**
 * Renders every preview screen for every seeded brand, in both schemes, using
 * the live API's own tokens and content — then writes one static page.
 *
 * This exists so the preview can be inspected without a browser automation
 * stack, and so a reviewer can see all 24 combinations side by side rather than
 * clicking through them.
 *
 * Usage: pnpm --filter @wl/web preview:render [outfile]
 */

const API = process.env['API_BASE'] ?? 'http://localhost:4000';
const AUTH = { authorization: `Bearer dev:${process.env['SEED_USER_ID'] ?? 'demo-user'}` };

const SCREENS = [
  ['Home', HomeScreen],
  ['Catalog', CatalogScreen],
  ['Detail', ItemScreen],
  ['Checkout', CheckoutScreen],
] as const;

const ACTIVE_TAB: Record<string, string> = {
  Home: 'home',
  Catalog: 'catalog',
  Detail: 'catalog',
  Checkout: 'orders',
};

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

async function main() {
  const tenantsRes = await fetch(`${API}/v1/tenants`, { headers: AUTH });
  if (!tenantsRes.ok) throw new Error(`GET /v1/tenants → ${tenantsRes.status}`);
  const { tenants } = (await tenantsRes.json()) as {
    tenants: Array<{ id: string; slug: string; name: string; vertical: string }>;
  };

  const sections: string[] = [];

  for (const tenant of tenants) {
    const [draftRes, contentRes] = await Promise.all([
      fetch(`${API}/v1/tenants/${tenant.id}/theme/draft`, { headers: AUTH }),
      fetch(`${API}/public/v1/tenants/${tenant.slug}/content`),
    ]);

    const { tokens } = (await draftRes.json()) as { tokens: ThemeTokens };
    const { content } = (await contentRes.json()) as { content: SampleContent };

    for (const scheme of ['light', 'dark'] as const) {
      const theme = resolveTheme(tokens, { scheme });

      const phones = SCREENS.map(([name, Screen]) => {
        const body = renderToStaticMarkup(<Screen theme={theme} content={content} />);
        const status = renderToStaticMarkup(<StatusBar theme={theme} />);
        const tabs = renderToStaticMarkup(
          <TabBar theme={theme} content={content} activeTabId={ACTIVE_TAB[name] ?? 'home'} />,
        );

        return `<figure class="phone">
  <div class="bezel"><div class="screen" style="background:${theme.surface.base};font-family:${theme.typography.body.fontFamily};color:${theme.text.primary}">
    ${status}
    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">${body}</div>
    ${tabs}
  </div></div>
  <figcaption>${name}</figcaption>
</figure>`;
      }).join('\n');

      sections.push(`<section>
  <h2>${tenant.name} <span class="meta">${tenant.vertical} · ${scheme} · ${theme.typography.display.family}/${theme.typography.body.family} · ${theme.meta.radiusScale} · ${theme.meta.buttonStyle}</span></h2>
  <div class="swatches">
    ${['primary', 'secondary', 'accent'].map((k) => `<span style="background:${(theme as unknown as Record<string, { base: string }>)[k]?.base}"></span>`).join('')}
    <code>${tokens.colors.primary} ${tokens.colors.secondary} ${tokens.colors.accent} ${tokens.colors.background}</code>
  </div>
  <div class="row">${phones}</div>
</section>`);
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Theme preview — all brands, all screens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsHref()}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=block">
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
  .screen{width:300px;height:616px;border-radius:31px;overflow:hidden;display:flex;flex-direction:column}
  figcaption{font-size:11px;color:#a3a3a8;text-align:center;margin-top:7px;font-family:ui-monospace,monospace}
  .icon{font-family:'Material Symbols Rounded';font-weight:400;font-style:normal;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;font-feature-settings:'liga'}
</style></head><body>
<h1>Theme preview — every seeded brand, every screen, both schemes</h1>
<p class="lede">Rendered through resolveTheme() from packages/theme, against live API tokens and content. The same computation the Expo app runs.</p>
${sections.join('\n')}
</body></html>`;

  const out = process.argv[2] ?? 'preview-proof.html';
  await writeFile(out, html, 'utf8');
  console.log(`Wrote ${out} — ${tenants.length} brands × 2 schemes × 4 screens`);

}

void main();

void React;
