import { useQuery } from '@tanstack/react-query';
import type { TenantSummary } from '@wl/api-client';
import { useMemo, useState } from 'react';
import { Button, Segmented, TextInput } from '../../components/chrome.js';
import { api } from '../../lib/api.js';

/**
 * The brand list.
 *
 * Ported from the design export, including its three distinct states: rows,
 * no-results, and the true empty state. Those are different situations and the
 * design is right to treat them differently — "no brands match 'oliv'" and "you
 * have no brands" call for completely different next actions.
 */

type Filter = 'all' | 'live' | 'draft';

export function BrandListPage({ onOpen }: { onOpen: (tenantId: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const brands = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await api.tenants.list()).tenants,
  });

  const all = useMemo(() => brands.data ?? [], [brands.data]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all
      .filter((tenant) => filter === 'all' || tenant.status === filter)
      .filter((tenant) => !needle || tenant.name.toLowerCase().includes(needle));
  }, [all, filter, query]);

  const liveCount = all.filter((t) => t.status === 'live').length;

  if (brands.isPending) return <Shell><TableSkeleton /></Shell>;

  if (brands.isError) {
    return (
      <Shell>
        <EmptyCard
          title="Could not load your brands"
          body={(brands.error as Error).message}
          action={<Button onClick={() => void brands.refetch()}>Try again</Button>}
        />
      </Shell>
    );
  }

  const isEmpty = all.length === 0;
  const noResults = !isEmpty && rows.length === 0;

  return (
    <Shell>
      <div className="mb-5 flex items-end justify-between gap-6">
        <div>
          <h1 className="m-0 text-19 font-semibold tracking-[-0.02em]">Brands</h1>
          <div className="mt-1 text-12-5 text-ink-helper">
            {isEmpty
              ? 'No businesses connected yet.'
              : `${all.length} ${all.length === 1 ? 'business' : 'businesses'} · ${liveCount} ${liveCount === 1 ? 'app' : 'apps'} live`}
          </div>
        </div>

        {!isEmpty ? (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="brand-search">
              Search brands
            </label>
            <TextInput
              id="brand-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search brands"
              className="h-8 w-[200px] text-12-5"
            />
            <Segmented
              label="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All' },
                { id: 'live', label: 'Live' },
                { id: 'draft', label: 'Draft' },
              ]}
            />
          </div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-11 border border-hairline bg-surface shadow-card">
            <div
              className="grid items-center gap-4 border-b border-divider bg-subtle px-4 py-2.5"
              style={{ gridTemplateColumns: '1fr 130px 150px 132px 40px' }}
            >
              {['Business', 'Status', 'Theme', 'Last edited'].map((heading) => (
                <span
                  key={heading}
                  className="text-11 font-semibold tracking-[0.04em] text-ink-helper uppercase"
                >
                  {heading}
                </span>
              ))}
              <span />
            </div>

            {rows.map((tenant) => (
              <BrandRow key={tenant.id} tenant={tenant} onOpen={onOpen} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-0.5">
            <span className="text-11-5 text-ink-faint">
              {rows.length === all.length
                ? `Showing ${rows.length} ${rows.length === 1 ? 'brand' : 'brands'}`
                : `Showing ${rows.length} of ${all.length} brands`}
            </span>
          </div>
        </>
      ) : null}

      {noResults ? (
        <EmptyCard
          title={
            query.trim()
              ? `No brands match “${query.trim()}”`
              : `No ${filter} brands`
          }
          body={
            query.trim()
              ? `Check the spelling, or clear the search to see all ${all.length} brands.`
              : 'Nothing here right now. Switch to All to see every brand.'
          }
          action={
            <Button
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear search and filters
            </Button>
          }
        />
      ) : null}

      {isEmpty ? <EmptyState /> : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex h-[56px] flex-none items-center justify-between border-b border-hairline bg-surface pr-4 pl-5">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="h-[18px] w-[18px] rounded-5 bg-ink" aria-hidden="true" />
            <span className="text-13 font-semibold tracking-[-0.01em]">Counter</span>
          </div>
          <div className="h-5 w-px bg-hairline" aria-hidden="true" />
          <nav className="flex items-center gap-2 text-13">
            <span className="font-medium">Brands</span>
          </nav>
        </div>
        <Button variant="primary">New brand</Button>
      </header>

      <main className="flex flex-1 justify-center overflow-y-auto px-6 pt-[30px] pb-15">
        <div className="w-full max-w-[1020px]">{children}</div>
      </main>
    </div>
  );
}

function BrandRow({
  tenant,
  onOpen,
}: {
  tenant: TenantSummary;
  onOpen: (tenantId: string) => void;
}) {
  const live = tenant.status === 'live';

  return (
    <button
      type="button"
      onClick={() => onOpen(tenant.id)}
      className="focus-ring grid w-full items-center gap-4 border-b border-row px-4 py-3 text-left transition-colors duration-100 hover:bg-subtle"
      style={{ gridTemplateColumns: '1fr 130px 150px 132px 40px' }}
    >
      <span className="flex min-w-0 items-center gap-[11px]">
        <span
          style={{ background: tenant.swatches[0] }}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-8 border border-black/[0.06] text-12-5 font-bold tracking-[-0.01em] text-white mix-blend-normal"
        >
          <span className="[text-shadow:0_0_2px_rgba(0,0,0,0.35)]">{initials(tenant.name)}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-13 font-medium tracking-[-0.005em]">
            {tenant.name}
          </span>
          <span className="mt-0.5 block text-11-5 text-ink-hint capitalize">{tenant.vertical}</span>
        </span>
      </span>

      <span
        className={`inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[11px] border pr-2.5 pl-[7px] ${
          live ? 'border-live-border bg-live-bg' : 'border-hairline bg-subtle'
        }`}
      >
        <span
          className={`h-[5px] w-[5px] rounded-full ${live ? 'bg-live-dot' : 'bg-idle-dot'}`}
          aria-hidden="true"
        />
        <span className={`text-11-5 font-medium ${live ? 'text-live-ink' : 'text-ink-body'}`}>
          {live ? 'Live' : 'Draft'}
        </span>
      </span>

      <span className="flex items-center gap-1.5">
        {tenant.swatches.map((hex, index) => (
          <span
            key={`${hex}-${index}`}
            style={{ background: hex }}
            className="h-[13px] w-[13px] rounded-4 border border-black/[0.09]"
            aria-hidden="true"
          />
        ))}
        <span className="ml-0.5 text-11-5 text-ink-hint">{tenant.themeName}</span>
      </span>

      <span>
        <span className="block text-12-5 text-ink-body">
          {formatRelative(tenant.draftUpdatedAt)}
        </span>
        <span className="mt-0.5 block text-11-5 text-ink-faint">
          {tenant.hasUnpublishedChanges ? 'Unpublished changes' : `v${tenant.liveVersion ?? 1}`}
        </span>
      </span>

      <span className="justify-self-end text-13 text-ink-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-11 border border-hairline bg-surface px-8 py-16 text-center">
      <div className="mb-[22px] flex items-end gap-2" aria-hidden="true">
        <span className="h-[34px] w-[26px] rounded-6 border border-hairline bg-subtle" />
        <span className="h-[46px] w-[34px] rounded-7 border border-dashed border-dashed-empty bg-surface" />
        <span className="h-[34px] w-[26px] rounded-6 border border-hairline bg-subtle" />
      </div>
      <div className="text-14-5 font-semibold tracking-[-0.015em]">No brands yet</div>
      <div className="mt-1.5 max-w-[340px] text-12-5 leading-[1.5] text-ink-helper">
        Add a business to give it a branded app. Setup takes about five minutes — logo, colours, and
        a font, then publish.
      </div>
      <div className="mt-5 flex items-center gap-2.5">
        <Button variant="primary" size="md">
          New brand
        </Button>
      </div>
    </div>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-11 border border-hairline bg-surface px-8 py-13 text-center">
      <div className="text-13-5 font-semibold tracking-[-0.01em]">{title}</div>
      <div className="mt-1.5 max-w-[320px] text-12-5 leading-[1.5] text-ink-helper">{body}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Matches the real table's grid so the layout does not jump when data lands. */
function TableSkeleton() {
  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-6">
        <div>
          <div className="h-[22px] w-[90px] animate-pulse rounded-6 bg-hairline" />
          <div className="mt-2 h-[14px] w-[160px] animate-pulse rounded-4 bg-divider" />
        </div>
      </div>
      <div className="overflow-hidden rounded-11 border border-hairline bg-surface shadow-card">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid items-center gap-4 border-b border-row px-4 py-3"
            style={{ gridTemplateColumns: '1fr 130px 150px 132px 40px' }}
          >
            <div className="flex items-center gap-[11px]">
              <div className="h-8 w-8 flex-none animate-pulse rounded-8 bg-hairline" />
              <div className="min-w-0 flex-1">
                <div className="h-[13px] w-[55%] animate-pulse rounded-4 bg-hairline" />
                <div className="mt-1.5 h-[11px] w-[35%] animate-pulse rounded-4 bg-divider" />
              </div>
            </div>
            <div className="h-[22px] w-[62px] animate-pulse rounded-[11px] bg-divider" />
            <div className="h-[13px] w-[92px] animate-pulse rounded-4 bg-divider" />
            <div className="h-[13px] w-[76px] animate-pulse rounded-4 bg-divider" />
            <span />
          </div>
        ))}
      </div>
    </>
  );
}

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('')
    .toUpperCase();
}

export function formatRelative(iso: string | null, now = new Date()): string {
  if (!iso) return 'Never';
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (seconds < 172800) return 'Yesterday';

  // Beyond a couple of days a relative figure stops being useful — "43 days
  // ago" is harder to place than a date.
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
