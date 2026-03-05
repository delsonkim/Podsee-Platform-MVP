# Podsee Platform — Architecture

## Three Dashboards, Three Auth Flows

The platform has three separate user interfaces, each with its own authentication:

```
┌────────────────────────────────────────────────────────────────────┐
│                        PARENT (Public)                             │
│  Routes: /(public)/*                                               │
│  Auth: Google OAuth → parents table                                │
│  Access: Anyone can browse. Login required to book.                │
│  Pages: /centres, /centres/[slug], /book/[slotId], /my-bookings   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     CENTRE DASHBOARD                               │
│  Routes: /centre-dashboard/*                                       │
│  Auth: Google OAuth → centre_users table                           │
│  Guard: requireCentreUser() in lib/centre-auth.ts                  │
│  Access: Only users with a centre_users record                     │
│  Pages: /centre-dashboard, /bookings, /slots, /centre-info, /team │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                               │
│  Routes: /admin/*                                                  │
│  Auth: Google OAuth → admin_users table                            │
│  Guard: requireAdminUser() in lib/admin-auth.ts                    │
│  Access: Only users with an admin_users record                     │
│  Pages: /admin, /bookings, /centres, /outcomes, /reviews, /links  │
└────────────────────────────────────────────────────────────────────┘
```

### How Auth Works

1. User clicks "Sign in with Google" → Supabase Auth handles OAuth flow
2. Middleware (`app/src/middleware.ts`) intercepts all requests:
   - `/centre-dashboard/*` → checks session, redirects to `/centre-login` if not authenticated
   - `/admin/*` (except `/admin-login`) → checks session, redirects to `/admin-login` if not authenticated
   - Public routes → refreshes session cookie silently
3. Page-level auth functions run in Server Components:
   - `requireCentreUser()` → looks up `centre_users` by `auth_user_id`, returns `{ centreId, centreName, role }`
   - `requireAdminUser()` → looks up `admin_users` by `auth_user_id`, returns `{ role }`
4. First-login backfill: if `auth_user_id` is null but email matches, the function links the Google account to the existing record

### Adding a New Centre User

Admin creates a `centre_users` row with the person's email. When that person logs in with Google using that email, `requireCentreUser()` automatically links their Google account.

### Adding a New Admin

Insert a row into `admin_users` with their email. Same auto-link on first Google login.

---

## Design Patterns

### Server Components by Default

All pages are React Server Components. They fetch data directly from Supabase on the server — no API routes, no client-side fetching for initial data.

```typescript
// Typical page pattern
export default async function SomePage() {
  const { centreId } = await requireCentreUser()    // auth check
  const supabase = createAdminClient()               // server-side query
  const { data } = await supabase.from('bookings').select('*').eq('centre_id', centreId)
  return <div>{/* render data */}</div>
}
```

### Client Components for Interactivity

Forms, toggles, and anything with `useState`/`useTransition` gets `"use client"` at the top. These call Server Actions for mutations.

### Server Actions for Mutations

All writes go through Server Actions (`"use server"` functions in `actions.ts` files). They:
1. Verify auth (`requireCentreUser()` or `requireAdminUser()`)
2. Validate input
3. Use `createAdminClient()` to bypass RLS for the write
4. Call `revalidatePath()` to refresh the page
5. Return `{ success }` or `{ error }` — never throw

```typescript
// Typical server action pattern
'use server'
export async function doSomething(data: SomeInput) {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()
  const { error } = await supabase.from('table').update(data).eq('centre_id', centreId)
  if (error) return { error: error.message }
  revalidatePath('/centre-dashboard/page')
  return { success: true }
}
```

### Three Supabase Clients

| Client | File | Use |
|--------|------|-----|
| `createClient()` (server) | `lib/supabase/server.ts` | Server Components — respects user's auth session |
| `createClient()` (browser) | `lib/supabase/client.ts` | Client Components — runs in browser |
| `createAdminClient()` | `lib/supabase/admin.ts` | Server Actions — bypasses RLS with service role key. **Never import in client code.** |

### Draft System (Centre Edits)

When a centre edits their profile through the dashboard:

```
Centre submits edit
    │
    ├── is_active = false (new centre, not listed yet)
    │   └── Direct save to centre record
    │
    ├── is_trusted = true (trusted centre)
    │   └── Direct save to centre record
    │
    └── Normal centre (active, not trusted)
        └── Saved to draft_data (JSONB column)
            └── has_pending_changes = true
                └── Admin reviews at /admin/centres/review
                    ├── Approve → merge draft_data into centre, clear draft
                    └── Reject → clear draft_data, no changes
```

Same pattern for trial slots:
- Normal centres submit slots as `is_draft = true` → admin approves → `is_draft = false` (goes live)
- Trusted centres submit slots directly as `is_draft = false` (live immediately)

### Booking Snapshot Pattern

When a parent books, we copy their current info into the booking record:
- `parent_name_at_booking`, `parent_email_at_booking`, `parent_phone_at_booking`
- `child_name_at_booking`, `child_level_at_booking`
- `trial_fee_at_booking`

This means the booking is a permanent record even if the parent later changes their profile or deletes their account.

### Atomic Capacity

`spots_remaining` is decremented atomically via an RPC function (`decrement_spots`) — not a read-then-write which could cause double bookings under concurrency.

---

## Email System

All transactional emails are in `lib/email.ts` using Resend. Emails are sent from `bookings@podsee.sg`.

| Trigger | Email Sent | To |
|---------|-----------|-----|
| Parent books a trial | Booking confirmation | Parent |
| Parent books a trial | New booking alert | Centre |
| Parent cancels | Cancellation notice | Centre |
| Parent reschedules | Reschedule notice | Centre |
| Centre cancels | Cancellation notice | Parent |
| Centre marks attended | Trial completed + review prompt | Parent |
| Centre marks no-show | No-show alert | Admin |
| Centre marks enrolled | Conversion alert | Admin |
| Parent disputes enrollment | Dispute alert | Admin |
| Admin invites centre staff | Dashboard invite link | Staff email |

If `RESEND_API_KEY` is not set, all email functions log a warning and return silently (no crash).

---

## AI Schedule Parser

Located in `lib/ai-parser.ts`. Used during centre onboarding to bulk-import trial slots.

1. Centre pastes schedule text or uploads an image
2. Text/image sent to Claude API with a structured extraction prompt
3. Claude returns JSON array of parsed slots with `subject`, `level`, `date`, `time`, `fee`
4. AI matches are fuzzy-matched against our `subjects` and `levels` tables
5. Admin reviews in a clarification table, corrects any mismatches
6. Corrections saved to `parse_corrections` table for future learning

---

## Current State

### What's Working (Production-Ready)

- Parent browsing and trial booking flow
- Booking lifecycle: pending → confirmed → completed → converted/no_show/cancelled
- Centre dashboard: view bookings, mark attendance, report enrollment
- Centre dashboard: edit profile/location/policies with draft system
- Centre dashboard: add trial slots (single + bulk import with AI parser)
- Admin dashboard: view all bookings, manage centres, verify outcomes
- Admin dashboard: review centre drafts (approve/reject)
- Admin dashboard: edit any centre directly (bypasses draft)
- Trusted centre bypass: edits and slots go live immediately
- Commission auto-creation on enrollment (when centre rate > 0)
- Parent post-trial actions: dispute enrollment, leave reviews
- Google OAuth for all three user types
- Transactional emails for all major events
- Payment screenshot upload for paid trials

### What's Planned (See TODO.md)

- **Pricing info field** — free-text field for trial vs regular class pricing
- **Auto-scrape centre website** — AI pre-fills onboarding form from centre's website
- **Multi-branch centres** — parent-child centre model for chains with multiple locations
- **AI Parser v2** — improved parsing with confidence scores and self-learning
- **Rewards system** — parent referral rewards (schema exists, feature toggled off)

### Known Shortcuts / MVP Decisions

- No RLS policies — all access control is application-level via `requireCentreUser()` / `requireAdminUser()`
- No rate limiting on booking or form submissions
- No image optimization or CDN — images stored directly in Supabase Storage
- Commission and reward auto-creation is feature-toggled off (`AUTO_CREATE_COMMISSION = false` in outcomes/actions.ts)
- Centre is source of truth for enrollment — parent can dispute within 14 days, admin only intervenes if disputed
- No pagination on list pages — fine for 40 centres, would need adding at scale

---

## Deployment

### Vercel

```bash
cd app
npx vercel deploy --yes        # Preview deployment
npx vercel deploy --prod --yes # Production deployment
```

Environment variables must be set in Vercel Dashboard → Settings → Environment Variables.

### Supabase

Database migrations:

```bash
# Link to your Supabase project (one-time)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push new migrations to remote DB
npx supabase db push

# Check migration status
npx supabase migration list

# If migration history gets out of sync
npx supabase migration repair --status reverted TIMESTAMP
```

**Important**: Never edit existing migration files. Always create new timestamped files for schema changes.
