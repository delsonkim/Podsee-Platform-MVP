# AI Schedule Parser — Implementation Plan

## Context
The Add Centre form (Step 4: Schedule) currently uses a rule-based CSV parser in `SlotUploader.tsx` with a fixed 8-column format. It fails on unknown subjects, can't handle flexible column ordering, and has no way to resolve issues in-place. Real-world centre schedules are messy — columns named differently ("Max Cap", "Class Size", "Pax"), rows mixed with exams/homework that aren't trial slots, and wildly inconsistent formatting. We need an AI parser that intelligently extracts trial slot data from any structure and shows a user-friendly clarification UI in the Add Centre form itself.

**Approach**: Pure AI — always send raw CSV to Claude API via `@anthropic-ai/sdk`. Keep existing rule-based parser as silent fallback if API is unavailable.

**Key design principles**:
- **The prompt is everything** — carefully engineered to handle flexible column names, column order, and mixed content (exams, homework rows filtered out)
- **All resolution happens in the UI** — flagged fields show friendly inline dropdowns and inputs right in the Add Centre form, never on the backend
- **Column naming is flexible** — "max capacity", "class size", "pax", "slots" all map to max_students. The AI handles this, not rigid column positions
- **Filter, don't reject** — if a schedule has exam rows or homework entries, the AI silently skips them and only returns trial-relevant slots

---

## Steps

### Step 1: Migration — add `is_custom` to `subjects`
**New file**: `supabase/migrations/20260307000000_add_is_custom_to_subjects.sql`
```sql
ALTER TABLE subjects ADD COLUMN is_custom boolean NOT NULL DEFAULT false;
```
All existing subjects default to `false`. AI-created subjects get `true`.

### Step 2: Install SDK + env var
- `cd app && npm install @anthropic-ai/sdk`
- Add `ANTHROPIC_API_KEY` to `app/.env.local`

### Step 3: Update types
**Modify**: `app/src/types/database.ts` — add `is_custom: boolean` to `Subject` interface

**New file**: `app/src/types/ai-parser.ts` — shared types (type-only, no runtime imports so both server and client can use):
```typescript
export type Confidence = 'confirmed' | 'inferred' | 'needs_review'

export interface AIField<T> {
  value: T
  confidence: Confidence
  match_id?: string | null
  raw_text?: string
}

export interface AIParsedSlot {
  subject: AIField<string>
  level: AIField<string>
  age_min: AIField<number | null>
  age_max: AIField<number | null>
  date: AIField<string>
  start_time: AIField<string>
  end_time: AIField<string>
  trial_fee: AIField<number>
  max_students: AIField<number>
  notes: string
}

export interface SkippedRow {
  row_number: number
  raw_text: string
  reason: string   // e.g. "Exam entry", "Holiday notice", "Administrative note"
}

export interface AIParseResult {
  slots: AIParsedSlot[]
  skipped_rows: SkippedRow[]  // non-class rows (exams, holidays, notes) shown to admin
  used_ai: boolean
  fallback_reason?: string
}
```

### Step 4: AI parser module
**New file**: `app/src/lib/ai-parser.ts`
- Conditional Anthropic client init (same pattern as `lib/email.ts`)
- `parseScheduleWithAI(rawText, subjects[], levels[])` → `AIParseResult`
- Model: `claude-haiku-4-5-20251001` (cheapest, ~$0.005/parse for 30 rows)
- On failure (no API key, network error, parse error): fall back to existing `parseRows()` from SlotUploader, convert output to `AIParseResult` with `used_ai: false`

**Prompt design (critical — this is the core of the feature)**:

The prompt must handle real-world messiness:

1. **Flexible column detection** — AI figures out which columns are which by content, not by position. "Max Cap", "Class Size", "Pax", "Students", "Capacity", "Max Pax" all → `max_students`. "Fee", "Trial Fee", "Price", "Cost", "Trial Price ($)", "SGD" all → `trial_fee`. "Time", "Start", "From" → `start_time`. Etc.

2. **Row filtering** — Centres upload their REGULAR class schedule (not trial-specific data). Every class row = a potential trial slot. However, schedules may also contain non-class rows (exam dates, homework, holidays, admin notes). The AI keeps all class entries, skips non-class rows. The word "trial" will NOT appear — it's just a normal schedule. Fields like `trial_fee` and `max_students` may be entirely absent from the schedule — the clarification UI handles this gracefully with bulk inputs (see Step 6).

3. **Subject intelligence** — The prompt receives the full list of existing subjects in our DB. The AI should:
   - Match "Maths" → "Mathematics", "Emath" → "Elementary Mathematics" (inferred)
   - Recognize Singapore education context (MOE subjects, enrichment categories)
   - Handle combined entries like "Math & Science" → flag as needs_review for the admin to split or confirm
   - Handle centre-specific programme names like "Power Math" or "Creative English" → inferred match to closest canonical subject, with the raw name preserved

4. **Level intelligence** — Understand Singapore education system levels: P1-P6, Sec 1-5, JC1-2, IP, NA, age bands for enrichment. Handle "Pri 4", "Primary Four", "P4", "Year 4" all → Primary 4.

5. **Confidence rules (strict)**:
   - `confirmed` — exact match to existing DB record, or unambiguous data (clear ISO date, 24h time, number)
   - `inferred` — close/fuzzy match (e.g. "Maths" → "Mathematics"). Set `match_id` to best match. Admin will see "Did you mean X?" with option to change
   - `needs_review` — cannot determine, missing, or ambiguous. Admin MUST resolve before import

6. **Never hallucinate** — if a field is missing or ambiguous, use `needs_review`. Never fill in a plausible-sounding value. Especially for fees and dates — if the AI isn't sure, it asks.

7. **Skipped rows reporting** — return a `skipped_rows` array with `{ row_number, raw_text, reason }` so the admin can see what was filtered out in a collapsible section

8. **Missing columns are normal** — if the schedule has no fee column or no capacity column, return those fields as `needs_review` with `value: null`. The clarification UI handles this gracefully with bulk defaults (one input for all rows, not per-row errors)

### Step 5: Server actions for parsing + custom subjects
**Modify**: `app/src/app/admin/centres/new/actions.ts`

Add two new exported server actions:
1. `parseSchedule(rawText: string)` — fetches subjects+levels from DB, calls `parseScheduleWithAI()`, returns result
2. `createCustomSubject(name: string)` — checks for existing (case-insensitive), creates with `is_custom: true` if new, returns `{ id, name }`

### Step 6: Clarification UI (low-friction, wizard-style)
**New file**: `app/src/app/admin/centres/new/SlotClarificationTable.tsx`

Interactive `'use client'` component. **UX priority: feel like a guided wizard, not an error report.**

**Layout — three sections top to bottom:**

**Section A: Bulk defaults** (shown only when needed)
If entire columns are missing (common: trial_fee, max_students won't be in regular schedules), show clean bulk inputs at the top:
- "Trial fee for all slots: $ [___]" — single number input, applied to every row
- "Max trial students per class: [___]" — single number input
- Per-row overrides available in the table below if some slots differ
- This turns 30 red cells into ONE simple input — massively reduces friction

**Section B: Parsed schedule table**
Clean table showing AI results. Cell styling is subtle, not alarming:
- **Confirmed fields** — normal text, no special styling (most cells should be this)
- **Inferred fields** — light amber dot/indicator + the AI's suggestion shown. Clicking opens a dropdown: "We matched 'Maths' to Mathematics — correct?" with existing subjects list. Default is the AI suggestion, so if it's right the admin just moves on
- **Needs review fields** — light outline + placeholder text. Inline dropdown (subjects/levels) or input (dates/numbers). Friendly label like "Which subject?" not "ERROR: Unknown subject"
- Row-level checkbox to exclude individual rows the admin doesn't want to import
- Skipped rows shown in a collapsible section at the bottom: "3 rows skipped (not class entries)" — expandable to see what and why

**Section C: Action bar**
- Summary line: "12 slots ready, 2 need your input" (not "2 ERRORS")
- "Confirm & Import" button — disabled only until the few `needs_review` items are resolved
- "Re-upload" link to start over

**Key behaviors:**
- On confirm: converts resolved `AIParsedSlot[]` → `ParsedSlot[]` (existing interface) and calls `onSlotsReady`
- For "Create new subject" selections in dropdowns: calls `createCustomSubject()` before `onSlotsReady`
- Fallback warning banner (non-alarming) if `used_ai: false`: "Basic matching was used — please review carefully"

### Step 7: Refactor SlotUploader
**Modify**: `app/src/app/admin/centres/new/SlotUploader.tsx`

State machine: `'input'` → `'parsing'` (loading) → `'review'` (clarification table)

Changes:
- Keep existing `parseRows()` + helpers intact (fallback)
- On file upload / paste → set state to `'parsing'`, call `parseSchedule()` server action
- On success → show `SlotClarificationTable` with AI results
- On exception → run local `parseRows()` as fallback, show warning
- `SlotClarificationTable.onConfirm` produces `ParsedSlot[]` → calls existing `onSlotsReady` prop

**Key**: `AddCentreForm.tsx` and `createCentre()` action need ZERO changes — the clarification table converts AI output to `ParsedSlot[]` which is the existing interface.

### Step 8: Admin subjects page
**New files**:
- `app/src/app/admin/subjects/page.tsx` — table of all subjects (name, canonical/custom badge, centre usage count, actions)
- `app/src/app/admin/subjects/actions.ts` — `renameSubject()`, `mergeSubject(customId, canonicalId)`, `deleteSubject(id)`
- `app/src/app/admin/subjects/SubjectActions.tsx` — client component for inline rename/merge/delete buttons

**Modify**: `app/src/app/admin/AdminNav.tsx` — add `{ href: '/admin/subjects', label: 'Subjects' }` after Centres

Merge logic: update all FK references (`trial_slots`, `centre_subjects`, `centre_subject_levels`, `teacher_subjects`) from custom → canonical, then delete custom row.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/migrations/20260307000000_add_is_custom_to_subjects.sql` | Create |
| `app/src/types/database.ts` | Modify (add `is_custom` to Subject) |
| `app/src/types/ai-parser.ts` | Create (shared types) |
| `app/src/lib/ai-parser.ts` | Create (Claude API + prompt + fallback) |
| `app/src/app/admin/centres/new/actions.ts` | Modify (add parseSchedule + createCustomSubject) |
| `app/src/app/admin/centres/new/SlotClarificationTable.tsx` | Create (review table) |
| `app/src/app/admin/centres/new/SlotUploader.tsx` | Modify (async flow + loading + clarification) |
| `app/src/app/admin/subjects/page.tsx` | Create |
| `app/src/app/admin/subjects/actions.ts` | Create |
| `app/src/app/admin/subjects/SubjectActions.tsx` | Create |
| `app/src/app/admin/AdminNav.tsx` | Modify (add Subjects link) |

**NOT modified**: `AddCentreForm.tsx`, `page.tsx` (existing interfaces preserved)

---

## Verification
1. `cd app && npx tsc --noEmit` — no errors
2. `cd app && npm run build` — builds cleanly
3. Upload messy CSV (misspelled subjects, weird date formats) → AI returns confidence levels
4. Set `ANTHROPIC_API_KEY` to empty → fallback to rule-based parser with warning banner
5. Clarification UI: green/amber/red cells render correctly, dropdowns work, "Create new" creates subject with `is_custom: true`
6. Full flow: complete Add Centre form with AI-parsed schedule → centre + slots created in DB
7. Admin subjects page: list subjects, merge custom into canonical, verify FK references updated
