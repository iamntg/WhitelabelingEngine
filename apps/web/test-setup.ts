/**
 * react-native-web's `View` and `Text` call `useLayoutEffect`, and the preview
 * tests render them through `renderToStaticMarkup`. React warns once per
 * component that a layout effect cannot run on the server — true, and harmless
 * here: nothing in these tests hydrates, and the assertions are about the
 * markup the renderer produced.
 *
 * Filtered by exact prefix rather than blanket-silencing `console.error`, so a
 * real React warning still fails loudly.
 */
const NOISE = 'Warning: useLayoutEffect does nothing on the server';

const original = console.error;

console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith(NOISE)) return;
  original(...args);
};
