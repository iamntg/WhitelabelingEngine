import type { SampleContent, SampleItem } from '@wl/api-client';
import { formatMoney } from '@wl/api-client';
import type { ResolvedTheme } from '@wl/theme';
import { bodyText, imageChip, placeholderSurface, radius } from '../theme-style.js';

/**
 * Pieces shared across the four preview screens.
 *
 * Every colour, radius and font here comes from `ResolvedTheme`. Nothing is
 * hand-styled — if a screen needs a value that isn't on the resolved theme,
 * that is a gap in the resolver, not licence to hardcode.
 */

export interface ScreenProps {
  theme: ResolvedTheme;
  content: SampleContent;
}

export function itemById(content: SampleContent, id: string): SampleItem | undefined {
  return content.items.find((item) => item.id === id);
}

export function money(content: SampleContent, amount: number): string {
  return formatMoney({ amount, currency: content.currency }, content.locale);
}

/** Striped image placeholder with an honest dimension label. */
export function ImageSlot({
  theme,
  height,
  label,
  cornerRadius,
  children,
}: {
  theme: ResolvedTheme;
  height: number;
  label?: string;
  cornerRadius?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...placeholderSurface(theme),
        height: `${height}px`,
        borderRadius: radius(cornerRadius ?? theme.radius.md),
        display: 'flex',
        alignItems: 'flex-end',
        padding: '12px',
        position: 'relative',
      }}
    >
      {children}
      {label ? <span style={imageChip(theme)}>{label}</span> : null}
    </div>
  );
}

export function Thumb({ theme, size }: { theme: ResolvedTheme; size: number }) {
  return (
    <div
      style={{
        ...placeholderSurface(theme),
        width: `${size}px`,
        height: `${size}px`,
        flex: `0 0 ${size}px`,
        borderRadius: radius(theme.radius.md),
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(127,127,127,0.15) 0 5px, transparent 5px 10px)',
      }}
    />
  );
}

/** Accent-coloured tag such as "Chef's pick" or "4 spots left". */
export function Tag({ theme, children }: { theme: ResolvedTheme; children: React.ReactNode }) {
  return (
    <span
      style={{
        ...bodyText(theme, 'xs', { weight: 'bold', color: theme.accent.onSubtle }),
        fontSize: '9.5px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: theme.accent.subtleFill,
        borderRadius: radius(theme.radius.sm),
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function StatusBar({ theme }: { theme: ResolvedTheme }) {
  return (
    <div
      style={{
        height: '44px',
        flex: '0 0 44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        ...bodyText(theme, 'sm', { weight: 'semibold' }),
      }}
    >
      <span>9:41</span>
      <span style={{ letterSpacing: '0.06em', opacity: 0.5 }}>▮▮▮</span>
    </div>
  );
}

export function TabBar({
  theme,
  content,
  activeTabId,
}: {
  theme: ResolvedTheme;
  content: SampleContent;
  activeTabId: string;
}) {
  return (
    <div
      style={{
        flex: '0 0 62px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px 10px',
        borderTop: `1px solid ${theme.surface.border}`,
      }}
    >
      {content.tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const color = active ? theme.primary.base : theme.text.tertiary;
        return (
          <div
            key={tab.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              paddingTop: '9px',
            }}
          >
            <span
              className="icon"
              style={{
                fontSize: '21px',
                color,
                // The variable FILL axis is what makes the active tab read as
                // selected without a second icon set.
                fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 400, 'opsz' 24`,
              }}
            >
              {tab.icon}
            </span>
            <span style={{ ...bodyText(theme, 'xs', { weight: 'medium', color }), fontSize: '9.5px' }}>
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The app header: logo tile (or initials) plus the business name. */
export function AppHeader({ theme }: { theme: ResolvedTheme }) {
  return (
    <div
      style={{
        padding: '4px 20px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: radius(theme.radius.logo),
            background: theme.brand.logoUrl ? 'transparent' : theme.primary.base,
            color: theme.primary.on,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            ...bodyText(theme, 'base', { weight: 'bold', color: theme.primary.on }),
          }}
        >
          {theme.brand.logoUrl ? (
            <img
              src={theme.brand.logoUrl}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
            />
          ) : (
            theme.brand.initials.slice(0, 1)
          )}
        </div>
        <span
          style={{
            fontFamily: theme.typography.display.fontFamily,
            fontWeight: theme.typography.display.weight,
            fontSize: '16px',
            letterSpacing: '-0.01em',
            color: theme.text.primary,
          }}
        >
          {theme.brand.businessName}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: theme.primary.subtleFill,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="icon" style={{ fontSize: '16px', color: theme.primary.base }}>
          notifications
        </span>
        <span
          style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: theme.accent.base,
            border: `2px solid ${theme.surface.base}`,
          }}
        />
      </div>
    </div>
  );
}
