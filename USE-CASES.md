# Podsee Platform MVP — Complete Use Case & Flow Documentation

## Context
This document is a comprehensive compilation of EVERY use case, edge case, business rule, status transition, and user flow in the Podsee Platform — from start to end. It covers all three user roles (Parent, Centre, Admin), all 18+ database entities, all 9 email triggers, and every decision made throughout development.

---

## TABLE OF CONTENTS
1. [Platform Overview](#1-platform-overview)
2. [User Roles & Authentication](#2-user-roles--authentication)
3. [Centre Discovery & Browsing](#3-centre-discovery--browsing)
4. [Trial Booking Flow (Parent)](#4-trial-booking-flow-parent)
5. [My Bookings — Parent Self-Service](#5-my-bookings--parent-self-service)
6. [Centre Dashboard — Overview & Stats](#6-centre-dashboard--overview--stats)
7. [Centre Dashboard — Booking Management](#7-centre-dashboard--booking-management)
8. [Centre Dashboard — Trial Slot Management](#8-centre-dashboard--trial-slot-management)
9. [Centre Dashboard — Centre Info Editing](#9-centre-dashboard--centre-info-editing)
10. [Admin Dashboard — Overview](#10-admin-dashboard--overview)
11. [Admin — Booking Management](#11-admin--booking-management)
12. [Admin — Trial Outcomes & Verification](#12-admin--trial-outcomes--verification)
13. [Admin — Commission System](#13-admin--commission-system)
14. [Admin — Reward/Referral System](#14-admin--rewardreferral-system)
15. [Admin — Review Moderation](#15-admin--review-moderation)
16. [Admin — Centre Management & Onboarding](#16-admin--centre-management--onboarding)
17. [Email System (All 9 Types + Centre Invite)](#17-email-system-all-9-types--centre-invite)
18. [Pricing, Promotions & Policies](#18-pricing-promotions--policies)
19. [AI Features (Parser, Standardizer, Web Search)](#19-ai-features-parser-standardizer-web-search)
20. [Dispute System (Shopee Model)](#20-dispute-system-shopee-model)
21. [Booking Status Lifecycle (Complete)](#21-booking-status-lifecycle-complete)
22. [Commission Lifecycle (Complete)](#22-commission-lifecycle-complete)
23. [Trial Outcome Lifecycle (Complete)](#23-trial-outcome-lifecycle-complete)
24. [All Edge Cases & Validations](#24-all-edge-cases--validations)
25. [Database Schema Summary](#25-database-schema-summary)
26. [Architecture Decisions & User Preferences](#26-architecture-decisions--user-preferences)
27. [Feature Toggles & Future Features](#27-feature-toggles--future-features)
28. [File Location Reference](#28-file-location-reference)

---

## 1. Platform Overview

Podsee is a trial booking and referral platform for tuition/enrichment centres in Singapore.

**Three user types:**
- **Parents** — Discover centres, book trial classes, manage bookings, leave reviews, dispute enrollment, earn referral rewards
- **Centres** — Manage trial slots, handle bookings, mark attendance/enrollment, edit centre profile
- **Admins** — Onboard centres, verify outcomes, track commissions, moderate reviews, resolve disputes

**Core value proposition:** Parents discover centres → book free/paid trial classes → centres track attendance → platform earns commission on conversions.

**Tech Stack:** Next.js 16 + TypeScript + Tailwind CSS 4, Supabase (PostgreSQL + Auth + Storage), Resend (email), Vercel (deploy)

---

## 2. User Roles & Authentication

### 2.1 Parent Account
- **Auth method:** Google OAuth via Supabase Auth
- **Auto-created on first booking** — parent record upserted with email, name, phone, auth_user_id
- **Can manage multiple children** — each child has name + level (P1-P6, SEC1-SEC5, JC1-JC2, etc.)
- **Data stored:** id, auth_user_id, email, name, phone
- **RLS:** Can only see/edit own records

### 2.2 Centre User Account
- **Auth method:** Google OAuth (same Supabase Auth)
- **Roles:** `owner` (full edit access) or `staff` (view + manage bookings)
- **Created by admin** during centre onboarding — email invite sent
- **auth_user_id nullable** — supports invite before sign-up (row exists with email, auth_user_id linked on first Google login)
- **Multiple users per centre** allowed (UNIQUE constraint on auth_user_id + centre_id)

### 2.3 Admin User Account
- **Roles:** `admin` or `superadmin`
- **Seeded:** `delsonkim2003@gmail.com` as superadmin
- **Can:** Manage all centres, bookings, outcomes, commissions, rewards, reviews
- **Admin-only features:** Commission visibility, outcome verification, review moderation

---

## 3. Centre Discovery & Browsing

### 3.1 Centres Listing Page (`/centres`)
**Features:**
- Filter by: area, subject, level
- Centre cards show: image (or gradient placeholder), name, area, subjects offered, years operating, class size, minimum fee, available slot count
- **Urgency signal:** "Limited slots!" badge when 1-3 spots left
- Only `is_active = true` centres visible (RLS enforced)
- `is_paused = true` centres hidden from listing

### 3.2 Centre Detail Page (`/centres/[slug]`)
**Displays:**
- Hero image carousel (or gradient placeholder if no images)
- Rating stars with review count (only `approved` reviews counted)
- **Pricing table** — all subject-level-stream combinations with trial fee + regular fee + billing display
- **Structured policies** — accordion UI with categories (replacement, makeup, commitment, notice period, payment, other)
  - Falls back to legacy policy columns if no structured policies exist
- **Teachers section** — name, role, founder badge, years experience, students taught, LinkedIn link, bio, qualifications
- Track record callout box
- Teaching approach callout box
- **Contact buttons:** Website, Instagram, TikTok, WhatsApp, Phone, Google Maps (only shown if URL/number provided)
- Promotions text banner (if set)
- Address, nearest MRT, parking info
- **Trial slots picker** — sticky sidebar on desktop, bottom sheet on mobile
  - Groups slots by subject → level → date
  - Shows: date, time, fee, spots remaining
  - "Book Trial" button per slot
  - Only shows slots where `is_draft = false` AND `spots_remaining > 0` AND `date >= today`

### 3.3 Edge Cases
- Past slots: `notFound` if centre is paused/inactive
- No images: gradient placeholder with centre initial
- No reviews: "No reviews yet" message
- No pricing data: section hidden
- Legacy vs structured policies: show structured if exists, else show legacy columns
- Mobile vs desktop: slot picker layout changes

---

## 4. Trial Booking Flow (Parent)

### 4.1 Booking Form Page (`/book/[slotId]`)

**Pre-conditions:**
- Parent must be logged in (Google Auth)
- Slot must exist, have `spots_remaining > 0`, `is_draft = false`, `date >= today`
- Centre must be `is_active = true` and `is_paused = false`

**Form fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Parent name | text | Yes | Pre-filled from Google profile |
| Parent email | text | Yes (read-only) | From auth session |
| Parent phone | text | Yes | Pre-filled if exists |
| Child name | text | Yes | Free text |
| Child level | dropdown | Yes | Grouped: Primary (P1-P6), Secondary (SEC1-SEC5), JC (JC1-JC2), IP, IB, Age groups, Skill levels |
| Referral source | dropdown | No | "How did you find us?" |
| Payment screenshot | file upload | **Only if paid trial** | Image validation (JPG/PNG/WEBP) |

**For paid trials only:**
- PayNow QR code displayed (from `centre.paynow_qr_image_url`)
- Instructions: "Please transfer via PayNow and upload screenshot"
- File upload required before submit button activates
- No actual payment verification — screenshot is proof-of-intent

### 4.2 Booking Submission (`submitBooking` server action)

**Step-by-step flow:**

1. **Validate all required fields** — child name, level, phone
2. **Upsert parent record** — email (from auth), name, phone, auth_user_id
   - Creates new parent if first booking
   - Updates name/phone if changed
3. **Lock trial fee** — `trial_fee_at_booking` captured from slot (immutable snapshot)
4. **Duplicate booking prevention:**
   - Query: Same `parent_id` + same `trial_slot_id` + same `child_name_at_booking` (case-insensitive, trimmed) + status = `confirmed`
   - If found → error: "You already have an active booking for this child on this slot"
   - ALLOWED: Same parent, different child on same slot. Same child on different slots.
5. **Atomic spot decrement:**
   - Calls `decrement_spots(slot_id)` RPC function
   - Returns 1 if successful, NULL/0 if no spots
   - If fails → error: "Sorry, this slot just filled up"
6. **Generate booking reference:**
   - Format: `PSE-YYMMDD-XXXX` (PSE prefix + date + 3-byte crypto-random hex)
   - Retry up to 3 times on unique constraint violation
7. **Insert booking record:**
   - Status: `confirmed`
   - `acknowledged_at`: now
   - Snapshot: parent_name, parent_email, parent_phone, child_name, child_level, trial_fee — all at booking time
   - `payment_screenshot_url` if paid trial
   - `referral_source` if provided
8. **If insert fails** → `increment_spots(slot_id)` to restore the spot
9. **Send emails:**
   - **E1:** `sendCentreNewBooking` → centre contact_email
   - **E2:** `sendBookingConfirmation` → parent email
10. **Redirect** to `/book/success?ref=PSE-...&centre=...&subject=...&date=...&time=...`

### 4.3 Booking Success Page (`/book/success`)
- Shows: booking ref, centre name, subject, date, time
- For paid trials: PayNow QR code displayed again
- "View My Bookings" link
- "Back to Centres" link

### 4.4 Edge Cases
- **Concurrent overbooking:** Prevented by atomic `decrement_spots()` — if two parents book last spot simultaneously, one gets the spot, other gets "slot just filled up"
- **Booking ref collision:** Crypto-random + 3 retries makes collision near-impossible
- **Stale page:** If parent has tab open and slot fills, submit will fail gracefully
- **Parent data changes:** Snapshot fields mean booking history preserved even if parent updates profile later
- **Paid trial without QR:** If centre hasn't uploaded PayNow QR, no QR shown but screenshot still requested

---

## 5. My Bookings — Parent Self-Service

### 5.1 Page Structure (`/my-bookings`)

**Two sections:**
- **Upcoming:** Status NOT in [completed, converted, no_show, cancelled] AND trial_slots.date >= today
- **Past:** Status in [completed, converted, no_show, cancelled] OR trial_slots.date < today

### 5.2 Booking Card Display

Each card shows:
- Centre name (linked to `/centres/[slug]`)
- Subject badge (mint green)
- Level badge (cream)
- Trial date + time (prominent, formatted)
- Child name and level
- Address and nearest MRT (for upcoming/active past only)
- Fee (S$ format, or "Free" if $0)
- Booking ref (muted monospace)

**Status badges (PARENT-SPECIFIC labels, different from admin):**

| Internal Status | Parent Label | Color | When Shown |
|----------------|-------------|-------|------------|
| confirmed | _(no badge, quiet)_ | — | Active upcoming |
| completed | "Trial Completed" | Purple | Past, trial done |
| converted | "Enrolled" | Green | Past, child enrolled |
| no_show | "No Show" | Red | Past |
| cancelled (by parent) | "Cancelled" | Gray | Past |
| cancelled (by centre) | "Cancelled by Centre" | Red box | Past, shows cancel_reason |
| cancelled (reschedule) | "Rescheduled" | Blue | Past, links to new booking |
| completed + is_flagged | "Under Review" | Amber | Disputed booking |

### 5.3 Parent Actions — Confirmed Upcoming Bookings

#### Cancel Trial
- **Pre-condition:** Status = `confirmed`, before trial date
- **UI:** "Cancel Trial" button → confirmation modal
- **Action (`cancelBooking`):**
  1. Verify booking belongs to parent
  2. Set status → `cancelled`, `cancelled_by` → `parent`, `cancelled_at` → now
  3. `increment_spots(slot_id)` to free the spot
  4. Send **E3:** `sendCentreBookingCancelled` to centre
- **Result:** Card moves to "Past" section with "Cancelled" badge

#### Reschedule Trial
- **Pre-condition:** Status = `confirmed`, before trial date
- **UI:** "Reschedule" button → slot picker showing available alternatives
- **Slot picker shows:** Same centre, same subject, same level, future dates, `spots_remaining > 0`
- **Action (`rescheduleBooking`):**
  1. Verify old booking belongs to parent + is `confirmed`
  2. Verify new slot has spots
  3. Atomic `decrement_spots(new_slot_id)`
  4. Create new booking (new ref, new slot, same parent/child, `rescheduled_from` = old booking id)
  5. Cancel old booking: `cancelled_by` = `reschedule`
  6. `increment_spots(old_slot_id)` to free old spot
  7. Send **E4:** `sendCentreBookingRescheduled` to centre (shows old + new dates)
- **Result:** Old booking shows "Rescheduled" (blue), new booking appears in "Upcoming"

### 5.4 Parent Actions — Post-Trial (Completed/Converted)

#### Dispute Enrollment
- **Pre-condition:** Status = `converted` (centre marked enrolled), within 14 days of `centre_reported_at`
- **UI:** "Dispute Enrollment" button → confirmation modal
- **Action (`disputeEnrollment`):**
  1. Verify status is `converted`
  2. Verify within 14-day window from `trial_outcomes.centre_reported_at`
  3. Revert booking status → `completed`
  4. Set `is_flagged` = true, `flag_reason` = "Parent disputed centre enrollment claim"
  5. Update trial_outcomes:
     - `centre_reported_status` → NULL (cleared)
     - `centre_reported_at` → NULL
     - `parent_reported_status` → `not_enrolled`
     - `reported_at` → now
  6. Send **E9:** `sendAdminDisputeAlert` to all admins
- **Result:** Card shows "Under Review" (amber), admin receives alert

#### Leave Review
- **Pre-condition:** Status = `completed` or `converted`, within 14 days of trial date, no existing review
- **UI:** Star rating (1-5) + optional review text
- **Action (`submitReview`):**
  1. Verify booking status is `completed` or `converted`
  2. Verify within 14-day window from `trial_slots.date`
  3. Check no existing review for this booking
  4. Insert review: rating, review_text, status = `pending_approval`
- **Result:** Review enters moderation queue (admin must approve before public display)

### 5.5 Edge Cases
- **Rescheduling chain:** If booking A → rescheduled to B → rescheduled to C, each link preserved via `rescheduled_from`
- **14-day window calculation:** Uses `centre_reported_at` for disputes (not trial date), `trial_slots.date` for reviews
- **Multiple children:** Same parent can see all their children's bookings, each tracked separately
- **Cancel after trial date:** NOT allowed — cancel button disappears on/after trial date
- **Already reviewed:** Review button hidden if review exists
- **Already disputed:** Dispute button hidden if not in `converted` status

---

## 6. Centre Dashboard — Overview & Stats

### 6.1 Dashboard Page (`/centre-dashboard`)

**Statistics displayed:**
- Total leads (all-time booking count)
- This month's bookings count
- Status breakdown: confirmed, completed, converted, no_show, cancelled (counts)

**Upcoming Trials section:**
- Next 5 upcoming slots (sorted by date + time)
- Each shows: subject, level, date, time, capacity bar
  - Capacity bar colors: Green (<75% full), Amber (75-99%), Red (100% full)
  - Text: "X / Y booked" (e.g., "3 / 5 booked")

**Recent Bookings section:**
- 10 most recent bookings
- Shows: ref, parent name, child name, subject, trial date, status
- Inline status actions (see below)

**Cancellation Banner:**
- Shown if any parent cancellations in last 7 days
- Lists: booking ref, parent name, child name, slot date + subject, cancelled_at timestamp
- Styled as amber/yellow warning banner

### 6.2 Inline Status Actions (InlineStatusActions component)
On the dashboard overview, centre can take quick actions:
- **Confirmed + on/after trial date:** "Attended" or "No-Show" buttons
- **Completed:** "Enrolled" or "Did Not Convert" buttons

These trigger the same server actions as the booking detail page (see Section 7).

---

## 7. Centre Dashboard — Booking Management

### 7.1 Bookings List (`/centre-dashboard/bookings`)

**Tab filter:** All | Confirmed | Completed | Converted | No Show | Cancelled
**Table columns:** Ref, Parent (name + phone), Child (name + level), Trial Date (date + time), Fee (S$), Status badge, Submitted date
**Limit:** 100 results per tab

### 7.2 Booking Detail (`/centre-dashboard/bookings/[id]`)

**Sections:**
- Parent info: name, email, phone, referral source
- Child info: name, level
- Trial slot: subject, level, date, time, fee
- Status badge + action buttons

### 7.3 Centre Booking Actions

#### Cancel Booking (Before Trial)
- **Pre-condition:** Status = `confirmed`, trial date is in the future
- **UI:** "Cancel Booking" button → modal with **required** reason text field
- **Action (`centreCancelBooking`):**
  1. Verify centre owns this booking
  2. Verify status = `confirmed`
  3. Verify trial date hasn't passed
  4. Set status → `cancelled`, `cancelled_by` → `centre`, `cancel_reason` → provided text, `cancelled_at` → now
  5. `increment_spots(slot_id)` to restore spot
  6. Send **E5:** `sendParentTrialCancelled` to parent (includes reason)
- **Edge case:** Cannot cancel on trial day or after

#### Mark Attended (On/After Trial Date)
- **Pre-condition:** Status = `confirmed`, trial date is today or past
- **Action (`centreMarkAttended`):**
  1. Set booking status → `completed`
  2. Upsert `trial_outcomes` row (create if doesn't exist, get if does)
  3. **Auto-create trial commission** if `centre.trial_commission_rate > 0`:
     - Insert commission: type = `trial`, amount = rate, status = `pending`
  4. Send **E6:** `sendParentTrialCompleted` to parent (prompts review + enrollment report)
- **Edge case:** Cannot mark attended before trial date

#### Mark No-Show (On/After Trial Date)
- **Pre-condition:** Status = `confirmed`, trial date is today or past
- **Action (`centreMarkNoShow`):**
  1. Set booking status → `no_show`
  2. Set `is_flagged` = true, `flag_reason` = "No-show marked by centre"
  3. Send **E7:** `sendAdminNoShowAlert` to all admins
- **Edge case:** Auto-flagged — admin can investigate if it's a legitimate no-show or centre error

#### Mark Enrolled (After Attended)
- **Pre-condition:** Status = `completed` (must be attended first)
- **Action (`centreMarkEnrolled`):**
  1. Set booking status → `converted`
  2. Update trial_outcomes: `centre_reported_status` → `enrolled`, `centre_reported_at` → now
  3. **Auto-create conversion commission** if `centre.conversion_commission_rate > 0`:
     - Insert commission: type = `conversion`, amount = rate, status = `pending`
  4. Send **E8:** `sendAdminConversionAlert` to all admins
- **Edge case:** Parent can dispute this within 14 days

#### Mark Not Enrolled (After Attended)
- **Pre-condition:** Status = `completed`
- **Action (`centreMarkNotConverted`):**
  1. Booking stays `completed` (status unchanged)
  2. Update trial_outcomes: `centre_reported_status` → `not_enrolled`, `centre_reported_at` → now
  3. No email sent, no commission created
- **Edge case:** Centre can still flip to enrolled later if parent changes mind

---

## 8. Centre Dashboard — Trial Slot Management

### 8.1 Slots Page (`/centre-dashboard/slots`)

**Four sections:**

#### Add New Slots (Form)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Subject | dropdown | Yes | From centre's subject list |
| Level | dropdown | Conditional | Grouped by Primary/Secondary/JC/Other |
| Stream | dropdown | No | FSBB: G3 (Express), G2 (Normal Academic), G1 (Foundational), IP, IB |
| Date | date picker | Yes | Must be future |
| Start time | time | Yes | |
| End time | time | Yes | Must be > start time |
| Trial fee | number | Yes | >= 0 (0 = free) |
| Max students | number | Yes | >= 1 |
| Age min/max | numbers | Conditional | Alternative to level_id |
| Custom level | text | Conditional | Fallback if no system level matches |
| Notes | text | No | Internal notes |

**Validation:** At least ONE of: level_id, (age_min + age_max), or custom_level must be provided.

#### Pending Admin Review (Draft Slots)
- Slots created with `is_draft = true`
- Shows: "Pending" status badge, subject, level, stream, date, time, fee, max students
- **Not visible to parents** until admin flips `is_draft → false`

#### Upcoming Slots
- `is_draft = false`, `date >= today`
- Sorted by date → start_time
- Shows: subject, level, stream badge, date, time, fee, capacity bar (booked/max), spots remaining
- **"Full"** red badge if spots_remaining = 0

#### Past Slots (Last 20)
- `is_draft = false`, `date < today`
- Same columns as upcoming

### 8.2 Stream (FSBB) Support
- **Purpose:** Singapore's Full Subject-Based Banding system for secondary school
- **Values:** G3 (Express), G2 (Normal Academic), G1 (Foundational), IP (Integrated Programme), IB (International Baccalaureate)
- **Display colors:** G3=blue, G2=emerald, G1=amber, IP=purple, IB=indigo
- **Optional field** — only relevant for secondary-level academic subjects
- **Stored on:** trial_slots.stream, centre_pricing.stream
- **Migration history:** Added in `20260306000001`, backfilled from notes in `20260306000003`

### 8.3 Slot Capacity (Atomic Operations)
```sql
-- Decrement: Used when booking created
decrement_spots(slot_id UUID) → returns 1 (success) or NULL (no spots)
  UPDATE trial_slots SET spots_remaining = spots_remaining - 1
  WHERE id = slot_id AND spots_remaining > 0

-- Increment: Used when booking cancelled
increment_spots(slot_id UUID) → void
  UPDATE trial_slots SET spots_remaining = spots_remaining + 1
  WHERE id = slot_id AND spots_remaining < max_students
```

---

## 9. Centre Dashboard — Centre Info Editing

### 9.1 Centre Info Page (`/centre-dashboard/centre-info`)

**Two modes based on centre status:**
- **Draft centres (is_active = false):** Changes save directly to centre record
- **Live centres (is_active = true):** Changes saved to `draft_data` (JSONB), `has_pending_changes` set to true, requires admin review before going live

### 9.2 Read-Only Fields (Admin-Managed)
- Name, Slug, Contact email, Subjects list, Levels list

### 9.3 Editable Sections

#### ProfileForm
- Description (textarea)
- Teaching style (textarea)
- Track record (textarea)
- Class size (number)
- Years operating (number)

#### LocationForm
- Address (text)
- Area (text)
- Nearest MRT (text)
- Parking info (textarea)

#### ContactLinksForm
- Website URL, Instagram URL, TikTok URL
- WhatsApp number, Phone number
- Google Maps URL

#### TeachersForm
- Add/edit/reorder teachers
- Per teacher: name, role, is_founder checkbox, qualifications, bio, years_experience, students_taught, linkedin_url
- Sort order for display

#### PoliciesForm (Structured)
- Stored in `centre_policies` table
- Each policy: category (free text), description, sort_order
- Can add unlimited policies

#### ImagesForm
- Image gallery URLs (text array)
- PayNow QR image URL (single image)
- Upload to Supabase storage `centre-images` bucket

#### PricingSection
- Subject-level-stream grid
- Per row: trial_type, trial_fee, regular_fee, billing_display, lessons_per_period, lesson_duration_minutes

#### PromotionsForm
- Promotions text (rich textarea, displayed as banner on centre page)

### 9.4 Draft/Review Workflow for Live Centres
1. Centre edits profile → changes stored in `centres.draft_data` (JSONB)
2. `has_pending_changes` set to `true`
3. "Pending changes" banner appears on centre info page
4. Admin sees centre in review queue (`/admin/centres/review`)
5. Admin reviews and approves → `draft_data` merged into centre record, `has_pending_changes` → false
6. Or admin requests changes → centre notified to revise

---

## 10. Admin Dashboard — Overview

### 10.1 Dashboard Page (`/admin`)

**Stats:**
- Status breakdown: Confirmed, Completed, Converted, No Shows, Cancelled (counts)
- Flagged bookings count with amber warning banner + link to filtered view

**Recent Bookings Table (10 most recent):**
- Columns: Ref (linked), Parent name, Child (name + level), Centre, Trial date, Status, Flagged badge
- **Rescheduled bookings:** If `cancelled_by = 'reschedule'`, new booking shown indented below old one
- **Flagged indicator:** Star icon on flagged bookings

---

## 11. Admin — Booking Management

### 11.1 Bookings List (`/admin/bookings`)

**Tab filter:** All | Confirmed | Completed | Converted | No Show | Cancelled | **Flagged**
**100 results per tab**

**Table columns:** Ref, Parent (name + phone), Child (name + level), Centre, Trial Date + Time, Fee (S$), Status (with rescheduled badge), Submitted date

### 11.2 Booking Detail (`/admin/bookings/[id]`)

**Sections:**

1. **Header** — Booking ref (large mono), status badge, flagged badge, submitted timestamp

2. **Status Actions** (StatusActions component)
   - Dropdown to change status: confirmed, completed, converted, no_show, cancelled
   - When cancelling: also calls `increment_spots()` to restore slot
   - When completing: creates `trial_outcomes` row if not exists

3. **Parent & Child Info** — Name, email, phone, referral source + child name, level

4. **Trial Slot** — Centre, area, address, subject, level, date, time, fee at booking

5. **Cancellation Info** (if cancelled) — Cancelled by (parent/centre/reschedule), cancelled_at, reason

6. **Reschedule History** (if rescheduled)
   - "Rescheduled from:" link to old booking
   - "Rescheduled to:" link to new booking

7. **Commission** (if completed/converted) — Trial commission amount, conversion commission amount (read-only)

8. **Payment Screenshot** (if paid trial) — Image viewer with download link

9. **Flag Section** (FlagActions)
   - Toggle: Flag / Unflag
   - Reason text field
   - Save button

10. **Admin Notes** (NotesForm)
    - Free-form textarea for internal notes

### 11.3 Admin Manual Commission Initiation
- `initiateCommission(bookingId, type, amount)` — Creates commission manually
- Type: `trial` (requires status >= completed) or `conversion` (requires status = converted)
- Validates no duplicate commission for same outcome + type (UNIQUE constraint)

---

## 12. Admin — Trial Outcomes & Verification

### 12.1 Outcomes Page (`/admin/outcomes`)

**Three sections:**

#### Reported Enrolled (Pending Verification)
- Shows outcomes where `centre_reported_status = 'enrolled'` AND `admin_verified = false`
- Card display: booking ref, parent/child names, centre name, "Enrolled" badge, reported date
- **OutcomeVerifyForm actions:**
  - "Verify" → `verifyOutcome()`: Sets `admin_verified = true`, `admin_verified_at = now`
  - "Verify & Issue Commission" → `verifyOutcomeAndConvert()`:
    - Sets admin_verified
    - Sets booking status → `converted`
    - If `AUTO_CREATE_COMMISSION = true` AND commission amount > 0: creates conversion commission
    - If `AUTO_CREATE_REWARD = true` AND reward amount > 0: creates reward
    - **(Both toggles currently OFF)**

#### Awaiting Report
- Outcomes with no enrollment report yet
- Shows parent_reported_status if exists, otherwise "Not reported yet"
- Table: Ref, Parent/Child, Centre, Reported Status, Created date

#### Verified Conversions
- `admin_verified = true`
- Table: Ref, Parent/Child, Centre, Verified date

### 12.2 Outcome Lifecycle
```
(no record)
  ↓ [centre marks attended → booking becomes completed]
trial_outcomes CREATED (booking_id linked)
  ↓ [centre marks enrolled]
centre_reported_status = 'enrolled', centre_reported_at = now
  ↓ [OR parent reports enrollment on their side]
parent_reported_status = 'enrolled'/'not_enrolled', reported_at = now
  ↓ [admin verifies]
admin_verified = true, admin_verified_at = now
  ↓ [IF dispute: parent within 14 days]
centre_reported_status → NULL, parent_reported_status → 'not_enrolled'
booking is_flagged → true, status reverts → 'completed'
```

---

## 13. Admin — Commission System

### 13.1 Commissions Page (`/admin/commissions`)

**Summary cards:**
- Outstanding (pending + invoiced + overdue): Total S$ amount
- Collected (paid): Total S$ amount

**Table columns:** Booking (ref + link, parent/child), Centre, Amount (S$), Invoice #, Status badge, Actions

### 13.2 Commission Types
| Type | Trigger | Rate Source | When Created |
|------|---------|-------------|-------------|
| Trial | Centre marks attended | `centre.trial_commission_rate` | On booking → completed |
| Conversion | Centre marks enrolled | `centre.conversion_commission_rate` | On booking → converted |

### 13.3 Commission Auto-Creation Rules
- **Rate > 0:** Commission auto-created with status `pending`
- **Rate = 0:** No commission created (centre in free onboarding period)
- **Feature flag:** `AUTO_CREATE_COMMISSION = false` in outcomes/actions.ts — currently OFF
  - When ON: admin verification auto-creates commission
  - When OFF: commission only created when centre marks attended/enrolled directly

### 13.4 Commission Status Flow
```
pending (auto-created)
  → invoiced (admin assigns invoice_number, invoiced_at timestamp)
    → paid (admin marks paid, paid_at timestamp)
    → overdue (if unpaid past SLA)
  → waived (admin writes off)
```

### 13.5 Key Rules
- **At most 1 trial + 1 conversion commission per booking** (UNIQUE constraint on trial_outcome_id + commission_type)
- **Commission amount > 0** (check constraint)
- **Admin-only visibility** — centres cannot see their commission data
- **Future:** Add centre-facing billing page when ready to charge

---

## 14. Admin — Reward/Referral System

### 14.1 Reward Model
- **One-to-one with trial outcome** (UNIQUE on trial_outcome_id)
- **Linked to referrer parent** (the parent who referred, not the one who booked)
- **Currently OFF** — `AUTO_CREATE_REWARD = false`

### 14.2 Reward Status Flow
```
pending (auto-created on conversion)
  → approved (admin approves, approved_at)
    → paid (admin records payment, paid_at, payment_method, payment_reference)
  → rejected (admin denies)
```

### 14.3 Reward Fields
- `reward_amount` (numeric, > 0)
- `payment_method` — how reward was paid (e.g., PayNow, cash, voucher)
- `payment_reference` — transaction ID or reference number
- `notes` — admin notes

---

## 15. Admin — Review Moderation

### 15.1 Review Lifecycle
```
pending_approval (parent submits)
  → approved (admin approves, approved_at = now)
    → visible on centre page to public
  → rejected (admin rejects)
    → not visible, stays in system
```

### 15.2 Review Rules
- **One review per booking** (UNIQUE on booking_id)
- **14-day window** from trial_slots.date (not booking creation, not completion date)
- **Rating required** (1-5 stars)
- **Text optional**
- **Only approved reviews:** Shown on centre detail page, counted in average rating
- **Admin moderation required** — prevents fake or abusive reviews
- **Revalidation:** Approving a review triggers Next.js revalidation on `/centres` pages

---

## 16. Admin — Centre Management & Onboarding

### 16.1 Centres List (`/admin/centres`)
- Table: Name, Area, Contact Email, Created date, Status badges (Active/Paused/Inactive)

### 16.2 Centre Creation (`/admin/centres/new`)

**Multi-step form (AddCentreForm):**

**Step 1: Basic Info**
- Name, contact email, area, address, nearest MRT
- Years operating, trial type (free/paid)
- Trial commission rate, conversion commission rate
- PayNow QR image (if paid)
- Image URLs

**Step 2: Profile**
- Description, teaching style, track record, class size

**Step 3: Teachers**
- Add teachers with: name, role, is_founder, qualifications, bio, years_experience, subjects[], levels[]

**Step 4: Policies**
- Free-text policies → AI standardizer categorizes into structured policies

**Step 5: Trial Slots**
- **SlotUploader:** Accept text/CSV/Excel paste → AI parser extracts slots
- **WeekDuplicationStep:** Copy slot pattern to multiple weeks
- **SlotClarificationTable:** Review parsed slots, resolve ambiguities
- Slots marked `is_draft = false` if centre is `is_trusted`, else `is_draft = true`

**On creation:**
- Creates centre record + centre_user (owner role)
- Creates all related records (subjects, levels, teachers, policies, pricing, slots)
- Sends centre invite email to contact_email

### 16.3 Centre Review/Onboarding (`/admin/centres/review`)

**Review Queue:**
- Shows centres with `has_pending_changes = true` or `is_active = false` (pending onboarding)

**Review Detail (`/admin/centres/review/[id]`):**
- Full centre preview (as it would appear to parents)
- **ReviewActions:**
  - **Approve:** `is_active → true`, `has_pending_changes → false`, `draft_data` merged if exists
  - **Reject:** Centre stays inactive, admin provides reason
  - **Request Changes:** Centre notified to revise (stays inactive)

### 16.4 Centre Edit (Admin) (`/admin/centres/[id]`)
- **AdminEditForms:** Full edit access to all centre fields
- Direct save (no draft workflow — admin is trusted)
- Can modify: all profile fields, commission rates, trial type, subjects, levels, teachers, policies, pricing, images

### 16.5 Centre Lifecycle States
| State | `is_active` | `is_paused` | Visibility | Bookings |
|-------|-------------|-------------|------------|----------|
| Onboarding | false | false | Hidden | Not possible |
| Live | true | false | Public | Open |
| Paused | true | true | Hidden | Blocked |
| Deactivated | false | false | Hidden | Not possible |

### 16.6 Trust Model
- `is_trusted = true`: Centre's new slots go live immediately (`is_draft = false`)
- `is_trusted = false`: New slots require admin approval (`is_draft = true`)
- Admin can toggle trust status

---

## 17. Email System (All 9 Types + Centre Invite)

All emails sent via **Resend** API. HTML templates with Podsee branding.

| # | Email Name | Trigger | Recipient | Key Content |
|---|-----------|---------|-----------|-------------|
| E1 | Centre New Booking | Parent books trial | Centre contact_email | Booking ref, parent name/phone, child name/level, trial date/time, subject |
| E2 | Booking Confirmation | Booking created | Parent email | Booking ref, centre name, address, MRT, trial date/time, subject, level, fee |
| E3 | Centre Booking Cancelled | Parent cancels | Centre contact_email | Booking ref, parent name, child name, cancelled reason |
| E4 | Centre Booking Rescheduled | Parent reschedules | Centre contact_email | Old ref + date, new ref + date, parent name |
| E5 | Parent Trial Cancelled | Centre cancels | Parent email | Booking ref, centre name, cancellation reason from centre |
| E6 | Parent Trial Completed | Centre marks attended | Parent email | Booking ref, centre name, prompts to leave review |
| E7 | Admin No-Show Alert | Centre marks no-show | All admin emails | Booking ref, centre, parent, child, trial date |
| E8 | Admin Conversion Alert | Centre marks enrolled | All admin emails | Booking ref, centre, parent, child, "enrolled by centre" |
| E9 | Admin Dispute Alert | Parent disputes enrollment | All admin emails | Booking ref, centre, parent, child, "disputed enrollment claim" |
| — | Centre Invite | Admin creates centre | Centre contact_email | Join link, Google OAuth instructions |

**Email HTML structure:**
- Podsee branded header (logo + green gradient)
- Color-coded header blocks (green = positive, red = alert, blue = info)
- Booking reference block (monospace, uppercase)
- Detail rows in table format
- CTA buttons (view booking, visit dashboard, etc.)
- Footer with copyright

---

## 18. Pricing, Promotions & Policies

### 18.1 Centre Pricing (`centre_pricing` table)

**One row per subject + level + stream combination:**

| Field | Type | Purpose |
|-------|------|---------|
| centre_id | FK | Centre |
| subject_id | FK | Subject |
| level_id | FK (nullable) | Level (null = all levels) |
| stream | text (nullable) | FSBB stream (G1/G2/G3/IP/IB) |
| trial_type | enum | `free`, `discounted`, `same_as_regular`, `multi_lesson` |
| trial_fee | numeric | Trial class fee (0 for free) |
| trial_lessons | int | Number of lessons in trial package |
| trial_same_as_regular | boolean | Override: trial fee = regular fee |
| regular_fee | numeric | Regular class fee |
| lessons_per_period | int | Lessons per billing period (e.g., 4/month) |
| lesson_duration_minutes | int | Duration per lesson |
| billing_display | text | AI-generated display text (e.g., "$280/month (4 lessons)") |
| billing_raw | text | Original free-text input for re-parsing |
| regular_schedule_note | text | Schedule notes (e.g., "Every Tue & Thu") |

**Auto-fill slot trial fees:** When pricing saved, can auto-populate trial_fee on matching trial_slots (by centre + subject + level + stream).

### 18.2 Promotions
- **Simplified to `centres.promotions_text`** (text field)
- Originally had separate `centre_promotions` table with structured fields (discount_type, discount_value, applies_to, valid_from/until, subject_id, level_id targeting)
- **Collapsed in migration `20260307000002`** — promotions data migrated to single text field
- Displayed as banner on centre detail page

### 18.3 Policies (`centre_policies` table)

**Flexible policy categories:**
| Field | Type | Purpose |
|-------|------|---------|
| centre_id | FK | Centre |
| category | text | Policy type (e.g., "Replacement Class", "Payment Terms") |
| description | text | Policy details |
| sort_order | int | Display order |

**AI Standardizer:** Admin enters free-text policies → AI categorizes into standard categories:
- Replacement Class, Makeup Class, Commitment Terms, Notice Period, Payment Terms, Other

**Backward compatibility:** Legacy columns on `centres` table preserved (`replacement_class_policy`, `makeup_class_policy`, etc.) — UI shows structured policies if they exist, else falls back to legacy columns.

### 18.4 Additional Fees
- `centres.additional_fees` — text field for fees beyond tuition (materials, registration, etc.)
- Displayed on centre detail page

---

## 19. AI Features (Parser, Standardizer, Web Search)

### 19.1 AI Schedule Parser (`lib/ai-parser.ts`)

**Input:** Centre uploads schedule (text, CSV, Excel paste, screenshot/image)

**Parsing pipeline:**
1. **Column Detection** — Identifies columns regardless of order: subject, level, day/date, time, fee, max_students
2. **Non-Class Row Filtering** — Skips: exams, homework, holidays, admin notes, student names, grades, progress tracking
3. **Subject Matching** — Fuzzy match against 50+ system subjects:
   - Recognizes abbreviations: Maths → Mathematics, Emath → Elementary Mathematics, Amath → Additional Mathematics
   - MOE subject codes recognized
   - Enrichment subjects: Music, Art, Dance, Coding, etc.
4. **Level Matching** — Maps to system levels: P1-P6, SEC1-SEC5, JC1-JC2, IP1-IP4, NA1-NA4, age groups, skill levels, music grades
5. **Stream Detection** — FSBB banding: G3/Express, G2/Normal Academic, G1/Foundational, IP, IB
6. **Date Generation** — If only day names provided (Monday, Tue), generates dates for next N weeks
7. **Confidence Scoring** — Each field gets: `confirmed` (exact match), `inferred` (fuzzy/context match), `needs_review` (ambiguous)

**Output:** Structured JSON with slots ready for clarification UI

### 19.2 Self-Learning Corrections (`parse_corrections` table)
- **Stores:** centre_id, field_type (subject/level/time), ai_raw_text, ai_value, user_correction
- **On next parse:** Previous corrections injected into AI prompt under "LEARNED CORRECTIONS"
- **Improves over time** — parser gets better for specific centres

### 19.3 AI Policy Standardizer (`lib/ai-standardizer.ts`)
- **Input:** Free-text policy descriptions
- **Output:** Categorized policies (replacement, makeup, commitment, notice_period, payment, other)
- **Creates** `centre_policies` rows with AI-generated category labels

### 19.4 AI Web Search (Enrichment Subject Support)
- When parser encounters unknown subject names
- Searches web: "[subject] enrichment Singapore"
- If match found to existing system subject → upgrades confidence to `inferred`
- Helps map colloquial names to system subjects

---

## 20. Dispute System (Shopee Model)

### 20.1 Design Philosophy
Inspired by Shopee's dispute resolution model:
- **Centre is source of truth** — Centre marks attendance and enrollment
- **Parent can challenge** — Within 14-day window
- **Admin arbitrates** — Final decision authority

### 20.2 Dispute Flow (Step by Step)

1. **Centre marks enrolled:** Booking status → `converted`, trial_outcomes updated
2. **Commission auto-created** (if applicable)
3. **Parent sees "Enrolled" on /my-bookings**
4. **Parent disagrees → clicks "Dispute Enrollment"**
5. **System checks:** Status must be `converted`, within 14 days of `centre_reported_at`
6. **If valid:**
   - Booking status reverts → `completed`
   - `is_flagged` → true
   - `flag_reason` → "Parent disputed centre enrollment claim"
   - trial_outcomes: `centre_reported_status` → NULL, `centre_reported_at` → NULL
   - trial_outcomes: `parent_reported_status` → `not_enrolled`, `reported_at` → now
   - **E9 email** sent to all admins
7. **Admin receives alert**, reviews case:
   - Looks at both reports
   - Contacts parent/centre if needed
   - Adds admin_notes
   - Marks `admin_verified = true` for final decision
8. **Resolution:** Admin can manually adjust status, commission, etc.

### 20.3 Dispute Edge Cases
- **14-day window expired:** Dispute button not shown (parent missed window)
- **Already disputed:** Button hidden (can't dispute twice from `completed` state)
- **Commission already created:** Admin must manually waive/adjust if dispute upheld
- **Multiple disputes:** Technically possible if centre re-marks as enrolled after dispute resolution

---

## 21. Booking Status Lifecycle (Complete)

```
BOOKING CREATED → status: confirmed
                  acknowledged_at: now

   ┌─────────────────────────────────────────────────────┐
   │                    CONFIRMED                         │
   │  Actions available:                                  │
   │  - Parent: cancel, reschedule                        │
   │  - Centre: cancel (before trial), mark attended,     │
   │            mark no-show (on/after trial date)        │
   │  - Admin: change to any status                       │
   └───────┬──────────┬──────────┬──────────┬─────────────┘
           │          │          │          │
      ┌────▼───┐  ┌──▼───┐  ┌──▼────┐  ┌──▼──────┐
      │COMPLETED│  │NO_SHOW│  │CANCEL │  │CANCEL   │
      │(attended)│  │(flag) │  │(parent│  │(centre  │
      └────┬────┘  └───────┘  │resched│  │+reason) │
           │                   └───────┘  └─────────┘
      ┌────▼────┐
      │CONVERTED │ ◄── Centre marks enrolled
      │(enrolled)│     (14-day dispute window starts)
      └────┬────┘
           │
      ┌────▼─────────┐
      │  DISPUTED     │ ◄── Parent disputes within 14 days
      │  (reverts to  │     → booking flagged
      │   completed)  │     → admin notified
      └──────────────┘
```

---

## 22. Commission Lifecycle (Complete)

```
TRIAL COMMISSION:
  Trigger: centreMarkAttended() → booking completed
  Condition: centre.trial_commission_rate > 0
  Created: commission(type='trial', amount=rate, status='pending')

CONVERSION COMMISSION:
  Trigger: centreMarkEnrolled() → booking converted
  Condition: centre.conversion_commission_rate > 0
  Created: commission(type='conversion', amount=rate, status='pending')

STATUS FLOW:
  pending ──→ invoiced ──→ paid
    │            │
    │            └──→ overdue (if past SLA)
    │
    └──→ waived (admin writes off)

CONSTRAINTS:
  - Max 1 trial + 1 conversion per booking (UNIQUE on outcome_id + type)
  - amount must be > 0
  - Admin-only visibility (centres can't see)
  - Rate = 0 means free onboarding period (no commission)
```

---

## 23. Trial Outcome Lifecycle (Complete)

```
1. CREATION
   - Created when: booking status → completed (centre marks attended)
   - Fields: booking_id (UNIQUE), all others NULL

2. CENTRE REPORTS
   - centreMarkEnrolled(): centre_reported_status='enrolled', centre_reported_at=now
   - centreMarkNotConverted(): centre_reported_status='not_enrolled', centre_reported_at=now

3. PARENT REPORTS
   - disputeEnrollment(): parent_reported_status='not_enrolled', reported_at=now

4. ADMIN VERIFICATION
   - verifyOutcome(): admin_verified=true, admin_verified_at=now
   - verifyOutcomeAndConvert(): same + changes booking status + creates commission/reward (if flags ON)

5. DISPUTE RESOLUTION
   - Parent disputes: centre_reported_status → NULL, centre_reported_at → NULL
   - Admin reviews, makes final call
   - admin_notes captures rationale
```

---

## 24. All Edge Cases & Validations

### 24.1 Concurrency & Race Conditions
| Scenario | Prevention |
|----------|-----------|
| Two parents book last spot simultaneously | Atomic `decrement_spots()` RPC — exactly one succeeds |
| Booking ref collision | Crypto-random + 3 retries, UNIQUE constraint |
| Spot restoration on failed insert | `increment_spots()` called in catch block |
| Stale page (slot filled while form open) | Server-side validation on submit |

### 24.2 Time-Based Guards
| Action | Time Constraint |
|--------|----------------|
| Parent cancel | Before trial date only |
| Parent reschedule | Before trial date only |
| Centre cancel | Before trial date only |
| Centre mark attended | On/after trial date only |
| Centre mark no-show | On/after trial date only |
| Parent dispute enrollment | Within 14 days of centre_reported_at |
| Parent leave review | Within 14 days of trial_slots.date |

### 24.3 Duplicate Prevention
| What | Rule |
|------|------|
| Same child, same slot | Same parent_id + slot_id + child_name (ilike, trim) + status='confirmed' → blocked |
| Same child, different slots | Allowed |
| Different children, same slot | Allowed |
| Commission per outcome | UNIQUE(trial_outcome_id, commission_type) |
| Reward per outcome | UNIQUE(trial_outcome_id) |
| Review per booking | UNIQUE(booking_id) |
| Centre user per centre | UNIQUE(auth_user_id, centre_id) |

### 24.4 Data Integrity
| Rule | Enforcement |
|------|-------------|
| Trial fee >= 0 | CHECK constraint |
| Commission amount > 0 | CHECK constraint |
| Reward amount > 0 | CHECK constraint |
| Rating 1-5 | CHECK constraint |
| End time > start time | CHECK constraint |
| spots_remaining <= max_students | CHECK constraint |
| Level OR age range OR custom level required | CHECK constraint |
| age_max >= age_min | CHECK constraint |

### 24.5 Snapshot Data (Immutable at Booking Time)
These fields captured at booking creation and NEVER updated:
- `parent_name_at_booking`
- `parent_email_at_booking`
- `parent_phone_at_booking`
- `child_name_at_booking`
- `child_level_at_booking`
- `trial_fee_at_booking`

Purpose: Booking history preserved even if parent updates profile or centre changes pricing.

### 24.6 Cascade & Orphan Rules
| Parent Record | Child Records | On Delete |
|--------------|---------------|-----------|
| Parent | Children | CASCADE (children deleted) |
| Parent | Bookings | SET NULL (bookings preserved) |
| Child | Bookings | SET NULL (bookings preserved) |
| Centre | Trial Slots | CASCADE |
| Centre | Centre Pricing | CASCADE |
| Centre | Centre Policies | CASCADE |
| Centre | Teachers | CASCADE |
| Trial Outcome | Commissions | CASCADE |
| Trial Outcome | Rewards | CASCADE |
| Booking | Reviews | CASCADE |

### 24.7 Payment Edge Cases
- **Paid trial without PayNow QR:** Screenshot still requested, but no QR displayed
- **Free trial:** No payment section shown, no screenshot needed
- **No payment verification:** Screenshot = proof-of-intent only (manual verification if needed)
- **Fee locked at booking:** `trial_fee_at_booking` immutable even if centre changes slot fee later

### 24.8 Display Edge Cases
- **No images:** Gradient placeholder with centre initial letter
- **No reviews:** "No reviews yet" message
- **No pricing data:** Pricing section hidden
- **Legacy vs structured policies:** Show structured if exists, else fall back to legacy columns
- **No promotions:** Banner hidden
- **Mobile vs desktop:** Slot picker layout changes (sidebar vs bottom sheet)

---

## 25. Database Schema Summary

### 25.1 All Tables (18 total)

**Core Entities (14):**
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| parents | Parent accounts | → auth.users, → children |
| children | Child records | → parents (CASCADE) |
| centres | Centre profiles | → centre_users, trial_slots, pricing, policies |
| centre_users | Dashboard access | → auth.users, → centres |
| admin_users | Platform admins | → auth.users |
| trial_slots | Available trial classes | → centres, subjects, levels |
| bookings | Trial bookings | → trial_slots, centres, parents, children |
| trial_outcomes | Post-trial tracking | → bookings (1:1) |
| commissions | Financial tracking | → trial_outcomes, centres |
| rewards | Referral rewards | → trial_outcomes, parents |
| reviews | Centre reviews | → bookings (1:1), parents, centres |
| teachers | Centre staff | → centres |
| centre_pricing | Structured pricing | → centres, subjects, levels |
| centre_policies | Policy categories | → centres |

**Junction Tables (4):**
| Table | Links |
|-------|-------|
| centre_subjects | centres <-> subjects |
| centre_levels | centres <-> levels |
| centre_subject_levels | centres <-> subjects <-> levels |
| teacher_subjects / teacher_levels | teachers <-> subjects/levels |

**Reference Tables (2):**
| Table | Purpose |
|-------|---------|
| subjects | 46+ subjects (Math, English, Science, Music, Art, etc.) |
| levels | P1-P6, SEC1-SEC5, JC1-JC2, IP1-IP4, NA1-NA4, age groups, skill levels, music grades |

**AI Tables (1):**
| Table | Purpose |
|-------|---------|
| parse_corrections | Self-learning dataset for AI parser improvements |

### 25.2 All Enums
| Enum | Values |
|------|--------|
| booking_status | pending, confirmed, completed, converted, no_show, cancelled |
| commission_status | pending, invoiced, paid, overdue, waived |
| reward_status | pending, approved, paid, rejected |
| level_group | primary, secondary, jc, other |
| parent_reported_enrolment | enrolled, not_enrolled |

### 25.3 All Migrations (Chronological)
| Date | File | Changes |
|------|------|---------|
| 2026-03-02 | consolidated_schema.sql | All core tables, enums, indexes, RLS, seed data |
| 2026-03-05 | add_rls_and_function_permissions.sql | Reinforced RLS, function permissions |
| 2026-03-06 | add_stream_to_trial_slots.sql | FSBB stream column |
| 2026-03-06 | backfill_stream_from_notes.sql | Migrate stream data from notes |
| 2026-03-06 | clean_ai_reasoning_from_notes.sql | Remove AI artifacts from notes |
| 2026-03-07 | centre_pricing_promotions_policies.sql | Structured pricing, promotions, policies tables |
| 2026-03-07 | collapse_centre_promotions.sql | Simplify promotions to text field |
| 2026-03-08 | add_contact_links_and_teacher_fields.sql | Social links, LinkedIn, students_taught |

---

## 26. Architecture Decisions & User Preferences

### 26.1 Key Architecture Decisions
1. **Commission is auto-created, not manual** — Rate > 0 = auto on status transition. Rate = 0 = free onboarding.
2. **Commission is admin-only** — Not visible on centre dashboard. Future: centre-facing billing page.
3. **Centre is source of truth** — Centre marks attended/enrolled. Parent can dispute within 14 days (Shopee model).
4. **Parent-facing labels differ from admin** — completed → "Trial Completed", converted → "Enrolled", disputed → "Under Review".
5. **Feature toggles preserved** — `AUTO_CREATE_COMMISSION = false`, `AUTO_CREATE_REWARD = false` for future activation.
6. **Snapshot data at booking** — Parent name, email, phone, child name, level, fee all locked at booking time.
7. **Atomic spot management** — RPC functions prevent overbooking under concurrent load.
8. **Draft system for centres** — Non-trusted centres' slots need admin approval. Live centre edits go to draft_data.
9. **Promotions simplified** — From structured table to simple text field (collapsed during development).

### 26.2 User (Developer) Preferences
1. **Don't delete code without thinking** — Use feature flags to toggle off, don't delete. User got frustrated when code was deleted.
2. **Explain WHERE components go** — User wants to understand placement before accepting new files.
3. **Don't change designs unexpectedly** — Preserve original styling when moving components between UI states.
4. **SQL migration rule** — Scan existing migrations first. Only create new file if change doesn't exist. Ask before deleting.

---

## 27. Feature Toggles & Future Features

### 27.1 Active Feature Toggles
| Toggle | Location | Current | Purpose |
|--------|----------|---------|---------|
| AUTO_CREATE_COMMISSION | outcomes/actions.ts | `false` | Auto-create commission on admin verification |
| AUTO_CREATE_REWARD | outcomes/actions.ts | `false` | Auto-create referral reward on conversion |

### 27.2 Future Features (Designed but Not Active)
- **Centre-facing billing page** — Show commissions to centres (currently admin-only)
- **Referral rewards** — Cash/voucher rewards for parents who refer friends (schema ready, toggle OFF)
- **AI parser self-learning** — parse_corrections table exists, injection into prompts designed
- **Scheduled slot duplication** — WeekDuplicationStep component exists for repeating patterns
- **Centre promotions structured data** — Table collapsed to text, but structured schema preserved in migration history

### 27.3 Checkpoint Progress (All Done)
- CP1: Schema + Booking Foundation
- CP2: Parent Self-Service
- CP3: Centre Dashboard Actions
- CP4: Parent Dispute + Review
- CP5: Commission System
- CP6: Reviews System
- CP7: Critical Emails (9 types + centre invite)
- CP8: Centre Onboarding (PayNow QR)

---

## 28. File Location Reference

### Public Routes
| File | Purpose |
|------|---------|
| app/(public)/centres/page.tsx | Centre listing with filters |
| app/(public)/centres/[slug]/page.tsx | Centre detail page |
| app/(public)/book/[slotId]/page.tsx | Booking form |
| app/(public)/book/[slotId]/actions.ts | submitBooking server action |
| app/(public)/book/success/page.tsx | Booking confirmation |
| app/(public)/my-bookings/page.tsx | Parent bookings list |
| app/(public)/my-bookings/actions.ts | cancel, reschedule, dispute, review actions |

### Centre Dashboard Routes
| File | Purpose |
|------|---------|
| app/centre-dashboard/page.tsx | Overview + stats |
| app/centre-dashboard/bookings/page.tsx | Bookings list |
| app/centre-dashboard/bookings/[id]/page.tsx | Booking detail |
| app/centre-dashboard/bookings/[id]/actions.ts | Centre booking actions |
| app/centre-dashboard/slots/page.tsx | Slot management |
| app/centre-dashboard/centre-info/page.tsx | Centre info editing |

### Admin Routes
| File | Purpose |
|------|---------|
| app/admin/page.tsx | Admin dashboard |
| app/admin/bookings/page.tsx | All bookings |
| app/admin/bookings/[id]/page.tsx | Booking detail |
| app/admin/outcomes/page.tsx | Trial outcome verification |
| app/admin/commissions/page.tsx | Commission tracking |
| app/admin/centres/page.tsx | Centre list |
| app/admin/centres/[id]/page.tsx | Centre edit |
| app/admin/centres/new/page.tsx | Create centre |
| app/admin/centres/review/page.tsx | Onboarding queue |

### Shared Libraries
| File | Purpose |
|------|---------|
| lib/email.ts | All 9 email types + centre invite |
| lib/ai-parser.ts | AI schedule parser |
| lib/ai-standardizer.ts | AI policy standardizer |
| lib/parse-corrections.ts | Self-learning corrections |
| lib/supabase/server.ts | Server-side Supabase client |
| lib/supabase/client.ts | Client-side Supabase client |
| lib/supabase/admin.ts | Service role Supabase client |
| types/database.ts | All TypeScript types + helpers |

### Database
| File | Purpose |
|------|---------|
| supabase/migrations/*.sql | 8 migration files (see Section 25.3) |
