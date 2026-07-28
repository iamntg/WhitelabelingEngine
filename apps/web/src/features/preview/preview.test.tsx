import type { SampleContent } from '@wl/api-client';
import { getPreset, resolveTheme, type ResolvedTheme, type ThemeTokens } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhoneApp, PHONE_CONTAINER_CSS, PHONE_HEIGHT, type PreviewScreen } from './PhoneApp.jsx';
import { skeleton } from './PhoneFrame.jsx';
import { RESTAURANT, SALON, STUDIO } from '@wl/api-client/fixtures';

/**
 * The preview is the product's central claim: what the owner sees is what ships
 * to the phone. These tests assert the claim rather than the pixels.
 *
 * They render `PhoneApp` — the exact tree the canvas mounts — rather than
 * screens in isolation, because the claim is now about the whole frame: the
 * header, the tab bar and Home all come from `@wl/ui`, and a test that composed
 * its own shell would stop testing what ships.
 */

const SCREENS: PreviewScreen[] = ['home', 'catalog', 'item', 'checkout'];

function tokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return { ...base, colors: { ...base.colors, ...overrides } };
}

/**
 * react-native-web normalises every colour to `rgba()` on its way into the
 * inline style, so a resolved hex never appears in the markup verbatim. This is
 * the same value, spelled the way the renderer spells it.
 */
function rendered(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1.00)`;
}

function renderScreen(
  theme: ResolvedTheme,
  content: SampleContent,
  screen: PreviewScreen,
): string {
  return renderToStaticMarkup(<PhoneApp theme={theme} content={content} screen={screen} />);
}

function renderAll(
  t: ThemeTokens,
  content: SampleContent,
  scheme: 'light' | 'dark' = 'light',
): string[] {
  const theme = resolveTheme(t, { scheme });
  return SCREENS.map((screen) => renderScreen(theme, content, screen));
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
        for (const markup of renderAll(tokens(), content, scheme)) {
          expect(markup.length, `${name}/${scheme}`).toBeGreaterThan(200);
        }
      }
    });
  }

  it('renders the shared tab bar on every screen, with one tab selected', () => {
    for (const content of [RESTAURANT, SALON, STUDIO]) {
      for (const markup of renderAll(tokens(), content)) {
        for (const tab of content.tabs) {
          expect(markup).toContain(tab.label);
        }
        expect(markup).toContain('aria-selected="true"');
      }
    }
  });
});

describe('the frame gives the app a height to fill', () => {
  /**
   * `AppShell`'s root is `flex: 1`, which react-native-web writes as
   * `flex-basis: 0%`. That is inert in a `display: block` parent — the root
   * falls back to its content height, and the tab bar either falls off the
   * bottom of the frame or floats up it. jsdom does not lay out, so these
   * assert the declaration rather than the pixels; the declaration is what was
   * missing.
   */
  it('declares the container as a fixed-height flex column', () => {
    expect(PHONE_CONTAINER_CSS).toMatch(/display:\s*flex/);
    expect(PHONE_CONTAINER_CSS).toMatch(/flex-direction:\s*column/);
    expect(PHONE_CONTAINER_CSS).toContain(`${PHONE_HEIGHT}px`);
  });

  it('puts that declaration on the element the preview actually portals into', () => {
    const html = skeleton();
    const rule = html.slice(html.indexOf('#preview-root'));

    expect(rule).toMatch(/display:\s*flex/);
    expect(rule).toMatch(/flex-direction:\s*column/);
  });

  it('uses one declaration, so the proof sheet cannot disagree with the editor', () => {
    // The proof sheet had its own copy and was correct while the editor was
    // broken, which is how the tab bar went missing from Home unnoticed.
    expect(skeleton()).toContain(PHONE_CONTAINER_CSS);
  });
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
      for (const markup of renderAll(tokens(), content)) {
        expect(markup.toLowerCase()).not.toContain('lorem');
        expect(markup).not.toContain('$0.00');
        expect(markup).not.toMatch(/Item \d/);
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
      for (const markup of renderAll(tokens(), content)) {
        expect(markup).not.toMatch(/\$\d+\.\d{3,}/);
      }
    }
  });

  it('computes the checkout total from the lines', () => {
    // The design's checkout shows $31.00 + $2.64 tax = $33.64.
    const markup = renderScreen(resolveTheme(tokens()), RESTAURANT, 'checkout');
    expect(markup).toContain('$31.00');
    expect(markup).toContain('$2.64');
    expect(markup).toContain('$33.64');
  });
});

describe('the preview renders through resolveTheme, not hand-styling', () => {
  it('paints the owner’s primary colour into the screens', () => {
    const markup = renderAll(tokens({ primary: '#1f5fd0' }), RESTAURANT).join('');
    expect(markup).toContain(rendered('#1f5fd0'));
  });

  it('follows the resolver when the button style changes', () => {
    const filled = resolveTheme({ ...tokens(), buttons: { style: 'filled' } });
    const outline = resolveTheme({ ...tokens(), buttons: { style: 'outline' } });

    const filledHome = renderScreen(filled, RESTAURANT, 'home');
    const outlineHome = renderScreen(outline, RESTAURANT, 'home');

    // Filled paints the primary; outline draws it and leaves the fill empty.
    expect(filledHome).toContain(`background-color:${rendered(filled.button.background)}`);
    expect(outline.button.background).toBe('transparent');
    expect(outlineHome).toContain(`border-top-color:${rendered(outline.button.border)}`);
    expect(outlineHome).not.toBe(filledHome);
  });

  it('follows the resolver when the corner scale changes', () => {
    const sharp = resolveTheme({ ...tokens(), shape: { radiusScale: 'sharp' } });
    const rounded = resolveTheme({ ...tokens(), shape: { radiusScale: 'rounded' } });

    expect(renderScreen(sharp, RESTAURANT, 'home')).not.toBe(
      renderScreen(rounded, RESTAURANT, 'home'),
    );
    // react-native-web expands `borderRadius` into the four corner longhands.
    expect(renderScreen(rounded, RESTAURANT, 'home')).toContain('border-top-left-radius:12px');
  });

  it('uses the pairing’s display face for headings', () => {
    const theme = resolveTheme({ ...tokens(), typography: { pairingId: 'grand' } });
    expect(renderScreen(theme, RESTAURANT, 'home')).toContain('DM Serif Display');
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
    //
    // Both spellings are checked. react-native-web writes colours as rgba(), so
    // hunting only for the hex would be a test that can no longer fail — which
    // is worse than not having it, because it still reads like coverage.
    const chromeTokens = ['#f4f4f3', '#e8e8e6', '#85858b', '#8b8bd6', '#18181a'];

    for (const markup of renderAll(tokens(), RESTAURANT)) {
      for (const token of chromeTokens) {
        expect(markup, `leaked ${token}`).not.toContain(token);
        expect(markup, `leaked ${token} as rgba`).not.toContain(rendered(token));
      }
    }
  });

  it('would catch a leak, in the spelling the renderer actually uses', () => {
    // Guards the assertion above: the tokens are only absent because nothing
    // uses them, not because the search string could never match.
    const markup = renderScreen(
      resolveTheme(tokens({ primary: '#8b8bd6' })),
      RESTAURANT,
      'home',
    );
    expect(markup).toContain(rendered('#8b8bd6'));
  });
});
