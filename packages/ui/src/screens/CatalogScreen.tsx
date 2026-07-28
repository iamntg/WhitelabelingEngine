import type { SampleContent } from '@wl/api-client';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../components/Button.js';
import { Chip, Divider, Thumb } from '../components/Surface.js';
import { Tag } from '../components/Tag.js';
import { money } from '../content.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * The catalog: a menu for restaurants, a service list for salons, a class
 * schedule for studios. One screen, driven entirely by the seeded content — the
 * labels ("Menu" / "Services" / "Schedule"), the categories and the item
 * metadata all come from the payload, so a new vertical needs content, not a
 * new component.
 *
 * The category strip scrolls horizontally rather than being clipped. The DOM
 * version simply let the overflowing pills disappear off the right edge, which
 * looked deliberate in a 372pt frame and would have been a bug on a narrower
 * phone.
 */

const PADDING = 20;

export function CatalogScreen({ content }: { content: SampleContent }) {
  const theme = useTheme();
  const type = useTextStyles();
  const [categoryId, setCategoryId] = useState(content.catalog.activeCategoryId);

  const cartTotal = content.checkout.lines.reduce(
    (sum, line) => sum + line.price.amount * line.qty,
    0,
  );
  const cartCount = content.checkout.lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: PADDING, paddingTop: 4, paddingBottom: 12 }}>
        <Text style={type.display('md')}>{content.catalog.title}</Text>
      </View>

      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingHorizontal: PADDING, paddingBottom: 14 }}
        >
          {content.catalog.categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={category.id === categoryId}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: PADDING }}
      >
        {content.items.slice(0, 5).map((item, index) => (
          <View key={item.id}>
            <Divider />
            <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 13 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={type.body('lg', { weight: 'semibold' })}>{item.name}</Text>
                  {item.tag ? <Tag label={item.tag} /> : null}
                </View>

                <Text
                  style={{
                    ...type.body('sm', { color: theme.text.secondary }),
                    marginTop: 3,
                    lineHeight: theme.typography.body.sizes.sm * 1.4,
                  }}
                >
                  {item.description}
                </Text>

                {item.meta ? (
                  <Text
                    style={{
                      ...type.body('xs', { color: theme.text.tertiary }),
                      marginTop: 3,
                    }}
                  >
                    {item.meta}
                  </Text>
                ) : null}

                <Text style={{ ...type.body('base', { weight: 'semibold' }), marginTop: 6 }}>
                  {money(content, item.price.amount)}
                </Text>
              </View>

              <Thumb size={62} vertical={content.vertical} index={index} />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: PADDING, paddingTop: 12, paddingBottom: 16 }}>
        <Button
          label={`${content.catalog.cartBarLabel} · ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
          trailingLabel={money(content, cartTotal)}
        />
      </View>
    </View>
  );
}
