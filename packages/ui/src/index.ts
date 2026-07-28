/**
 * @wl/ui — the app's components, rendered by both hosts.
 *
 * Written against React Native. The Expo app consumes them directly; the admin
 * tool's phone preview resolves `react-native` to `react-native-web` and mounts
 * the same tree inside the phone frame. That is what makes the preview the app
 * rather than a picture of it — not just the same resolved theme, but the same
 * components laying it out.
 *
 * The rule that keeps it that way: nothing here may import from `react-dom`,
 * `react-native-web`, or any DOM global. A component that cannot render on a
 * device does not belong in this package.
 */

export { ThemeProvider, useTheme, useFontStrategy, type FontStrategy } from './theme-context.js';
export {
  useTextStyles,
  displayStyle,
  bodyStyle,
  fontFor,
  type TextStyles,
  type BodyWeight,
} from './typography.js';
export { ViewportProvider, useViewport, type Insets, type Viewport } from './viewport.js';

export { Icon, ICON_NAMES, hasIcon, type IconName } from './icons.js';
export { HeroArt, ItemArt } from './illustrations.js';

export { AppShell } from './components/AppShell.js';
export { AppHeader } from './components/AppHeader.js';
export { Button, IconButton, Stepper } from './components/Button.js';
export { Carousel, slideOffsets, type CarouselGeometry } from './components/Carousel.js';
export { ImageSlot } from './components/ImageSlot.js';
export { Card, Chip, Divider, SelectableRow, Thumb } from './components/Surface.js';
export { TabBar } from './components/TabBar.js';
export { Tag } from './components/Tag.js';

export {
  Screen,
  APP_SCREENS,
  TAB_FOR_SCREEN,
  screenForTab,
  CatalogScreen,
  CheckoutScreen,
  HomeScreen,
  ItemScreen,
  type AppScreen,
} from './screens/index.js';

export { featuredItems, itemById, itemIndex, money } from './content.js';
