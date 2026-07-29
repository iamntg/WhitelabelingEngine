import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { BEZEL, MARGIN, deviceFrame, type Frame } from './device-frame.js';

/**
 * The device a desktop browser sees the app inside.
 *
 * This is a property of the *host*, in the same sense as `fonts`, `width` and
 * `statusBar` are: nothing below `ThemeProvider` knows the frame exists, and
 * `@wl/ui` gains no notion of a desktop. It receives a width of 390 and draws
 * exactly what it draws on a device, because as far as it is concerned that is
 * what it is on.
 *
 * Deliberately not the admin tool's `PhoneFrame`. That one is an iframe, which
 * it has to be — the preview renders a tenant's fonts inside the tool's own
 * document and the two must not mix. Here there is one app in one document and
 * nothing to isolate it from, so this is a `View` with a radius.
 */

/**
 * The window backdrop. Neutral by intent: the brand is what's on the screen,
 * the same rule the admin tool's chrome follows.
 *
 * The dark value is a charcoal rather than a black so the device still has a
 * silhouette against it. A near-black page behind a near-black bezel leaves the
 * app looking like it is floating in the window with no phone around it, which
 * is most of what the frame was for.
 */
const PAGE = { light: '#e7e5e4', dark: '#26241f' } as const;
/** A phone is a dark object in both schemes. Darker than either backdrop. */
const BEZEL_FILL = '#0c0a09';
/**
 * Behind the app while it loads, so the bezel never shows through.
 *
 * White in both schemes, deliberately. The spinner and the "could not load"
 * message render *before* there is a theme, so they are drawn in React Native's
 * default black — on a dark fill the error state is black text on black, which
 * is indistinguishable from a phone that never booted. The themed app paints
 * `surface.base` over this on its first frame either way.
 */
const SCREEN_FILL = '#ffffff';

const OUTER_RADIUS = 54;
const SCREEN_RADIUS = OUTER_RADIUS - BEZEL;

/**
 * The device to draw, or `null` on a phone's browser and on a real device.
 *
 * Recomputed on resize — `useWindowDimensions` re-renders on a browser resize,
 * and dragging a desktop window narrow should hand the app the window, exactly
 * as opening it on a phone does.
 */
export function useDeviceFrame(): Frame | null {
  const { width, height } = useWindowDimensions();
  const coarsePointer = useCoarsePointer();

  return deviceFrame({ platform: Platform.OS, width, height, coarsePointer });
}

/** Live `(pointer: coarse)`. A media query, not a user-agent sniff. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => pointerQuery()?.matches ?? false);

  useEffect(() => {
    const query = pointerQuery();
    if (!query) return;

    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return coarse;
}

/**
 * `null` anywhere `matchMedia` isn't a thing — a device, or a server render.
 * Guarded on `Platform.OS` first so the native bundle never reaches for
 * `window` at all.
 */
function pointerQuery(): MediaQueryList | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(pointer: coarse)');
}

export function PhoneShell({
  frame,
  scheme,
  children,
}: {
  frame: Frame;
  scheme: 'light' | 'dark';
  children: ReactNode;
}) {
  return (
    // A `ScrollView` rather than a centred `View`: in a window too short to
    // hold `FRAME_MIN_HEIGHT` the device is clamped rather than squashed, and
    // the page scrolls to reach the rest of it. `flexGrow: 1` keeps it centred
    // in every window that is tall enough, which is the common case.
    <ScrollView
      style={{ flex: 1, backgroundColor: PAGE[scheme] }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: MARGIN,
      }}
    >
      <View
        style={{
          padding: BEZEL,
          borderRadius: OUTER_RADIUS,
          backgroundColor: BEZEL_FILL,
          shadowColor: '#000000',
          shadowOpacity: scheme === 'dark' ? 0.55 : 0.28,
          shadowRadius: 44,
          shadowOffset: { width: 0, height: 22 },
        }}
      >
        <View
          style={{
            width: frame.width,
            height: frame.height,
            borderRadius: SCREEN_RADIUS,
            overflow: 'hidden',
            backgroundColor: SCREEN_FILL,
          }}
        >
          {children}
        </View>
      </View>
    </ScrollView>
  );
}
