import type { ResolvedTheme } from '@wl/theme';
import { HeroArt, ItemArt } from '@wl/ui';
import type { CSSProperties } from 'react';

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
 *
 * Deliberately the last piece of hand-styled DOM that draws a theme. It is not
 * the phone — it is a diagram of one, sized for a modal — so it belongs to the
 * admin tool rather than to `@wl/ui`, and it is not bound by that package's
 * rule that a component must be able to render on a device. The illustrations
 * still come from `@wl/ui`, because there is no reason for two of those.
 */

/** Radii above the pill threshold are capped so CSS does not print "999px". */
const radius = (value: number): string => (value >= 999 ? '9999px' : `${value}px`);

/** Body type tokens as CSS. The only such helper the admin tool still needs. */
function bodyText(
  theme: ResolvedTheme,
  size: keyof ResolvedTheme['typography']['body']['sizes'],
  options: { weight?: keyof ResolvedTheme['typography']['body']['weights']; color?: string } = {},
): CSSProperties {
  const { body } = theme.typography;
  return {
    fontFamily: body.fontFamily,
    fontWeight: body.weights[options.weight ?? 'regular'],
    fontSize: `${body.sizes[size]}px`,
    lineHeight: body.lineHeight,
    color: options.color ?? theme.text.primary,
  };
}

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
          backgroundColor: theme.placeholder.fill,
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
        <HeroArt size={44} color={theme.placeholder.ink} />
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
            backgroundColor: theme.placeholder.fill,
            width: '30px',
            height: '30px',
            borderRadius: radius(theme.radius.md),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.placeholder.ink,
          }}
        >
          <ItemArt size={19} color={theme.placeholder.ink} />
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
