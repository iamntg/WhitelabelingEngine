import { writeFile } from 'node:fs/promises';
import { getPreset, resolveTheme } from '@wl/theme';
import { HeroArt, ItemArt } from '@wl/ui';
import { renderToStaticMarkup } from 'react-dom/server';
import { StyleSheet } from 'react-native';

import { MiniPhone } from '../src/features/preview/MiniPhone.jsx';
import { RESTAURANT, SALON, STUDIO } from '@wl/api-client/fixtures';

/**
 * A contact sheet for the illustrations: every motif for every vertical, at the
 * two sizes they are actually used at, plus the publish modal's `MiniPhone` in
 * both schemes.
 *
 * Narrower than `render-preview.tsx` on purpose. That one answers "what does
 * this brand look like"; this one answers "does the line weight hold at 34px,
 * and does motif 4 read as a different dish from motif 3" — which is a question
 * about the art, and is easiest to judge with the motifs side by side and no
 * screen around them.
 *
 * Run through vite-node for the `react-native` alias, same as its sibling.
 *
 * Usage: pnpm --filter @wl/web art:proof [outfile]
 */

const webStyleSheet = StyleSheet as unknown as {
  getSheet: () => { id: string; textContent: string };
};

const VERTICALS = ['restaurant', 'salon', 'studio'] as const;

/** Five motifs per vertical, drawn twice over to show the repeat. */
const INDICES = Array.from({ length: 10 }, (_, i) => i);

const theme = resolveTheme(getPreset('ember').tokens);
const ink = theme.placeholder.ink;

const motifs = VERTICALS.map(
  (vertical) => `<h2>${vertical} motifs</h2><div class="sheet">${INDICES.map(
    (index) =>
      `<span class="slot">${renderToStaticMarkup(
        <ItemArt vertical={vertical} index={index} size={80} color={ink} />,
      )}</span>` +
      `<span class="slot small">${renderToStaticMarkup(
        <ItemArt vertical={vertical} index={index} size={34} color={ink} />,
      )}</span>`,
  ).join('')}</div>`,
).join('');

const heroes = `<h2>heroes</h2><div class="sheet">${[...VERTICALS, undefined]
  .map(
    (vertical) =>
      `<span class="slot wide">${renderToStaticMarkup(
        <HeroArt vertical={vertical} size={78} color={ink} />,
      )}</span>`,
  )
  .join('')}</div>`;

const minis = [RESTAURANT, SALON, STUDIO]
  .flatMap((content) =>
    (['light', 'dark'] as const).map((scheme) => {
      const t = resolveTheme(getPreset('ember').tokens, { scheme });
      return `<section><h2>MiniPhone · ${content.vertical} · ${scheme}</h2>${renderToStaticMarkup(
        <MiniPhone theme={t} />,
      )}</section>`;
    }),
  )
  .join('');

// Read after rendering: react-native-web registers rules as components render.
const { textContent } = webStyleSheet.getSheet();

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Illustration contact sheet</title>
<style>${textContent}</style>
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:20px;background:#f4f4f3;font-family:system-ui}
h2{font-size:13px;font-family:ui-monospace,monospace;margin:18px 0 8px}
.sheet{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.slot{width:110px;height:110px;display:flex;align-items:center;justify-content:center;background:${theme.placeholder.fill};border-radius:10px}
.slot.small{width:56px;height:56px}
.slot.wide{width:180px;height:120px}
section{display:inline-block;vertical-align:top;margin:0 14px 14px 0}
</style></head><body>${motifs}${heroes}${minis}</body></html>`;

await writeFile(process.argv[2] ?? 'art-proof.html', html, 'utf8');
console.log(`Wrote ${process.argv[2] ?? 'art-proof.html'}`);
