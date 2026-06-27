# AGENTS.md — ListAI

Instructions for Claude Code and any AI agent working on this codebase.

---

## What this project is

ListAI (brand name **Listly AI**) is a web app for secondhand resellers. A user uploads a photo of an item, the AI extracts structured listing data (brand, condition, colour, size, description, price) in the user's chosen language, and the user copies the output to whichever platforms they sell on. A Pro tier adds batch upload and a browser extension. Later phases add one-click publishing via eBay and Allegro APIs.

Live at: **listlyai-photo.vercel.app**

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens in `globals.css`) |
| Auth + DB | Supabase (PostgreSQL + auth + storage) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) — vision + extraction |
| Payments | Stripe (checkout + webhook) |
| Hosting | Vercel (auto-deploy from GitHub `main`) |
| Package manager | **npm** — do not use yarn or pnpm |

---

## Project structure

```
src/
  app/
    layout.tsx              # Root layout — fonts (Inter + Plus Jakarta) + globals
    globals.css             # DESIGN BOOK — @theme tokens, type scale, helpers
    page.tsx                # Landing page
    login/ signup/          # Auth screens
    auth/confirm|reset|callback
    onboarding/page.tsx     # Guided post-signup setup (intent, categories, country, language, platforms)
    dashboard/page.tsx      # Saved listings — redirects to /login if no session
    list/page.tsx           # Upload screen — pure drag-drop, auto-analyze
    list/review/page.tsx    # Single review + edit screen
    list/batch-review/page.tsx
    settings/page.tsx       # Account, Subscription, Platforms, Preferences, Extension
    pricing/page.tsx        # Free / Pro plan cards → Stripe checkout
    api/
      extract/route.ts          # POST — photo → structured listing JSON (accepts language)
      extension/generate-key/   # GET/POST/DELETE — extension API key (hashed)
      extension/listings/       # GET — extension fetch (REQUIRES plan == PRO)
      stripe/checkout|webhook
      user/delete/route.ts      # DELETE account + storage
  components/
    AppShell.tsx            # Light sidebar shell + SidebarQueue + PlatformLogo (exported)
  lib/
    platforms.ts            # ALL_PLATFORMS, COUNTRIES, LANGUAGES, country→platform map
    ai/extractListing.ts    # Two-pass extraction pipeline
    supabase/client.ts|server.ts|service.ts
  proxy.ts                  # Auth session middleware (Next.js 16 — not middleware.ts)
```

---

## Coding rules

**Always follow these without being asked.**

### TypeScript
- Strict mode is on. No `any` unless genuinely unavoidable — comment why.
- Define interfaces for all API response shapes and component props.
- Use `unknown` + type narrowing instead of casting with `as` where possible.

### React / Next.js
- All interactive components must have `"use client"` at the top.
- Never use `<form>` elements — use `onClick` handlers on buttons instead.
- Never use `useEffect` to derive state — compute it inline or with `useMemo`.
- Use `next/image` for UI images. User-uploaded previews and the heavy logo SVGs use plain `<img>` (with an eslint-disable comment) — that's the established pattern.

### Supabase
- Server client (`lib/supabase/server.ts`) in API routes + server components.
- Browser client (`lib/supabase/client.ts`) in `"use client"` components.
- Service client (`lib/supabase/service.ts`) only where RLS must be bypassed (webhooks, extension key lookup, account deletion).
- Never import from `@supabase/supabase-js` directly — go through the lib wrappers.
- RLS is enabled on all user tables. Never disable it.

### Styling — the design book
- Tailwind utility classes only. No CSS modules / styled-components.
- **All tokens live in `src/app/globals.css` under `@theme`** (Tailwind v4) — there is no `tailwind.config.ts`. Use the token utilities, don't inline hex.
- Core tokens: `bg-page` `#F8F9FA` · `bg-card` `#FFFFFF` · `border-line` `#E5E7EB` · `text-ink` `#1E2022` · `text-ink-2` · `text-muted` `#6B7280` · accent mint `var(--color-accent)` `#00C47A` (`accent-dark` for pressed, `accent-tint` for selected) · `danger` `#EF4444`.
- Type scale helpers: `.t-display .t-title .t-card .t-body .t-meta .t-label`. Surface helper: `.surface-card`. Use these for consistency.
- Headers (Plus Jakarta) via `font-header`; body (Inter) via `font-sans`.
- Mobile-first. Test at 390px. The app shell is a **light** sidebar (white) — not the old dark one.

### API routes
- Every API route checks auth first; return `401` immediately if no session.
- Never expose the service role key to the client.
- Rate limiting via `api_usage` / `api_usage_log` — do not bypass.
- Consistent error shape: `{ error: string, code?: string }`.

### Environment variables
- Never hardcode secrets — use `process.env.VARIABLE_NAME`.
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`.
- Never commit `.env.local` (it is gitignored). New env vars must be added manually in Vercel.

---

## AI extraction system

The pipeline lives in `src/lib/ai/extractListing.ts`. Key facts:

- **Two-pass design**: Pass 1 detects gender + category (~300 token budget). Pass 2 does full extraction using only the relevant taxonomy branch (~1200 token budget).
- **Model**: always `claude-sonnet-4-6`. Do not change this.
- **Image formats**: `image/jpeg`, `image/png`, `image/webp`. Max 5MB free / 10MB pro.
- **Language**: `extractListing(..., language)` controls the output language of titles + descriptions (defaults `en`). Plumbed from the user's `profiles.language` via `/api/extract`.
- **Output**: structured JSON matching the `ListingData` interface.
- If you modify the Pass 2 prompt, test on at least 3 real photos before committing. Prompt regressions are invisible until users hit them.

---

## Database

Supabase project `gtprjuqkdklhntgbvsbp`. Tables:

| Table | Purpose |
|---|---|
| `profiles` | User profile + `plan` (`FREE`/`PRO`), `extension_api_key_hash`, and onboarding fields: `seller_intent`, `item_categories[]`, `country`, `language`, `platforms[]`, `onboarded_at` |
| `listings` | Saved listings |
| `api_usage` | Daily extraction counter per user |
| `api_usage_log` | Per-request log for hourly rate limiting |

- `profiles` RLS: single `ALL` policy `auth.uid() = id`.
- Apply schema changes via the Supabase MCP `apply_migration` (or dashboard). Enable RLS + add an `auth.uid() = user_id` policy for any new user table, and test before wiring UI.

---

## Deployment

- Push to `main` → Vercel auto-deploys. Do not push broken builds. Always run `npm run build` locally first.
- Env vars are set in the Vercel dashboard (Production + Preview). Flag any new one — it must be added manually.
- Migrations do not run on deploy — apply them to Supabase separately.

---

## What NOT to do

- Do not add npm packages without checking the existing deps first. Keep the dependency count low.
- Do not create API routes that bypass authentication.
- Do not gate the extension on key existence alone — it must check live `plan == PRO` (a cancelled Pro user must lose access).
- Do not automate posting to Vinted, Leboncoin, Wallapop, or Kleinanzeigen — their ToS prohibit it. The app helps users create listings; they post manually.
- Do not assert brand or authenticity from photos alone — the prompt intentionally flags uncertainty.
- Do not remove or weaken rate limiting.
- Do not use `middleware.ts` — this project uses `proxy.ts` (Next.js 16 convention).

---

## When you're unsure

- Check `lib/supabase/server.ts` / `client.ts` before writing new queries.
- Check `lib/platforms.ts` before touching platform / country / language logic.
- Check the `ListingData` interface before touching extraction output shape.
- Schema change needed? List the migration before writing app code.
- Touching the AI prompt? Describe the change and why first — it has outsized product impact.

---

## Current build status

| Task | Status |
|---|---|
| Task 1 — Scaffold + Supabase auth | ✅ Done |
| Task 2 — Claude Vision extraction prompt | ✅ Done |
| Task 3 — Upload + Review UI (`/list`, `/list/review`, `/list/batch-review`) | ✅ Done |
| Task 4 — Saved listings dashboard (free paywall, image thumbnails) | ✅ Done |
| Task 5 — Resend SMTP wiring (email confirm) | ⬜ Not started |
| Task 6 — Stripe (checkout + webhook + env vars) | ✅ Done — live keys in Vercel & `.env.local` |
| Task 7 — eBay OAuth + direct publish (Pro tier) | ⬜ Not started |
| Premium overhaul — light shell, design book, Settings | ✅ Done |
| Onboarding flow + `profiles` schema | ✅ Done |
| Upload redesign — drag-drop, auto-analyze, Pro gate | ✅ Done |
| Extension subscription gating (`plan == PRO`) | ✅ Done |
| Language-aware descriptions | ✅ Done |

### Known follow-ups
- M6 polish: tighten microcopy, align review-screen skeleton to real layout.
- Logo SVGs in `/public` are ~5.5MB base64-wrapped PNGs — re-export as optimized assets.
- Stripe `subscription_data.metadata.user_id` only on **new** subs — existing Pro subs won't auto-downgrade on cancel.
- Signup page still shows "Listly AI" as text, not the logo.
