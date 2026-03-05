# Podsee Platform MVP — To-Do List

## Context
The Podsee Platform MVP has a working public booking flow (browse centres → book trial → confirmation email) and a Podsee-internal admin panel. What's missing is a centre-facing dashboard, robust reference numbers, real-time capacity management, and a polished parent-facing UI.

---

## Priority Order

| Priority | Task | Why | Status |
|----------|------|-----|--------|
| 1 | Fix reference number generation | Quick win, prevents bugs | Done |
| 2 | Atomic capacity decrement | Quick win, prevents overbooking | Done |
| 3 | Centre dashboard (core) | Business-critical — centres need visibility | Done |
| 4 | Admin auth protection | Admin panel is currently unprotected | Done |
| 5 | AI parsing layer | Onboarding blocker — can't ask centres to reformat their data | Done |
| 6 | UI polish (centre detail + booking flow) | Parent experience — existing flow works for now | Done |
| 7 | Parent ↔ Centre booking flow (redesigned) | Core platform functionality — parents/centres need self-service | Next |

---

## 1. Centre Dashboard (Scalable & Reusable)

**Problem**: Centres currently have no way to see their own bookings or track leads from Podsee. Everything goes through the Podsee admin panel.

**What "duplicatable" means**: When a new centre signs up, they should automatically get their own dashboard view filtered to their data — NOT a copy-paste of code. One codebase, dynamic per-centre.

### Tasks
- [x] Centre auth system — `centre_users` table linking Supabase Auth users to a `centre_id`. Centre login via Google OAuth (same Supabase Auth, different role) so accounts are protected and centres don't manage passwords
- [x] Auto-provisioning from Add Centre form — When admin creates a new centre via the Add Centre form, automatically: (1) create a `centre_users` record linked to that `centre_id`, (2) send an invite email to the centre's email with a link to sign in via Google OAuth. No manual SQL needed — the form handles everything end-to-end
- [x] Centre layout & nav — Create `/centre-dashboard` route group with its own layout (sidebar: Overview, Bookings, Trial Slots)
- [x] Middleware guard — Protect `/centre-dashboard/*` routes; redirect if not a centre user; verify OAuth session matches a valid `centre_users` record
- [x] Overview page — Show:
  - Total trial bookings (all time + this month)
  - Leads counter (how many bookings Podsee has sent them)
  - Upcoming trials with capacity (spots filled / max)
  - Conversion rate (if trial outcomes data exists)
- [x] Bookings list — Table of all bookings for THEIR centre only, showing: booking ref, parent name, child name, child level, subject, trial date/time, status, created date
- [x] Trial slots view — Their upcoming slots with real-time capacity (`spots_remaining` / `max_students`)

### Key Architecture Decision
All centre dashboard pages query with a `WHERE centre_id = ?` filter using the logged-in centre user's linked `centre_id`. No per-centre code duplication. One set of components, parameterized by centre.

### Files to create/modify
- `supabase/migrations/` — New migration for `centre_users` table
- `app/src/app/centre-dashboard/` — New route group (layout, page, bookings/page, slots/page)
- `app/src/lib/centre-auth.ts` — Centre auth helpers
- `app/src/middleware.ts` — Add centre route protection

---

## 2. Reference Number Generation (Proper Implementation)

**Problem**: Current `PSE-YYMMDD-XXXX` uses `Math.random()` which has collision risk and isn't cryptographically random.

### Tasks
- [x] Switch to crypto-safe generation — Use `crypto.randomBytes()` or `nanoid` for the random portion
- [x] Add retry logic — If insert fails on unique constraint, regenerate and retry (up to 3 attempts)
- [x] Consider sequential component — Format: `PSE-YYMMDD-XXXX` where XXXX is a 4-char alphanumeric from a crypto-safe source (collision probability ~1 in 1.6M per day, acceptable for MVP with retry)

### Files to modify
- `app/src/app/(public)/book/[slotId]/actions.ts` — Update `generateRef()` function

---

## 3. Real-Time Capacity Updates on Booking

**Problem**: When someone books a trial, `spots_remaining` decrements server-side, but the centre dashboard (once built) and the public site don't reflect this in real-time.

### Tasks
- [x] Atomic decrement — Replace the current read-then-update with a Supabase RPC or raw SQL: `UPDATE trial_slots SET spots_remaining = spots_remaining - 1 WHERE id = $1 AND spots_remaining > 0 RETURNING spots_remaining`
- [x] Return error if full — If the atomic update returns 0 rows, the slot is full; show error to user
- [x] Centre dashboard counters — On the centre dashboard overview, show:
  - "Leads from Podsee" counter (total bookings for their centre)
  - "This month" vs "All time" toggle
  - Upcoming trials with live capacity bars
- [ ] Optional: Supabase Realtime — Subscribe to `bookings` table changes in the centre dashboard for live updates (nice-to-have, not required for tomorrow)

### Files to modify
- `app/src/app/(public)/book/[slotId]/actions.ts` — Atomic capacity decrement
- `supabase/migrations/` — New migration for RPC function (if using RPC approach)
- Centre dashboard components (from task 1)

---

## 4. UI/UX Redesign — ClassPass/Agoda-Inspired

**Problem**: Current UI is functional but not polished to the level of ClassPass/Agoda/Booking.com. Parents need to find everything they need without contacting the centre on WhatsApp.

### Design Principles (from ClassPass, Agoda, Booking.com)
- Clear information hierarchy — Most important info (subject, date, price, spots left) immediately visible
- Trust signals — Teacher qualifications, years operating, class size prominently shown
- Friction-free booking — Minimal steps, clear CTAs, no ambiguity
- Mobile-first — Most parents will be on their phones
- Comprehensive centre profile — Everything a parent needs: schedule, pricing, location, policies, FAQs — so they never need to WhatsApp the centre

### Tasks
- [ ] Add Centre form UX review — Ensure the Add Centre form question flow and field layout aligns with the frontend design language (consistent styling, logical grouping, mobile-friendly inputs)
- [x] Centre image upload in Add Centre form — Add an image upload field to the Add Centre admin form so centre photos can be added during centre creation (stored via Supabase Storage), instead of requiring manual file placement through code
- [x] Centre listing cards — Display the uploaded centre image above the centre name (like ClassPass and Agoda/Trip.com hotel cards). Redesign with key stats (rating-style layout like Agoda), price prominently shown, "X spots left" urgency indicator
- [ ] Centre detail page — Agoda-style tabbed/sectioned layout:
  - [x] Hero section with key details
  - [x] Quick facts bar (class size, years, subjects)
  - [ ] "Available trials" section with calendar-style date picker
  - [x] Teacher profiles with credentials
  - [x] Policies in expandable accordion (not walls of text)
  - [ ] Location map section
  - [ ] FAQ section (reduces WhatsApp queries)
- [x] Booking success page — Update copy to match instant-confirm flow:
  - Change "We'll confirm your slot within 1 business day via email" → "Your trial is confirmed!"
  - Step 1: Remove "Podsee contacts the centre to confirm your spot" (instant confirmed now)
  - Step 3: Remove "earn a cash reward" (OFF). Replace with "After the trial, let us know how it went."
- [ ] Slot cards — "Already booked" + "Full" states:
  - If parent has an active booking on this slot → show "Already booked" badge but keep slot clickable
  - On click, show prompt: "Have another child who wants to trial for the same slot?"
  - If `spots_remaining <= 0` → show "Full" badge, disable booking button
  - Both states should be visually distinct (Already booked = blue/info, Full = grey/disabled)
- [x] Duplicate booking logic (server-side) — Relax current check: allow same parent + same slot if `child_name_at_booking` is different (case-insensitive). Block only same parent + same slot + same child name. Show friendly inline error instead of runtime error.
- [x] Booking form error handling — Catch server action errors and display as inline form messages (not raw runtime errors)
- [ ] Booking flow — ClassPass-style streamlined checkout:
  - Fewer fields, cleaner layout
  - Clear price breakdown
  - Instant confirmation feel
- [ ] Slot highlighting from filters — When a parent filters by subject/level on the homepage (e.g. "P3 Science"), carry those filters as URL params (`?subject=...&level=...`) to the centre detail page. On the centre page:
  - Matching slots are visually highlighted (e.g. green border, "Matches your search" badge)
  - Non-matching slots are dimmed but still visible and bookable (parent might have multiple children)
  - This prevents parents from accidentally booking the wrong level/subject after filtering
  - Filter context shown at top: "Showing slots for P3 Science" with a "Clear filter" option
- [ ] Parent profile + saved children — When a parent books a trial, save their phone number to the `parents` table and save child info (name, level) to the `children` table linked to their `parent_id`. On future bookings (any centre), pre-populate parent phone + show a dropdown of saved children (no retyping). Parent can also manage from a `/profile` page. The `children` and `parents` tables already exist — just not fully wired into the booking flow.
  - Save/update parent phone on every booking
  - Save child to `children` table on first booking (upsert by parent_id + name)
  - Link `bookings.child_id` to the created/matched child record
  - Booking form: pre-fill parent phone from profile, "Select child" dropdown (saved children) + "Add new child" option
  - `/profile` page: view/edit parent info (name, phone) + manage children list (add, edit, remove)
- [ ] My Bookings — Card-based layout with clear status, next steps, and centre contact info (but designed so they DON'T need to contact)
- [ ] Schedule browsing & calendar UX — Centres upload schedules one month at a time, resulting in many slots across many centres. Parents need an intuitive way to browse:
  - **Time filters**: Filter slots by "This week", "Next week", or "This month" (default: this week)
  - **Calendar view**: Show available trial dates in a calendar format so parents can visually scan availability across centres
  - **Date selection for recurring classes**: When a parent clicks on a class (e.g. "Wednesday 4pm Science P3"), show them which specific dates are available — this Wednesday, next Wednesday, the following Wednesday, etc. Parent picks the exact date they want to attend
  - **Multiple centres, different schedules**: Each centre has its own schedule. The calendar/list view must aggregate across centres or let parents drill into one centre at a time
  - **Interaction with subject/level filters**: Combine with existing subject + level filters so parents only see classes relevant to their child
  - This is critical for usability — without date filtering, parents will see an overwhelming list of slots spanning an entire month across all centres
- [ ] Homepage — Hero with search/filter, popular centres, how-it-works section

### Files to modify
- `app/src/app/(public)/centres/page.tsx` — Centre listing
- `app/src/app/(public)/centres/[slug]/page.tsx` — Centre detail
- `app/src/app/(public)/centres/[slug]/CentreSlots.tsx` — Slot selection
- `app/src/app/(public)/book/[slotId]/BookingForm.tsx` — Booking form
- `app/src/app/(public)/my-bookings/page.tsx` — My Bookings
- `app/src/app/(public)/page.tsx` — Homepage
- `app/src/app/globals.css` — Design tokens/styles

---

## 5. Other Recommended Items

### High Priority (before launch)
- [x] Admin panel auth protection — Protect `/admin/*` routes with Google OAuth. Add an `admin_users` table (or `role` column on a shared `users` table) that whitelists specific Google emails as admins. Middleware redirects unauthenticated users to login. Same Supabase Auth as parents and centres, just a different role check
- [ ] Booking cancellation flow — → Moved to Section 7, CP2
- [ ] Centre confirmation mechanism — → Replaced by auto-confirm model in Section 7, CP1
- [ ] Duplicate booking prevention — → Moved to Section 7, CP1
- [ ] Mobile responsiveness audit — Ensure all pages work well on mobile (parents will primarily use phones)
- [ ] Error handling & loading states — Add proper loading skeletons, error boundaries, and user-friendly error messages across all pages

### Medium Priority (soon after launch)
- [ ] Centre email notifications — → Moved to Section 7, CP7
- [ ] SMS/WhatsApp reminders — Automated trial reminders 24h before the class (reduces no-shows)
- [ ] Search & filter improvements — Add search by centre name, location-based sorting, subject category filters on the browse page
- [ ] SEO & meta tags — Proper meta descriptions, Open Graph tags for sharing
- [ ] Parent reviews/testimonials — → Moved to Section 7, CP6

---

## 6. AI Parsing Layer for Schedule Data (Client-Facing)

**Problem**: The current CSV parser is rule-based and brittle. It fails on unknown subjects, can't handle messy formats, and requires exact column order. The Add Centre form already handles centre metadata (name, address, teachers, policies) — the schedule/slot data needs an intelligent parsing layer that **never guesses silently**.

**Critical Rule**: This is client-facing. The AI parser **must not hallucinate**. Any field without a clear answer gets flagged and shown to the centre user to clarify before import.

---

### Pipeline: How It Works (End-to-End)

```
                         ╔═══════════════════════════════╗
                         ║   CENTRE UPLOADS SCHEDULE     ║
                         ║                               ║
                         ║   Accepts: Excel (.xlsx/.xls) ║
                         ║           CSV / text file     ║
                         ║           Screenshot / photo  ║
                         ║           Paste from clipboard║
                         ║                               ║
                         ║   + "Generate for __ weeks"   ║
                         ╚══════════════╤════════════════╝
                                        │
                                        ▼
                         ╔═══════════════════════════════╗
                         ║   FORMAT DETECTION            ║
                         ║   (client-side)               ║
                         ║                               ║
                         ║   .xlsx → SheetJS → CSV       ║
                         ║          (all sheets merged)  ║
                         ║   .csv  → read as text        ║
                         ║   .png  → base64 for Vision   ║
                         ╚══════════════╤════════════════╝
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │  subjects table   │   │  levels table     │   │ parse_corrections│
   │  (60+ subjects    │   │  (P1-P6, Sec1-5, │   │ table            │
   │   incl. MOE list) │   │   JC, IP, NA, NT)│   │ (learned from    │
   │                   │   │                   │   │  past uploads)   │
   └────────┬──────────┘   └────────┬──────────┘   └────────┬────────┘
            │                       │                        │
            └───────────┬───────────┘                        │
                        │                                    │
                        ▼                                    ▼
                         ╔═══════════════════════════════╗
                         ║   AI PARSING                  ║
                         ║   (Claude Haiku API)          ║
                         ║                               ║
                         ║   Prompt includes:            ║
                         ║   • DB subjects + levels      ║
                         ║   • SEAB subject reference    ║
                         ║   • FSBB stream/banding rules ║
                         ║     (G1/G2/G3/IP/IB)         ║
                         ║   • Learned corrections       ║
                         ║     (centre + global)         ║
                         ║   • Date generation rules     ║
                         ║     (SG timezone + weeks)     ║
                         ║   • Edge case rules           ║
                         ║   • Confidence rules          ║
                         ║                               ║
                         ║   Images → Claude Vision API  ║
                         ║   Text   → Claude Messages    ║
                         ║   Cost   → ~$0.02 per parse   ║
                         ╚══════════════╤════════════════╝
                                        │
                                        ▼
                         ╔═══════════════════════════════╗
                         ║   AI RETURNS PER-FIELD        ║
                         ║   CONFIDENCE                  ║
                         ║                               ║
                         ║   ✅ confirmed  — exact match  ║
                         ║   🟡 inferred   — best guess   ║
                         ║   🔴 needs_review — user must  ║
                         ║                    answer      ║
                         ║                               ║
                         ║   Fields: subject, level,     ║
                         ║   stream, date, time, fee     ║
                         ║                               ║
                         ║   + skipped_rows (non-class)  ║
                         ║   + fallback if AI fails      ║
                         ╚══════════════╤════════════════╝
                                        │
                                        ▼
                         ╔═══════════════════════════════╗
                         ║   CLARIFICATION TABLE         ║
                         ║   (review screen)             ║
                         ║                               ║
                         ║   Bulk defaults:              ║
                         ║   "Trial fee for all: [___]"  ║
                         ║   "Max students: [___]"       ║
                         ║                               ║
                         ║   Per-row table:              ║
                         ║   ☑ ✅ Math │ P4 │  — │Mar 16 ║
                         ║   ☑ 🟡 [▼] │ S2 │ G3 │Mar 17 ║
                         ║   ☑ 🔴 [▼] │ [_]│[▼] │[____] ║
                         ║   ☐ (excluded row)            ║
                         ║                               ║
                         ║   [Re-upload]  [Confirm (12)] ║
                         ╚══════════════╤════════════════╝
                                        │
                                        ▼
                         ╔═══════════════════════════════╗
                         ║   CENTRE CONFIRMS             ║
                         ║                               ║
                         ║   1. Create new subjects      ║
                         ║      (is_custom: true)        ║
                         ║                               ║
                         ║   2. Build final slot list    ║
                         ║                               ║
                         ║   3. ★ SELF-LEARNING:         ║
                         ║      Compare AI vs user       ║
                         ║      Save corrections to DB   ║
                         ║      (fire-and-forget)        ║
                         ╚══════════════╤════════════════╝
                                        │
                        ┌───────────────┤
                        │               │
                        ▼               ▼
   ┌──────────────────────┐   ┌──────────────────────┐
   │  trial_slots table    │   │  parse_corrections   │
   │  (is_draft = true     │   │  table               │
   │   for centre uploads) │   │                      │
   │                       │   │  AI said "Power Math" │
   │  Admin reviews →      │   │  User picked "Maths" │
   │  approves → live      │   │  → centre_id tagged  │
   └──────────────────────┘   │                      │
                               │  Next upload: AI     │
                               │  sees this and gets  │
                               │  it right!           │
                               └──────────────────────┘

                    ╔═══════════════════════════════════╗
                    ║       SELF-LEARNING LOOP          ║
                    ║                                   ║
                    ║  Upload 1: AI gets "Power Math"   ║
                    ║            wrong → user corrects  ║
                    ║                                   ║
                    ║  Upload 2: AI prompt includes     ║
                    ║            correction → gets it   ║
                    ║            right!                 ║
                    ║                                   ║
                    ║  Centre-specific: only affects    ║
                    ║  this centre's future uploads     ║
                    ║                                   ║
                    ║  Global: common corrections       ║
                    ║  (e.g. "GP" → "General Paper")   ║
                    ║  help ALL centres                 ║
                    ╚═══════════════════════════════════╝
```

---

### Edge Cases Handled by AI

| Scenario | How AI Handles It |
|----------|-------------------|
| "Mon & Wed, 3-5pm" | Splits into 2 separate slots |
| Day names only (no dates) | Generates next N weeks of dates (SG timezone) |
| Grid/timetable (days as columns) | Detects and pivots to rows |
| Merged cells (blank subject) | Inherits subject from row above |
| Chinese characters (华文, 数学) | Maps to English subject names |
| "Free" / "FOC" / "$0" | trial_fee = 0, confirmed |
| Fees missing from schedule | All fees set to needs_review (admin sets bulk default) |
| Student names mixed in | Filtered out as non-class data |
| Multi-sheet Excel | All sheets concatenated with separators |
| "Power Math" (branded name) | Learned correction → Mathematics |

---

### Core Tasks (v1 — Done)
- [x] Build AI parser server action (`app/src/lib/ai-parser.ts`) — Claude Haiku API, structured JSON output with per-field confidence
- [x] Build clarification UI (`SlotClarificationTable.tsx`) — Colour-coded confidence, inline dropdowns/inputs, bulk defaults bar, exclude checkbox
- [x] Auto-create pipeline — Unknown subjects created with `is_custom: true`, unknown levels saved as `custom_level`
- [x] Fallback — If Claude API call fails, fall back to rule-based parser with a warning message
- [x] Multi-format support — CSV, XLSX (via SheetJS), screenshot/image (via Claude Vision), text paste
- [ ] Admin subject management page — View all subjects, merge custom → canonical, rename, hide

### Self-Learning + Improvements (v2 — In Progress)

#### Database Changes
- [x] Migration `20260314000000_add_moe_subjects.sql` — Add ~22 commonly-tutored MOE subjects (F&N, D&T, Computing, Higher Malay/Tamil, Literature variants, etc.)
- [x] Migration `20260314000001_parse_corrections.sql` — New `parse_corrections` table for self-learning corrections

#### AI Parser Rewrite
- [x] `app/src/lib/ai-parser.ts` — Major rewrite: full SEAB subject reference, learned corrections injection, date generation from day names (Singapore timezone), edge case rules, enhanced aliases, max_tokens 8192
- [x] `app/src/lib/parse-corrections.ts` — New helper: `fetchCorrections()` (centre-specific + global, deduplicated) + `saveCorrections()` (batch insert)

#### Server Actions Wiring
- [x] `app/src/app/admin/centres/new/actions.ts` — `parseSchedule()` / `parseScheduleImage()` now fetch corrections and pass to AI. Added `saveParseCorrections()`.
- [x] `app/src/app/centre-dashboard/slots/actions.ts` — Same (centreId from auth)

#### SlotUploader Updates
- [x] Both SlotUploaders — "Weeks ahead" input (default 4, for day-name schedules), multi-sheet Excel concatenation, pass weeksAhead to parse calls
- [x] Admin `SlotUploader.tsx` — centreId prop, saveCorrectionsFn passed to clarification table
- [x] Generic `SlotUploader.tsx` — Same + updated function prop signatures

#### SlotClarificationTable Correction Capture
- [x] Both SlotClarificationTables — On confirm, compare AI vs user overrides. Changed subject/level/date/time fields saved to `parse_corrections` (fire-and-forget)

#### Parent Component Wiring
- [x] `AddCentreForm.tsx` — Pass centreId, bind centreId in parse wrappers, pass saveCorrectionsFn
- [ ] `AddSlotSection.tsx` — Pass centreId + saveCorrectionsFn
- [ ] `centre-dashboard/slots/page.tsx` — Pass centreId to AddSlotSection

#### Verification
- [ ] `cd app && npx tsc --noEmit` passes
- [ ] Run both migrations against Supabase
- [ ] Test: upload schedule with day names + weeks=2 → dates generated
- [ ] Test: upload multi-sheet Excel → all sheets parsed
- [ ] Test: make corrections → confirm → check `parse_corrections` has rows
- [ ] Test: re-upload same format → AI uses learned corrections

### Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260314000000_add_moe_subjects.sql` | MOE subjects |
| `supabase/migrations/20260314000001_parse_corrections.sql` | Corrections table |
| `app/src/lib/ai-parser.ts` | AI parser (Claude Haiku + Vision) |
| `app/src/lib/parse-corrections.ts` | Fetch/save corrections helper |
| `app/src/app/admin/centres/new/actions.ts` | Admin parse actions |
| `app/src/app/admin/centres/new/SlotUploader.tsx` | Admin slot uploader |
| `app/src/app/admin/centres/new/SlotClarificationTable.tsx` | Admin clarification table |
| `app/src/app/admin/centres/new/AddCentreForm.tsx` | Admin add centre form |
| `app/src/app/centre-dashboard/slots/actions.ts` | Centre parse actions |
| `app/src/app/centre-dashboard/slots/AddSlotSection.tsx` | Centre add slot section |
| `app/src/app/centre-dashboard/slots/page.tsx` | Centre slots page |
| `app/src/components/SlotUploader.tsx` | Shared slot uploader |
| `app/src/components/SlotClarificationTable.tsx` | Shared clarification table |

### FSBB Stream / Subject-Based Banding Support (Done)

Singapore's Full Subject-Based Banding (FSBB) replaced Express/NA/NT streaming from 2024. Students take individual subjects at G1 (Foundational), G2 (Normal Academic), or G3 (Express) levels. Many centres now label classes as "Sec 2 G3 Math" or "G1 English".

#### What was done:
- [x] **Database**: New migration `20260306000001_add_stream_to_trial_slots.sql` — adds nullable `stream` text column to `trial_slots`
- [x] **Types**: Added `stream: string | null` to `TrialSlot` type + `StreamCode` type + `getStreamDisplay()` helper (returns label + color for badge rendering)
- [x] **AI Parser**: Updated prompt to extract stream separately from level. Normalizes legacy terms (Express→G3, NA→G2, NT→G1). Stream returned as separate JSON field with confidence.
- [x] **SlotUploader** (both admin + shared): `ParsedSlot` interface includes `stream`, fallback returns `stream: null`
- [x] **SlotClarificationTable** (both admin + shared): Stream column with dropdown (G3/G2/G1/IP/IB/none), editable per-row
- [x] **Slot creation actions** (both admin + centre-dashboard): `stream` field passed through to Supabase insert
- [x] **AddSlotSection**: Stream dropdown in single-slot form (only visible when secondary level selected)
- [x] **AddCentreForm**: Stream passed through bulk import pipeline
- [x] **Centre dashboard slots page**: Stream column in both live and draft slot tables, colored badge pills
- [x] **Public slot cards** (CentreSlots.tsx): Stream badge shown inline with subject/level on slot cards and sticky CTA
- [x] **Booking page**: Stream badge shown in trial summary card next to level
- [x] **Admin review page**: Stream column in pending trial slots table

#### Design decisions:
- **Separate column** (not compound level like SEC1-G3) — keeps the level filter clean for parents
- **Nullable text** (not enum) — allows IP, IB, and future custom streams without migrations
- **Colored badges**: G3 = blue, G2 = emerald, G1 = amber — visually distinct, parent-friendly
- **Only shown for secondary levels** — primary and JC don't have G-level banding

#### Files
| File | Change |
|------|--------|
| `supabase/migrations/20260306000001_add_stream_to_trial_slots.sql` | New migration |
| `app/src/types/database.ts` | `stream` field + `getStreamDisplay()` |
| `app/src/types/ai-parser.ts` | `stream` in `AIParsedSlot` |
| `app/src/lib/ai-parser.ts` | Stream extraction + FSBB normalization in prompt |
| `app/src/components/SlotUploader.tsx` | `stream` in `ParsedSlot` |
| `app/src/components/SlotClarificationTable.tsx` | Stream column + dropdown |
| `app/src/app/admin/centres/new/SlotUploader.tsx` | `stream` in `ParsedSlot` |
| `app/src/app/admin/centres/new/SlotClarificationTable.tsx` | Stream column + dropdown |
| `app/src/app/admin/centres/new/actions.ts` | `stream` in insert |
| `app/src/app/admin/centres/new/AddCentreForm.tsx` | Pass `stream` through |
| `app/src/app/centre-dashboard/slots/actions.ts` | `stream` in insert |
| `app/src/app/centre-dashboard/slots/AddSlotSection.tsx` | Stream dropdown in form |
| `app/src/app/centre-dashboard/slots/page.tsx` | Stream column + badges |
| `app/src/app/(public)/centres/[slug]/CentreSlots.tsx` | Stream badges on cards |
| `app/src/app/(public)/book/[slotId]/page.tsx` | Stream badge in summary |
| `app/src/app/admin/centres/review/[id]/page.tsx` | Stream column in review |

---

## 7. Parent ↔ Centre Booking Flow (Redesigned)

### Core Philosophy
- **Parent books → instantly confirmed.** No waiting. No pending state.
- **Parent self-serves:** cancel, reschedule from their profile
- **Centre acts on their dashboard:** cancel (if needed), mark attendance (sole source of truth)
- **Admin observes EVERYTHING** — every movement logged, every status change tracked — but doesn't drive any of it
- **Payment:** Parents pay the centre directly (deposit or fee) — platform doesn't handle money
- **Reviews:** Optional (star rating + text), public after admin approval on centre profile
- **Commission:** Admin-only. Not visible to centres. Free during onboarding. Admin initiates when ready.
- **Cash reward:** OFF for now. Toggle to enable later. Not part of current build.
- **Emails:** All emails must include booking reference code (PSE-YYMMDD-XXXX). Templates designed separately (not auto-generated).

### The Complete Flow

```
Parent selects trial slot
         │
         ↓
    ┌─────────────────────────────────────────────┐
    │  BOOKING FORM                               │
    │  Parent fills: child name, level, phone     │
    │                                             │
    │  ┌─ FREE trial ─────────────────────────┐   │
    │  │  No payment needed                   │   │
    │  └──────────────────────────────────────┘   │
    │                                             │
    │  ┌─ PAID trial (future) ────────────────┐   │
    │  │  Centre's PayNow QR displayed        │   │
    │  │  Parent scans & pays centre directly │   │
    │  │  Parent uploads payment screenshot   │   │
    │  └──────────────────────────────────────┘   │
    │                                             │
    │  [Book Trial]                               │
    └─────────────────────────────────────────────┘
         │
         ↓
    ┌─────────┐
    │CONFIRMED│ ← immediate, no pending (regardless of paid/free)
    └────┬────┘
         │
         │  Emails sent (all include booking ref PSE-YYMMDD-XXXX):
         │  To parent: booking confirmation + details
         │  To centre: new booking notification + child/parent details
         │             (paid trials: includes payment screenshot link)
         │
         │  ┌─ PAID trial only (future) ──────────────────────┐
         │  │  Centre checks dashboard for payment screenshot │
         │  │  Centre checks their own bank account           │
         │  │  If issue → admin handles manually (edge case)  │
         │  │  Platform does NOT hold or verify payment       │
         │  └─────────────────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────────────┐
    │  PRE-TRIAL ACTIONS                        │
    │  (parent or centre can act)               │
    │                                           │
    ├── Parent cancels ──────► CANCELLED        │
    │   (cancelled_by: 'parent')                │
    │   spot restored, centre emailed           │
    │                                           │
    ├── Centre cancels ──────► CANCELLED        │
    │   (cancelled_by: 'centre')                │
    │   spot restored, parent emailed           │
    │                                           │
    ├── Parent reschedules ──► OLD CANCELLED    │
    │   (cancelled_by: 'reschedule')            │
    │   + NEW CONFIRMED                         │
    │                                           │
    └── Trial day arrives ──────────────────────┘
         │
    ┌────┴────────────────────────────┐
    │  TRIAL DAY                      │
    │  (centre marks on dashboard)    │
    │                                 │
    ├── Centre marks attended ► COMPLETED
    │   (trial_outcomes auto-created) │
    │   parent emailed with prompt    │
    │                                 │
    └── Centre marks no-show ─► NO_SHOW
        booking auto-flagged          │
        admin emailed alert           │
        (dead end — nothing follows)  │
    └─────────────────────────────────┘
         │
         │ (only COMPLETED continues)
         ↓
    ┌────────────────────────────────────────┐
    │  POST-TRIAL (parent on /my-bookings)  │
    │                                        │
    │  [optional star rating]                │
    │  [optional review text]                │
    │  [We enrolled!] / [We didn't enrol]    │
    │                                        │
    ├── Enrolled ──────────► CONVERTED       │
    │   (outcome recorded, admin notified)   │
    │   NO auto commission or reward         │
    │                                        │
    └── Didn't enrol ──────► stays COMPLETED │
        (outcome recorded)                   │
    └────────────────────────────────────────┘
         │
         ↓
    ┌────────────────────────────────────────┐
    │  ADMIN (manual, when ready)            │
    │                                        │
    │  Commission auto-tracked:               │
    │  Rate > 0 on centre = auto-created     │
    │  Rate = 0 = free (onboarding period)   │
    │                                        │
    │  Cash reward: OFF (toggle for future)  │
    └────────────────────────────────────────┘
```

### Key Changes From Previous Version

| Area | Before | Now |
|------|--------|-----|
| **No-show** | Just logged | Auto-flags booking (`is_flagged=true`) + admin email alert |
| **Commission** | Auto-created on conversion | Auto-created based on centre rates. Rate=0 means free (onboarding). Admin-only visibility |
| **Cash reward** | Auto-created on conversion | OFF entirely. Toggle for future. Not built now |
| **Emails** | Auto-generated templates | Templates are a TODO — design separately. All must include booking ref |
| **Parent enrolled** | Creates commission + reward | Just records outcome + notifies admin. No financial records auto-created |

---

### Checkpoint 1: Schema + Booking Foundation
- [x] Schema migration — Add `cancelled_by`, `cancelled_at`, `cancel_reason`, `rescheduled_from` to bookings. Create `reviews` table.
- [x] Auto-confirm booking — Change `submitBooking()` to set status='confirmed' + acknowledged_at=now() instead of 'pending'.
- [x] Fix spots restoration bug — Call `increment_spots()` when any booking is cancelled (in admin `updateBookingStatus()`).
- [x] Duplicate booking prevention — Check for existing active booking on same slot before allowing (matches by child name, case-insensitive).

### Checkpoint 2: Parent Self-Service (`/my-bookings`)
- [x] Parent cancel — "Cancel Trial" button on booking cards (status=confirmed, before trial start_time). Updates status to cancelled, sets cancelled_by='parent', restores spot.
- [x] Parent reschedule — "Reschedule" button. Shows available slots at same centre. Cancels old booking (cancelled_by='reschedule'), creates new booking, links via rescheduled_from.
- [x] Reschedule filtering — Only show slots matching the **same subject AND same level** as the original booking. Prevents P3 Science child from accidentally rescheduling into P5 Math.
- [x] Rescheduled badge — Old rescheduled bookings show "Rescheduled" (blue) instead of "Cancelled" (red). Uses `cancelled_by === 'reschedule'` to distinguish.
- [x] UI updates — Cancel/Reschedule buttons conditionally shown based on status + timing.
- [x] Removed stale `pending` status from 6 booking flow locations.

### Checkpoint 3: Centre Dashboard Actions
- [x] Centre cancel booking — "Cancel Booking" button on confirmed bookings (before trial). Requires reason text. Sets cancelled_by='centre', cancel_reason, restores spot.
- [x] Centre mark attended — "Mark Attended" button on/after trial date. Status → completed, auto-creates trial_outcomes row.
- [x] Centre mark no-show — "Mark No-Show" button on/after trial date. Status → no_show, auto-flags booking (is_flagged=true, flag_reason='No-show marked by centre').
- [x] Centre mark enrolled — "Mark Enrolled" button on completed bookings. Status → converted, records centre_reported_status + centre_reported_at on trial_outcomes.
- [x] Inline status actions on bookings list — Hover over status badge to reveal quick actions (Attended/No-Show for confirmed on trial day, Mark Enrolled for completed). Reduces clicks. Tap-to-toggle on mobile.
- [x] Migration — Added `centre_reported_status` and `centre_reported_at` columns to trial_outcomes table.

### Checkpoint 4: Parent Dispute + Review (Revised)
Centre is the primary reporter of enrollment (like Shopee delivery model). Parent can dispute.
- [x] Parent sees "Enrolled" badge on `/my-bookings` for converted bookings where centre reported enrollment.
  - "I didn't enrol" dispute button (within 14 days of centre_reported_at) → flags booking for admin review, sets status to completed + is_flagged=true.
  - Parent sees "Under Review" (amber) badge after disputing.
  - If parent doesn't dispute within 14 days, enrollment stands.
- [x] Parent sees "Trial Completed" badge on `/my-bookings` for completed bookings (attended, not enrolled).
- [x] Optional review form on `/my-bookings` for completed/converted bookings (14-day window after trial date).
  - Star rating (1-5) + optional review text → saved to reviews table (pending_approval).
- [x] Completed/converted bookings show in "Past bookings" section with full styling (green border, address). Cancelled/no-show stay faded.

### Checkpoint 5: Commission System
- [x] Schema migration — Added `commission_type` column to commissions table (`trial` | `conversion`). UNIQUE constraint on `(trial_outcome_id, commission_type)`.
- [x] Schema migration — Added `trial_commission_rate` and `conversion_commission_rate` to centres table.
- [x] Commission rates in Add Centre form — Trial and conversion commission rates set per centre during onboarding.
- [x] Auto-commission on mark attended — When centre marks booking as attended (completed), trial commission auto-created if `trial_commission_rate > 0`.
- [x] Auto-commission on mark enrolled — When centre marks booking as enrolled (converted), conversion commission auto-created if `conversion_commission_rate > 0`.
- [x] Read-only commission display — Admin booking detail page shows commission records (no manual buttons).
- [x] Commission not visible on centre dashboard — Confirmed admin-only.
- [x] Feature toggles preserved — `AUTO_CREATE_COMMISSION` and `AUTO_CREATE_REWARD` flags in outcomes/actions.ts for future use.

### Checkpoint 6: Reviews System
- [x] Review submission — Save to reviews table with status='pending_approval' when parent reports outcome (built in CP4).
- [x] Admin review moderation page — `/admin/reviews/` with summary counts (Pending/Approved/Rejected), table with booking ref, parent, centre, stars, review text, status, and Approve/Reject buttons.
- [x] Public reviews on centre profile — Approved reviews shown on `/centres/[slug]` with average star rating, individual review cards (parent first name, stars, text, date). Only displays when approved reviews exist.

### Checkpoint 7: All 9 Emails
All emails include booking reference code (PSE-YYMMDD-XXXX), warm early-adopter tone, step-by-step instructions, and CTAs linking to `NEXT_PUBLIC_SITE_URL`.
- [x] E1: Booking confirmed → centre — New booking notification with parent/child details, phone, and 3 steps (save date, contact info, mark attendance after trial).
- [x] E2: Booking confirmed → parent (updated copy) — "You're all set!" with confirmed subtitle, 3 steps (show up, reschedule/cancel, share feedback), early adopter footer.
- [x] E3: Parent cancels → centre — Heads-up email with cancelled booking details, note that slot is auto-freed.
- [x] E4: Parent reschedules → centre — Reschedule notification with old/new date+time, old/new ref, 2 steps (update records, old slot freed).
- [x] E5: Centre cancels → parent — Cancellation with reason, encouragement to browse other centres.
- [x] E6: Centre marks attended → parent — "Hope the trial went well!" with 3 steps (find booking, leave rating, report enrollment).
- [x] E7: No-show → admin — Alert with booking details, auto-flagged for review.
- [x] E8: Centre marks enrolled → admin — Conversion notification with booking details.
- [x] E9: Parent disputes enrollment → admin — Dispute alert with booking details, flagged for review.
- [x] Shared HTML builders — `emailShell()`, `headerBlock()`, `refBlock()`, `detailsBlock()`, `stepsBlock()`, `bodyText()`, `ctaBlock()`, `footerLinks()`, `earlyAdopterFooter()`.
- [x] Shared data helpers — `fetchBookingEmailData()` (full booking+centre+slot query), `fetchAdminEmails()` (from admin_users table).
- [x] All emails fire-and-forget (`.catch(() => {})`), graceful skip if `RESEND_API_KEY` not set.
- [ ] **Email API setup (pending)** — Developer to verify podsee.sg domain in Resend + add RESEND_API_KEY to Vercel env vars. Code is ready, emails will auto-activate.

### Checkpoint 8: Centre Onboarding — Trial Type + PayNow QR
- [x] Migration — Added `trial_type` (free/paid, default free) and `paynow_qr_image_url` columns to centres table.
- [x] Trial type radio on Add Centre form (Step 1) — Free (default) / Paid toggle.
- [x] PayNow QR screenshot upload — Conditionally shown when "Paid" selected. Uploads to `centre-images` bucket under `paynow-qr/` path. Preview + remove.
- [x] Server action updated — `createCentre()` accepts `trial_type` and `paynow_qr_image_url`.
- [x] TypeScript type updated — `Centre` interface includes `trial_type` and `paynow_qr_image_url`.

### Checkpoint 9: Centre Onboarding Overhaul — Progressive Creation + Draft System

**Goal**: Create the centre record at step 1 (name + email) so the centre gets a dashboard immediately. Save progressively per step. Let centres edit their own profile with admin approval before changes go live.

**Key Design Decisions**:
- `draft_data` JSONB column on centres — keys match column names, approval = spread into actual columns
- Before going live (`is_active=false`): edits save directly, no draft friction
- After going live (`is_active=true`): edits save to `draft_data` for admin review
- `has_pending_changes` boolean flag for easy admin filtering
- Trial slots proposed by centres use `is_draft=true`, not visible publicly until approved
- Centre-editable fields: profile, location, policies, images, trial slots
- Admin-only fields: name, slug, commission rates, trial_type, is_active, is_paused

#### CP9-A: Schema Changes
- [x] Migration `20260313000000_centre_onboarding_overhaul.sql` — Added `draft_data JSONB`, `has_pending_changes BOOLEAN`, `is_draft BOOLEAN` on trial_slots, changed `is_active` default to false
- [x] TypeScript types updated — `Centre` has `draft_data`, `has_pending_changes`; `TrialSlot` has `is_draft`
- [x] Public queries filtered — `getCentres()` and `getCentreBySlug()` exclude `is_draft=true` slots

#### CP9-B: Progressive Admin Form
- [x] New `createMinimalCentre(name, email, commissionRates, trialType, paynowQr)` server action — INSERTs centre (`is_active=false`) + centre_users (owner) + sends invite email → returns centreId
- [x] New `updateCentreStep(centreId, stepData)` server action — UPDATEs centre with fields from steps 2-4
- [x] New `addSlotsForCentre(centreId, slots[])` server action — INSERTs trial_slots + derives centre_subjects/levels
- [x] Restructure `AddCentreForm.tsx` — Step 1 "Next" calls `createMinimalCentre()`, stores centreId. Steps 2-4 "Next" saves progressively. Step 5 "Finish" adds slots.
- [x] Admin centres list — "Onboarding" badge for `is_active===false`. Link to continue setup.

#### CP9-C: Centre Dashboard Editing
- [x] New `centre-dashboard/centre-info/actions.ts` — server actions with draft logic (direct save if onboarding, draft_data if live)
- [x] `ProfileForm.tsx` — description, teaching_style, track_record, class_size, years_operating
- [x] `LocationForm.tsx` — address, area, nearest_mrt, parking_info
- [x] `PoliciesForm.tsx` — all 6 policy fields
- [x] `ImagesForm.tsx` — centre photos (up to 3) + PayNow QR
- [x] Move image upload actions to `lib/image-actions.ts` (shared between admin + centre dashboard)
- [x] Admin-only fields (name, slug, commission rates, trial_type) shown as read-only labels
- [x] Centre sees "Changes saved" (onboarding) or "Submitted for review" (live)
- [x] LinkedIn-style view/edit toggle — sections show read-only by default, pencil icon to edit, Save/Cancel buttons

#### CP9-D: Centre Slot Management
- [x] New `centre-dashboard/slots/actions.ts` — `addDraftSlots()`, `addSingleDraftSlot()`, `parseSchedule()`, `createCustomSubject()` — all INSERTs with `is_draft=true`
- [x] New `AddSlotSection.tsx` — two tabs: Bulk Import (AI-powered paste/upload) + Add Single Slot (form with subject/level dropdowns, date, times, fee, capacity)
- [x] Slots page — "Pending Review" section for `is_draft=true` slots (amber styling), existing Upcoming/Past sections filter `is_draft=false`
- [x] Shared components — `SlotUploader` + `SlotClarificationTable` moved to `@/components/` with injectable action props, admin form updated to use shared components
- [x] Migration `20260313100000_add_other_policies.sql` — added missing `other_policies` column to centres table

#### CP9-E: Admin Review & Publish
- [x] New `/admin/centres/review/` — list page with summary cards (Profile Changes, Draft Slots, Ready to Publish) + table of centres needing review
- [x] New `/admin/centres/review/[id]/` — detail page with centre status, draft data diff table (Field/Current/Proposed), draft slots table, Approve/Reject buttons, Publish button
- [x] `approveDraftData(centreId)` — spreads draft_data into actual columns, clears draft_data + has_pending_changes
- [x] `rejectDraftData(centreId)` — clears draft_data + has_pending_changes
- [x] `approveDraftSlots(centreId)` — sets `is_draft=false`, re-derives centre_subjects/levels/pairings from all live slots
- [x] `rejectDraftSlots(centreId)` — deletes draft slots
- [x] `publishCentre(centreId)` — sets `is_active=true`
- [x] Admin nav — "Review" link with amber pending count badge, layout queries review count

#### CP9-F: Admin Edit Page + Trusted Centre Auto-Update
- [x] Migration `20260314100000_add_is_trusted.sql` — added `is_trusted` boolean to centres table
- [x] New `/admin/centres/[id]/` — admin edit page with admin controls, profile, location, policies sections. All edits save directly (no draft for admin)
- [x] Admin controls section — name, slug, email, trial type, commission rates (S$), status toggles: is_active, is_paused, is_trusted
- [x] Pending draft changes section — diff table (Field/Current/Proposed) with inline Approve/Reject buttons
- [x] Admin centres list — clickable centre names linking to edit page
- [x] Trusted centre auto-update — `saveCentreFields()` checks `is_trusted`: when true, centre edits go live immediately (no draft)
- [x] Trusted slot bypass — `addDraftSlots()` checks `is_trusted`: when true, slots insert as `is_draft=false` + re-derive subjects/levels

#### Files to Create/Modify
**CP9-A:** `supabase/migrations/20260313000000_centre_onboarding_overhaul.sql`, `app/src/types/database.ts`, `app/src/lib/public-data.ts`
**CP9-B:** `app/src/app/admin/centres/new/actions.ts`, `app/src/app/admin/centres/new/AddCentreForm.tsx`, `app/src/app/admin/centres/page.tsx`
**CP9-C:** `app/src/app/centre-dashboard/centre-info/` (actions.ts, ProfileForm.tsx, LocationForm.tsx, PoliciesForm.tsx, ImagesForm.tsx, page.tsx), `app/src/lib/image-actions.ts`
**CP9-D:** `app/src/app/centre-dashboard/slots/` (actions.ts, AddSlotForm.tsx, page.tsx)
**CP9-E:** `app/src/app/admin/centres/review/` (page.tsx, [id]/page.tsx, [id]/actions.ts), `app/src/app/admin/AdminNav.tsx`
**CP9-F:** `app/src/app/admin/centres/[id]/` (page.tsx, actions.ts), `app/src/app/admin/centres/page.tsx`

### Future Items (Not Current Build)

**Payment in booking form (build when ready):**
- [x] Booking form: show PayNow QR + screenshot upload when trial_type='paid'
- [x] Add `payment_screenshot_url` to bookings table
- [x] Supabase Storage for payment screenshots (`centre-images` bucket, `payment-screenshots/` prefix)
- [x] Centre email variant for paid trials (include screenshot link)
- [x] Admin booking detail: view payment screenshot

**Cash Reward (toggle for future):**
- [ ] Add reward toggle (admin setting or feature flag)
- [ ] When enabled: auto-create reward record on conversion
- [ ] Parent reward notification email
- [ ] Parent reward tracking on /my-bookings

**Post-trial UX enhancements:**
- [ ] "Browse other centres" CTA — After a parent submits a review on a "Trial Completed" (non-enrolled) booking, show a "Browse other centres" link/button to encourage re-engagement with the platform
- [ ] Review confirmation UI — After submitting a review, show a thank-you card with the submitted rating and a prompt to try other centres

**Centre-facing commission/billing page (when ready to charge):**
- [ ] Add `/centre-dashboard/billing` page — shows commission records (trial + conversion), amounts, status (pending/invoiced/paid)
- [ ] Only visible when centre has commission records (or when a global toggle is enabled)
- [ ] Centre can view but NOT modify commission records — admin controls amounts and status

**Database cleanup:**
- [ ] Consolidate migration files — Squash all migrations into a single clean baseline file using `supabase db reset` + fresh migration

**Nice-to-have emails (add later):**
- [x] All moved to CP7 and built — parent cancels → centre, parent reschedules → centre, no-show → admin, conversion → admin, dispute → admin

### Files to Create/Modify (by checkpoint)

**CP1:** `supabase/migrations/`, `app/src/app/(public)/book/[slotId]/actions.ts`, `app/src/app/admin/bookings/[id]/actions.ts`
**CP2:** `app/src/app/(public)/my-bookings/page.tsx`, `app/src/app/(public)/my-bookings/actions.ts` (NEW)
**CP3:** `app/src/app/centre-dashboard/bookings/[id]/page.tsx`, `app/src/app/centre-dashboard/bookings/[id]/actions.ts` (NEW)
**CP4:** `app/src/app/(public)/my-bookings/page.tsx`, `app/src/app/(public)/my-bookings/actions.ts`
**CP5:** `app/src/app/admin/bookings/[id]/page.tsx`, `app/src/app/admin/outcomes/actions.ts`
**CP6:** `app/src/app/admin/reviews/` (NEW), `app/src/app/(public)/centres/[slug]/page.tsx`
**CP7:** `app/src/lib/email.ts`, action files for booking/attended/centre-cancel (add email sends)
**CP8:** `supabase/migrations/`, `app/src/app/admin/centres/new/` (Add Centre form), Supabase Storage setup

---

## Verification
- [x] Admin auth: Visit `/admin` without logging in → redirected to login. Log in with non-admin Google account → access denied. Log in with whitelisted admin email → access granted
- [x] Centre dashboard: Log in as a centre user → see only that centre's bookings and slots
- [x] Reference numbers: Create multiple bookings → verify unique refs, no collisions
- [x] Capacity: Book a trial → verify `spots_remaining` decrements atomically; try booking when full → verify rejection
- [ ] UI: Test all pages on mobile viewport (375px) and desktop (1440px)
- [ ] Cancellation: Cancel a booking from My Bookings → verify status updates and capacity restores
- [ ] AI parsing: Upload messy CSV → confirmed fields auto-match, uncertain fields flagged for centre to clarify
- [ ] AI parsing: Centre resolves all flagged fields → import succeeds, no data hallucinated
- [ ] AI parsing: Unknown subject → auto-created with `is_custom: true`, visible in admin
- **CP1:** Book a trial → instant confirmed. Cancel from admin → spot restored. Try duplicate → blocked.
- **CP2:** Cancel from /my-bookings → cancelled, spot restored. Reschedule → old cancelled + new confirmed.
- **CP3:** Centre cancels → spot restored. Centre marks attended → trial_outcomes created. Centre marks no-show → booking auto-flagged.
- **CP4:** Parent reports enrolled → converted, no commission/reward auto-created. Reports not enrolled → stays completed.
- **CP5:** Centre marks attended → trial commission auto-created (if rate > 0). Centre marks enrolled → conversion commission auto-created (if rate > 0). Admin sees commission read-only on booking detail.
- **CP6:** Submit review → pending_approval. Admin approves → shows on centre profile.
- **CP7:** All 9 emails built. Booking → parent + centre. Parent cancels/reschedules → centre. Centre cancels → parent. Attended → parent. No-show → admin. Enrolled → admin. Dispute → admin. All emails contain booking ref + CTAs.
- **CP8:** Add Centre form: select Free/Paid trial type. If Paid → QR upload works. QR stored in Supabase Storage.
- **CP9-A:** Migration runs clean. TypeScript compiles. Public listing excludes draft slots.
- **CP9-B:** Admin enters name+email → centre record created after step 1. Each subsequent step saves to DB. Centre user invited immediately.
- **CP9-C:** Centre logs in → edits profile/location/policies/images. If onboarding: saves directly. If live: saves to draft_data.
- **CP9-D:** Centre adds a trial slot → created as draft. Does NOT appear on public listing. Shows as "Pending" on centre dashboard.
- **CP9-E:** Admin sees review queue. Approves draft data → merged into live columns. Approves draft slots → become live. First publish → centre appears on public listing.
- **CP9-F:** Admin clicks centre name → edit page. Can change any field directly. Can approve/reject inline drafts.

---

## 8. Structured Pricing (Per Subject + Level)

**Problem**: Trial fees and monthly fees vary by subject and level. A centre might charge S$10 trial for P3 Math but S$20 for Sec 2 Science. Currently trial_fee is set per slot during upload, but there's no way to show a pricing overview or auto-fill fees.

**Approach**: After the AI parser identifies subjects + levels from the schedule, prompt the centre to fill in pricing for each unique subject+level pair. Store in a dedicated `centre_pricing` table. Show structured pricing on the public centre profile.

### Flow
1. Centre uploads schedule → AI parser extracts slots with subjects + levels
2. Centre reviews/corrects parsed slots in clarification table
3. **NEW**: After slots confirmed, extract unique subject+level pairs and show a pricing table for the centre to fill in trial fee + monthly fee per pair
4. Trial fees auto-populate into the parsed slots
5. Monthly fees stored for display on public profile

### Schema
```sql
CREATE TABLE centre_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  level_id UUID REFERENCES levels(id),
  stream TEXT,
  trial_fee NUMERIC(8,2) NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(centre_id, subject_id, level_id, stream)
);
```

### Confirmed Decisions
- monthly_fee is **required** (NOT NULL)
- AI parser: do NOT touch — user is working on it separately
- Pricing is editable standalone from the centre dashboard at any time

### Tasks

#### Cleanup (remove wrong free-text approach)
- [x] Remove `pricing_info` from Centre TypeScript interface + mock data
- [x] Remove pricing_info from ProfileForm, AdminEditForms, AddCentreForm, centre-info actions/page, admin centre edit page, public centre profile
- [x] Delete migration file `20260306000002_add_pricing_info.sql`

#### Schema + Types
- [x] Migration: create `centre_pricing` table + `centre_promotions` table
- [x] TypeScript types: add `CentrePricing` + `CentrePromotion` interfaces to database.ts

#### Pricing Step Component
- [x] New `PricingStep.tsx` component — table of subject+level pairs with trial_fee + monthly_fee inputs
- [x] Server action: `saveCentrePricing(centreId, pricings[])` — upsert into centre_pricing
- [x] Auto-fill: when pricing saved, update trial_fee on corresponding draft slots

#### Wire into Onboarding (AddCentreForm)
- [x] After slot clarification confirmed, show PricingStep as Step 5 with unique pairs extracted from parsed slots
- [x] Save pricing on "Confirm & Finish"

#### Wire into Centre Dashboard (AddSlotSection)
- [x] After bulk import confirmed, show PricingStep for subject+level pairs (existing pricing pre-filled)
- [x] Single slot add: trial fee field stays as-is (manual entry)

#### Centre Dashboard Pricing Management
- [x] Centre-info page: "Pricing" section (view/edit table of all centre_pricing rows, LinkedIn-style toggle)
- [x] Server actions for standalone pricing edits (`saveCentrePricing`, `fetchCentrePricing`)

#### Centre Dashboard Promotions Management
- [x] Centre-info page: "Promotions" section (add/pause/delete promotions)
- [x] Server actions for promotions CRUD (`addPromotion`, `deletePromotion`, `togglePromotion`, `getPromotions`)

#### Admin
- [x] Admin centre edit page: pricing section (read-only view of centre_pricing rows)
- [x] Admin centre edit page: promotions section (read-only view of centre_promotions)

#### Public Display
- [ ] Public centre profile: structured pricing table grouped by subject, sorted by level
- [ ] Public centre profile: promotions displayed as highlighted cards/badges
- [ ] Booking page: show monthly fee from centre_pricing alongside trial fee

#### Verification
- [x] `cd app && npx tsc --noEmit` passes
- [ ] Test: upload schedule → confirm slots → pricing step appears with correct pairs
- [ ] Test: fill pricing → slots get trial_fee auto-filled → submit
- [ ] Test: public profile shows pricing table + promotions

### Promotions Schema
```sql
CREATE TABLE centre_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat', 'free')),
  discount_value NUMERIC(8,2),
  applies_to TEXT NOT NULL DEFAULT 'monthly_fee'
    CHECK (applies_to IN ('trial_fee', 'monthly_fee', 'registration', 'materials', 'other')),
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 9. Auto-Scrape Centre Website for Onboarding

**Problem**: Onboarding friction. Centres have to manually type their description, teaching style, policies, address, etc. Most of this info already exists on their website.

**Approach**: Admin pastes centre's website URL during onboarding Step 1. After centre record is created, AI scrapes the site and pre-fills Steps 2-4. Admin reviews and tweaks before saving.

**Key constraint**: AI prompt enforces our field schema. Output maps to exact column names. This guarantees uniform data regardless of source website quality — parents can always compare apples-to-apples.

### Tasks
- [ ] Migration: add `website_url TEXT` to centres table
- [ ] TypeScript type: add `website_url` to Centre interface
- [ ] Add Centre form Step 1: optional "Centre Website" URL input
- [ ] Server action: `scrapeWebsite(url)` — fetch HTML server-side, pass to Claude API with structured extraction prompt
- [ ] Claude prompt: extract JSON matching our fields (`description`, `teaching_style`, `track_record`, `address`, `area`, `nearest_mrt`, `class_size`, `years_operating`, `pricing_info`, policies, etc.)
- [ ] Add Centre form: after Step 1 completes, if URL provided → call scrape → pre-fill Steps 2-4 with returned values
- [ ] Error handling: timeout, invalid URL, scrape fails → show warning, continue with empty form
- [ ] Admin edit page: show website_url as clickable link

---

## 10. Multi-Branch Centres

**Problem**: A centre brand (e.g. "The Learning Lab") might have 4 branches across Singapore. Currently each centre = one location. No way to group branches under one brand. Centre manager can't monitor all branches from one dashboard. Teachers overlap. Shared policies would be duplicated and hard to keep in sync.

**Approach**: Parent-child centre model. Each branch = its own centre record (so slots, bookings, teachers all work without refactoring). A `parent_centre_id` groups branches under one brand. Centre manager links to parent, gets access to all branches via a branch picker.

### Schema
- Migration: add `parent_centre_id UUID REFERENCES centres(id)` + `branch_name TEXT` to centres
- Parent record = brand container: name, description, policies, teachers, commission rates. `is_active=false` (not listed directly)
- Branch records = location entries: `parent_centre_id` set, own address/area/MRT/parking/slots. `is_active=true`. Displayed as "Brand Name — Branch Name"

### Centre Auth
- `centre_users.centre_id` links to the PARENT centre
- `requireCentreUser()` returns `parentCentreId` + array of `branchCentreIds`
- Dashboard queries filter by selected branch

### Tasks
- [ ] Migration: `parent_centre_id`, `branch_name` on centres
- [ ] TypeScript type update
- [ ] Modify `requireCentreUser()` to return parent + branch IDs
- [ ] Centre dashboard: branch picker dropdown in nav
- [ ] Centre dashboard: shared info (profile, policies) editable on parent → propagates to all branches
- [ ] Centre dashboard: location-specific info (address, MRT) editable per branch
- [ ] Centre dashboard: slots/bookings filtered by selected branch
- [ ] Centre dashboard overview: aggregate stats across all branches or per-branch toggle
- [ ] Admin: "Add Branch" flow on parent centre's edit page (creates child centre record, copies shared fields)
- [ ] Admin centres list: show branch grouping (indent under parent or "4 branches" badge)
- [ ] Public listing: each branch as own card showing "Brand Name — Branch Name"
- [ ] Public detail page: "Also at: Clementi, Jurong East, Tampines" banner with links to sibling branches
