const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro needs to be told about the monorepo, because by default it only watches
 * and resolves from the app directory.
 *
 * Two things are non-default here, both consequences of pnpm:
 *
 *   1. `watchFolders` includes the repo root, so edits to `packages/theme` and
 *      `packages/api-client` trigger a rebundle. Without it the app would keep
 *      serving a stale copy of the very contract it exists to prove.
 *
 *   2. `nodeModulesPaths` includes pnpm's virtual store. pnpm does not hoist to
 *      the root `node_modules`; it links each package's own dependencies under
 *      `.pnpm/node_modules`. Metro's default upward walk never looks there, so
 *      transitive runtime deps (`@babel/runtime` first among them) go missing.
 *
 * Hierarchical lookup stays ON — the Expo monorepo docs suggest disabling it,
 * but that advice assumes a hoisting package manager. Under pnpm the nested
 * `node_modules` directories *are* the resolution mechanism, and turning the
 * walk off breaks every transitive dependency.
 */

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules/.pnpm/node_modules'),
];

/**
 * Resolve through the `exports` field rather than the legacy `main`/`browser`
 * fields. Metro 0.80 leaves this off; Expo turns it on by default from SDK 52.
 *
 * It is not optional here. On web, Metro's default field order prefers
 * `browser`, and culori — the OKLCH engine behind every derived shade — points
 * `browser` at a UMD bundle with no named exports, so `converter` arrives
 * undefined and the first `resolveTheme()` call throws. Its `exports` map has a
 * correct ESM entry; this makes Metro use it.
 */
config.resolver.unstable_enablePackageExports = true;

/**
 * This codebase writes ESM-correct relative imports — `./App.js` for a file on
 * disk called `App.tsx` — which is what TypeScript requires under a Node16/ESM
 * module resolution and what every other package here is compiled with. Metro
 * takes the specifier literally and reports the file as missing.
 *
 * Rather than rewrite the imports and make this one app the odd one out, the
 * extension is stripped on failure so Metro's normal `sourceExts` search runs.
 * The unmodified specifier is tried first, so a genuine `.js` file on disk —
 * every file in a built shared-package `dist` — still wins.
 */
const relativeJsImport = /^\.{1,2}\/.*\.js$/;
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;

  if (relativeJsImport.test(moduleName)) {
    try {
      return resolve(context, moduleName, platform);
    } catch {
      return resolve(context, moduleName.slice(0, -'.js'.length), platform);
    }
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
