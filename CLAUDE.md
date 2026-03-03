# Podsee Platform MVP — AI Assistant Rules

## About This Project
Podsee is a trial booking and referral platform for tuition centres in Singapore.
Parents discover centres, book trial classes, and get referral rewards.
Centres manage slots, bookings, and track commissions.

## Tech Stack
- **App**: Next.js 16 + TypeScript + Tailwind CSS 4 (in `/app`)
- **Database**: Supabase (PostgreSQL) with migrations in `/supabase/migrations`
- **Auth**: Supabase Auth with Google OAuth
- **Email**: Resend
- **Deploy**: Vercel

## Project Structure
- `app/src/app/(public)/` — Pages parents see (centres, booking, my-bookings)
- `app/src/app/admin/` — Admin dashboard (centres, bookings, outcomes, commissions, rewards)
- `app/src/lib/supabase/` — Supabase client, server, and admin helpers
- `app/src/types/database.ts` — TypeScript types for all database tables
- `supabase/migrations/` — Database schema changes (always add new files, never edit old ones)

## Workflow Rules

### 1. Plan Before Building
- For any feature that touches more than 2 files, write a plan first and get approval
- If something breaks mid-build, stop and re-plan — don't keep pushing a broken approach
- Keep plans short and focused: what changes, which files, what order

### 2. Verify Before Saying Done
- Never say a task is complete without proving it works
- Run `npx tsc --noEmit` from the `/app` directory to check for TypeScript errors
- When possible, run `npm run build` to catch build-time issues
- If a change affects the UI, describe what to check visually

### 3. Fix Bugs Directly
- When a bug is reported, investigate and fix it — don't ask a lot of questions first
- Check the error, find the cause, apply the fix, then verify
- Explain what went wrong in simple terms after fixing

### 4. Keep It Simple (MVP Mindset)
- This is an MVP — ship working features over perfect code
- Don't add extra error handling, abstractions, or "nice to haves" that weren't asked for
- Don't refactor or clean up code that isn't part of the current task
- Three similar lines of code is fine — don't create a helper function for something used once

### 5. Use Helper Agents for Research
- For complex questions, use subagents to explore the codebase in the background
- Keep the main conversation clean and focused on results

## Code Conventions
- All app code lives inside `app/src/`
- Use Server Components by default; add `"use client"` only when needed (forms, interactivity)
- Supabase queries: use `server.ts` helper in Server Components, `client.ts` in Client Components
- Database migrations: create new timestamped files in `supabase/migrations/`, never modify existing ones
- Styling: use Tailwind utility classes, no separate CSS files

## Important Commands
```bash
# Run the dev server
cd app && npm run dev

# Check for TypeScript errors
cd app && npx tsc --noEmit

# Build for production
cd app && npm run build

# Deploy to Vercel
cd app && npx vercel deploy --yes
```
