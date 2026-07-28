import type { SampleContent } from '@wl/api-client';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '../icons.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * The tab bar.
 *
 * The active tab is carried by a filled glyph plus the primary colour, not by
 * colour alone — colour alone fails for anyone who cannot separate the brand's
 * primary from the tertiary text colour, and the owner picks that primary.
 */
export function TabBar({
  content,
  activeTabId,
  onTabPress,
  bottomInset = 0,
}: {
  content: SampleContent;
  activeTabId: string;
  onTabPress?: ((tabId: string) => void) | undefined;
  bottomInset?: number;
}) {
  const theme = useTheme();
  const type = useTextStyles();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingBottom: 10 + bottomInset,
        borderTopWidth: 1,
        borderTopColor: theme.surface.border,
      }}
    >
      {content.tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const color = active ? theme.primary.base : theme.text.tertiary;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            // The unified `aria-*` form, which React Native maps to the native
            // accessibility state and react-native-web emits verbatim. The
            // older `accessibilityState` prop only reaches the native side.
            aria-selected={active}
            accessibilityLabel={tab.label}
            onPress={onTabPress ? () => onTabPress(tab.id) : undefined}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 3,
              paddingTop: 9,
            }}
          >
            <Icon name={tab.icon} size={21} color={color} filled={active} />
            <Text
              style={{
                ...type.body('xs', { weight: 'medium', color }),
                fontSize: 9.5,
                lineHeight: 12,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
