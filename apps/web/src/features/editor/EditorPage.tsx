import { useQuery } from '@tanstack/react-query';
import { defaultTokens, diffTokens, validateForPublish, type ThemeTokens } from '@wl/theme';
import { useMemo, useState } from 'react';
import { PanelSection } from '../../components/chrome.js';
import { api } from '../../lib/api.js';
import { useDraftStore } from '../../state/draft-store.js';
import { Header } from './Header.jsx';
import { BrandSection } from './sections/BrandSection.jsx';
import { ButtonsSection } from './sections/ButtonsSection.jsx';
import { ColorSection } from './sections/ColorSection.jsx';
import { ShapeSection } from './sections/ShapeSection.jsx';
import { TypographySection } from './sections/TypographySection.jsx';
import { useAutosave, useUndoRedoShortcuts } from './useAutosave.js';

type SectionKey = 'brand' | 'color' | 'typography' | 'shape' | 'buttons';

export function EditorPage() {
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    brand: true,
    color: true,
    typography: true,
    shape: true,
    buttons: true,
  });

  const tokens = useDraftStore((s) => s.tokens);
  const serverTokens = useDraftStore((s) => s.serverTokens);
  const saveState = useDraftStore((s) => s.saveState);
  const liveVersion = useDraftStore((s) => s.liveVersion);
  const apply = useDraftStore((s) => s.apply);
  const hydrate = useDraftStore((s) => s.hydrate);

  useAutosave();
  useUndoRedoShortcuts();

  // Picks the first brand the user can edit. The brand list (step 8) will
  // replace this with a real route parameter.
  const bootstrap = useQuery({
    queryKey: ['bootstrap'],
    queryFn: async () => {
      const { tenants } = await api.tenants.list();
      const first = tenants[0];
      if (!first) return null;

      const draft = await api.theme.getDraft(first.id);
      hydrate({
        tenantId: first.id,
        tokens: draft.tokens as ThemeTokens,
        liveVersion: draft.liveVersion,
        nextVersion: draft.nextVersion,
      });
      return { tenant: first, draft };
    },
    retry: 1,
  });

  const validation = useMemo(() => (tokens ? validateForPublish(tokens) : null), [tokens]);

  const changeCount = useMemo(() => {
    if (!tokens || !serverTokens) return 0;
    // Against the *live* theme, not the last save — the pill answers "how far
    // am I from what customers see?"
    return liveVersion === null ? 0 : diffTokens(serverTokens, tokens).count;
  }, [tokens, serverTokens, liveVersion]);

  const publishBlockedReason = useMemo(() => {
    if (!validation) return 'Loading…';
    if (validation.blockers.length === 0) return null;
    const [first] = validation.blockers;
    return validation.blockers.length === 1 && first
      ? `${first.label} is only ${first.ratio.toFixed(1)}:1. Fix it in the Colour section before publishing.`
      : `${validation.blockers.length} contrast problems must be fixed before publishing.`;
  }, [validation]);

  const toggle = (key: SectionKey) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  if (bootstrap.isPending) return <BootScreen state="loading" />;
  if (bootstrap.isError) {
    return <BootScreen state="error" detail={(bootstrap.error as Error).message} />;
  }
  if (!bootstrap.data || !tokens) return <BootScreen state="empty" />;

  const { tenant } = bootstrap.data;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas text-ink">
      <Header
        businessName={tokens.brand.businessName}
        saveState={saveState}
        changeCount={changeCount}
        liveVersion={liveVersion}
        publishBlockedReason={publishBlockedReason}
        onPublish={() => undefined}
        onRetrySave={() => apply({ ...tokens })}
      />

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Appearance settings"
          className="w-[380px] flex-none overflow-y-auto border-r border-hairline bg-surface"
        >
          <div className="px-5 pt-[18px] pb-3.5">
            <h1 className="text-13 font-semibold tracking-[-0.01em]">Appearance</h1>
            <p className="mt-[3px] text-12 leading-[1.45] text-ink-helper">
              Changes apply to the preview instantly. Nothing goes live until you publish.
            </p>
          </div>

          <PanelSection title="Brand" open={openSections.brand} onToggle={() => toggle('brand')}>
            <BrandSection tokens={tokens} onChange={apply} />
          </PanelSection>

          <PanelSection title="Colour" open={openSections.color} onToggle={() => toggle('color')}>
            <ColorSection tokens={tokens} onChange={apply} />
          </PanelSection>

          <PanelSection
            title="Typography"
            open={openSections.typography}
            onToggle={() => toggle('typography')}
          >
            <TypographySection tokens={tokens} onChange={(next) => apply(next)} />
          </PanelSection>

          <PanelSection title="Shape" open={openSections.shape} onToggle={() => toggle('shape')}>
            <ShapeSection tokens={tokens} onChange={(next) => apply(next)} />
          </PanelSection>

          <PanelSection
            title="Buttons"
            open={openSections.buttons}
            onToggle={() => toggle('buttons')}
            last
          >
            <ButtonsSection tokens={tokens} onChange={(next) => apply(next)} />
          </PanelSection>

          <div className="flex items-center justify-between px-5 pt-4 pb-8">
            <button
              type="button"
              onClick={() =>
                apply(defaultTokens(tokens.brand.businessName, tenant.vertical))
              }
              className="focus-ring rounded-4 text-12 text-ink-helper transition-colors hover:text-ink"
            >
              Reset to platform default
            </button>
            <span className="font-mono text-11 text-ink-fainter">
              v{useDraftStore.getState().nextVersion}
            </span>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col items-center overflow-y-auto bg-canvas px-6 pt-[22px] pb-10">
          <PreviewPlaceholder />
        </main>
      </div>
    </div>
  );
}

/**
 * The phone preview is step 6. This placeholder occupies the canvas so the
 * shell's proportions are honest, and is deliberately obvious rather than a
 * half-built mock that might be mistaken for the real thing.
 */
function PreviewPlaceholder() {
  return (
    <div className="mt-6 rounded-[46px] bg-bezel p-[9px] shadow-phone">
      <div className="flex h-[764px] w-[372px] flex-col items-center justify-center gap-2 rounded-[38px] bg-surface px-10 text-center">
        <span className="font-mono text-11 text-ink-hint">step 6</span>
        <span className="text-13-5 font-semibold tracking-[-0.01em] text-ink-heading">
          Phone preview
        </span>
        <span className="text-12 leading-[1.5] text-ink-helper">
          Renders through resolveTheme() from packages/theme, in an isolated frame, across Home,
          Menu, Item Detail and Checkout.
        </span>
      </div>
    </div>
  );
}

function BootScreen({ state, detail }: { state: 'loading' | 'error' | 'empty'; detail?: string }) {
  const content = {
    loading: { title: 'Loading your brand…', body: null },
    error: {
      title: 'Could not load your brands',
      body: detail ?? 'Check that the API is running on port 4000.',
    },
    empty: {
      title: 'No brands yet',
      body: 'Add a business to give it a branded app. Setup takes about five minutes — logo, colours, and a font, then publish.',
    },
  }[state];

  return (
    <div className="flex h-full items-center justify-center bg-canvas px-6">
      <div className="flex max-w-[340px] flex-col items-center gap-1.5 text-center">
        {state === 'loading' ? (
          <div className="mb-3 flex items-end gap-2" aria-hidden="true">
            <span className="h-[34px] w-[26px] animate-pulse rounded-6 border border-hairline bg-subtle" />
            <span className="h-[46px] w-[34px] animate-pulse rounded-7 border border-dashed border-dashed bg-surface" />
            <span className="h-[34px] w-[26px] animate-pulse rounded-6 border border-hairline bg-subtle" />
          </div>
        ) : null}
        <div className="text-14-5 font-semibold tracking-[-0.015em]">{content.title}</div>
        {content.body ? (
          <div className="text-12-5 leading-[1.5] text-ink-helper">{content.body}</div>
        ) : null}
      </div>
    </div>
  );
}
