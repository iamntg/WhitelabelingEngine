import {
  checkContrast,
  diffTokens,
  getPreset,
  type ContrastResult,
  type ThemeTokens,
} from '@wl/theme';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublishModal } from './PublishModal.jsx';

function tokens(overrides: Partial<ThemeTokens['colors']> = {}): ThemeTokens {
  const base = getPreset('ember').tokens;
  return { ...base, colors: { ...base.colors, ...overrides } };
}

const noop = () => undefined;

function render(props: Partial<Parameters<typeof PublishModal>[0]> = {}) {
  const draft = props.draftTokens ?? tokens({ primary: '#123456' });
  const live = props.liveTokens === undefined ? tokens() : props.liveTokens;

  return renderToStaticMarkup(
    <PublishModal
      open
      businessName="Olive & Ash Kitchen"
      draftTokens={draft}
      liveTokens={live}
      liveVersion={1}
      nextVersion={2}
      changeSummary={live ? diffTokens(live, draft) : { count: 0, changes: [] }}
      blockers={[]}
      warnings={[]}
      publishing={false}
      error={null}
      onPublish={noop}
      onClose={noop}
      {...props}
    />,
  );
}

function blockersFor(t: ThemeTokens): ContrastResult[] {
  return checkContrast(t).filter((r) => r.level === 'fail' && r.blocking);
}

function warningsFor(t: ThemeTokens): ContrastResult[] {
  return checkContrast(t).filter((r) => r.level === 'warn' && r.blocking);
}

describe('rendering', () => {
  it('renders nothing when closed', () => {
    expect(render({ open: false })).toBe('');
  });

  it('is a labelled modal dialog', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby');
  });

  it('shows before and after, both rendered through the resolver', () => {
    const html = render({
      liveTokens: tokens({ primary: '#b4472b' }),
      draftTokens: tokens({ primary: '#1f5fd0' }),
    });
    expect(html).toContain('Live now');
    expect(html).toContain('New theme');
    expect(html).toContain('#b4472b');
    expect(html).toContain('#1f5fd0');
  });

  it('names the version it will create and the one it can roll back to', () => {
    const html = render();
    expect(html).toContain('Draft · v2');
    expect(html).toContain('You can roll back to v1');
  });

  it('handles a brand that has never been published', () => {
    const html = render({ liveTokens: null, liveVersion: null });
    expect(html).toContain('Never published');
    expect(html).toContain('This will be the first published version.');
    // No misleading empty phone where "live" would be.
    expect(html).toContain('Nothing is live yet');
  });
});

describe('the change list', () => {
  it('renders the server-computed summary rather than diffing again', () => {
    const html = render({
      liveTokens: tokens(),
      draftTokens: { ...tokens({ primary: '#123456' }), shape: { radiusScale: 'sharp' } },
    });
    expect(html).toContain('Primary colour');
    expect(html).toContain('Corners');
    expect(html).toContain('Rounded');
    expect(html).toContain('Sharp');
    expect(html).toContain('2 changes');
  });

  it('shows colour changes as swatch → swatch with the new hex', () => {
    const html = render({
      liveTokens: tokens({ primary: '#b4472b' }),
      draftTokens: tokens({ primary: '#1f5fd0' }),
    });
    expect(html).toContain('#1F5FD0');
  });

  it('explains an empty diff instead of showing a blank panel', () => {
    const same = tokens();
    const html = render({ liveTokens: same, draftTokens: same });
    expect(html).toContain('No changes');
    expect(html).toContain('This draft matches what is already live');
  });
});

describe('publish gating', () => {
  it('enables publish for a clean theme', () => {
    const html = render();
    expect(html).toContain('Publish now');
    expect(html).not.toMatch(/Publish now<\/button>[\s\S]{0,50}disabled/);
  });

  it('disables publish and explains why when a pair fails', () => {
    const bad = tokens({ accent: '#f5c518', background: '#ffffff' });
    const blockers = blockersFor(bad);
    expect(blockers.length).toBeGreaterThan(0);

    const html = render({ draftTokens: bad, blockers });
    expect(html).toContain('must be fixed first');
    expect(html).toContain('Prices, tags and labels in this colour will be hard to read.');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Fix the contrast problems above before publishing');
  });

  it('requires an explicit checkbox for each warning', () => {
    const risky = tokens({ secondary: '#7d7d85', background: '#ffffff' });
    const warnings = warningsFor(risky);
    expect(warnings.length).toBeGreaterThan(0);

    const html = render({ draftTokens: risky, warnings });
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('Publish anyway');
    // Unticked warnings must leave the button disabled.
    expect(html).toContain('Confirm the warnings above before publishing');
  });

  it('shows progress and locks the controls while publishing', () => {
    const html = render({ publishing: true });
    expect(html).toContain('Publishing…');
    expect(html).toContain('disabled=""');
  });

  it('surfaces a server rejection in the footer', () => {
    const html = render({ error: 'Someone else published while you were working.' });
    expect(html).toContain('Someone else published while you were working.');
    // The error replaces the rollback note rather than stacking under it.
    expect(html).not.toContain('You can roll back to v1');
  });
});

describe('the modal stays in the tool’s chrome', () => {
  it('does not tint its own controls with the tenant’s brand colour', () => {
    // Brand colours belong in the two comparison phones and nowhere else.
    const html = render({
      liveTokens: tokens({ primary: '#e23d28' }),
      draftTokens: tokens({ primary: '#e23d28' }),
    });
    const footer = html.slice(html.lastIndexOf('Keep editing') - 400);
    expect(footer).not.toContain('#e23d28');
  });
});
