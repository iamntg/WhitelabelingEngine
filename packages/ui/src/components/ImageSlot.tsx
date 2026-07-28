import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme-context.js';

/**
 * The dimension label is a measurement, not copy, so it is set in monospace and
 * must not read as part of the brand's typography. `ui-monospace` is a web-only
 * CSS keyword and the platforms share no monospace face, so each names its own.
 */
const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

/**
 * Image placeholder: line art of what the photo will be, plus the honest
 * dimension label. See `illustrations.tsx` for why it draws rather than stripes.
 *
 * The label sits above the art layer, and the art layer is absolutely
 * positioned behind everything so a caller's overlay (a promo pill, a tag) can
 * sit on top without knowing the art is there.
 */
export function ImageSlot({
  height,
  label,
  cornerRadius,
  art,
  children,
}: {
  height: number;
  label?: string | undefined;
  cornerRadius?: number | undefined;
  art?: ReactNode;
  children?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        height,
        borderRadius: cornerRadius ?? theme.radius.md,
        backgroundColor: theme.placeholder.fill,
        justifyContent: 'flex-end',
        padding: 12,
        overflow: 'hidden',
      }}
    >
      {art ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          {art}
        </View>
      ) : null}

      {children}

      {label ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: theme.placeholder.chip,
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontFamily: MONO, fontSize: 10, color: theme.placeholder.ink }}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
