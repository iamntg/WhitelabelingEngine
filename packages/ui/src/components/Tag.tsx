import { Text, View } from 'react-native';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';

/**
 * Accent-coloured tag such as "Chef's pick" or "4 spots left".
 *
 * `subtle` sits on the accent's low-emphasis wash and is used in lists, where a
 * saturated pill on every row would drown the screen. `solid` sits on the
 * accent itself and is used once per image, over the placeholder.
 */
export function Tag({
  label,
  tone = 'subtle',
  size = 'md',
}: {
  label: string;
  tone?: 'subtle' | 'solid';
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const type = useTextStyles();

  const solid = tone === 'solid';
  const metrics = SIZES[size];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: solid ? theme.accent.base : theme.accent.subtleFill,
        borderRadius: solid ? theme.radius.full : theme.radius.sm,
        paddingHorizontal: metrics.paddingHorizontal,
        paddingVertical: metrics.paddingVertical,
      }}
    >
      <Text
        style={{
          ...type.body('xs', {
            weight: 'bold',
            color: solid ? theme.accent.on : theme.accent.onSubtle,
          }),
          fontSize: metrics.fontSize,
          lineHeight: metrics.fontSize * 1.25,
          letterSpacing: metrics.fontSize * 0.05,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const SIZES = {
  sm: { fontSize: 8.5, paddingHorizontal: 6, paddingVertical: 3 },
  md: { fontSize: 9.5, paddingHorizontal: 6, paddingVertical: 2 },
  lg: { fontSize: 10.5, paddingHorizontal: 9, paddingVertical: 5 },
} as const;
