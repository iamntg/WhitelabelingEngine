import { checkoutTotals } from '@wl/api-client';
import { bodyText, buttonSurface, displayText, radius } from '../theme-style.js';
import { money, type ScreenProps } from './shared.jsx';

export function CheckoutScreen({ theme, content }: ScreenProps) {
  // Totals are computed from the lines, never stored, so the figure under
  // "Total" can never disagree with the rows above it.
  const totals = checkoutTotals(content.checkout, content.currency);

  const row = (label: string, value: string, strong = false) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: strong ? '7px 0 0' : '3px 0',
        ...bodyText(theme, strong ? 'lg' : 'md', {
          ...(strong ? { weight: 'semibold' as const } : {}),
          color: strong ? theme.text.primary : theme.text.secondary,
        }),
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 20px 14px' }}>
        <div style={displayText(theme, 'md')}>{content.checkout.title}</div>
        <div style={{ ...bodyText(theme, 'md', { color: theme.text.secondary }), marginTop: '4px' }}>
          {content.checkout.subline}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div
          style={{
            padding: '14px',
            border: `1px solid ${theme.surface.border}`,
            borderRadius: radius(theme.radius.md),
          }}
        >
          {content.checkout.lines.map((line) => (
            <div
              key={line.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '6px 0',
              }}
            >
              <span style={bodyText(theme, 'base')}>
                {line.qty} × {line.name}
              </span>
              <span style={bodyText(theme, 'base', { weight: 'medium' })}>
                {money(content, line.price.amount * line.qty)}
              </span>
            </div>
          ))}

          <div
            style={{ height: '1px', background: theme.surface.border, margin: '10px 0' }}
          />
          {row('Subtotal', money(content, totals.subtotal.amount))}
          {row(content.checkout.taxLabel, money(content, totals.tax.amount))}
          {row('Total', money(content, totals.total.amount), true)}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ ...bodyText(theme, 'sm', { weight: 'semibold' }), marginBottom: '9px' }}>
          Add a tip
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {content.checkout.tipOptions.map((tip, index) => {
            const selected = index === content.checkout.selectedTipIndex;
            return (
              <span
                key={tip.label}
                style={{
                  ...bodyText(theme, 'md', {
                    weight: 'semibold',
                    color: selected ? theme.primary.onSubtle : theme.text.secondary,
                  }),
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 0',
                  background: selected ? theme.primary.subtleFill : 'transparent',
                  border: `1px solid ${selected ? theme.primary.base : theme.surface.border}`,
                  borderRadius: radius(theme.radius.md),
                }}
              >
                {tip.label}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '14px 20px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            marginBottom: '12px',
            background: theme.accent.subtleFill,
            borderRadius: radius(theme.radius.md),
          }}
        >
          <span
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: theme.accent.base,
              flex: '0 0 16px',
            }}
          />
          <span
            style={bodyText(theme, 'sm', { weight: 'medium', color: theme.accent.onSubtle })}
          >
            {content.checkout.loyaltyLabel}
          </span>
        </div>

        <div
          style={{
            ...buttonSurface(theme),
            ...bodyText(theme, 'lg', { weight: 'semibold', color: theme.button.foreground }),
            textAlign: 'center',
            padding: '13px 0',
          }}
        >
          {content.checkout.payActionPrefix} {money(content, totals.total.amount)}
        </div>
        <div
          style={{
            ...bodyText(theme, 'xs', { color: theme.text.secondary }),
            textAlign: 'center',
            marginTop: '9px',
          }}
        >
          {content.checkout.footnote} · {theme.brand.businessName}
        </div>
      </div>
    </div>
  );
}
