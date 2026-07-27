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
pnpm install                                   # 1
docker compose up -d                           # 2  Postgres on :5433
cp apps/api/.env.example apps/api/.env         # 3
cp apps/web/.env.example apps/web/.env         # 4
pnpm --filter @wl/theme build                  # 5
pnpm --filter @wl/api-client build             # 6
pnpm --filter @wl/api db:migrate               # 7
pnpm --filter @wl/api db:seed                  # 8  three demo brands
pnpm --filter @wl/api dev                      # 9  API on :4000
pnpm --filter @wl/web dev                      # 10 admin app on :5173
```

Open <http://localhost:5173>. The seed grants `demo-user` access to all three
brands, and the web app authenticates locally as that user.

### Without Docker

Point `DATABASE_URL` in `apps/api/.env` at any Postgres 14+ instance and skip
step 2.

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
| `pnpm test` | All tests across every package |
| `pnpm typecheck` | Strict TypeScript, no `any` |
| `pnpm build` | Build the shared packages |
| `pnpm --filter @wl/api openapi` | Write `apps/api/openapi.json` |
| `pnpm --filter @wl/api db:reset` | Drop, migrate and re-seed |

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

| Step | State |
| --- | --- |
| 1. `packages/theme` + tests | Done |
| 2. Prisma schema, migration, seed | Done |
| 3. Fastify API, auth, OpenAPI | Done |
| 4. `packages/api-client` | Done |
| 5. Web shell, header, left panel | Done |
| 6. Phone preview, 4 screens | Next |
| 7. Publish modal with before/after | Pending |
| 8. Brand list + empty state | Pending |
| 9. Expo scaffold | Pending |
