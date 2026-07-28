import type { ResolvedTheme } from '@wl/theme';
import { HeroArt, ItemArt } from './illustrations.jsx';
import { bodyText, placeholderSurface, radius } from './theme-style.js';

/**
 * The compact phone used in the publish modal's before/after.
 *
 * A condensed home screen rather than a scaled-down real one: at 268px the full
 * screen's 11px body text would be unreadable, and an unreadable comparison
 * teaches the owner nothing. This shows the things a theme change actually
 * moves — logo tile, heading face, accent chip, button style, corner radius —
 * at a size where each is legible.
 *
 * It renders through the same `ResolvedTheme` as the full preview, so it cannot
 * disagree with it about what a token produces.
 */
export function MiniPhone({ theme, dimmed = false }: { theme: ResolvedTheme; dimmed?: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '268px',
        border: `1px solid ${theme.surface.border}`,
        borderTopLeftRadius: '14px',
        borderTopRightRadius: '14px',
        borderBottom: 'none',
        background: theme.surface.base,
        fontFamily: theme.typography.body.fontFamily,
        padding: '12px 12px 18px',
        // The live pane is dimmed so the eye lands on the new theme first.
        opacity: dimmed ? 0.78 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: radius(theme.radius.logo),
              background: theme.primary.base,
              color: theme.primary.on,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: theme.typography.body.weights.bold,
            }}
          >
            {theme.brand.initials.slice(0, 1)}
          </span>
          <span
            style={{
              fontFamily: theme.typography.display.fontFamily,
              fontWeight: theme.typography.display.weight,
              fontSize: '12.5px',
              letterSpacing: '-0.01em',
              color: theme.text.primary,
            }}
          >
            {theme.brand.businessName}
          </span>
        </div>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: theme.accent.base,
          }}
        />
      </div>

      <div
        style={{
          ...placeholderSurface(theme),
          height: '76px',
          marginTop: '10px',
          borderRadius: radius(theme.radius.md),
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.placeholder.ink,
        }}
      >
        {/* No content here, so the generic frame rather than a vertical scene. */}
        <HeroArt size={44} />
        <span
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            padding: '3px 7px',
            fontSize: '8.5px',
            fontWeight: theme.typography.body.weights.bold,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: theme.accent.base,
            color: theme.accent.on,
            borderRadius: radius(theme.radius.full),
          }}
        >
          Featured
        </span>
      </div>

      <div
        style={{
          fontFamily: theme.typography.display.fontFamily,
          fontWeight: theme.typography.display.weight,
          fontSize: '14px',
          letterSpacing: '-0.015em',
          color: theme.text.primary,
          marginTop: '10px',
        }}
      >
        Open until 10
      </div>
      <div
        style={{
          ...bodyText(theme, 'xs', { color: theme.text.secondary }),
          fontSize: '10.5px',
          marginTop: '3px',
        }}
      >
        Ready in ~18 min
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '8px 0',
            fontSize: '10.5px',
            fontWeight: theme.typography.body.weights.semibold,
            background: theme.button.background,
            color: theme.button.foreground,
            border: `1px solid ${theme.button.border}`,
            borderRadius: radius(theme.radius.md),
          }}
        >
          Primary action
        </span>
        <span
          style={{
            padding: '8px 10px',
            fontSize: '10.5px',
            fontWeight: theme.typography.body.weights.medium,
            color: theme.text.primary,
            border: `1px solid ${theme.surface.border}`,
            borderRadius: radius(theme.radius.md),
          }}
        >
          More
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <span
          style={{
            ...placeholderSurface(theme),
            width: '30px',
            height: '30px',
            borderRadius: radius(theme.radius.md),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.placeholder.ink,
          }}
        >
          <ItemArt size={19} />
        </span>
        <span
          style={{
            flex: 1,
            fontSize: '10.5px',
            fontWeight: theme.typography.body.weights.semibold,
            color: theme.text.primary,
          }}
        >
          Most popular
        </span>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: theme.typography.body.weights.semibold,
            color: theme.text.primary,
          }}
        >
          $26.00
        </span>
      </div>
    </div>
  );
}
