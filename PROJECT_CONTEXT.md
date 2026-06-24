# ListAI — Project Context

## What we are building
Listly AI is a web tool for secondhand resellers that turns 
a single photo into a ready-to-post listing using AI, then 
formats that listing for every platform the user sells on.
Tagline: "The fastest way to list anything, anywhere."

## The user
Young, tech-savvy, serious thrifter. Has been reselling for 
a while. Has a small social media presence tied to their 
thrifting identity. Lists across 2-3 platforms, consistent 
routine (sources 2x/week, uploads in batches). Not afraid 
of new tools. Wants speed without losing listing quality.
Does NOT need platforms explained to them.

## Brand — three words
Reliable. Satisfying. Effortless.
Emotional benefit: getting 5 hours of your Sunday back.

## Tone of voice
Chill but reliable. Calm confidence. 
✅ "Batch done. 42 listings ready to go."
❌ "Batch Upload Successful. 42 items processed." (too cold)
❌ "Boom! 42 items live! 🚀" (too loud)

## Current build status
- Sprint 1 ✅ — Scaffold, Supabase auth, Vercel deploy
- Sprint 2 ✅ — Auth polish, email confirm, error states
- Sprint 3 ✅ — Batch upload UI, pricing page, plan gating (Stripe deferred to Sprint 5)
- Sprint 4 ✅ — Listings table, auto-save, dashboard, re-list from DB, mark sold
- Sprint 5 ✅ — New brand (mint/charcoal), fonts, landing page, login/signup/confirm styled, Stripe wired (test keys)
- Sprint 6 ✅ — AppShell, 3-column review, pricing rebrand, password reset, upgrade success banner
- Jun 24 Polish ✅ — Dark sidebar, SidebarQueue, platform logos (9 platforms), channel selector grid, upload layout, review right column, header centering, field capitalization

## What's still needed before launch
- Batch review layout: rebuild `/list/batch-review` with 3-column layout matching single review
- Smoke test full flow on Vercel (logged out → signup → upload → review → dashboard)
- Stripe env vars added to Vercel (STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_POWER, STRIPE_WEBHOOK_SECRET)
- Stripe webhook registered in Stripe dashboard pointing to listlyai-photo.vercel.app/api/stripe/webhook
- PostHog analytics (post-launch)
- Sentry error monitoring (post-launch)
- Mobile test on real Android device

## After the review page — the flow
1. User lands on /list/review — listing auto-saves to Supabase immediately on mount
2. User edits fields, copies platform descriptions ("Copy Details" per platform, or "Copy all & done" on mobile)
3. First copy triggers end-of-flow modal after 1.5s:
   - "New photo" → saves edits, clears session, → /list
   - "My listings" → → /dashboard
   - "Keep editing" → dismiss modal
4. Listing stays in Supabase as status: 'draft' until user marks it sold from dashboard

## Live URL
listlyai-photo.vercel.app

## Tech stack
- Next.js 16, TypeScript, App Router
- Tailwind CSS v4 (tokens in globals.css via @theme)
- Supabase (auth + postgres + storage + RLS)
- Anthropic Claude API — claude-sonnet-4-6 (vision extraction)
- Stripe (test keys active, prod keys pending entity setup)
- Vercel (hosting)
- Package manager: npm

## Design system (Sprint 5 — current)
Background: #F8F9FA (workspace white)
Cards: #FFFFFF with 1px #E5E7EB border
Accent UI: #00C47A (softer mint — dense UI)
Accent bold: #00E699 (full mint — landing/marketing CTAs)
Text: #1E2022 charcoal
Muted: #6B7280
Fonts: Plus Jakarta Sans (headers, var(--font-header)), Inter (body, var(--font-sans))
Styling: Tailwind utility classes. Custom tokens via @theme in globals.css.
Buttons: minimum 44px height (48px for primary CTAs)

Platform accent colours (left-border on cards):
  eBay: #5B8DB8 | Vinted: #4A9E8E | Depop: #C47A7A
  Leboncoin: #C49A5B | Kleinanzeigen: #8EA85B
  Wallapop: #5B9EA8 | Allegro: #C4725B

## Key file locations
src/app/page.tsx                   — landing page
src/app/list/page.tsx              — upload screen (two-column desktop)
src/app/list/review/page.tsx       — review screen (three-column desktop)
src/app/list/batch-review/page.tsx — batch review (needs 3-column rebuild)
src/app/dashboard/page.tsx         — listings dashboard (server component)
src/app/dashboard/ListingsGrid.tsx — listings grid (client component)
src/app/pricing/page.tsx           — pricing page
src/app/login/page.tsx             — login
src/app/signup/page.tsx            — signup
src/app/auth/confirm/page.tsx      — email confirm
src/app/auth/reset/page.tsx        — password reset
src/app/api/extract/route.ts       — AI extraction API route
src/app/api/stripe/checkout/route.ts — Stripe checkout session
src/app/api/stripe/webhook/route.ts  — Stripe webhook (plan upgrade/downgrade)
src/lib/ai/extractListing.ts       — two-pass extraction logic
src/lib/supabase/client.ts         — browser Supabase client
src/lib/supabase/server.ts         — server Supabase client
src/components/AppShell.tsx        — sidebar + bottom nav shell
src/proxy.ts                       — auth middleware (Next.js 16)
SPRINT.md                          — current sprint tasks
AGENTS.md                          — coding rules and architecture

## Supabase project
URL: https://gtprjuqkdklhntgbvsbp.supabase.co
Tables: profiles (id, plan), api_usage, api_usage_log, listings
Storage bucket: listing-images (public)
RLS: enabled on all tables

## sessionStorage keys
listai_listing          — full AI extraction JSON
listai_platforms        — selected platform array
listai_preview          — base64 image preview
listai_listing_id       — Supabase listing UUID (set after auto-save)
listai_saved_platforms  — persisted platform selection (set on "New photo")

## AI extraction architecture
Two-pass design:
Pass 1 — coarse: gender + category classification (~150 tokens)
Pass 2 — precise: full extraction using taxonomy branch (~1200 tokens)
Cost: ~$0.027 per extraction
Model: claude-sonnet-4-6

## Monetization
Free: 1 photo at a time, 3 platforms, 10 listings/month, last 3 in history
Pro (€8.99/mo): batch upload (up to 10), all 7 platforms, full listing history
Power (€19/mo): everything + eBay/Allegro publish (Phase 2)

## Sprint plan summary
Sprint 1 ✅ Core UI
Sprint 2 ✅ Auth polish + error states
Sprint 3 ✅ Batch upload + pricing page
Sprint 4 ✅ Saved listings + dashboard
Sprint 5 ✅ Brand system + landing page + Stripe
Sprint 6 ✅ App shell + 3-column review + pre-launch polish
Launch: Week of August 4 2026

## What we are NOT building (decided)
- Background removal (PhotoRoom solves this)
- Measurements AI extraction (not possible from photos)
- Vinted/Leboncoin/Wallapop API automation (ToS violation)
- Custom model fine-tuning (Phase 3+)

## Critical rules
- Never rewrite a whole file to fix one bug
- Always run npx tsc --noEmit before reporting done
- Always run npm run build before reporting done
- Update SPRINT.md at end of every session
- Read AGENTS.md before touching any file
