# Whitelabeling Engine

Small businesses — restaurants, salons, studios — get their own branded mobile app.
A non-technical owner picks a logo, four colours, a font pairing, a corner style
and a button style; the platform derives everything else and ships it to their app.

## The one rule

If the web preview and the phone can disagree about what a theme looks like, the
design is wrong. Two packages enforce that, at two different levels.

**`packages/theme`** is one theme token contract, consumed by the web preview,
the React Native app, and the API — which re-runs the identical contrast
validation on publish. It has no DOM, Node or React Native imports, which is
what makes running it in all three places possible.

**`packages/ui`** is one set of components, written against React Native. The
Expo app renders them directly; the admin tool's preview resolves `react-native`
to `react-native-web` and mounts the same tree inside the phone frame. So the
preview is not an approximation of the app — the screens, the tab bar, the
carousel and the icons *are* the app's, running in an iframe.

The second half matters as much as the first. Sharing a resolver but not a
renderer means the two agree about `#e23d28` and disagree about everything the
owner is actually looking at: where the card sits, how the corner reads at that
radius, whether the active tab is legible. It also forces honesty in the other
direction — the preview can only promise what a phone can do, so the CSS grid,
the CSS transitions and the variable-axis icon font are gone.

## Setup

Requires Node 20+, pnpm 10+, and Docker (for local Postgres).

```bash
pnpm install                              # 1
cp apps/api/.env.example apps/api/.env    # 2
cp apps/web/.env.example apps/web/.env    # 3
pnpm setup                                # 4  Postgres, build, migrate, seed
pnpm dev                                  # 5  API :4000 + admin app :5173
```

`pnpm dev` runs four watchers in parallel — both shared packages rebuild on
change, so editing `packages/theme` reaches the web app without a manual build.
Ports 4000 and 5173 must be free.

Open <http://localhost:5173>. The seed grants `demo-user` access to all three
brands, and the web app authenticates locally as that user.

### Without Docker

Point `DATABASE_URL` in `apps/api/.env` at any Postgres 14+ instance and skip
step 2.

### The mobile app

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @wl/mobile start        # device or simulator
pnpm --filter @wl/mobile web          # the same app, in a browser tab
```

It fetches the published theme and content for `EXPO_PUBLIC_TENANT_SLUG`, caches
both in AsyncStorage, applies `resolveTheme()` and renders `@wl/ui` — the same
components the admin preview draws. On a physical device `localhost` is the
device itself, so use your machine's LAN address.

`web` runs the real React Native source through `react-native-web` on
<http://localhost:8081>, so it exercises the same components, the same fetch and
cache path (AsyncStorage falls back to `localStorage`) and the same resolver as
the native build. Worth knowing about it:

- It needs `http://localhost:8081` in the API's `CORS_ORIGINS`. A browser sends
  an `Origin` header where a device does not, so this is the one place the web
  target is stricter than native.
- It is a *debugging* view of the mobile app, not the customer-facing preview.
  For "what will this brand look like", use the admin app's phone preview, which
  covers all four screens and both schemes.
- `apps/mobile/metro.config.js` exists because of this target — see the comments
  there before changing it. Native bundling depends on it too.

### Seeing every combination at once

```bash
pnpm --filter @wl/web preview:render     # writes apps/web/preview-proof.html
pnpm --filter @wl/web art:proof          # writes apps/web/art-proof.html
```

`preview:render` puts every brand × both schemes × all four screens on one page,
rendered through the same `@wl/ui` components the phone runs. `art:proof` is
narrower: every illustration motif at the two sizes they are used at, for
judging line weight and whether neighbouring motifs read as different things.

Both use the live API when one is up and fall back to the shipped presets and
test fixtures when there isn't — a proof sheet you cannot generate without
Postgres running is a proof sheet nobody looks at.

Both run through `vite-node` rather than `tsx`, because they need the
`react-native` → `react-native-web` alias from `vite.config.ts`. Under plain
Node the import resolves to React Native's Flow source and the script dies on
the first line of `@wl/ui`.

## Layout

```
apps/
  web         Vite + React + TypeScript + Tailwind — the admin tool
  api         Fastify + TypeScript + Prisma + Zod
  mobile      Expo React Native
packages/
  theme       token schema, resolver, contrast engine, font registry, presets
  ui          the app's components, rendered by the phone and the preview alike
  api-client  wire contract (Zod) + typed fetch client, shared by web and mobile
```

`packages/api-client` owns the request and response schemas, and `apps/api`
imports them. One definition, validated by the server and parsed by both
clients — the alternative is restating each payload twice and waiting for the
two to drift.

`packages/ui` follows the same principle for pixels. It may not import
`react-dom`, `react-native-web`, or any DOM global: a component that cannot
render on a device does not belong in it.

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

## How theming works

`ThemeTokens` is everything the owner chooses, and nothing else:

```ts
brand      { businessName, logoUrl, logoAspect }
colors     { primary, secondary, accent, background }   // hex
typography { pairingId }                                // one of five
shape      { radiusScale }                              // sharp|subtle|rounded|pill
buttons    { style }                                    // filled|outline|soft
```

`resolveTheme(tokens, { scheme })` derives the rest — surfaces, borders, text
colours, hover/pressed/disabled/subtle variants, "on" colours chosen for
contrast, radii in px, and a type scale. Shade derivation is OKLCH via culori,
not sRGB or HSL mixing, which produces muddy mid-tones and unpredictable
perceived lightness.

The owner never sets a hover shade or a text colour. **The constrained input
surface is the product**: an owner who can set a hover shade is an owner who can
ship an unreadable app.

### Light and dark

Dark mode is a render-time scheme, not a token — the device decides, and the
public endpoint serves both resolved schemes so the app can switch instantly.

Because the owner never chooses the dark surface, a warning about it would be
unactionable, so the resolver **guarantees** dark-mode legibility by
construction rather than reporting on it. That guarantee is asserted across a
hue × lightness × background grid in `packages/theme/test/resolve.test.ts`.

### Contrast

`checkContrast(tokens)` returns a result for every pair that can appear in the
app. Two WCAG bars apply, because using one is how a checker earns a reputation
for crying wolf:

- **SC 1.4.3 Contrast (Minimum)**, 4.5:1 — anything you read
- **SC 1.4.11 Non-text Contrast**, 3:1 — button fills, accent chips, graphics

Below 3:1 blocks publish either way. Between 3:1 and 4.5:1 on a text pair is a
warning that publishes only with an explicit acknowledgement.

`secondary-on-primary` is checked but never blocks and is never shown to the
owner: those two colours do not touch in the current screens, so it fails for
all six shipped presets. It stays in the engine as a regression guard for
layouts that put them together later.

Every suggested fix is asserted to actually resolve its pair — a one-click fix
that fixes nothing is worse than offering none.

## Publish

```
validate draft → snapshot into theme_version → bump version
```

Versions are immutable. Rollback republishes an older snapshot *forward* as a
new version rather than deleting anything, so history stays append-only.

The server re-runs `validateForPublish` against the **stored draft**, never
against anything the request supplied. There is no request body that talks past
a hard contrast failure.

`changeSummary` ("Primary colour changed", "Font pairing: Modern → Editorial")
is computed server-side and stored on the version, so the confirmation modal and
the version history read identically, and a year-old version still explains
itself.

## How `packages/ui` is put together

Components take **content and variant props only — never colours**. The theme
arrives through `<ThemeProvider>` and is read with `useTheme()`. A
`<Button primaryColor="#ff0000">` would typecheck, and a surface that accepts a
colour is a surface that can be handed the wrong one; there is nowhere to pass
the mistake in. This is the same reasoning that keeps the owner's token surface
small.

Three facts are properties of the *host*, not of the theme, so the host states
them:

| | Expo app | Admin preview |
| --- | --- | --- |
| `fonts` | `bundled` — expo-font registers each weight as its own family (`Inter_600SemiBold`), because RN cannot synthesise a weight for a custom face | `css` — Google Fonts under the real family name, with a numeric weight |
| `width` | `useWindowDimensions().width` | `372`, the iframe's width — `Dimensions` would report the browser window |
| `statusBar` | `device`, the OS paints it and the shell owes it an inset | `simulated`, the 9:41 stand-in |

Four things the port cost, all worth naming before someone rediscovers them:

- **Icons are drawn, not typeset.** Material Symbols' variable `FILL` axis is
  what used to light the active tab, and React Native has no variable axes. The
  13 icons in use are SVG paths in `packages/ui/src/icons.tsx`, keyed by the
  names the API already sends for tabs.
- **`PhoneFrame` copies react-native-web's stylesheet into the iframe.**
  react-native-web injects atomic CSS into the document *it* was imported into;
  the preview is a portal into a separate document, so without the copy every
  `View` arrives carrying class names that mean nothing there.
- **Vite needs `global` defined, twice.** react-native-web ships React Native's
  `Animated` more or less unmodified, and it reaches for `global` — which Metro
  has and a browser does not. It is set in both `define` and
  `optimizeDeps.esbuildOptions.define`, because the first covers source and the
  second covers the pre-bundled dependency, and fixing one leaves the carousel
  throwing exactly where it was.
- **Vite needs `resolve.dedupe`.** `@wl/ui` imports `react-native` from inside
  its own `dist`, so pnpm hands it a second react-native-web linked against the
  Expo app's React. Two React copies means null hooks; two react-native-web
  copies means two style registries, and half the rules never reach the iframe.

`packages/ui`'s `tsconfig.json` deliberately omits the DOM lib, which is what
makes "no DOM globals in `src`" a compiler error rather than a code-review note.
Its tests mount through react-native-web into jsdom and genuinely do read
attributes off elements, so they compile under a separate `tsconfig.test.json`
that adds the lib back. Both run under `pnpm typecheck`.

## The tool's chrome

Neutral greys, near-black text, and exactly one muted accent for interactive
states. **The tenant's brand colours are the only saturated pixels on screen** —
never the publish button, never a focus ring. `apps/web/src/styles/chrome.test.ts`
enforces this by measuring the chroma of every declared token.

## Status

All nine build steps are complete.

| Step | State |
| --- | --- |
| 1. `packages/theme` + tests | Done |
| 2. Prisma schema, migration, seed | Done |
| 3. Fastify API, auth, OpenAPI | Done |
| 4. `packages/api-client` | Done |
| 5. Web shell, header, left panel | Done |
| 6. Phone preview, 4 screens | Done |
| 7. Publish modal with before/after | Done |
| 8. Brand list + empty state | Done |
| 9. Expo scaffold | Done |
| 10. `packages/ui`, shared by both hosts | Done |

The admin tool no longer owns any part of what the phone draws.
`apps/web/src/features/preview/` is down to four files — `PhoneFrame` (the
iframe and bezel), `PhoneApp` (the three host facts), `PreviewCanvas` (the
switchers) and `MiniPhone` — and the last of those is a diagram for the publish
modal rather than a screen. Everything else is `@wl/ui`.

### Not built yet

Deliberately out of scope so far, and worth naming rather than discovering:

- **Auth.** Supabase JWT verification is wired in the API, but there is no login
  screen. Local development uses `Bearer dev:<userId>`, which the API refuses in
  production.
- **Logo upload.** The signed-URL endpoint exists; the editor still uses a local
  `FileReader` data URL, so a logo is not yet persisted to storage.
- **New brand flow.** `POST /v1/tenants` works; the button does not open a form.
- **Version history UI.** The endpoints and rollback logic are done and tested;
  there is no screen for them.
- **The header "Preview" button** is unwired — see the open question about what
  it should do.
- **The mobile app has never run on a device or simulator.** It typechecks, its
  font bundle is asserted against the registry, its fetch-and-resolve path is
  verified from Node against the live API, and `expo export --platform ios`
  produces a Hermes bundle — so Metro resolves the whole tree, `@wl/ui` and
  `react-native-svg` included. But nothing has been rendered on a screen with a
  touch digitiser attached to it, and the carousel's drag behaviour in
  particular has only ever been exercised with a mouse.
- **A stack, rather than four tabs.** Tapping a tab switches screens on both
  hosts, but Item is only reachable from the preview's screen switcher — on the
  phone there is no way to press a catalogue row and push the detail. Item is
  wired to keep the catalogue tab lit for exactly this reason; what is missing
  is the push, not the mapping.
- **`account` has no screen.** The tab is in the seeded content because a real
  app has one. `screenForTab` returns null for it and both hosts leave the
  current screen up.
