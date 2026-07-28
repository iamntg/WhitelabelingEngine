import { writeFile } from 'node:fs/promises';
import React from 'react';
import { getPreset, resolveTheme } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';

import { RESTAURANT, SALON, STUDIO } from '../src/features/preview/fixtures.js';
import { HeroArt, ItemArt } from '../src/features/preview/illustrations.jsx';
import { HomeScreen } from '../src/features/preview/screens/HomeScreen.jsx';
import { CatalogScreen } from '../src/features/preview/screens/CatalogScreen.jsx';
import { ItemScreen } from '../src/features/preview/screens/ItemScreen.jsx';
import { MiniPhone } from '../src/features/preview/MiniPhone.jsx';

const CONTENT = [RESTAURANT, SALON, STUDIO];
const SCREENS = [HomeScreen, CatalogScreen, ItemScreen] as const;
const VERTICALS = ['restaurant', 'salon', 'studio'] as const;
const SEEDS = 'abcdefghijklmnop'.split('');

const theme = resolveTheme(getPreset('ember').tokens);

const sheet = VERTICALS.map(
  (vertical) => `<h2>${vertical} motifs</h2><div class="sheet">${SEEDS.map(
    (seed) =>
      `<span class="slot">${renderToStaticMarkup(<ItemArt vertical={vertical} seed={seed} size={80} />)}</span>` +
      `<span class="slot small">${renderToStaticMarkup(<ItemArt vertical={vertical} seed={seed} size={34} />)}</span>`,
  ).join('')}</div>`,
).join('');

const heroes = `<h2>heroes</h2><div class="sheet">${[...VERTICALS, undefined]
  .map(
    (vertical) =>
      `<span class="slot wide">${renderToStaticMarkup(<HeroArt vertical={vertical} size={78} />)}</span>`,
  )
  .join('')}</div>`;

const sections = CONTENT.flatMap((content) =>
  (['light', 'dark'] as const).map((scheme) => {
    const t = resolveTheme(getPreset('ember').tokens, { scheme });
    const phones = SCREENS.map(
      (Screen) =>
        `<div class="screen" style="background:${t.surface.base};color:${t.text.primary}">${renderToStaticMarkup(
          <Screen theme={t} content={content} />,
        )}</div>`,
    ).join('');
    return `<section><h2>${content.vertical} · ${scheme}</h2><div class="row">${phones}<div>${renderToStaticMarkup(
      <MiniPhone theme={t} />,
    )}</div></div></section>`;
  }),
);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:20px;background:#f4f4f3;font-family:system-ui}
h2{font-size:13px;font-family:ui-monospace,monospace;margin:18px 0 8px}
.row{display:flex;gap:14px;align-items:flex-start}
.sheet{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.slot{width:110px;height:110px;display:flex;align-items:center;justify-content:center;background:${theme.placeholder.fill};color:${theme.placeholder.ink};border-radius:10px}
.slot.small{width:56px;height:56px}
.slot.wide{width:180px;height:120px}
.screen{width:300px;height:600px;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(0,0,0,.12)}
</style></head><body>${sheet}${heroes}${sections.join('')}</body></html>`;

await writeFile(process.argv[2] ?? 'art-proof.html', html, 'utf8');
