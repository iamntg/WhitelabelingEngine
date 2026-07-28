import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { Icon } from '../icons.js';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * The themed button.
 *
 * `primary` renders whichever of filled / outline / soft the owner picked —
 * that decision is already resolved into `theme.button`, so there is nothing to
 * branch on here. `secondary` is the neutral companion: a hairline on the
 * surface, never a second brand colour, because two saturated buttons side by
 * side is how a screen stops having a primary action.
 *
 * Pressed state comes from the resolver too. The owner never picks it, and a
 * button with no pressed state is the single clearest tell that a preview is a
 * picture of an app rather than an app.
 */
export function Button({
  label,
  trailingLabel,
  variant = 'primary',
  size = 'md',
  onPress,
  style,
}: {
  label: string;
  /**
   * Right-aligned second label, which turns the button into a bar — the
   * catalogue's "View order · 3 items … $31.00". Same surface, because it is
   * the same primary action and should change with the owner's button style.
   */
  trailingLabel?: string | undefined;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  onPress?: (() => void) | undefined;
  style?: ViewStyle | undefined;
}) {
  const theme = useTheme();
  const type = useTextStyles();
  const primary = variant === 'primary';
  const bar = trailingLabel !== undefined;

  const textStyle = type.body(size === 'lg' ? 'lg' : 'base', {
    weight: primary ? 'semibold' : 'medium',
    color: primary ? theme.button.foreground : theme.text.primary,
  });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: bar ? 'space-between' : 'center',
          paddingVertical: size === 'lg' ? 13 : 11,
          paddingHorizontal: bar ? 14 : primary ? 0 : 14,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: primary ? theme.button.border : theme.surface.border,
          backgroundColor: primary
            ? pressed
              ? theme.button.pressedBackground
              : theme.button.background
            : pressed
              ? theme.surface.sunken
              : 'transparent',
        },
        style,
      ]}
    >
      <Text style={textStyle}>{label}</Text>
      {bar ? <Text style={textStyle}>{trailingLabel}</Text> : null}
    </Pressable>
  );
}

/**
 * The quantity stepper on the item screen.
 *
 * Drawn with the icon set rather than the `−` and `+` characters the DOM
 * version used: a text minus sign picks up the brand's body face, so its weight
 * and width changed with the font pairing while the plus beside it did not.
 */
export function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange?: ((next: number) => void) | undefined;
}) {
  const theme = useTheme();
  const type = useTextStyles();

  const step = (delta: number, label: string, icon: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onChange ? () => onChange(Math.max(1, value + delta)) : undefined}
      style={{ paddingHorizontal: 2 }}
    >
      <Icon name={icon} size={16} color={delta < 0 ? theme.text.secondary : theme.text.primary} />
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.surface.border,
        borderRadius: theme.radius.md,
      }}
    >
      {step(-1, 'Decrease quantity', 'remove')}
      <Text style={type.body('lg', { weight: 'semibold' })}>{value}</Text>
      {step(1, 'Increase quantity', 'add')}
    </View>
  );
}

/**
 * The circular icon button that sits on a card — "add to order", "book".
 * It carries the same resolved button surface as the primary action, so a
 * change to the button style shows up in the list as well as on the hero.
 */
export function IconButton({
  icon,
  size = 24,
  accessibilityLabel,
  onPress,
}: {
  icon: string;
  size?: number;
  accessibilityLabel: string;
  onPress?: (() => void) | undefined;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.button.border,
        backgroundColor: pressed ? theme.button.pressedBackground : theme.button.background,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <View>
        <Icon name={icon} size={Math.round(size * 0.62)} color={theme.button.foreground} />
      </View>
    </Pressable>
  );
}
