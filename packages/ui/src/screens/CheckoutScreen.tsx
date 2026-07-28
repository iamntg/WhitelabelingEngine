import { checkoutTotals, type SampleContent } from '@wl/api-client';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../components/Button.js';
import { Card, Divider, SelectableRow } from '../components/Surface.js';
import { money } from '../content.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * Checkout.
 *
 * Totals are computed from the lines, never stored, so the figure under "Total"
 * can never disagree with the rows above it.
 */

const PADDING = 20;

export function CheckoutScreen({ content }: { content: SampleContent }) {
  const theme = useTheme();
  const type = useTextStyles();
  const [tipIndex, setTipIndex] = useState(content.checkout.selectedTipIndex);

  const totals = checkoutTotals(content.checkout, content.currency);

  const summaryRow = (label: string, value: string, strong = false) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: strong ? 7 : 3,
        paddingBottom: strong ? 0 : 3,
      }}
    >
      {[label, value].map((text, index) => (
        <Text
          key={index}
          style={type.body(strong ? 'lg' : 'md', {
            ...(strong ? { weight: 'semibold' as const } : {}),
            color: strong ? theme.text.primary : theme.text.secondary,
          })}
        >
          {text}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: PADDING, paddingTop: 4, paddingBottom: 14 }}>
          <Text style={type.display('md')}>{content.checkout.title}</Text>
          <Text style={{ ...type.body('md', { color: theme.text.secondary }), marginTop: 4 }}>
            {content.checkout.subline}
          </Text>
        </View>

        <View style={{ paddingHorizontal: PADDING }}>
          <Card>
            {content.checkout.lines.map((line) => (
              <View
                key={line.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={type.body('base')}>
                  {line.qty} × {line.name}
                </Text>
                <Text style={type.body('base', { weight: 'medium' })}>
                  {money(content, line.price.amount * line.qty)}
                </Text>
              </View>
            ))}

            <Divider style={{ marginVertical: 10 }} />

            {summaryRow('Subtotal', money(content, totals.subtotal.amount))}
            {summaryRow(content.checkout.taxLabel, money(content, totals.tax.amount))}
            {summaryRow('Total', money(content, totals.total.amount), true)}
          </Card>
        </View>

        <View style={{ paddingHorizontal: PADDING, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ ...type.body('sm', { weight: 'semibold' }), marginBottom: 9 }}>
            Add a tip
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {content.checkout.tipOptions.map((tip, index) => {
              const selected = index === tipIndex;
              return (
                <SelectableRow
                  key={tip.label}
                  selected={selected}
                  align="center"
                  onPress={() => setTipIndex(index)}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={type.body('md', {
                      weight: 'semibold',
                      color: selected ? theme.primary.onSubtle : theme.text.secondary,
                    })}
                  >
                    {tip.label}
                  </Text>
                </SelectableRow>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: PADDING, paddingTop: 14, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
            backgroundColor: theme.accent.subtleFill,
            borderRadius: theme.radius.md,
          }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: theme.accent.base,
            }}
          />
          <Text style={type.body('sm', { weight: 'medium', color: theme.accent.onSubtle })}>
            {content.checkout.loyaltyLabel}
          </Text>
        </View>

        <Button
          label={`${content.checkout.payActionPrefix} ${money(content, totals.total.amount)}`}
          size="lg"
        />

        <Text
          style={{
            ...type.body('xs', { color: theme.text.secondary }),
            textAlign: 'center',
            marginTop: 9,
          }}
        >
          {content.checkout.footnote} · {theme.brand.businessName}
        </Text>
      </View>
    </View>
  );
}
