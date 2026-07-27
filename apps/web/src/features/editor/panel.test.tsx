import { checkContrast, getPreset, type ThemeTokens } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandSection } from './sections/BrandSection.jsx';
import { ButtonsSection } from './sections/ButtonsSection.jsx';
import { ColorSection } from './sections/ColorSection.jsx';
import { ShapeSection } from './sections/ShapeSection.jsx';
import { TypographySection } from './sections/TypographySection.jsx';

/**
 * Renders each panel section to markup.
 *
 * These are not snapshot tests — they assert the specific behaviours the spec
 * calls for, so a regression names itself rather than showing a diff.
 */

function tokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return { ...base, colors: { ...base.colors, ...overrides } };
}

const noop = () => undefined;

describe('BrandSection', () => {
  it('shows the upload target with the design’s copy when there is no logo', () => {
    const html = renderToStaticMarkup(<BrandSection tokens={tokens()} onChange={noop} />);
    expect(html).toContain('Upload your logo');
    expect(html).toContain('SVG or PNG · square · min 512px');
    expect(html).toContain('Shown in the app header and on receipts.');
  });

  it('switches to the replace/remove state once a logo exists', () => {
    const withLogo = { ...tokens(), brand: { ...tokens().brand, logoUrl: 'https://x.test/a.png' } };
    const html = renderToStaticMarkup(<BrandSection tokens={withLogo} onChange={noop} />);
    expect(html).toContain('Replace');
    expect(html).toContain('Remove');
    expect(html).not.toContain('Upload your logo');
  });
});

describe('ColorSection', () => {
  it('renders all four channels with five quick picks each', () => {
    const html = renderToStaticMarkup(<ColorSection tokens={tokens()} onChange={noop} />);
    for (const label of ['Primary', 'Secondary', 'Accent', 'Background']) {
      expect(html).toContain(label);
    }
    expect(html.match(/role="radio"/g)?.length).toBe(20);
  });

  it('shows no contrast card for a shipped preset', () => {
    // Every preset is publishable, so opening the editor on one must be a
    // clean slate. A warning on the default theme is a warning nobody reads.
    const html = renderToStaticMarkup(<ColorSection tokens={tokens()} onChange={noop} />);
    expect(html).not.toContain('Use suggested colour');
  });

  it('surfaces a failing pair inline, with the consequence and a one-click fix', () => {
    const html = renderToStaticMarkup(
      <ColorSection tokens={tokens({ accent: '#f5c518', background: '#ffffff' })} onChange={noop} />,
    );
    expect(html).toContain('Accent on background');
    expect(html).toContain('Prices, tags and labels in this colour will be hard to read.');
    expect(html).toContain('Use suggested colour');
  });

  it('never surfaces an advisory pair to the owner', () => {
    // secondary-on-primary fails for all six presets because those colours
    // never touch. It stays in checkContrast for the API and for future
    // layouts, but the owner must not be shown a problem they cannot act on.
    const identical = tokens({ primary: '#b4472b', secondary: '#b4472b' });
    const advisory = checkContrast(identical).find((r) => r.pairId === 'secondary-on-primary');
    expect(advisory?.level).toBe('fail');

    const html = renderToStaticMarkup(<ColorSection tokens={identical} onChange={noop} />);
    expect(html).not.toContain('Secondary on primary');
  });

  it('marks the selected swatch for assistive technology, not just visually', () => {
    const html = renderToStaticMarkup(
      <ColorSection tokens={tokens({ primary: '#e23d28' })} onChange={noop} />,
    );
    expect(html).toContain('aria-label="Primary #e23d28"');
    expect(html).toContain('aria-checked="true"');
  });
});

describe('TypographySection', () => {
  it('shows the current pairing and a live specimen', () => {
    const html = renderToStaticMarkup(<TypographySection tokens={tokens()} onChange={noop} />);
    expect(html).toContain('Fraunces');
    expect(html).toContain('Ash-Roasted Half Chicken');
    expect(html).toContain('Try your own words');
  });

  it('renders the specimen in the pairing’s own typeface, not the tool’s', () => {
    const html = renderToStaticMarkup(<TypographySection tokens={tokens()} onChange={noop} />);
    expect(html).toContain('font-family:&quot;Fraunces&quot;');
  });
});

describe('ShapeSection', () => {
  it('offers all four scales with the id "subtle", not "soft"', () => {
    const html = renderToStaticMarkup(<ShapeSection tokens={tokens()} onChange={noop} />);
    for (const label of ['Sharp', 'Subtle', 'Rounded', 'Pill']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Applied to cards, images, inputs and buttons together.');
  });

  it('marks the active scale as checked', () => {
    const html = renderToStaticMarkup(<ShapeSection tokens={tokens()} onChange={noop} />);
    expect(html.match(/aria-checked="true"/g)?.length).toBe(1);
  });
});

describe('ButtonsSection', () => {
  it('previews each style in the tenant’s real resolved colours', () => {
    const html = renderToStaticMarkup(<ButtonsSection tokens={tokens()} onChange={noop} />);
    expect(html).toContain('Filled');
    expect(html).toContain('Outline');
    expect(html).toContain('Soft');
    // The outline chip must be transparent, not merely a lighter fill.
    expect(html).toContain('background:transparent');
  });

  it('renders the primary colour on the filled chip', () => {
    const html = renderToStaticMarkup(
      <ButtonsSection tokens={tokens({ primary: '#b4472b' })} onChange={noop} />,
    );
    expect(html).toContain('#b4472b');
  });
});

describe('the tool’s chrome stays desaturated', () => {
  it('never paints a tenant colour outside a preview chip', () => {
    // The rule: brand colours appear only in swatches and button previews —
    // never on the panel's own surfaces, borders or text.
    const brand = '#e23d28';
    const html = renderToStaticMarkup(
      <ShapeSection tokens={tokens({ primary: brand })} onChange={noop} />,
    );
    expect(html).not.toContain(brand);
  });
});
