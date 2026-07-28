import { ItemArt } from '../illustrations.jsx';
import { bodyText, buttonSurface, displayText, radius } from '../theme-style.js';
import { ImageSlot, itemById, itemIndex, money, type ScreenProps } from './shared.jsx';

export function ItemScreen({ theme, content }: ScreenProps) {
  const item = itemById(content, content.detail.itemId);
  if (!item) return null;

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 20px' }}>
        <ImageSlot
          theme={theme}
          height={232}
          label={content.detail.imageLabel}
          art={<ItemArt vertical={content.vertical} index={itemIndex(content, item.id)} size={118} />}
        />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              ...bodyText(theme, 'xs', { weight: 'semibold', color: theme.secondary.base }),
              fontSize: '10.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {content.detail.eyebrow}
          </span>
          <span
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: theme.surface.borderStrong,
            }}
          />
          <span
            style={{
              ...bodyText(theme, 'xs', { weight: 'semibold', color: theme.accent.onSubtle }),
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <span style={{ color: theme.accent.base, fontSize: '12px' }}>★</span>
            {content.detail.ratingValue} · {content.detail.ratingCount} {content.detail.ratingNoun}
          </span>
        </div>

        <div style={{ ...displayText(theme, 'lg'), marginTop: '6px', lineHeight: 1.15 }}>
          {item.name}
        </div>
        <div
          style={{
            ...bodyText(theme, 'base', { color: theme.text.secondary }),
            marginTop: '7px',
            lineHeight: 1.5,
          }}
        >
          {item.description}
        </div>
        {item.meta ? (
          <div
            style={{ ...bodyText(theme, 'sm', { color: theme.text.tertiary }), marginTop: '6px' }}
          >
            {item.meta}
          </div>
        ) : null}
        <div style={{ ...bodyText(theme, 'xl', { weight: 'semibold' }), marginTop: '12px' }}>
          {money(content, item.price.amount)}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div
          style={{ ...bodyText(theme, 'sm', { weight: 'semibold' }), marginBottom: '9px' }}
        >
          {content.detail.addOnsTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {content.detail.addOns.map((addOn, index) => {
            // The first add-on renders pre-selected, so the owner can see the
            // selected-row treatment without interacting.
            const selected = index === 0;
            return (
              <div
                key={addOn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 12px',
                  background: selected ? theme.primary.subtleFill : 'transparent',
                  border: `1px solid ${selected ? theme.primary.base : theme.surface.border}`,
                  borderRadius: radius(theme.radius.md),
                }}
              >
                <span style={bodyText(theme, 'base', { weight: 'medium' })}>{addOn.name}</span>
                <span style={bodyText(theme, 'md', { color: theme.text.secondary })}>
                  +{money(content, addOn.price.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          padding: '14px 20px 16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '10px 12px',
            border: `1px solid ${theme.surface.border}`,
            borderRadius: radius(theme.radius.md),
            ...bodyText(theme, 'lg'),
          }}
        >
          <span style={{ color: theme.text.secondary }}>−</span>
          <span style={{ fontWeight: theme.typography.body.weights.semibold }}>1</span>
          <span>+</span>
        </div>
        <div
          style={{
            ...buttonSurface(theme),
            ...bodyText(theme, 'lg', { weight: 'semibold', color: theme.button.foreground }),
            flex: 1,
            textAlign: 'center',
            padding: '13px 0',
          }}
        >
          {content.detail.primaryActionLabel}
        </div>
      </div>
    </div>
  );
}
