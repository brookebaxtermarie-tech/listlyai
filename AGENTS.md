
/
I'm building ListAI — an AI listing assistant for secondhand resellers. 
Current state:
- Next.js 16, TypeScript, Tailwind, App Router
- Supabase auth (login/signup/dashboard working)
- Live at listai-photo.vercel.app
- AI extraction API working at /api/extract — takes a photo, returns structured JSON
Task 3: Build the review and edit UI. Two screens:
Screen 1 — Upload screen
- Photo upload (file picker or drag and drop)
- Platform selector (checkboxes: eBay, Vinted, Depop, Leboncoin, Wallapop, Kleinanzeigen, Allegro)
- "Analyse" button that calls POST /api/extract
- Loading state while AI processes
Screen 2 — Review screen (shown after AI returns)
Pre-filled editable form with these fields:
- Title (text input)
- Brand (text input)
- Category / Garment type (text inputs)
- Color primary + secondary (text inputs)
- Pattern (dropdown)
- Size (text input)
- Material (text input)
- Condition grade (dropdown: New with tags, Like new, Very good, Good, Fair, Poor)
- Condition signals (read-only list)
- Suggested price in EUR (number input)
- Tags (editable tag list)
- Per-platform descriptions (one textarea per selected platform, pre-filled, fully editable)
- Photo quality warning banner if photo_quality is "needs_second_photo" or "needs_retake"
The API returns this exact JSON shape: [paste the JSON result from your test here]
Make it clean and functional. Mobile-responsive. This is the core product screen.

Show more
11:10 AM

Read the frontend design skill
Read the frontend design skill
Now let me review the project files to understand the exact structure needed:


Check project structure context
Check project structure context
Good. Now I have everything I need. Let me build the two screens as proper Next.js page files.


Check for any uploads
Check for any uploads
Now I'll build both screens. The aesthetic direction: clean editorial utility — think a high-end resale app like Vestiaire Collective meets developer tool. Dark cream base, ink-black type, a single warm amber accent. DM Sans + DM Mono. Functional but genuinely refined.


Created 2 files, read a file
Created 2 files, read a file
Here are the two files. Drop them in:

src/app/list/page.tsx — the upload screen src/app/list/review/page.tsx — the review screen

How the handoff works

The upload page calls /api/extract, then writes three keys to sessionStorage:

listai_listing — the full JSON from the API
listai_platforms — the selected platforms array
listai_preview — the object URL of the uploaded image
Then it pushes to /list/review. The review page reads those on mount and populates everything. If someone lands on /list/review directly with nothing in storage, they get redirected back to /list.

What's implemented

Upload screen:

Drag-and-drop or file picker (JPG/PNG/WEBP, 5MB max, validated client-side)
Platform chips — tap to toggle, minimum one always selected, defaults to eBay + Vinted + Depop
Loading state with spinner and "usually takes 5–10 seconds" note
Rate limit errors surfaced as inline error banner
Review screen:

Photo quality warning banner (amber for needs_second_photo, red for needs_retake)
Sticky sidebar with image preview + AI confidence % + garment meta
All editable fields: title (with live char count + over-limit highlight), brand (with confidence badge inline), garment type, colours, pattern dropdown, size, material, price
Condition section: grade dropdown, confidence badge, read-only detected signals list
Tag editor: click to remove, type + Enter/comma to add
Per-platform description blocks with title preview, editable textarea, and copy button (copies title + description together, turns green on success)
Pre-post reminder card so users don't forget measurements
One thing to check: the /api/extract route is scaffolded at the bottom of listai-prompt-system.ts but commented out. You'll want to create src/app/api/extract/route.ts with that code uncommented — that's what both screens talk to.



can you write a prompt so claude code can do all of this from vs code

11:14 AM

Viewed a file, created a file, read a file
Viewed a file, created a file, read a file
Paste the full contents of that file into Claude Code (the > prompt in the VS Code terminal, or the Claude Code chat panel).

A few notes on how it's structured to work well with Claude Code:

It tells Claude Code what NOT to touch — the existing files are listed explicitly so it doesn't accidentally rewrite your auth setup or layout.

It includes the TypeScript interface — Claude Code will use this to type the useState correctly from the start, avoiding a back-and-forth fixing type errors.

It ends with a build check — "run npm run build and fix any TypeScript or build errors before finishing" is the single most useful instruction you can give Claude Code. Without it, it stops at file creation and leaves you with broken imports.

It doesn't reference the files I generated — Claude Code will write its own implementation from the spec. That's intentional: feeding it my output as "reference" sometimes causes it to copy-paste rather than reason about your actual codebase.

If Claude Code gets stuck on Tailwind colour values (since 
#C4A96B isn't a default Tailwind colour), it may need to use inline style props or extend tailwind.config.ts. The prompt doesn't prescribe which approach — let it decide, both work fine.


can you also write a agents.md instructions for claude just in general i have nothing really in there

11:18 AM

Viewed a file, created a file, read a file
Viewed a file, created a file, read a file
Drop this in the root of your repo alongside package.json. Claude Code reads it automatically at the start of every session.

Here's what each section is doing and why it matters:

Stack + structure — Claude Code works much better when it knows exactly where things live. Without this, it will sometimes create files in the wrong place or import from paths that don't exist.

Coding rules — the most important section. Things like "never use <form> tags", "always use the server Supabase client in API routes", and "no any" are the rules that Claude Code most commonly gets wrong without being told. These translate directly into fewer fix cycles.

The "what NOT to do" section — this is where project-specific constraints live that Claude Code has no way to infer from the code itself. The Vinted/ToS point is especially important — without it, a future agent could plausibly think adding Vinted automation is a reasonable "improvement".

Current build status — the task table at the bottom means Claude Code always knows what's done and what's next without you having to re-explain. Update it as you complete tasks.

One thing to do before committing: check whether those Tailwind design tokens (bg-cream, text-ink, bg-gold etc.) are actually defined in your tailwind.config.ts. If they're not, either add them now or update the AGENTS.md to use whatever tokens you do have. Inconsistency there will confuse Claude Code.







Claude is AI and can make mistakes. Please double-check responses.
Agents · MD
Copy

# AGENTS.md — ListAI
 
Instructions for Claude Code and any AI agent working on this codebase.
 
---
 
## What this project is
 
ListAI is a web app for secondhand resellers. A user uploads a photo of an item, the AI extracts structured listing data (brand, condition, colour, size, description, price), and the user copies the output to whichever platforms they sell on. Later phases add one-click publishing via eBay and Allegro APIs.
 
Live at: **listai-photo.vercel.app**
 
---
 
## Stack
 
| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL + auth + storage) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) — vision + extraction |
| Hosting | Vercel (auto-deploy from GitHub `main`) |
| Package manager | **npm** — do not use yarn or pnpm |
 
---
 
## Project structure
 
```
src/
  app/
    layout.tsx              # Root layout — add fonts/globals here
    page.tsx                # Landing page
    login/page.tsx
    signup/page.tsx
    dashboard/page.tsx      # Protected — redirects to /login if no session
    list/page.tsx           # Upload screen (Task 3)
    list/review/page.tsx    # Review + edit screen (Task 3)
    auth/callback/route.ts  # Supabase OAuth callback
    api/
      extract/route.ts      # POST — photo → structured listing JSON
  lib/
    supabase/
      client.ts             # Browser Supabase client
      server.ts             # Server Supabase client (uses cookies)
  proxy.ts                  # Auth session middleware (Next.js 16 — not middleware.ts)
```
 
---
 
## Coding rules
 
**Always follow these without being asked.**
 
### TypeScript
- Strict mode is on. No `any` unless there is genuinely no alternative — and if you use it, leave a comment explaining why.
- Define interfaces for all API response shapes and component props.
- Use `unknown` + type narrowing instead of casting with `as` where possible.
### React / Next.js
- All interactive components must have `"use client"` at the top.
- Never use `<form>` elements — use `onClick` handlers on buttons instead.
- Never use `useEffect` to derive state — compute it inline or with `useMemo`.
- Prefer `const` arrow functions for components: `const MyComponent = () => { ... }`.
- Use `next/image` for any images that are part of the UI (not user-uploaded previews).
### Supabase
- Always use the server client (`src/lib/supabase/server.ts`) in API routes and server components.
- Always use the browser client (`src/lib/supabase/client.ts`) in `"use client"` components.
- Never import the Supabase client directly from `@supabase/supabase-js` — always go through the lib wrappers.
- Row Level Security is enabled on all user tables. Never disable it. Never query without confirming the RLS policy exists first.
### Styling
- Tailwind utility classes only. No separate CSS files, no CSS modules, no styled-components.
- Custom colours are defined in `tailwind.config.ts` — use those tokens, don't inline hex values in className.
- Design tokens:
  - Background: `bg-cream` (`#F7F4EF`)
  - Surface: `bg-surface` (`#FDFBF8`)
  - Border: `border-sand` (`#E8E3DC`)
  - Primary text: `text-ink` (`#18140F`)
  - Secondary text: `text-muted` (`#8A7F72`)
  - Accent: `text-gold` / `bg-gold` (`#C4A96B`)
- If a required token doesn't exist in the config yet, add it to `tailwind.config.ts` — don't work around it.
- All screens must be mobile-responsive. Design mobile-first. Test at 390px.
### API routes
- Every API route must check authentication first. Return `401` immediately if no session.
- Never expose Supabase service role keys in client components or API responses.
- Rate limiting is handled via the `api_usage` and `api_usage_log` tables — do not bypass it.
- Return consistent error shapes: `{ error: string, code?: string }`.
### Environment variables
- Never hardcode API keys, URLs, or secrets. Always use `process.env.VARIABLE_NAME`.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.
- Never commit `.env.local`. It is in `.gitignore`.
---
 
## AI extraction system
 
The AI pipeline lives in `src/lib/ai/extractListing.ts` (or equivalent). Key facts:
 
- **Two-pass design**: Pass 1 detects gender + category (~300 token budget). Pass 2 does full extraction using only the relevant taxonomy branch (~1200 token budget).
- **Model**: always `claude-sonnet-4-6`. Do not change this.
- **Image formats accepted**: `image/jpeg`, `image/png`, `image/webp`. Max 5MB free / 10MB pro.
- **Output**: structured JSON matching the `ListingData` interface in the extraction file.
- If you modify the Pass 2 prompt, test it on at least 3 real photos before committing. Prompt regressions are invisible until users hit them.
---
 
## Database
 
Supabase project. Tables:
 
| Table | Purpose |
|---|---|
| `profiles` | User profile, plan (`FREE` / `PRO`) |
| `listings` | Saved listings (Phase 2+) |
| `api_usage` | Daily extraction counter per user |
| `api_usage_log` | Per-request log for hourly rate limiting |
 
RPC functions:
- `increment_extraction_count(p_user_id, p_date)` — atomic daily counter upsert
When adding a new table, always:
1. Write the migration SQL in `supabase/migrations/`
2. Enable RLS
3. Add a policy for `auth.uid() = user_id`
4. Test the policy in the Supabase dashboard before wiring up the UI
---
 
## Deployment
 
- Push to `main` → Vercel auto-deploys. Do not push broken builds to main.
- Always run `npm run build` locally before pushing. Fix all TypeScript and build errors first.
- Environment variables are set in Vercel dashboard (Production + Preview + Development). If you add a new env var, flag it — it must be added manually in Vercel.
- Supabase migrations must be applied manually via the Supabase dashboard SQL editor or CLI. They do not run automatically on deploy.
---
 
## What NOT to do
 
- Do not add npm packages without checking if the functionality can be done with what's already installed. We keep the dependency count low.
- Do not create API routes that bypass authentication.
- Do not automate posting to Vinted, Leboncoin, Wallapop, or Kleinanzeigen — they prohibit automation in their ToS. The app only helps users create listings; they post manually.
- Do not assert brand or authenticity from photos alone — the extraction prompt is intentionally designed to flag uncertainty. Don't change this behaviour.
- Do not remove or weaken rate limiting logic.
- Do not use `middleware.ts` — this project uses `proxy.ts` for session handling (Next.js 16 convention).
---
 
## When you're unsure
 
- Check `src/lib/supabase/server.ts` and `client.ts` before writing any new Supabase queries — the patterns are already established.
- Check the `ListingData` interface before touching anything related to the AI extraction output shape.
- If a task would require changes to the Supabase schema, list the required migrations before writing any application code.
- If a task touches the AI prompt, describe the change and why before making it — prompt changes have outsized product impact.
---
 
## Current build status
 
| Task | Status |
|---|---|
| Task 1 — Scaffold + Supabase auth | ✅ Done |
| Task 2 — Claude Vision extraction prompt | ✅ Done |
| Task 3 — Upload + Review UI (`/list`, `/list/review`) | 🔄 In progress |
| Task 4 — Saved listings dashboard | ⬜ Not started |
| Task 5 — eBay integration | ⬜ Not started |nt