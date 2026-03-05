# Podsee Platform MVP

Trial booking and referral platform for tuition centres in Singapore. Parents discover centres, book trial classes, and get referral rewards. Centres manage slots, bookings, and track commissions.

## Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Google OAuth
- **Email**: Resend (`bookings@podsee.sg`)
- **AI**: Anthropic Claude API (schedule parsing)
- **Deploy**: Vercel

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/delsonkim/Podsee-Platform-MVP.git
cd Podsee-Platform-MVP/app
npm install
```

### 2. Set up environment variables

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key |

Optional variables:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Transactional emails. If missing, emails are silently skipped. |
| `ANTHROPIC_API_KEY` | AI schedule parsing. If missing, AI features are disabled. |
| `NEXT_PUBLIC_SITE_URL` | Base URL for email links. Defaults to Vercel deployment URL. |

### 3. Set up the database

The full schema is in a single migration file:

```bash
# If starting fresh with a new Supabase project:
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This creates all 21 tables, enums, indexes, RPC functions, and seed data (subjects, levels, admin user).

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. In Supabase Dashboard → Authentication → Providers → Google: paste Client ID and Client Secret

### 5. Run locally

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/src/
├── app/
│   ├── (public)/           # Parent-facing pages
│   │   ├── centres/        #   Browse & view centres
│   │   ├── book/[slotId]/  #   Book a trial slot
│   │   └── my-bookings/    #   View & manage bookings
│   ├── centre-dashboard/   # Centre manager dashboard
│   │   ├── bookings/       #   View & manage bookings
│   │   ├── slots/          #   Add & manage trial slots
│   │   ├── centre-info/    #   Edit centre profile
│   │   └── team/           #   Manage staff access
│   └── admin/              # Admin dashboard
│       ├── bookings/       #   All bookings across centres
│       ├── centres/        #   Manage centres, review drafts
│       ├── outcomes/       #   Verify trial outcomes
│       ├── reviews/        #   Moderate parent reviews
│       └── links/          #   Platform URLs
├── components/             # Shared client components
├── lib/
│   ├── supabase/           # Supabase client helpers (server, client, admin)
│   ├── centre-auth.ts      # requireCentreUser() — centre dashboard auth
│   ├── admin-auth.ts       # requireAdminUser() — admin dashboard auth
│   ├── email.ts            # Resend email functions
│   ├── ai-parser.ts        # Claude AI schedule parser
│   └── public-data.ts      # Public data fetching helpers
└── types/
    └── database.ts         # TypeScript types for all tables
```

## Key Commands

```bash
cd app

npm run dev          # Start dev server
npx tsc --noEmit     # TypeScript check (no output)
npm run build        # Production build
npx vercel deploy    # Deploy to Vercel
```

## Database

- **Schema**: Single consolidated migration at `supabase/migrations/20260302000000_consolidated_schema.sql`
- **Schema diagram**: See [GeneralFlow.md](GeneralFlow.md)
- **Architecture details**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Never edit existing migration files** — always create new timestamped ones

## Key Documentation

| File | What's in it |
|------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Auth flows, design patterns, current state, known limitations |
| [GeneralFlow.md](GeneralFlow.md) | Full database schema diagram + data flows |
| [TODO.md](TODO.md) | Feature tracking — what's done, what's planned |
| [CLAUDE.md](CLAUDE.md) | AI assistant instructions for working on this codebase |
