import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { ItemArt } from '../illustrations.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';
import type { SampleContent } from '@wl/api-client';

/**
 * The surfaces the screens sit things on: a bordered card, a hairline, a
 * category pill, a selectable row, a small placeholder thumbnail.
 *
 * The selected state is the same treatment everywhere it appears — a primary
 * border over the primary's low-emphasis wash. It shows up on the catalogue's
 * active category, the item's chosen add-on and the checkout's chosen tip, and
 * an owner who changes their primary colour should see all three move together.
 * That only holds if there is one implementation of it.
 */

/** A bordered container on the base surface. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | undefined }) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: theme.surface.border,
          borderRadius: theme.radius.md,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle | undefined }) {
  const theme = useTheme();
  // A 1px View rather than a border, because it is a rule between rows and not
  // an edge of anything.
  return <View style={[{ height: 1, backgroundColor: theme.surface.border }, style]} />;
}

/** The catalogue's category pill. Selected is a filled primary, not a tint. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress?: (() => void) | undefined;
}) {
  const theme = useTheme();
  const type = useTextStyles();

  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={selected}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: selected ? theme.primary.base : theme.surface.border,
        backgroundColor: selected ? theme.primary.base : 'transparent',
      }}
    >
      <Text
        style={type.body('sm', {
          weight: 'medium',
          color: selected ? theme.primary.on : theme.text.secondary,
        })}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A row or tile the customer picks: an add-on, a tip amount.
 *
 * `align` is the only difference between the two uses — add-ons are full-width
 * rows with the price on the right, tips are equal columns of centred text.
 */
export function SelectableRow({
  selected,
  onPress,
  align = 'between',
  children,
  style,
}: {
  selected: boolean;
  onPress?: (() => void) | undefined;
  align?: 'between' | 'center';
  children: ReactNode;
  style?: ViewStyle | undefined;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={selected}
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : 'space-between',
          paddingHorizontal: 12,
          paddingVertical: align === 'center' ? 10 : 11,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: selected ? theme.primary.base : theme.surface.border,
          backgroundColor: selected ? theme.primary.subtleFill : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Square image placeholder for a list row. */
export function Thumb({
  size,
  vertical,
  index,
}: {
  size: number;
  vertical?: SampleContent['vertical'] | undefined;
  index?: number | undefined;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.md,
        backgroundColor: theme.placeholder.fill,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <ItemArt
        vertical={vertical}
        index={index}
        size={Math.round(size * 0.62)}
        color={theme.placeholder.ink}
      />
    </View>
  );
}
