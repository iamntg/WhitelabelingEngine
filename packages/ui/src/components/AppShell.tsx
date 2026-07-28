import type { SampleContent } from '@wl/api-client';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme-context.js';
import { useTextStyles } from '../typography.js';
import { ViewportProvider, type Insets } from '../viewport.js';
import { TabBar } from './TabBar.js';

/**
 * The app frame: status bar, screen, tab bar.
 *
 * Shared, because the frame is most of what an owner reads as "my app" — the
 * tab labels, the icons, which one is lit. If the preview drew its own frame
 * and the phone drew another, the two would diverge in exactly the place the
 * owner looks first.
 *
 * `statusBar` is the one deliberate difference between hosts. On a device the
 * real status bar paints itself and the shell only owes it the inset; in the
 * preview there is no status bar, so the shell draws the 9:41 stand-in that
 * makes the frame read as a phone.
 */

/**
 * Breathing room above the header when the platform reports no inset at all.
 *
 * A notched iPhone reports ~47–59pt and this never applies. But
 * `react-native-safe-area-context` reports zero in a browser, which is where
 * the Expo app's `web` target runs — and zero means the logo sits flush against
 * the top edge, touching it. Clamping rather than adding, so a device that does
 * report an inset is not padded twice.
 */
const MIN_TOP_INSET = 16;
export function AppShell({
  content,
  activeTabId,
  onTabPress,
  width,
  insets = { top: 0, bottom: 0 },
  statusBar = 'device',
  children,
}: {
  content: SampleContent | null;
  activeTabId: string;
  onTabPress?: ((tabId: string) => void) | undefined;
  /** The phone's width in pt. See `viewport.tsx` for why this is not measured. */
  width: number;
  insets?: Insets;
  statusBar?: 'device' | 'simulated';
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <ViewportProvider width={width} insets={insets}>
      <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
        {statusBar === 'simulated' ? (
          <SimulatedStatusBar />
        ) : (
          <View style={{ height: Math.max(insets.top, MIN_TOP_INSET) }} />
        )}

        <View style={{ flex: 1, overflow: 'hidden' }}>{children}</View>

        {content ? (
          <TabBar
            content={content}
            activeTabId={activeTabId}
            onTabPress={onTabPress}
            bottomInset={statusBar === 'simulated' ? 0 : insets.bottom}
          />
        ) : null}
      </View>
    </ViewportProvider>
  );
}

/** The preview's stand-in for the OS status bar. Never rendered on a device. */
function SimulatedStatusBar() {
  const type = useTextStyles();

  return (
    <View
      style={{
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
      }}
    >
      <Text style={type.body('sm', { weight: 'semibold' })}>9:41</Text>
      <Text style={{ ...type.body('sm', { weight: 'semibold' }), letterSpacing: 0.7, opacity: 0.5 }}>
        ▮▮▮
      </Text>
    </View>
  );
}
