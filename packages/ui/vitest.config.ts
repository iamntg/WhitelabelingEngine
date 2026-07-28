import { defineConfig } from 'vitest/config';

/**
 * The library is written against React Native, so anything under test resolves
 * `react-native` to `react-native-web` exactly as the admin app does. A test
 * that imported the native module would fail on the Flow-typed source, and a
 * test that imported a hand-written stub would stop proving anything about the
 * component the browser actually renders.
 */
export default defineConfig({
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-svg$/,
        replacement: 'react-native-svg/lib/module/ReactNativeSVG.web.js',
      },
    ],
    dedupe: ['react', 'react-dom', 'react-native-web'],
  },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'jsdom',
  },
});
