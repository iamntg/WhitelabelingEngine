import type { SampleContent } from '@wl/api-client';
import { getPreset, resolveTheme, type ThemeTokens } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RESTAURANT, SALON, STUDIO } from './fixtures.js';
import { CatalogScreen } from './screens/CatalogScreen.jsx';
import { CheckoutScreen } from './screens/CheckoutScreen.jsx';
import { HomeScreen } from './screens/HomeScreen.jsx';
import { ItemScreen } from './screens/ItemScreen.jsx';

/**
 * The preview is the product's central claim: what the owner sees is what ships
 * to the phone. These tests assert the claim rather than the pixels.
 */

function tokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return { ...base, colors: { ...base.colors, ...overrides } };
}

const screens = [HomeScreen, CatalogScreen, ItemScreen, CheckoutScreen];

function renderAll(t: ThemeTokens, content: SampleContent, scheme: 'light' | 'dark' = 'light') {
  const theme = resolveTheme(t, { scheme });
  return screens.map((Screen) => renderToStaticMarkup(<Screen theme={theme} content={content} />));
}

describe('every screen renders for every vertical', () => {
  const verticals: Array<[string, SampleContent]> = [
    ['restaurant', RESTAURANT],
    ['salon', SALON],
    ['studio', STUDIO],
  ];

  for (const [name, content] of verticals) {
    it(`renders all four screens for ${name}, in both schemes`, () => {
      for (const scheme of ['light', 'dark'] as const) {
        for (const html of renderAll(tokens(), content, scheme)) {
          expect(html.length, `${name}/${scheme}`).toBeGreaterThan(200);
        }
      }
    });
  }
});

describe('content is real, never placeholder', () => {
  it('shows named dishes and genuine prices for a restaurant', () => {
    const [home, catalog, item] = renderAll(tokens(), RESTAURANT);
    expect(home).toContain('Ash-Roasted Half Chicken');
    expect(home).toContain('$26.00');
    expect(catalog).toContain('Blistered Padrón Peppers');
    expect(item).toContain('Charred broccolini');
  });

  it('shows services with durations and stylists for a salon', () => {
    const [home, catalog] = renderAll(tokens(), SALON);
    expect(home).toContain('Balayage &amp; Gloss');
    expect(catalog).toContain('2 hr 30 min · with Sofia');
    expect(catalog).toContain('Services');
  });

  it('shows classes with times and instructors for a studio', () => {
    const [home, catalog] = renderAll(tokens(), STUDIO);
    expect(home).toContain('Slow Flow');
    expect(catalog).toContain('6:00 PM · 60 min · Ana');
    expect(catalog).toContain('Schedule');
  });

  it('never renders lorem ipsum or a zero price', () => {
    for (const content of [RESTAURANT, SALON, STUDIO]) {
      for (const html of renderAll(tokens(), content)) {
        expect(html.toLowerCase()).not.toContain('lorem');
        expect(html).not.toContain('$0.00');
        expect(html).not.toMatch(/Item \d/);
      }
    }
  });

  it('labels image slots honestly instead of faking photography', () => {
    const [home] = renderAll(tokens(), RESTAURANT);
    expect(home).toContain('hero image 1200×800');
  });
});

describe('money', () => {
  it('formats from integer minor units, with no floating-point artefacts', () => {
    for (const content of [RESTAURANT, SALON, STUDIO]) {
      for (const html of renderAll(tokens(), content)) {
        expect(html).not.toMatch(/\$\d+\.\d{3,}/);
      }
    }
  });

  it('computes the checkout total from the lines', () => {
    // The design's checkout shows $31.00 + $2.64 tax = $33.64.
    const html = renderToStaticMarkup(
      <CheckoutScreen theme={resolveTheme(tokens())} content={RESTAURANT} />,
    );
    expect(html).toContain('$31.00');
    expect(html).toContain('$2.64');
    expect(html).toContain('$33.64');
  });
});

describe('the preview renders through resolveTheme, not hand-styling', () => {
  it('paints the owner’s primary colour into the screens', () => {
    const html = renderAll(tokens({ primary: '#1f5fd0' }), RESTAURANT).join('');
    expect(html).toContain('#1f5fd0');
  });

  it('follows the resolver when the button style changes', () => {
    const outline = resolveTheme({ ...tokens(), buttons: { style: 'outline' } });
    const html = renderToStaticMarkup(<HomeScreen theme={outline} content={RESTAURANT} />);
    expect(html).toContain('background:transparent');
    expect(html).toContain(outline.primary.base);
  });

  it('follows the resolver when the corner scale changes', () => {
    const sharp = resolveTheme({ ...tokens(), shape: { radiusScale: 'sharp' } });
    const rounded = resolveTheme({ ...tokens(), shape: { radiusScale: 'rounded' } });

    const sharpHtml = renderToStaticMarkup(<HomeScreen theme={sharp} content={RESTAURANT} />);
    const roundedHtml = renderToStaticMarkup(<HomeScreen theme={rounded} content={RESTAURANT} />);

    expect(sharpHtml).not.toBe(roundedHtml);
    expect(roundedHtml).toContain('border-radius:12px');
  });

  it('uses the pairing’s display face for headings', () => {
    const theme = resolveTheme({ ...tokens(), typography: { pairingId: 'grand' } });
    const html = renderToStaticMarkup(<HomeScreen theme={theme} content={RESTAURANT} />);
    expect(html).toContain('DM Serif Display');
  });

  it('produces a genuinely different surface in dark mode', () => {
    const light = renderAll(tokens(), RESTAURANT, 'light').join('');
    const dark = renderAll(tokens(), RESTAURANT, 'dark').join('');
    expect(light).not.toBe(dark);
  });
});

describe('the preview never contains tool chrome', () => {
  it('does not leak the admin tool’s greys into the phone', () => {
    // The preview is the tenant's app. If a chrome token appears inside it,
    // something was hand-styled instead of resolved.
    const chromeTokens = ['#f4f4f3', '#e8e8e6', '#85858b', '#8b8bd6', '#18181a'];
    for (const html of renderAll(tokens(), RESTAURANT)) {
      for (const token of chromeTokens) {
        expect(html, `leaked ${token}`).not.toContain(token);
      }
    }
  });
});
