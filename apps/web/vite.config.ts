import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The phone preview renders `@wl/ui`, which is written against React Native —
 * the same components the Expo app builds from. Resolving `react-native` to
 * `react-native-web` here is what lets the admin tool run them, and is the
 * whole reason the preview is the app rather than a picture of it.
 *
 * Both aliases are anchored. `react-native-svg` is a separate package whose
 * name begins with the string `react-native`, and an unanchored rewrite would
 * swap the SVG library for the renderer.
 *
 * It needs its own entry because Metro picks `.web.js` off the platform
 * extension list automatically and Vite has no notion of a platform. Left to
 * the default fields, the admin app loads the native implementation, which
 * renders an empty box in a browser.
 */
const reactNativeWeb = [
  { find: /^react-native$/, replacement: 'react-native-web' },
  { find: /^react-native-svg$/, replacement: 'react-native-svg/lib/module/ReactNativeSVG.web.js' },
];

/**
 * React Native's `global` does not exist in a browser.
 *
 * react-native-web ships React Native's own `Animated` implementation more or
 * less unmodified, and it reaches for `global.cancelAnimationFrame` when an
 * animation is stopped and `global.RN$Bridgeless` when the module loads. Under
 * Metro `global` is the JS realm's global object; in a browser the identifier is
 * simply undefined, and the carousel throws the moment a slide or a dot
 * animates.
 *
 * Defined twice on purpose. `define` covers source and linked workspace
 * packages, which Vite transforms itself; `optimizeDeps.esbuildOptions.define`
 * covers react-native-web, which is pre-bundled by esbuild and never sees the
 * first one. Fixing only one leaves the error exactly where it was.
 */
const reactNativeGlobal = { global: 'globalThis' };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: reactNativeGlobal,
  optimizeDeps: { esbuildOptions: { define: reactNativeGlobal } },
  resolve: {
    alias: reactNativeWeb,
    /**
     * `@wl/ui` imports `react-native` from inside its own `dist`, so the alias
     * resolves against *its* `node_modules` and pnpm hands it a second
     * react-native-web — one linked against react 18.2.0, the version the Expo
     * app pins. Two React copies in one tree means the second one's hooks read
     * a null dispatcher, and every `View` throws on render.
     *
     * Deduping collapses them onto the admin app's copies. react-native-web is
     * in the list as well as React: it keeps module-level state (the style
     * registry `PhoneFrame` copies into the iframe), and two registries means
     * half the rules never reach the phone.
     */
    dedupe: ['react', 'react-dom', 'react-native-web'],
  },
  server: {
    port: 5173,
    proxy: {
      '/v1': { target: 'http://localhost:4000', changeOrigin: true },
      '/public': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
  },
});
