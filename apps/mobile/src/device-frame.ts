/**
 * Should this browser see the app inside a phone, or as the phone?
 *
 * The Expo `web` target runs the real app, so a desktop browser stretches a
 * layout designed for 390pt across 1440 and the two-column card grid turns into
 * two very wide rows. Nothing is broken — `@wl/ui` lays out against the width
 * the host declares — but it stops reading as the thing it is.
 *
 * So on a desktop the host declares a phone's width and draws a device around
 * it. On a phone's browser the window already *is* the viewport and a frame
 * would be a bezel drawn inside a bezel, so there isn't one.
 *
 * The decision is a pure function of four facts the caller measures, which is
 * what makes it testable from Node without a DOM or a React Native runtime.
 * Everything that needs `window` lives in `PhoneShell.tsx`.
 */

/** A generic modern phone viewport, in pt — iPhone 14 / Pixel 7 class. */
export const FRAME_WIDTH = 390;
export const FRAME_HEIGHT = 844;

/**
 * Bezel thickness, and the gap kept between the device and the window edge.
 *
 * The margin is deliberately tight. A browser viewport on a laptop is ~800–900
 * tall, and every pt of margin is a pt the device loses: at 28 a 900pt window
 * already renders a shortened phone, which is the one thing the frame exists to
 * avoid. 16 clears a full 844 in a 900pt window.
 */
export const BEZEL = 10;
export const MARGIN = 16;

/**
 * Below this the window is already phone-shaped and the frame is dropped.
 *
 * Wide enough to hold the device with its margins and still read as a desktop
 * page rather than a cramped one; also above every phone in landscape that a
 * fine pointer might plausibly be paired with.
 */
export const DESKTOP_MIN_WIDTH = 760;

/**
 * Never squash the device past this, even in a short window.
 *
 * A frame shorter than this has room for the header and the tab bar and almost
 * nothing between them, which reads as a broken app rather than a small one.
 * Past that point the page scrolls instead.
 */
export const FRAME_MIN_HEIGHT = 560;

export interface Frame {
  /** The viewport handed to `AppShell`, in pt. */
  width: number;
  height: number;
}

export interface Window {
  /** `Platform.OS` — anything but `web` is a real device and never framed. */
  platform: string;
  width: number;
  height: number;
  /**
   * `(pointer: coarse)` — the primary input is a finger.
   *
   * The width test alone is not enough in either direction: a tablet browser is
   * wider than the threshold and should still get the app itself, and a desktop
   * window dragged narrow should lose the frame rather than keep it. Pointer
   * type is the fact that actually separates the two cases; width only says
   * whether there is room to draw a device.
   */
  coarsePointer: boolean;
}

/** The device to draw, or `null` to render the app at the window's own size. */
export function deviceFrame(window: Window): Frame | null {
  if (window.platform !== 'web') return null;
  if (window.coarsePointer) return null;
  if (window.width < DESKTOP_MIN_WIDTH) return null;

  const available = window.height - (MARGIN + BEZEL) * 2;

  return {
    width: FRAME_WIDTH,
    height: Math.max(FRAME_MIN_HEIGHT, Math.min(FRAME_HEIGHT, available)),
  };
}
