import { getPreset, resolveTheme } from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { hasIcon, ICON_NAMES, Icon } from '../src/icons.js';

/**
 * The icon set is a contract with the seed content: the API sends a Material
 * Symbols name for each tab, and this library has to have drawn it. A name with
 * no glyph is a blank tab on a customer's phone, and it would only appear for
 * the vertical nobody previewed.
 *
 * The tab names are listed here rather than imported from the API fixtures,
 * which are in another workspace and would drag the server's dependencies into
 * this package's test run. A name added to the seed without a glyph here is
 * caught by the `SampleContent` round trip in the web app's preview tests.
 */
const TAB_ICONS = [
  'home',
  'restaurant_menu',
  'receipt_long',
  'person',
  'content_cut',
  'calendar_month',
  'confirmation_number',
  'event_note',
];

const theme = resolveTheme(getPreset('ember').tokens);

describe('the icon set', () => {
  it('draws every icon the seed content asks a tab for', () => {
    for (const name of TAB_ICONS) {
      expect(hasIcon(name), `no glyph for ${name}`).toBe(true);
    }
  });

  it('renders each glyph as actual geometry, in both states', () => {
    for (const name of ICON_NAMES) {
      for (const filled of [false, true]) {
        const svg = renderToStaticMarkup(
          <Icon name={name} size={21} color={theme.primary.base} filled={filled} />,
        );
        expect(svg, `${name} filled=${filled}`).toContain('<svg');
        // A glyph that renders an empty <svg> passes a smoke test and shows the
        // user nothing.
        expect(svg.includes('<path') || svg.includes('<circle') || svg.includes('<rect')).toBe(
          true,
        );
      }
    }
  });

  it('paints in the colour it is given, never a hardcoded one', () => {
    const svg = renderToStaticMarkup(<Icon name="home" size={21} color="#1f5fd0" />);
    expect(svg).toContain('#1f5fd0');
  });

  it('falls back rather than throwing on a name the content invented', () => {
    expect(hasIcon('spaceship')).toBe(false);
    const svg = renderToStaticMarkup(<Icon name="spaceship" size={21} color="#000000" />);
    expect(svg).toContain('<rect');
  });

  it('distinguishes the selected state by more than colour', () => {
    // The active tab has to read as active for someone who cannot separate the
    // owner's primary from the tertiary text colour.
    const outline = renderToStaticMarkup(<Icon name="home" size={21} color="#000000" />);
    const solid = renderToStaticMarkup(<Icon name="home" size={21} color="#000000" filled />);
    expect(outline).not.toBe(solid);
  });
});
