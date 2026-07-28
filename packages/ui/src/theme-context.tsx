import type { ResolvedTheme } from '@wl/theme';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * The theme reaches components through context, never through props.
 *
 * The obvious alternative — every component takes the tokens it needs — puts
 * the brand's colours on the public surface of every component in the library,
 * and a surface that accepts a colour is a surface that can be handed the wrong
 * one. A `<Button primaryColor="#ff0000">` typechecks. Reading from context
 * instead means a component *cannot* be rendered off-theme: there is nowhere to
 * pass the mistake in.
 *
 * So components here take content and variant props only. If a screen needs a
 * value that isn't on `ResolvedTheme`, that is a gap in the resolver — the same
 * rule the web preview already followed, now enforced by the type signatures.
 */

/**
 * How font families are named in the host environment. The two hosts load the
 * same five pairings by two different mechanisms, and they disagree about what
 * a family is called:
 *
 * - `bundled` — expo-font registers each *weight* as its own family, because
 *   React Native does not synthesise weights for custom faces. Asking for
 *   `fontWeight: 600` on a face loaded as Regular silently renders Regular, so
 *   the family name carries the weight: `Inter_600SemiBold`. Used by the Expo
 *   app on device and by its react-native-web debug target, which registers the
 *   same names through the FontFace API.
 *
 * - `css` — the admin preview loads the families from Google Fonts under their
 *   real names, where `Inter` at `fontWeight: 600` is exactly right and
 *   `Inter_600SemiBold` is a family that does not exist.
 *
 * This is a property of the host, not of the theme, which is why it is passed
 * in rather than sniffed from `Platform.OS` — both hosts report `web` in a
 * browser and they still need opposite answers.
 */
export type FontStrategy = 'bundled' | 'css';

export interface ThemeContextValue {
  theme: ResolvedTheme;
  fonts: FontStrategy;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  theme,
  fonts,
  children,
}: {
  theme: ResolvedTheme;
  fonts: FontStrategy;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ theme, fonts }), [theme, fonts]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('Wrap the tree in <ThemeProvider> — @wl/ui components read the theme from it.');
  }
  return value;
}

export function useTheme(): ResolvedTheme {
  return useThemeContext().theme;
}

export function useFontStrategy(): FontStrategy {
  return useThemeContext().fonts;
}
