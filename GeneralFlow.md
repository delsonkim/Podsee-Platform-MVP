# Podsee Platform — Database Schema & General Flow

## Entity Relationship Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PODSEE PLATFORM — DATABASE SCHEMA                       ║
╚══════════════════════════════════════════════════════════════════════════════╝


  ┌─────────────────────┐          ┌─────────────────────┐
  │     SUBJECTS        │          │      LEVELS          │
  │─────────────────────│          │─────────────────────│
  │ id          (PK)    │          │ id          (PK)    │
  │ name        UNIQUE  │          │ code        UNIQUE  │
  │ sort_order          │          │ label               │
  │ is_custom           │          │ level_group (enum)  │
  │ created_at          │          │ sort_order          │
  └────────┬────────────┘          │ created_at          │
           │                       └────────┬────────────┘
           │                                │
     ┌─────┴────────────────────────────────┴──────┐
     │              LOOKUP TABLES                   │
     │  (referenced by slots, children, junctions)  │
     └─────┬────────────────────────────────┬──────┘
           │                                │
           ▼                                ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │                           CENTRES                                    │
  │──────────────────────────────────────────────────────────────────────│
  │ id (PK)                                                              │
  │                                                                      │
  │ IDENTITY:    name, slug (UNIQUE), contact_email                      │
  │ LOCATION:    area, address, nearest_mrt, parking_info                │
  │ PROFILE:     description, teaching_style, teacher_bio,               │
  │              teacher_qualifications, class_size, years_operating,     │
  │              track_record                                            │
  │ POLICIES:    replacement_class_policy, makeup_class_policy,          │
  │              commitment_terms, notice_period_terms, payment_terms,   │
  │              other_policies                                          │
  │ MEDIA:       image_urls (text[])                                     │
  │ PAYMENT:     trial_type (free|paid), paynow_qr_image_url            │
  │ COMMISSION:  trial_commission_rate, conversion_commission_rate        │
  │ DRAFT:       draft_data (JSONB), has_pending_changes                 │
  │ FLAGS:       is_active (default false), is_paused, is_trusted        │
  │ TIMESTAMPS:  created_at, updated_at                                  │
  └───┬───────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
      │           │          │          │          │          │
      │           │          │          │          │          │
      ▼           ▼          ▼          ▼          ▼          ▼

┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌───────────────┐ ┌─────────────────┐
│ centre_  │ │ centre_  │ │ centre_      │ │ centre_   │ │  teachers     │ │ parse_          │
│ subjects │ │ levels   │ │ subject_     │ │ users     │ │               │ │ corrections     │
│──────────│ │──────────│ │ levels       │ │───────────│ │───────────────│ │─────────────────│
│ centre_id│ │ centre_id│ │──────────────│ │ id (PK)   │ │ id (PK)       │ │ id (PK)         │
│ subject_ │ │ level_id │ │ centre_id    │ │ auth_     │ │ centre_id(FK) │ │ centre_id (FK)  │
│   id     │ │ (PK:both)│ │ subject_id   │ │  user_id  │ │ name          │ │ field_type      │
│ display_ │ └──────────┘ │ level_id     │ │ centre_id │ │ role          │ │ ai_raw_text     │
│  name    │              │ (PK: all 3)  │ │  (FK)     │ │ is_founder    │ │ ai_value        │
│ descrip- │              └──────────────┘ │ role      │ │ qualifications│ │ ai_match_id     │
│  tion    │                               │(owner|    │ │ bio           │ │ ai_confidence   │
│ (PK:both)│                               │ staff)    │ │ years_exp     │ │ user_value      │
└──────────┘                               │ email     │ │ sort_order    │ │ user_match_id   │
                                           │ created_at│ │ created_at    │ │ created_at      │
                                           └───────────┘ │ updated_at    │ └─────────────────┘
                                                         └──────┬────────┘
                                                                │
                                                    ┌───────────┴───────────┐
                                                    │                       │
                                              ┌─────┴──────┐         ┌─────┴──────┐
                                              │ teacher_   │         │ teacher_   │
                                              │ subjects   │         │ levels     │
                                              │────────────│         │────────────│
                                              │ teacher_id │         │ teacher_id │
                                              │ subject_id │         │ level_id   │
                                              │ (PK: both) │         │ (PK: both) │
                                              └────────────┘         └────────────┘


  ┌─────────────────────┐          ┌─────────────────────┐
  │      PARENTS        │          │     CHILDREN         │
  │─────────────────────│          │─────────────────────│
  │ id          (PK)    │──1:N────▶│ id          (PK)    │
  │ auth_user_id (FK)   │          │ parent_id   (FK)    │
  │ email       UNIQUE  │          │ name                │
  │ name                │          │ level_id    (FK)    │
  │ phone               │          │ created_at          │
  │ created_at          │          │ updated_at          │
  │ updated_at          │          └─────────────────────┘
  └────────┬────────────┘
           │
           │
           ▼

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                         TRIAL_SLOTS                                      │
  │──────────────────────────────────────────────────────────────────────────│
  │ id (PK)                                                                  │
  │ centre_id (FK → centres)        subject_id (FK → subjects)               │
  │ level_id (FK → levels)          age_min, age_max, custom_level           │
  │ stream (nullable text)          — FSBB band: G1/G2/G3/IP/IB             │
  │ date, start_time, end_time      trial_fee                                │
  │ max_students, spots_remaining   is_draft                                 │
  │ notes, created_at, updated_at                                            │
  │                                                                          │
  │ CHECK: end_time > start_time, fee >= 0, spots valid, level present       │
  └────────────────────────────────┬─────────────────────────────────────────┘
                                   │
                                   │ 1:N
                                   ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                          BOOKINGS                                        │
  │──────────────────────────────────────────────────────────────────────────│
  │ id (PK)              booking_ref (UNIQUE)                                │
  │ trial_slot_id (FK)   centre_id (FK)                                      │
  │ child_id (FK)        parent_id (FK)                                      │
  │                                                                          │
  │ SNAPSHOT:    parent_name, parent_email, parent_phone, child_name,         │
  │             child_level, trial_fee  (all "_at_booking")                   │
  │ STATUS:     status (pending → confirmed → completed → converted)         │
  │ CANCEL:     cancelled_by (parent|centre|reschedule), cancelled_at,       │
  │             cancel_reason                                                │
  │ OTHER:      acknowledged_at, referral_source, rescheduled_from (FK→self) │
  │             payment_screenshot_url, is_flagged, flag_reason, admin_notes  │
  │ TIMESTAMPS: created_at, updated_at                                       │
  └──────────┬───────────────────────────────┬───────────────────────────────┘
             │                               │
             │ 1:1                           │ 1:1
             ▼                               ▼
  ┌──────────────────────────┐    ┌──────────────────────────┐
  │     TRIAL_OUTCOMES       │    │       REVIEWS            │
  │──────────────────────────│    │──────────────────────────│
  │ id (PK)                  │    │ id (PK)                  │
  │ booking_id (FK, UNIQUE)  │    │ booking_id (FK, UNIQUE)  │
  │ parent_reported_status   │    │ parent_id (FK)           │
  │ reported_at              │    │ centre_id (FK)           │
  │ centre_reported_status   │    │ rating (1-5)             │
  │ centre_reported_at       │    │ review_text              │
  │ admin_verified           │    │ status (pending_approval │
  │ admin_verified_at        │    │   | approved | rejected) │
  │ admin_notes              │    │ approved_at              │
  │ created_at, updated_at   │    │ created_at, updated_at   │
  └──────────┬───────────────┘    └──────────────────────────┘
             │
     ┌───────┴────────┐
     │ 1:1            │ 1:N (per type)
     ▼                ▼
  ┌────────────────┐  ┌────────────────────┐
  │    REWARDS     │  │   COMMISSIONS      │
  │────────────────│  │────────────────────│
  │ id (PK)        │  │ id (PK)            │
  │ trial_outcome_ │  │ trial_outcome_     │
  │   id (FK,UNQ)  │  │   id (FK)          │
  │ parent_id (FK) │  │ centre_id (FK)     │
  │ reward_amount  │  │ commission_type    │
  │ status (enum)  │  │   (trial|          │
  │ approved_at    │  │    conversion)     │
  │ paid_at        │  │ commission_amount  │
  │ payment_method │  │ status (enum)      │
  │ payment_ref    │  │ invoice_number     │
  │ notes          │  │ invoiced_at        │
  │ created_at     │  │ paid_at, notes     │
  │ updated_at     │  │ created_at         │
  └────────────────┘  │ updated_at         │
                      │                    │
                      │ UNIQUE: outcome_id │
                      │  + commission_type │
                      └────────────────────┘


  ┌─────────────────────┐
  │    ADMIN_USERS       │
  │─────────────────────│
  │ id          (PK)    │     (standalone — no FK to other tables)
  │ auth_user_id (FK)   │
  │ email       UNIQUE  │
  │ role (admin|        │
  │       superadmin)   │
  │ created_at          │
  └─────────────────────┘
```

---

## Table Summary

| Category | Tables |
|----------|--------|
| Lookups | `subjects`, `levels` |
| Users | `parents`, `children`, `centre_users`, `admin_users` |
| Centres | `centres`, `teachers` |
| Junctions | `centre_subjects`, `centre_levels`, `centre_subject_levels`, `teacher_subjects`, `teacher_levels` |
| Booking Flow | `trial_slots`, `bookings` |
| Post-Trial | `trial_outcomes`, `commissions`, `rewards`, `reviews` |
| AI | `parse_corrections` |

**15 core tables + 6 junction tables = 21 tables total**

---

## Data Flow

### Onboarding
```
Admin creates Centre → adds Teachers → adds Trial Slots
Centre User linked via centre_users (owner/staff)
Subjects & Levels auto-derived from slots into junction tables
```

### Booking Flow
```
Parent signs up → adds Child → browses Centres → books a Trial Slot
Booking snapshots parent/child info at time of booking
spots_remaining decremented atomically via RPC function
```

### Booking Lifecycle
```
pending → confirmed → completed → converted
                   ↘ cancelled (by parent/centre/reschedule)
                   ↘ no_show
```

### Post-Trial Outcomes
```
Centre marks attended → sets enrolled/not_enrolled
Parent can dispute within 14 days (Shopee model)
Admin verifies only if disputed
```

### Commission Flow
```
Commission auto-created when outcome is set (if centre rate > 0)
Two types: trial commission + conversion commission
Flow: pending → invoiced → paid (or waived)
```

### Reward Flow
```
Parent gets reward when child enrolls (future feature)
Flow: pending → approved → paid (or rejected)
```

### Review Flow
```
Parent leaves review after completing a trial
Flow: pending_approval → approved (or rejected by admin)
```

### Draft System
```
Centre edits profile → saved to draft_data (JSONB) → admin approves/rejects
Trusted centres (is_trusted=true) bypass draft → direct save
Draft slots: is_draft=true → admin approves → is_draft=false (goes live)
```

---

## Enums

| Enum | Values |
|------|--------|
| `booking_status` | pending, confirmed, completed, converted, no_show, cancelled |
| `parent_reported_enrolment` | enrolled, not_enrolled |
| `commission_status` | pending, invoiced, paid, overdue, waived |
| `reward_status` | pending, approved, paid, rejected |
| `level_group` | primary, secondary, jc, other |

---

## RPC Functions

| Function | Purpose |
|----------|---------|
| `decrement_spots(slot_id)` | Atomically decrease spots_remaining (prevents double-booking) |
| `increment_spots(slot_id)` | Atomically increase spots_remaining (on cancellation) |
| `set_updated_at()` | Trigger function: auto-sets updated_at on row update |
