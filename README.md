# Whitelabeling Engine

Small businesses — restaurants, salons, studios — get their own branded mobile app.
A non-technical owner picks a logo, four colours, a font pairing, a corner style
and a button style; the platform derives everything else and ships it to their app.

## The one rule

There is **one theme token contract**, defined once in `packages/theme`, consumed by:

- the **web preview**, so the preview is not an approximation — it is the same resolver
- the **React Native app**, which renders the published theme
- the **API**, which re-runs the identical contrast validation on publish

If the web preview and the phone can disagree about what a theme looks like, the
design is wrong. `packages/theme` has no DOM, Node or React Native imports, which
is what makes running it in all three places possible.

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

### The mobile scaffold

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @wl/mobile start        # device or simulator
pnpm --filter @wl/mobile web          # the same app, in a browser tab
```

It fetches the published theme for `EXPO_PUBLIC_TENANT_SLUG`, caches it in
AsyncStorage, applies `resolveTheme()` and renders one themed screen. On a
physical device `localhost` is the device itself — use your machine's LAN
address.

`web` runs the real React Native source through `react-native-web` on
<http://localhost:8081>, so it exercises the same components, the same fetch and
cache path (AsyncStorage falls back to `localStorage`) and the same resolver as
the native build. Worth knowing about it:

- It needs `http://localhost:8081` in the API's `CORS_ORIGINS`. A browser sends
  an `Origin` header where a device does not, so this is the one place the web
  target is stricter than native.
- It is a *debugging* view of the mobile app, not the customer-facing preview.
  For "what will this brand look like", use the admin app's phone preview, which
  is built for it and covers all four screens.
- `apps/mobile/metro.config.js` exists because of this target — see the comments
  there before changing it. Native bundling depends on it too.

## Layout

```
apps/
  web         Vite + React + TypeScript + Tailwind — the admin tool
  api         Fastify + TypeScript + Prisma + Zod
  mobile      Expo React Native (scaffold)
packages/
  theme       token schema, resolver, contrast engine, font registry, presets
  api-client  wire contract (Zod) + typed fetch client, shared by web and mobile
```

`packages/api-client` owns the request and response schemas, and `apps/api`
imports them. One definition, validated by the server and parsed by both
clients — the alternative is restating each payload twice and waiting for the
two to drift.

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
- **The mobile app has never run on a device or simulator.** The scaffold
  typechecks, its font bundle is asserted against the registry, and its exact
  fetch-and-resolve path is verified from Node against the live API, but no
  Metro bundle has been built.
