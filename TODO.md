# Podsee Platform MVP — To-Do List

## Context
The Podsee Platform MVP has a working public booking flow (browse centres → book trial → confirmation email) and a Podsee-internal admin panel. What's missing is a centre-facing dashboard, robust reference numbers, real-time capacity management, and a polished parent-facing UI.

---

## Priority Order

| Priority | Task | Why |
|----------|------|-----|
| 1 | Fix reference number generation | Quick win, prevents bugs |
| 2 | Atomic capacity decrement | Quick win, prevents overbooking |
| 3 | Centre dashboard (core) | Business-critical — centres need visibility |
| 4 | UI polish (centre detail + booking flow) | Parent experience is key |
| 5 | Booking cancellation + duplicate prevention | Reduces manual work |

---

## 1. Centre Dashboard (Scalable & Reusable)

**Problem**: Centres currently have no way to see their own bookings or track leads from Podsee. Everything goes through the Podsee admin panel.

**What "duplicatable" means**: When a new centre signs up, they should automatically get their own dashboard view filtered to their data — NOT a copy-paste of code. One codebase, dynamic per-centre.

### Tasks
- [ ] Centre auth system — Add centre login (email/password via Supabase Auth) with a role field or separate `centre_users` table linking auth users to a `centre_id`
- [ ] Centre layout & nav — Create `/centre-dashboard` route group with its own layout (sidebar: Overview, Bookings, Trial Slots)
- [ ] Middleware guard — Protect `/centre-dashboard/*` routes; redirect if not a centre user
- [ ] Overview page — Show:
  - Total trial bookings (all time + this month)
  - Leads counter (how many bookings Podsee has sent them)
  - Upcoming trials with capacity (spots filled / max)
  - Conversion rate (if trial outcomes data exists)
- [ ] Bookings list — Table of all bookings for THEIR centre only, showing: booking ref, parent name, child name, child level, subject, trial date/time, status, created date
- [ ] Trial slots view — Their upcoming slots with real-time capacity (`spots_remaining` / `max_students`)

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
- [ ] Centre dashboard counters — On the centre dashboard overview, show:
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
- [ ] Centre image upload in Add Centre form — Add an image upload field to the Add Centre admin form so centre photos can be added during centre creation (stored via Supabase Storage), instead of requiring manual file placement through code
- [ ] Centre listing cards — Display the uploaded centre image above the centre name (like ClassPass and Agoda/Trip.com hotel cards). Redesign with key stats (rating-style layout like Agoda), price prominently shown, "X spots left" urgency indicator
- [ ] Centre detail page — Agoda-style tabbed/sectioned layout:
  - Hero section with key details
  - Quick facts bar (class size, years, subjects)
  - "Available trials" section with calendar-style date picker
  - Teacher profiles with credentials
  - Policies in expandable accordion (not walls of text)
  - Location map section
  - FAQ section (reduces WhatsApp queries)
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

## 6. Dynamic Subject Pipeline (Auto-Create from CSV Upload)

**Problem**: Currently, subjects/levels are seeded via SQL migrations. When a centre uploads a schedule with a new subject we don't have (e.g. "Robotics", "Creative Writing"), it shows as an error and can't be imported without a manual SQL change.

### Solution: Auto-create subjects from AI-parsed upload
- [ ] When the AI parser encounters a subject it can't match to any existing DB record:
  1. Create a new row in the `subjects` table with the raw name
  2. Use it as the `subject_id` for the trial slot
  3. Flag it as `is_custom: true` (new column) so admins can review/merge later
- [ ] Admin subject management page — View all subjects, merge custom → canonical, rename, hide
- [ ] No more SQL migrations for new subjects — everything flows from CSV uploads

### Files to create/modify
- `supabase/migrations/` — Add `is_custom` boolean column to `subjects` table
- `app/src/app/admin/centres/new/SlotUploader.tsx` — Auto-create logic (or server action)
- `app/src/app/admin/subjects/` — New admin page for subject management (optional, nice-to-have)

---

## Verification
- [ ] Centre dashboard: Log in as a centre user → see only that centre's bookings and slots
- [x] Reference numbers: Create multiple bookings → verify unique refs, no collisions
- [x] Capacity: Book a trial → verify `spots_remaining` decrements atomically; try booking when full → verify rejection
- [ ] UI: Test all pages on mobile viewport (375px) and desktop (1440px)
- [ ] Cancellation: Cancel a booking from My Bookings → verify status updates and capacity restores
- [ ] Dynamic subjects: Upload CSV with unknown subject → auto-created in DB, flagged as custom
