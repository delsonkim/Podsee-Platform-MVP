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
- [ ] Booking success page — Update copy to match instant-confirm flow:
  - Change "We'll confirm your slot within 1 business day via email" → "Your trial is confirmed!"
  - Step 1: Remove "Podsee contacts the centre to confirm your spot" (instant confirmed now)
  - Step 3: Remove "earn a cash reward" (OFF). Replace with "After the trial, let us know how it went."
- [ ] Slot cards — "Already booked" + "Full" states:
  - If parent has an active booking on this slot → show "Already booked" badge but keep slot clickable
  - On click, show prompt: "Have another child who wants to trial for the same slot?"
  - If `spots_remaining <= 0` → show "Full" badge, disable booking button
  - Both states should be visually distinct (Already booked = blue/info, Full = grey/disabled)
- [ ] Duplicate booking logic (server-side) — Relax current check: allow same parent + same slot if `child_name_at_booking` is different (case-insensitive). Block only same parent + same slot + same child name. Show friendly inline error instead of runtime error.
- [ ] Booking form error handling — Catch server action errors and display as inline form messages (not raw runtime errors)
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
