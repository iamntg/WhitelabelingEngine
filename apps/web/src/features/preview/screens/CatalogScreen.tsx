import { bodyText, buttonSurface, displayText, radius } from '../theme-style.js';
import { Tag, Thumb, money, type ScreenProps } from './shared.jsx';

/**
 * The catalog: a menu for restaurants, a service list for salons, a class
 * schedule for studios. One screen, driven entirely by the seeded content —
 * the labels ("Menu" / "Services" / "Schedule"), the categories and the item
 * metadata all come from the payload, so a new vertical needs content, not a
 * new component.
 */
export function CatalogScreen({ theme, content }: ScreenProps) {
  const cartTotal = content.checkout.lines.reduce(
    (sum, line) => sum + line.price.amount * line.qty,
    0,
  );
  const cartCount = content.checkout.lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 20px 12px' }}>
        <div style={displayText(theme, 'md')}>{content.catalog.title}</div>
      </div>

      <div style={{ display: 'flex', gap: '7px', padding: '0 20px 14px', overflow: 'hidden' }}>
        {content.catalog.categories.map((category) => {
          const active = category.id === content.catalog.activeCategoryId;
          return (
            <span
              key={category.id}
              style={{
                ...bodyText(theme, 'sm', {
                  weight: 'medium',
                  color: active ? theme.primary.on : theme.text.secondary,
                }),
                padding: '7px 12px',
                whiteSpace: 'nowrap',
                background: active ? theme.primary.base : 'transparent',
                border: `1px solid ${active ? theme.primary.base : theme.surface.border}`,
                borderRadius: radius(theme.radius.full),
              }}
            >
              {category.name}
            </span>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
        {content.items.slice(0, 5).map((item, index) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '13px 0',
              borderTop: `1px solid ${theme.surface.border}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={bodyText(theme, 'lg', { weight: 'semibold' })}>{item.name}</div>
                {item.tag ? <Tag theme={theme}>{item.tag}</Tag> : null}
              </div>
              <div
                style={{
                  ...bodyText(theme, 'sm', { color: theme.text.secondary }),
                  marginTop: '3px',
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
              {item.meta ? (
                <div
                  style={{
                    ...bodyText(theme, 'xs', { color: theme.text.tertiary }),
                    marginTop: '3px',
                  }}
                >
                  {item.meta}
                </div>
              ) : null}
              <div
                style={{ ...bodyText(theme, 'base', { weight: 'semibold' }), marginTop: '6px' }}
              >
                {money(content, item.price.amount)}
              </div>
            </div>
            <Thumb theme={theme} size={62} vertical={content.vertical} index={index} />
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 20px 16px' }}>
        <div
          style={{
            ...buttonSurface(theme),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
          }}
        >
          <span
            style={bodyText(theme, 'base', {
              weight: 'semibold',
              color: theme.button.foreground,
            })}
          >
            {content.catalog.cartBarLabel} · {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </span>
          <span
            style={bodyText(theme, 'base', {
              weight: 'semibold',
              color: theme.button.foreground,
            })}
          >
            {money(content, cartTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
