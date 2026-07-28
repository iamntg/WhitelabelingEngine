import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColorScheme } from '@wl/theme';
import { defaultTokens, diffTokens, validateForPublish, type ThemeTokens } from '@wl/theme';
import { useMemo, useState } from 'react';
import { PanelSection } from '../../components/chrome.js';
import { ApiError } from '@wl/api-client';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { useDraftStore } from '../../state/draft-store.js';
import { Header } from './Header.jsx';
import { BrandSection } from './sections/BrandSection.jsx';
import { ButtonsSection } from './sections/ButtonsSection.jsx';
import { ColorSection } from './sections/ColorSection.jsx';
import { ShapeSection } from './sections/ShapeSection.jsx';
import { TypographySection } from './sections/TypographySection.jsx';
import { PreviewCanvas, type PreviewScreen } from '../preview/PreviewCanvas.jsx';
import { PublishModal } from './PublishModal.jsx';
import { useAutosave, useUndoRedoShortcuts } from './useAutosave.js';

type SectionKey = 'brand' | 'color' | 'typography' | 'shape' | 'buttons';

export function EditorPage({
  tenantId,
  onBack,
}: {
  tenantId: string;
  onBack: () => void;
}) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [screen, setScreen] = useState<PreviewScreen>('home');
  const [scheme, setScheme] = useState<ColorScheme>('light');
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
  const liveTokens = useDraftStore((s) => s.liveTokens);
  const nextVersion = useDraftStore((s) => s.nextVersion);
  const savedChangeSummary = useDraftStore((s) => s.changeSummary);
  const apply = useDraftStore((s) => s.apply);
  const hydrate = useDraftStore((s) => s.hydrate);

  useAutosave();
  useUndoRedoShortcuts();

  const bootstrap = useQuery({
    queryKey: ['bootstrap', tenantId],
    queryFn: async () => {
      const { tenants } = await api.tenants.list();
      const first = tenants.find((t) => t.id === tenantId);
      if (!first) return null;

      const draft = await api.theme.getDraft(first.id);
      hydrate({
        tenantId: first.id,
        tokens: draft.tokens as ThemeTokens,
        liveTokens: (draft.liveTokens as ThemeTokens | null) ?? null,
        liveVersion: draft.liveVersion,
        nextVersion: draft.nextVersion,
        changeSummary: draft.changeSummary,
      });
      return { tenant: first, draft };
    },
    retry: 1,
  });

  const slug = bootstrap.data?.tenant.slug ?? null;

  // Preview content comes from the same public endpoint the phone calls, so the
  // editor cannot preview against data the app would never receive.
  const previewContent = useQuery({
    queryKey: ['preview-content', slug],
    queryFn: async () => (slug ? (await api.public.content(slug)).data.content : null),
    enabled: slug !== null,
    staleTime: Infinity,
  });

  const validation = useMemo(() => (tokens ? validateForPublish(tokens) : null), [tokens]);

  // The diff shown is against what is *live*, not the last save — it answers
  // "how far am I from what customers see?". While an edit is still unsaved the
  // server's summary is one step behind, so it is recomputed locally from the
  // same diffTokens the server uses; they agree by construction.
  const changeSummary = useMemo(() => {
    if (!tokens) return savedChangeSummary;
    if (!liveTokens) return { count: 0, changes: [] };
    if (tokens === serverTokens) return savedChangeSummary;
    return diffTokens(liveTokens, tokens);
  }, [tokens, serverTokens, liveTokens, savedChangeSummary]);

  // Contrast no longer disables this button. A failing pair is something the
  // owner confirms inside the modal, where they can see both phones and read
  // what the problem actually is — refusing at the header meant the argument
  // happened before they were shown the evidence.
  const publishBlockedReason = validation ? null : 'Loading…';

  const queryClient = useQueryClient();
  const { push } = useToast();
  const markPublishing = useDraftStore((s) => s.markPublishing);
  const markPublished = useDraftStore((s) => s.markPublished);

  const publish = useMutation({
    mutationFn: async (acknowledgedIssues: string[]) => {
      const tenantId = useDraftStore.getState().tenantId;
      if (!tenantId) throw new Error('No brand loaded');
      markPublishing();
      return api.theme.publish(tenantId, { acknowledgedIssues });
    },
    onSuccess: async (result) => {
      markPublished(result.version.version);
      setPublishOpen(false);
      push({ tone: 'neutral', message: `Published v${result.version.version}. Live shortly.` });
      // The live theme moved, so the draft's diff and the brand list are stale.
      await queryClient.invalidateQueries({ queryKey: ['bootstrap', tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      // The server's verdict wins. It re-ran the same contrast check against
      // the stored draft, so a rejection here means the client was out of date —
      // it confirmed a set of problems that is no longer the set that exists.
      useDraftStore.setState({ saveState: 'dirty' });
      if (error instanceof ApiError && error.code === 'confirmation_required') {
        void queryClient.invalidateQueries({ queryKey: ['bootstrap', tenantId] });
      }
    },
  });

  const toggle = (key: SectionKey) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  if (bootstrap.isPending) return <BootScreen state="loading" onBack={onBack} />;
  if (bootstrap.isError) {
    return (
      <BootScreen state="error" detail={(bootstrap.error as Error).message} onBack={onBack} />
    );
  }
  if (!bootstrap.data || !tokens) return <BootScreen state="missing" onBack={onBack} />;

  const { tenant } = bootstrap.data;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas text-ink">
      <Header
        businessName={tokens.brand.businessName}
        saveState={saveState}
        changeCount={changeSummary.count}
        liveVersion={liveVersion}
        publishBlockedReason={publishBlockedReason}
        onBack={onBack}
        onPublish={() => setPublishOpen(true)}
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
              v{nextVersion}
            </span>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col items-center overflow-y-auto bg-canvas px-6 pt-[22px] pb-10">
          <PreviewCanvas
            tokens={tokens}
            content={previewContent.data ?? null}
            screen={screen}
            onScreenChange={setScreen}
            scheme={scheme}
            onSchemeChange={setScheme}
          />
        </main>
      </div>

      <PublishModal
        open={publishOpen}
        businessName={tokens.brand.businessName}
        draftTokens={tokens}
        liveTokens={liveTokens}
        liveVersion={liveVersion}
        nextVersion={nextVersion}
        changeSummary={changeSummary}
        failures={validation?.failures ?? []}
        warnings={validation?.warnings ?? []}
        publishing={publish.isPending}
        error={publish.error instanceof Error ? publish.error.message : null}
        onPublish={(acknowledged) => publish.mutate(acknowledged)}
        onClose={() => {
          publish.reset();
          setPublishOpen(false);
        }}
      />
    </div>
  );
}

function BootScreen({
  state,
  detail,
  onBack,
}: {
  state: 'loading' | 'error' | 'missing';
  detail?: string;
  onBack: () => void;
}) {
  const content = {
    loading: { title: 'Loading your brand…', body: null },
    error: {
      title: 'Could not load this brand',
      body: detail ?? 'Check that the API is running on port 4000.',
    },
    missing: {
      title: 'That brand is not available',
      body: 'It may have been removed, or you may not have access to it.',
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
        {state !== 'loading' ? (
          <button
            type="button"
            onClick={onBack}
            className="focus-ring mt-3 rounded-4 text-12-5 font-medium text-ink-body underline underline-offset-2 hover:text-ink"
          >
            Back to brands
          </button>
        ) : null}
      </div>
    </div>
  );
}
