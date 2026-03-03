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
| 7 | Booking cancellation + duplicate prevention | Manual workarounds exist for now | Next |

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
- [ ] Booking flow — ClassPass-style streamlined checkout:
  - Fewer fields, cleaner layout
  - Clear price breakdown
  - Instant confirmation feel
- [ ] My Bookings — Card-based layout with clear status, next steps, and centre contact info (but designed so they DON'T need to contact)
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
- [ ] Booking cancellation flow — Parents should be able to cancel from My Bookings (currently no cancel button). Avoids WhatsApp messages to centres
- [ ] Centre confirmation mechanism — Add a one-click confirmation link in an email sent to centres when a booking comes in. Updates status from `pending` → `confirmed`
- [ ] Duplicate booking prevention — Check if a parent already has an active booking for the same slot before allowing another
- [ ] Mobile responsiveness audit — Ensure all pages work well on mobile (parents will primarily use phones)
- [ ] Error handling & loading states — Add proper loading skeletons, error boundaries, and user-friendly error messages across all pages

### Medium Priority (soon after launch)
- [ ] Centre email notifications — Auto-email the centre when a new booking comes in (currently only the parent gets an email)
- [ ] SMS/WhatsApp reminders — Automated trial reminders 24h before the class (reduces no-shows)
- [ ] Search & filter improvements — Add search by centre name, location-based sorting, subject category filters on the browse page
- [ ] SEO & meta tags — Proper meta descriptions, Open Graph tags for sharing
- [ ] Parent reviews/testimonials — Post-trial feedback that shows on centre profiles (builds trust)

---

## 6. AI Parsing Layer for Schedule Data (Client-Facing)

**Problem**: The current CSV parser is rule-based and brittle. It fails on unknown subjects, can't handle messy formats, and requires exact column order. The Add Centre form already handles centre metadata (name, address, teachers, policies) — the schedule/slot data needs an intelligent parsing layer that **never guesses silently**.

**Critical Rule**: This is client-facing. The AI parser **must not hallucinate**. Any field without a clear answer gets flagged and shown to the centre user to clarify before import.

---

### Pipeline: How It Works (End-to-End)

```
STEP 1: CENTRE UPLOADS
Centre pastes or uploads their schedule (any format — CSV, copy from Excel, etc.)
         │
         ▼
STEP 2: AI PARSING (server-side, Claude API)
The raw text is sent to the Claude API along with:
  - The AI template/prompt (see below)
  - The list of existing subjects & levels from the DB (so it can match)
         │
         ▼
STEP 3: AI RETURNS STRUCTURED DATA + CONFIDENCE
Each row comes back as a ParsedSlot with every field marked:
  ✅ confirmed  — exact match to DB record (auto-accepted)
  🟡 inferred   — AI's best guess, not exact (shown for centre to confirm)
  🔴 needs_review — AI cannot determine (centre MUST answer before import)
         │
         ▼
STEP 4: CLARIFICATION UI (shown to the centre)
A review screen displays the parsed schedule:
  - ✅ Green rows: fully matched, ready to import
  - 🟡 Amber fields: "Did you mean [X]?" with dropdown to confirm or correct
  - 🔴 Red fields: "We couldn't determine [field]. Please select/enter:"
    with input fields or dropdowns for the centre to fill in
         │
         ▼
STEP 5: CENTRE CONFIRMS
Centre reviews, answers all flagged questions, then clicks "Confirm Import"
  - Only rows where ALL fields are ✅ or centre-approved get imported
  - Unknown subjects → auto-created with is_custom: true
  - Unknown levels → saved as custom_level text
         │
         ▼
STEP 6: DATA SAVED
Slots inserted into DB. Admin can later review/merge custom subjects.
```

---

### AI Template (Prompt sent to Claude API)

```
You are a schedule parser for a tuition centre booking platform in Singapore.

INPUT: Raw schedule data (CSV, pasted text, or messy format) from a tuition centre.

EXISTING DATA IN OUR SYSTEM:
- Subjects: [list of {id, name} from DB]
- Levels: [list of {id, label, code} from DB]

YOUR JOB: Parse each row into this structure:
{
  subject:      { value: string, match_id: string|null, confidence: "confirmed"|"inferred"|"needs_review" }
  level:        { value: string, match_id: string|null, confidence: "confirmed"|"inferred"|"needs_review" }
  date:         { value: "YYYY-MM-DD", confidence: "confirmed"|"needs_review" }
  start_time:   { value: "HH:mm", confidence: "confirmed"|"needs_review" }
  end_time:     { value: "HH:mm", confidence: "confirmed"|"needs_review" }
  trial_fee:    { value: number, confidence: "confirmed"|"inferred"|"needs_review" }
  max_students: { value: number, confidence: "confirmed"|"inferred"|"needs_review" }
  notes:        { value: string }
}

CONFIDENCE RULES (STRICT — do not guess):
- "confirmed": Exact match to an existing subject/level in our system, or unambiguous data
- "inferred": Close match (e.g. "Maths" → "Mathematics", "P4" → "Primary 4") — flag for user to confirm
- "needs_review": Cannot determine (missing column, ambiguous text, no match at all) — user must provide answer

NEVER fill in a value you're not sure about. If a field is missing or ambiguous, set confidence to "needs_review" and leave value as the raw text or empty.
```

---

### Tasks
- [ ] Build AI parser server action — Send raw CSV + existing subjects/levels to Claude API, return structured ParsedSlot[] with per-field confidence
- [ ] Build clarification UI — Review screen with colour-coded confidence (green/amber/red), inline dropdowns and inputs for centre to resolve flagged fields
- [ ] Auto-create pipeline — Unknown subjects get created with `is_custom: true`, unknown levels saved as `custom_level`
- [ ] Fallback — If Claude API call fails, fall back to the existing rule-based parser with a warning message
- [ ] Admin subject management page — View all subjects, merge custom → canonical, rename, hide

### Files to create/modify
- `supabase/migrations/` — Add `is_custom` boolean column to `subjects` table
- `app/src/lib/ai-parser.ts` — New: Claude API integration with the template above
- `app/src/app/admin/centres/new/SlotUploader.tsx` — Replace rule-based parser, add clarification UI
- `app/src/app/admin/subjects/` — New admin page for subject management

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
