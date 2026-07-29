// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DESKTOP_MIN_WIDTH,
  FRAME_HEIGHT,
  FRAME_MIN_HEIGHT,
  FRAME_WIDTH,
  deviceFrame,
  type Window,
} from './device-frame.js';

/**
 * Who gets a drawn device.
 *
 * The failure mode this guards is quiet in both directions: a phone that draws
 * a bezel inside its own bezel, or a desktop that hands `@wl/ui` a 1440pt
 * viewport and stretches a two-column card grid across it. Neither throws, and
 * neither shows up in a test that only mounts screens.
 */

const desktop: Window = { platform: 'web', width: 1440, height: 900, coarsePointer: false };
const phoneBrowser: Window = { platform: 'web', width: 390, height: 844, coarsePointer: true };
const device: Window = { platform: 'ios', width: 390, height: 844, coarsePointer: true };

describe('deviceFrame', () => {
  it('draws a phone-sized device in a desktop browser', () => {
    expect(deviceFrame(desktop)).toEqual({ width: FRAME_WIDTH, height: FRAME_HEIGHT });
  });

  // The case the margin is tuned for: a laptop browser, which is around 900pt
  // of viewport, must still show a whole phone rather than a shortened one.
  it('fits a full device in a laptop-sized window', () => {
    expect(deviceFrame({ ...desktop, height: 900 })?.height).toBe(FRAME_HEIGHT);
  });

  it('never frames a real device, however wide the screen reports', () => {
    expect(deviceFrame(device)).toBeNull();
    expect(deviceFrame({ ...device, platform: 'android', width: 1600 })).toBeNull();
  });

  it("leaves a phone's browser alone — the window is the viewport", () => {
    expect(deviceFrame(phoneBrowser)).toBeNull();
  });

  // Width alone gets both of these wrong, which is why the pointer test exists.
  it('trusts the pointer over the width', () => {
    const tablet = { ...desktop, width: 1024, coarsePointer: true };
    const narrowDesktop = { ...desktop, width: DESKTOP_MIN_WIDTH - 1 };

    expect(deviceFrame(tablet)).toBeNull();
    expect(deviceFrame(narrowDesktop)).toBeNull();
  });

  it('shortens the device to fit a short window', () => {
    const frame = deviceFrame({ ...desktop, height: 700 });

    expect(frame?.width).toBe(FRAME_WIDTH);
    expect(frame?.height).toBeLessThan(FRAME_HEIGHT);
    expect(frame?.height).toBeLessThanOrEqual(700);
  });

  it('clamps rather than squashes, and lets the page scroll instead', () => {
    expect(deviceFrame({ ...desktop, height: 300 })?.height).toBe(FRAME_MIN_HEIGHT);
  });

  it('never draws a device taller than a phone in a tall window', () => {
    expect(deviceFrame({ ...desktop, height: 2400 })?.height).toBe(FRAME_HEIGHT);
  });
});
