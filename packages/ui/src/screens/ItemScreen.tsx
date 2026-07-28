import type { SampleContent } from '@wl/api-client';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Stepper } from '../components/Button.js';
import { ImageSlot } from '../components/ImageSlot.js';
import { SelectableRow } from '../components/Surface.js';
import { itemById, itemIndex, money } from '../content.js';
import { Icon } from '../icons.js';
import { ItemArt } from '../illustrations.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * The item detail: one dish, one service, one class.
 *
 * The DOM version pushed the buy bar down with `marginTop: auto` in a
 * non-scrolling column, which fit at 764pt and would have clipped on anything
 * shorter. Here the body scrolls and the bar is pinned, which is what a phone
 * does and what an owner with a long description needs.
 */

const PADDING = 20;

export function ItemScreen({ content }: { content: SampleContent }) {
  const theme = useTheme();
  const type = useTextStyles();
  const [selectedAddOn, setSelectedAddOn] = useState(content.detail.addOns[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const item = itemById(content, content.detail.itemId);
  if (!item) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: PADDING }}>
          <ImageSlot
            height={232}
            label={content.detail.imageLabel}
            art={
              <ItemArt
                vertical={content.vertical}
                index={itemIndex(content, item.id)}
                size={118}
                color={theme.placeholder.ink}
              />
            }
          />
        </View>

        <View style={{ paddingHorizontal: PADDING, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                ...type.body('xs', { weight: 'semibold', color: theme.secondary.base }),
                fontSize: 10.5,
                letterSpacing: 10.5 * 0.06,
                textTransform: 'uppercase',
              }}
            >
              {content.detail.eyebrow}
            </Text>

            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.surface.borderStrong,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="star" size={12} color={theme.accent.base} filled />
              <Text
                style={{
                  ...type.body('xs', { weight: 'semibold', color: theme.accent.onSubtle }),
                  fontSize: 11,
                }}
              >
                {content.detail.ratingValue} · {content.detail.ratingCount}{' '}
                {content.detail.ratingNoun}
              </Text>
            </View>
          </View>

          <Text
            style={{
              ...type.display('lg'),
              marginTop: 6,
              lineHeight: theme.typography.display.sizes.lg * 1.15,
            }}
          >
            {item.name}
          </Text>

          <Text
            style={{
              ...type.body('base', { color: theme.text.secondary }),
              marginTop: 7,
              lineHeight: theme.typography.body.sizes.base * 1.5,
            }}
          >
            {item.description}
          </Text>

          {item.meta ? (
            <Text style={{ ...type.body('sm', { color: theme.text.tertiary }), marginTop: 6 }}>
              {item.meta}
            </Text>
          ) : null}

          <Text style={{ ...type.body('xl', { weight: 'semibold' }), marginTop: 12 }}>
            {money(content, item.price.amount)}
          </Text>
        </View>

        <View style={{ paddingHorizontal: PADDING, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ ...type.body('sm', { weight: 'semibold' }), marginBottom: 9 }}>
            {content.detail.addOnsTitle}
          </Text>

          <View style={{ gap: 8 }}>
            {content.detail.addOns.map((addOn) => {
              const selected = addOn.id === selectedAddOn;
              return (
                <SelectableRow
                  key={addOn.id}
                  selected={selected}
                  onPress={() => setSelectedAddOn(selected ? null : addOn.id)}
                >
                  <Text style={type.body('base', { weight: 'medium' })}>{addOn.name}</Text>
                  <Text style={type.body('md', { color: theme.text.secondary })}>
                    +{money(content, addOn.price.amount)}
                  </Text>
                </SelectableRow>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: PADDING,
          paddingTop: 14,
          paddingBottom: 16,
        }}
      >
        <Stepper value={quantity} onChange={setQuantity} />
        <Button label={content.detail.primaryActionLabel} size="lg" style={{ flex: 1 }} />
      </View>
    </View>
  );
}
