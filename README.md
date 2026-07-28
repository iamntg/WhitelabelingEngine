<div align="center">

# Whitelabeling Engine

**A non-technical business owner picks six things. Their web app and their phone app both become theirs, and agree, pixel for pixel, on what that means.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.base.json)
[![Tests](https://img.shields.io/badge/tests-304%20passing-0f766e?style=flat-square)](#tests)
[![WCAG](https://img.shields.io/badge/WCAG-1.4.3%20%C2%B7%201.4.11-0f766e?style=flat-square)](#contrast-is-a-gate-not-a-hint)
[![pnpm workspace](https://img.shields.io/badge/pnpm-workspace-F69220?style=flat-square&logo=pnpm&logoColor=white)](pnpm-workspace.yaml)
[![License: MIT](https://img.shields.io/badge/license-MIT-1c1917?style=flat-square)](LICENSE)

</div>

---

## Where this fits

The wider platform onboards small businesses, restaurants, salons, studios, and hands each one four surfaces: a **storefront website**, a **customer mobile app**, an **owner dashboard**, and an **order manager** for the counter or the kitchen.

All four have to look like *that* business. Not like the platform with a logo dropped in the corner.

**This repository is the module that makes that true.** It is where a brand is authored, validated, published and served. Everything else on the platform reads what this publishes.

The hard part isn't storing a hex code. It's that the owner is not a designer, has no staging environment, and will never see a diff. So the engine takes six decisions from them and derives the other several hundred, then refuses to publish a combination nobody could read.

<br>

<p align="center">
  <img src="docs/architecture.svg" alt="Architecture: a business onboards once and gets four branded surfaces. This repository holds the admin tool where an owner authors a theme, the API that validates and publishes it into immutable versions, and the Expo app that renders it, over three shared packages consumed unchanged by all three." width="100%">
</p>

<br>

## The one rule

**If the web preview and the phone can disagree about what a theme looks like, the design is wrong.** Two packages enforce that, at two different levels.

**`packages/theme`** is one theme token contract, consumed by the web preview, the React Native app, and the API, which re-runs the identical contrast validation on publish. It has no DOM, Node or React Native imports, which is what makes running it in all three places possible.

**`packages/ui`** is one set of components, written against React Native. The Expo app renders them directly; the admin tool's preview resolves `react-native` to `react-native-web` and mounts the same tree inside the phone frame. So the preview is not an approximation of the app, the screens, the tab bar, the carousel and the icons **are** the app's, running in an iframe.

The second half matters as much as the first. Sharing a resolver but not a renderer means the two agree about `#e23d28` and disagree about everything the owner is actually looking at: where the card sits, how the corner reads at that radius, whether the active tab is legible. It also forces honesty in the other direction, the preview can only promise what a phone can do, so the CSS grid, the CSS transitions and the variable-axis icon font are gone.

## What a brand actually is

`ThemeTokens` is everything the owner chooses, and nothing else:

```ts
brand      { businessName, logoUrl, logoAspect }
colors     { primary, secondary, accent, background }   // hex
typography { pairingId }                                // one of five
shape      { radiusScale }                              // sharp | subtle | rounded | pill
buttons    { style }                                    // filled | outline | soft
```

`resolveTheme(tokens, { scheme })` derives the rest, surfaces, borders, text colours, hover/pressed/disabled/subtle variants, "on" colours chosen for contrast, radii in px, and a type scale.

| The owner picks | The engine derives |
| --- | --- |
| 4 hex colours | every resolved colour role, per scheme |
| 1 font pairing (of 5) | display + body faces, weights, a full type scale, tracking |
| 1 corner style (of 4) | every radius in the app, in px |
| 1 button style (of 3) | fill, border, foreground, hover, pressed, disabled |
|, | light **and** dark, both resolved and served |

Shade derivation is OKLCH via [culori](https://culorijs.org/), not sRGB or HSL mixing, which produces muddy mid-tones and unpredictable perceived lightness.

The owner never sets a hover shade or a text colour. **The constrained input surface is the product**: an owner who can set a hover shade is an owner who can ship an unreadable app.

## Contrast is a gate, not a hint

`checkContrast(tokens)` returns a result for every pair that can appear in the app. Two WCAG bars apply, because using one is how a checker earns a reputation for crying wolf:

- **SC 1.4.3 Contrast (Minimum)**, 4.5:1, anything you read
- **SC 1.4.11 Non-text Contrast**, 3:1, button fills, accent chips, graphics

Below 3:1 blocks publish either way. Between 3:1 and 4.5:1 on a text pair is a warning that publishes only with an explicit acknowledgement.

Every suggested fix is asserted to actually resolve its pair, a one-click fix that fixes nothing is worse than offering none.

## Publish

```
validate the stored draft  →  snapshot into theme_version  →  bump version
```

Versions are immutable. Rollback republishes an older snapshot **forward** as a new version rather than deleting anything, so history stays append-only.

The server re-runs `validateForPublish` against the **stored draft**, never against anything the request supplied. There is no request body that talks past a hard contrast failure.

`changeSummary` ("Primary colour changed", "Font pairing: Modern → Editorial") is computed server-side and stored on the version, so the confirmation modal and the version history read identically, and a year-old version still explains itself.

---

## Quick start

Requires **Node 20+**, **pnpm 10+**, and **Docker** (for local Postgres).

```bash
pnpm install                              # 1
cp apps/api/.env.example apps/api/.env    # 2
cp apps/web/.env.example apps/web/.env    # 3
pnpm setup                                # 4  Postgres, build, migrate, seed
pnpm dev                                  # 5  API :4000 + admin app :5173
```

Open **<http://localhost:5173>**. The seed grants `demo-user` access to three brands, `olive-ash-kitchen`, `fern-fold-studio` and `palmetto-nail-bar`, and the web app authenticates locally as that user. The last of the three has never been published, so it exercises the "not published yet" path.

`pnpm dev` runs four watchers in parallel, so editing `packages/theme` reaches the web app without a manual build. Ports 4000 and 5173 must be free.

<details>
<summary><b>Running the mobile app</b></summary>

<br>

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @wl/mobile start        # device or simulator
pnpm --filter @wl/mobile web          # the same app, in a browser tab
```

It fetches the published theme and content for `EXPO_PUBLIC_TENANT_SLUG`, caches both in AsyncStorage, applies `resolveTheme()` and renders `@wl/ui`, the same components the admin preview draws. On a physical device `localhost` is the device itself, so use your machine's LAN address.

`web` runs the real React Native source through `react-native-web` on <http://localhost:8081>, exercising the same components, the same fetch and cache path (AsyncStorage falls back to `localStorage`) and the same resolver as the native build. Worth knowing:

- It needs `http://localhost:8081` in the API's `CORS_ORIGINS`. A browser sends an `Origin` header where a device does not, so this is the one place the web target is stricter than native.
- It is a **debugging** view of the mobile app, not the customer-facing preview. For "what will this brand look like", use the admin app's phone preview, which covers all four screens and both schemes.
- `apps/mobile/metro.config.js` exists because of this target, read the comments there before changing it. Native bundling depends on it too.

</details>

<details>
<summary><b>Without Docker</b></summary>

<br>

Point `DATABASE_URL` in `apps/api/.env` at any Postgres 14+ instance, then run the build, migrate and seed steps of `pnpm setup` directly:

```bash
pnpm build && pnpm --filter @wl/api db:migrate && pnpm --filter @wl/api db:seed
```

</details>

<details>
<summary><b>Seeing every combination at once</b></summary>

<br>

```bash
pnpm --filter @wl/web preview:render     # writes apps/web/preview-proof.html
pnpm --filter @wl/web art:proof          # writes apps/web/art-proof.html
```

`preview:render` puts every brand × both schemes × all four screens on one page, rendered through the same `@wl/ui` components the phone runs. `art:proof` is narrower: every illustration motif at the two sizes they are used at, for judging line weight and whether neighbouring motifs read as different things.

Both use the live API when one is up and fall back to the shipped presets and test fixtures when there isn't, a proof sheet you cannot generate without Postgres running is a proof sheet nobody looks at.

Both run through `vite-node` rather than `tsx`, because they need the `react-native` → `react-native-web` alias from `vite.config.ts`. Under plain Node the import resolves to React Native's Flow source and the script dies on the first line of `@wl/ui`.

</details>

## Layout

```
apps/
  web         Vite + React + TypeScript + Tailwind, the admin tool
  api         Fastify + TypeScript + Prisma + Zod
  mobile      Expo React Native
packages/
  theme       token schema, resolver, contrast engine, font registry, presets
  ui          the app's components, rendered by the phone and the preview alike
  api-client  wire contract (Zod) + typed fetch client, shared by web and mobile
```

`packages/api-client` owns the request and response schemas, and `apps/api` imports them. One definition, validated by the server and parsed by both clients, the alternative is restating each payload twice and waiting for the two to drift.

`packages/ui` follows the same principle for pixels. It may not import `react-dom`, `react-native-web`, or any DOM global: a component that cannot render on a device does not belong in it.

> **Reusable on its own.** `packages/theme` has no dependency on the rest of this repo, it is a schema, a resolver and a contrast engine in plain TypeScript, and will run wherever you can run JavaScript. If all you want is "derive a full theme from four colours and refuse the unreadable ones", that package is the whole thing.

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Everything, one command |
| `pnpm setup` | Postgres + build + migrate + seed |
| `pnpm test` | All tests across every package |
| `pnpm typecheck` | Strict TypeScript, no `any` |
| `pnpm build` | Build the shared packages |
| `pnpm openapi` | Write `apps/api/openapi.json` |
| `pnpm db:reset` | Drop, migrate and re-seed |

## API

Authenticated routes take a Supabase JWT and are guarded by a membership check. Public routes take none, they are what a customer's phone calls.

| Route | |
| --- | --- |
| `GET /v1/tenants` | Brands the signed-in user can edit |
| `POST /v1/tenants` | Create a brand, seed its draft theme and preview content |
| `GET /v1/tenants/:id/theme/draft` | Read the working draft |
| `PATCH /v1/tenants/:id/theme/draft` | Autosave a partial token update |
| `POST /v1/tenants/:id/theme/validate` | Re-run the contrast engine against the stored draft |
| `POST /v1/tenants/:id/theme/publish` | Validate, snapshot and bump the live version |
| `GET /v1/tenants/:id/theme/versions` | Publish history, newest first |
| `POST /v1/tenants/:id/theme/rollback` | Republish an earlier version as a new version |
| `POST /v1/tenants/:id/assets/logo` | Signed upload URL for a logo |
| `GET /v1/catalog/presets` · `/font-pairings` | Starting themes, and the five pairings |
| `GET /public/v1/tenants/:slug/theme` | **The live theme**, both schemes resolved |
| `GET /public/v1/tenants/:slug/content` | Sample menu / services / schedule content |

Both public responses are ETagged and served with a long stale-while-revalidate window, so a phone with no connectivity still opens on the last good theme and a republish propagates within the max-age. `pnpm openapi` writes the full document to `apps/api/openapi.json`.

---

## Under the hood

<details>
<summary><b>Light and dark are a render-time decision, not a token</b></summary>

<br>

The device decides, and the public endpoint serves both resolved schemes so the app can switch instantly.

Because the owner never chooses the dark surface, a warning about it would be unactionable, so the resolver **guarantees** dark-mode legibility by construction rather than reporting on it. That guarantee is asserted across a hue × lightness × background grid in `packages/theme/test/resolve.test.ts`.

</details>

<details>
<summary><b>The contrast pair that is checked but never shown</b></summary>

<br>

`secondary-on-primary` is checked but never blocks and is never shown to the owner: those two colours do not touch in the current screens, so it fails for all six shipped presets. It stays in the engine as a regression guard for layouts that put them together later.

</details>

<details>
<summary><b>How <code>packages/ui</code> is put together</b></summary>

<br>

Components take **content and variant props only, never colours**. The theme arrives through `<ThemeProvider>` and is read with `useTheme()`. A `<Button primaryColor="#ff0000">` would typecheck, and a surface that accepts a colour is a surface that can be handed the wrong one; there is nowhere to pass the mistake in. This is the same reasoning that keeps the owner's token surface small.

Three facts are properties of the *host*, not of the theme, so the host states them:

| | Expo app | Admin preview |
| --- | --- | --- |
| `fonts` | `bundled`, expo-font registers each weight as its own family (`Inter_600SemiBold`), because RN cannot synthesise a weight for a custom face | `css`, Google Fonts under the real family name, with a numeric weight |
| `width` | `useWindowDimensions().width` | `372`, the iframe's width, `Dimensions` would report the browser window |
| `statusBar` | `device`, the OS paints it and the shell owes it an inset | `simulated`, the 9:41 stand-in |

`packages/ui`'s `tsconfig.json` deliberately omits the DOM lib, which is what makes "no DOM globals in `src`" a compiler error rather than a code-review note. Its tests mount through react-native-web into jsdom and genuinely do read attributes off elements, so they compile under a separate `tsconfig.test.json` that adds the lib back. Both run under `pnpm typecheck`.

</details>

<details>
<summary><b>Four things the React Native port cost</b></summary>

<br>

All worth naming before someone rediscovers them:

- **Icons are drawn, not typeset.** Material Symbols' variable `FILL` axis is what used to light the active tab, and React Native has no variable axes. The 13 icons in use are SVG paths in `packages/ui/src/icons.tsx`, keyed by the names the API already sends for tabs.
- **`PhoneFrame` copies react-native-web's stylesheet into the iframe.** react-native-web injects atomic CSS into the document *it* was imported into; the preview is a portal into a separate document, so without the copy every `View` arrives carrying class names that mean nothing there.
- **Vite needs `global` defined, twice.** react-native-web ships React Native's `Animated` more or less unmodified, and it reaches for `global`, which Metro has and a browser does not. It is set in both `define` and `optimizeDeps.esbuildOptions.define`, because the first covers source and the second covers the pre-bundled dependency, and fixing one leaves the carousel throwing exactly where it was.
- **Vite needs `resolve.dedupe`.** `@wl/ui` imports `react-native` from inside its own `dist`, so pnpm hands it a second react-native-web linked against the Expo app's React. Two React copies means null hooks; two react-native-web copies means two style registries, and half the rules never reach the iframe.

</details>

<details>
<summary><b>The admin tool's own chrome stays out of the way</b></summary>

<br>

Neutral greys, near-black text, and exactly one muted accent for interactive states. **The tenant's brand colours are the only saturated pixels on screen**, never the publish button, never a focus ring. `apps/web/src/styles/chrome.test.ts` enforces this by measuring the chroma of every declared token.

</details>

## Tests

```bash
pnpm test        # 304 tests, six workspaces
pnpm typecheck   # strict, and no `any`
```

| Workspace | Tests | Covers |
| --- | ---: | --- |
| `packages/theme` | 129 | the resolver across a hue × lightness × background grid, contrast thresholds, suggested fixes, OKLCH conversion, the font and radius registries, diffing |
| `packages/ui` | 39 | all four screens mounted through react-native-web, the icon registry, typography |
| `packages/api-client` | 19 | the wire contract, round-tripped |
| `apps/api` | 36 | routes, auth, membership, publish, rollback, against real Postgres |
| `apps/web` | 77 | editor panel, publish modal, preview host facts, draft store, chrome chroma |
| `apps/mobile` | 4 | the bundled font set, asserted against the registry |

`apps/api`'s tests need the Docker Postgres up (`pnpm setup` gets you there). Everything else runs cold.

## Not built yet

Deliberately out of scope so far, and worth naming rather than discovering:

- **Auth.** Supabase JWT verification is wired in the API, but there is no login screen. Local development uses `Bearer dev:<userId>`, which the API refuses in production.
- **Logo upload.** The signed-URL endpoint exists; the editor still uses a local `FileReader` data URL, so a logo is not yet persisted to storage.
- **New brand flow.** `POST /v1/tenants` works; the button does not open a form.
- **Version history UI.** The endpoints and rollback logic are done and tested; there is no screen for them.
- **The mobile app has never run on a device or simulator.** It typechecks, its font bundle is asserted against the registry, its fetch-and-resolve path is verified from Node against the live API, and `expo export --platform ios` produces a Hermes bundle, so Metro resolves the whole tree, `@wl/ui` and `react-native-svg` included. But nothing has been rendered on a screen with a touch digitiser attached to it, and the carousel's drag behaviour in particular has only ever been exercised with a mouse.
- **A stack, rather than four tabs.** Tapping a tab switches screens on both hosts, but Item is only reachable from the preview's screen switcher, on the phone there is no way to press a catalogue row and push the detail. Item is wired to keep the catalogue tab lit for exactly this reason; what is missing is the push, not the mapping.
- **`account` has no screen.** The tab is in the seeded content because a real app has one. `screenForTab` returns null for it and both hosts leave the current screen up.

## License

[MIT](LICENSE).
