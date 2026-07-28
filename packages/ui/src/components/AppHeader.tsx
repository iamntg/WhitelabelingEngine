import { Image, Text, View } from 'react-native';
import { Icon } from '../icons.js';
import { useTheme } from '../theme-context.js';
import { fontFor } from '../typography.js';
import { useFontStrategy } from '../theme-context.js';

/** The app header: logo tile (or initials) plus the business name. */
export function AppHeader() {
  const theme = useTheme();
  const strategy = useFontStrategy();

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: theme.radius.logo,
            backgroundColor: theme.brand.logoUrl ? 'transparent' : theme.primary.base,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {theme.brand.logoUrl ? (
            <Image
              source={{ uri: theme.brand.logoUrl }}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Text
              style={{
                ...fontFor(theme, 'body', theme.typography.body.weights.bold, strategy),
                fontSize: theme.typography.body.sizes.base,
                color: theme.primary.on,
              }}
            >
              {theme.brand.initials.slice(0, 1)}
            </Text>
          )}
        </View>

        <Text
          style={{
            ...fontFor(theme, 'display', undefined, strategy),
            fontSize: 16,
            letterSpacing: -0.16,
            color: theme.text.primary,
          }}
        >
          {theme.brand.businessName}
        </Text>
      </View>

      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: theme.primary.subtleFill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="notifications" size={16} color={theme.primary.base} />
        {/* The unread dot is the accent's one appearance in the chrome, and it
            is ringed in the surface colour so it reads as detached from the
            bell rather than as part of it. */}
        <View
          style={{
            position: 'absolute',
            top: -1,
            right: -1,
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: theme.accent.base,
            borderWidth: 2,
            borderColor: theme.surface.base,
          }}
        />
      </View>
    </View>
  );
}
