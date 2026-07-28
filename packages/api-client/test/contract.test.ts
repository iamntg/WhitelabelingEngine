import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/errors.js';
import {
  checkoutTotals,
  formatMoney,
  formatMoneyDelta,
  PatchDraftBody,
  PublicThemeResponse,
  SampleContent,
  Slug,
} from '../src/index.js';

const usd = (amount: number) => ({ amount, currency: 'USD' });

describe('money', () => {
  it('formats integer minor units, never floats', () => {
    expect(formatMoney(usd(2600))).toBe('$26.00');
    expect(formatMoney(usd(900))).toBe('$9.00');
    expect(formatMoney(usd(18500))).toBe('$185.00');
  });

  it('cannot produce a floating-point artefact', () => {
    // The reason money is stored as integers at all: 0.1 + 0.2 in the preview
    // renders as "$0.30000000000000004" and destroys the customer's trust in
    // everything else on the screen.
    for (let cents = 0; cents <= 10000; cents += 7) {
      expect(formatMoney(usd(cents))).toMatch(/^\$\d{1,3}(,\d{3})*\.\d{2}$/);
    }
  });

  it('signs add-on deltas', () => {
    expect(formatMoneyDelta(usd(400))).toBe('+$4.00');
    expect(formatMoneyDelta(usd(-400))).toBe('−$4.00');
  });
});

describe('checkoutTotals', () => {
  it('computes totals from the lines rather than trusting a stored figure', () => {
    const totals = checkoutTotals(
      {
        title: 'Checkout',
        subline: 'Pickup',
        lines: [
          { qty: 1, name: 'A', price: usd(2600) },
          { qty: 1, name: 'B', price: usd(500) },
        ],
        taxRateBps: 851,
        taxLabel: 'Tax',
        tipOptions: [{ label: 'None', bps: 0 }],
        selectedTipIndex: 0,
        loyaltyLabel: 'x',
        payActionPrefix: 'Pay',
        footnote: 'y',
      },
      'USD',
    );

    expect(totals.subtotal.amount).toBe(3100);
    expect(totals.tax.amount).toBe(264);
    expect(totals.total.amount).toBe(3364);
    // The design's checkout screen shows exactly these numbers.
    expect(formatMoney(totals.total)).toBe('$33.64');
  });

  it('multiplies by quantity', () => {
    const totals = checkoutTotals(
      {
        title: 't',
        subline: 's',
        lines: [{ qty: 3, name: 'A', price: usd(1000) }],
        taxRateBps: 0,
        taxLabel: 'Tax',
        tipOptions: [{ label: 'None', bps: 0 }],
        selectedTipIndex: 0,
        loyaltyLabel: 'x',
        payActionPrefix: 'Pay',
        footnote: 'y',
      },
      'USD',
    );
    expect(totals.subtotal.amount).toBe(3000);
  });
});

describe('SampleContent integrity', () => {
  const base = {
    vertical: 'restaurant',
    currency: 'USD',
    locale: 'en-US',
    home: {
      heroSlides: [{ promoLabel: 'p', imageLabel: 'hero image 1200×800' }],
      headline: 'h',
      subline: 's',
      primaryActionLabel: 'a',
      secondaryActionLabel: 'b',
      listTitle: 'l',
      listLinkLabel: 'll',
      featuredItemIds: ['a'],
    },
    catalog: {
      title: 'Menu',
      categories: [
        { id: 'c1', name: 'One' },
        { id: 'c2', name: 'Two' },
      ],
      activeCategoryId: 'c1',
      cartBarLabel: 'View order',
    },
    items: [
      { id: 'a', categoryId: 'c1', name: 'A', description: 'd', price: usd(100), tag: null, meta: null, imageLabel: 'i' },
      { id: 'b', categoryId: 'c2', name: 'B', description: 'd', price: usd(200), tag: null, meta: null, imageLabel: 'i' },
      { id: 'c', categoryId: 'c2', name: 'C', description: 'd', price: usd(300), tag: null, meta: null, imageLabel: 'i' },
    ],
    detail: {
      itemId: 'a',
      eyebrow: 'e',
      ratingValue: 4.8,
      ratingCount: 10,
      ratingNoun: 'orders',
      imageLabel: 'i',
      addOnsTitle: 'Add',
      addOns: [{ id: 'x', name: 'X', price: usd(100) }],
      primaryActionLabel: 'Add to order',
    },
    checkout: {
      title: 'Checkout',
      subline: 's',
      lines: [{ qty: 1, name: 'A', price: usd(100) }],
      taxRateBps: 800,
      taxLabel: 'Tax',
      tipOptions: [{ label: 'None', bps: 0 }],
      selectedTipIndex: 0,
      loyaltyLabel: 'l',
      payActionPrefix: 'Pay',
      footnote: 'f',
    },
    tabs: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'catalog', label: 'Menu', icon: 'restaurant_menu' },
      { id: 'orders', label: 'Orders', icon: 'receipt_long' },
      { id: 'account', label: 'Account', icon: 'person' },
    ],
  };

  it('accepts a well-formed payload', () => {
    expect(() => SampleContent.parse(base)).not.toThrow();
  });

  it('rejects a featured item that does not exist', () => {
    // A dangling reference renders as a blank row in the preview, which reads
    // as a theme bug rather than a content bug.
    const broken = { ...base, home: { ...base.home, featuredItemIds: ['nope'] } };
    expect(() => SampleContent.parse(broken)).toThrow(/not in items/);
  });

  it('rejects a detail item that does not exist', () => {
    const broken = { ...base, detail: { ...base.detail, itemId: 'nope' } };
    expect(() => SampleContent.parse(broken)).toThrow(/not in items/);
  });

  it('rejects an item in an unknown category', () => {
    const broken = {
      ...base,
      items: [{ ...base.items[0], categoryId: 'ghost' }, base.items[1], base.items[2]],
    };
    expect(() => SampleContent.parse(broken)).toThrow(/unknown category/);
  });

  it('rejects a selected tip index out of range', () => {
    const broken = { ...base, checkout: { ...base.checkout, selectedTipIndex: 5 } };
    expect(() => SampleContent.parse(broken)).toThrow(/out of range/);
  });

  it('requires exactly four tabs', () => {
    const broken = { ...base, tabs: base.tabs.slice(0, 3) };
    expect(() => SampleContent.parse(broken)).toThrow();
  });
});

describe('Slug', () => {
  it('accepts a well-formed slug', () => {
    expect(Slug.parse('olive-ash-kitchen')).toBe('olive-ash-kitchen');
  });

  it('rejects shapes that would break the public URL', () => {
    for (const bad of ['Olive-Ash', 'olive_ash', '-olive', 'olive-', 'olive--ash', 'ab']) {
      expect(() => Slug.parse(bad), bad).toThrow();
    }
  });
});

describe('PatchDraftBody', () => {
  it('is the theme package’s own patch schema, not a restatement', () => {
    expect(() => PatchDraftBody.parse({ colors: { primary: '#123456' } })).not.toThrow();
    expect(() => PatchDraftBody.parse({ colors: { tertiary: '#123456' } })).toThrow();
  });
});

describe('PublicThemeResponse', () => {
  it('rejects a payload whose resolved theme is not actually resolved', () => {
    expect(() =>
      PublicThemeResponse.parse({
        schemaVersion: 1,
        version: 1,
        tenant: { slug: 'a-b-c', name: 'X', vertical: 'restaurant' },
        tokens: {
          brand: { businessName: 'X', logoUrl: null, logoAspect: 1 },
          colors: { primary: '#b4472b', secondary: '#2f4a3f', accent: '#a8710c', background: '#fffbf2' },
          typography: { pairingId: 'modern' },
          shape: { radiusScale: 'rounded' },
          buttons: { style: 'filled' },
          schemaVersion: 1,
        },
        resolved: { light: { nope: true }, dark: { nope: true } },
        assets: { logoUrl: null, logoWidth: null, logoHeight: null },
        publishedAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});

describe('ApiError', () => {
  it('classifies transient failures for the optimistic-UI revert path', () => {
    expect(new ApiError(500, 'internal_error', 'x').isTransient).toBe(true);
    expect(new ApiError(429, 'rate_limited', 'x').isTransient).toBe(true);
    expect(new ApiError(400, 'bad_request', 'x').isTransient).toBe(false);
  });

  it('classifies auth failures separately, so the app can prompt a sign-in', () => {
    expect(new ApiError(401, 'unauthorized', 'x').isAuth).toBe(true);
    expect(new ApiError(403, 'forbidden', 'x').isAuth).toBe(true);
    expect(new ApiError(404, 'not_found', 'x').isAuth).toBe(false);
  });

  it('falls back gracefully when the error body is not JSON', async () => {
    // Proxy timeouts and HTML error pages must not mask the real status.
    const response = new Response('<html>502 Bad Gateway</html>', {
      status: 502,
      statusText: 'Bad Gateway',
    });
    const error = await ApiError.fromResponse(response);
    expect(error.status).toBe(502);
    expect(error.isTransient).toBe(true);
  });

  it('reads a structured error body when present', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'confirmation_required', message: 'Confirm the contrast problems' } }),
      { status: 422, headers: { 'content-type': 'application/json' } },
    );
    const error = await ApiError.fromResponse(response);
    expect(error.code).toBe('confirmation_required');
    expect(error.message).toBe('Confirm the contrast problems');
  });
});
