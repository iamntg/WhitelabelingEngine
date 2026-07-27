import { bodyText, buttonSurface, displayText, radius } from '../theme-style.js';
import { AppHeader, ImageSlot, Thumb, itemById, money, type ScreenProps } from './shared.jsx';

export function HomeScreen({ theme, content }: ScreenProps) {
  const featured = content.home.featuredItemIds
    .map((id) => itemById(content, id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppHeader theme={theme} />

      <div style={{ padding: '0 20px' }}>
        <ImageSlot theme={theme} height={148} label={content.home.heroImageLabel}>
          <span
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '5px 9px',
              fontSize: '10.5px',
              fontWeight: theme.typography.body.weights.bold,
              fontFamily: theme.typography.body.fontFamily,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: theme.accent.base,
              color: theme.accent.on,
              borderRadius: radius(theme.radius.full),
            }}
          >
            {content.home.promoLabel}
          </span>
        </ImageSlot>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ ...displayText(theme, 'md'), lineHeight: 1.2 }}>{content.home.headline}</div>
        <div style={{ ...bodyText(theme, 'md', { color: theme.text.secondary }), marginTop: '4px' }}>
          {content.home.subline}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <span
            style={{
              ...buttonSurface(theme),
              ...bodyText(theme, 'base', { weight: 'semibold', color: theme.button.foreground }),
              flex: 1,
              textAlign: 'center',
              padding: '11px 0',
            }}
          >
            {content.home.primaryActionLabel}
          </span>
          <span
            style={{
              ...bodyText(theme, 'base', { weight: 'medium' }),
              padding: '11px 14px',
              border: `1px solid ${theme.surface.border}`,
              borderRadius: radius(theme.radius.md),
            }}
          >
            {content.home.secondaryActionLabel}
          </span>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...displayText(theme, 'xs'), fontSize: '14px' }}>
            {content.home.listTitle}
          </span>
          <span
            style={bodyText(theme, 'sm', { weight: 'medium', color: theme.secondary.base })}
          >
            {content.home.listLinkLabel}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '11px' }}>
          {featured.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: '11px', alignItems: 'center' }}>
              <Thumb theme={theme} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={bodyText(theme, 'lg', { weight: 'semibold' })}>{item.name}</div>
                <div
                  style={{
                    ...bodyText(theme, 'sm', { color: theme.text.secondary }),
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.meta ?? item.description}
                </div>
              </div>
              <div style={bodyText(theme, 'base', { weight: 'semibold' })}>
                {money(content, item.price.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
