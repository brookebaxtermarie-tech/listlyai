# ListAI — Current Sprint

**Sprint:** Post-sprint polish (all 6 complete)
**Goal:** Ship the remaining gaps before public launch.

---

## Must-do before launch

- [ ] **Batch review 3-column layout** — rebuild `/list/batch-review` to match the single review screen (left: queue sidebar + item thumbnail, center: edit form, right: platform output deck)
- [ ] **Smoke test on Vercel** — full flow: logged out → signup → upload → review → dashboard → pricing
- [ ] **Stripe env vars in Vercel** — add STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_POWER, STRIPE_WEBHOOK_SECRET
- [ ] **Register Stripe webhook** — in Stripe dashboard, endpoint: `https://listai-photo.vercel.app/api/stripe/webhook`, events: `checkout.session.completed` + `customer.subscription.deleted`
- [ ] **Mobile test** — real iPhone + Android, check all touch targets ≥44px

## Legal & GDPR ✅ Complete — June 24, 2026

- [x] Privacy Policy — `/privacy`, GDPR-compliant, Belgium jurisdiction, all processors disclosed
- [x] Terms of Service — `/terms`, subscriptions, AI disclaimer, platform trademark disclaimer
- [x] Signup consent — ToS + PP links under signup button
- [x] Account deletion — `DELETE /api/user/delete` + two-step UI in dashboard
- [x] Storage bucket private — RLS policies, images scoped to `{user_id}/`, signed URLs
- [x] Power plan "coming soon" label on unbuilt direct-publish feature
- [ ] Anthropic ZDR — contact Anthropic support to enable Zero Data Retention

## Nice-to-have before launch

- [ ] Client-side image compression (<800KB before upload)
- [ ] Custom 404 page
- [ ] SEO: OG image + meta descriptions
- [ ] Cookie banner (needed once PostHog added, not before)

## Post-launch

- [ ] PostHog analytics
- [ ] Sentry error monitoring
- [ ] eBay / Allegro direct publish (Power tier, Phase 2)
- [ ] Price suggestions via eBay sold listings API

---

## Sprint 6 — complete ✅

- [x] AppShell — 64px icon sidebar (desktop), bottom tab bar (mobile), sign-out button
- [x] Upload screen — two-column desktop layout, platform toggle cards with color left-border
- [x] Review screen — three-column workspace (left=photo/status, center=edit, right=platform output)
- [x] Platform cards — color left-border, Copy Details button, title preview row, proper spacing
- [x] Field values auto-capitalized on initForm (garment type, colour, material etc.)
- [x] Pricing page — rebranded to mint, AppShell font applied
- [x] Password reset — `/auth/reset`
- [x] Stripe success banner — `/list?upgraded=1`

## Sprint 5 — complete ✅

- [x] New brand tokens in globals.css (mint, charcoal, white, Jakarta Sans + Inter)
- [x] Landing page `/` — hero, platform chips, feature cards, bottom CTA
- [x] Login, signup, auth/confirm — all styled to new brand
- [x] Stripe checkout route + webhook route (test keys)
- [x] Rate limit 429 → upgrade prompt with Stripe CTA

## Sprint 4 — complete ✅

- [x] `listings` table migration SQL + RLS
- [x] Auto-save after extraction (review page on mount)
- [x] Image upload to Supabase Storage (listing-images bucket)
- [x] Dashboard — active/sold split, platform chips, mark sold, delete, free plan blur
- [x] Re-list: tap card → `/list/review?id=` loads from DB

## Sprint 3 — complete ✅ (Stripe deferred → Sprint 5)

- [x] Batch upload UI (toggle, multi-file, progress, batch-review screen)
- [x] `/pricing` page (Free / Pro / Power cards)
- [x] Plan gating (3 platform cap free, batch behind Pro)

## Sprint 2 — complete ✅

- [x] Auth protection on `/list`, `/list/review`
- [x] Email confirm flow `/auth/confirm`
- [x] Auth callback → /list

## Sprint 1 — complete ✅

- [x] Next.js scaffold + Supabase auth + Vercel deploy
- [x] AI extraction API (two-pass, rate limiting)
- [x] Upload screen + review screen
