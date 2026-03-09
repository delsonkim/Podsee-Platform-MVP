# NEW PLAN: TODO.md Consolidation + 3 New Feature Sections (NOT CP9-F)

## Context
TODO.md is 730+ lines. ~80% is completed work. We need to trim it down and add 3 new features the user wants to think through: trial vs regular pricing, auto-scrape centre websites, and multi-branch centres.

---

## Part 1: Trim TODO.md

Collapse completed sections to one-line summaries:
- Section 1 (Centre Dashboard) → one line "Done"
- Section 2 (Reference Numbers) → one line "Done"
- Section 3 (Capacity) → one line "Done"
- Section 5 (Other Items) → collapse completed, keep unchecked
- Section 6 (AI Parser) → collapse v1 (done), keep v2 as-is (user is working on this separately)
- Section 7, CP1-CP9 → one line each "Done"
- Section 7, Future Items → keep as-is
- Remove ASCII flow diagrams, old file listings for completed work
- Keep: Section 4 (UI/UX) unchecked items, Section 7 Future Items, new sections below

Target: ~250-300 lines (from 730)

---

## Part 2: Three New Feature Sections to Add

### Feature A: Trial vs Regular Class Info (Pricing & Duration)

**Decision**: Free-text field for MVP.

**What to build**:
- Migration: add `pricing_info TEXT` to centres table
- TypeScript type: add to Centre interface
- Centre dashboard: add Pricing section to centre-info page (view/edit, same LinkedIn pattern)
- Admin edit page: add pricing_info to profile section
- Add Centre form: add pricing_info textarea in Step 2 (About)
- Public centre detail page: show pricing info section (between About and Available Trials)
- Placeholder text: "e.g. Trial: 1hr, S$10 | Regular classes: 2hrs, S$280/month"

**Tasks**:
- [ ] Migration: `pricing_info TEXT` on centres
- [ ] TypeScript type update
- [ ] Centre dashboard: pricing field in centre-info forms
- [ ] Admin edit page: pricing field
- [ ] Add Centre form: pricing textarea
- [ ] Public centre page: display pricing info
- [ ] Mock data for existing centres

---

### Feature B: Auto-Scrape Centre Website for Onboarding

**Decision**: During onboarding (Add Centre form). Admin pastes website URL in Step 1, AI pre-fills Steps 2-4.

**What to build**:
- Migration: add `website_url TEXT` to centres table
- Step 1 of Add Centre form: add "Centre Website" URL input (optional)
- New server action: `scrapeWebsite(url: string)` → returns structured JSON matching our fields
- Implementation:
  1. Fetch HTML from URL (server-side, using `fetch` or a scraping library)
  2. Pass HTML content to Claude API with a structured extraction prompt
  3. Claude returns JSON: `{ description, teaching_style, track_record, address, area, nearest_mrt, class_size, years_operating, policies... }`
  4. Map to form fields
- After Step 1 completes (centre created): if website URL provided, auto-scrape in background
- Steps 2-4 open pre-filled with scraped data
- Admin reviews, adjusts, saves — ensuring **uniform presentation**
- Fallback: if scrape fails, form is empty (normal flow)

**Key design constraint**: The AI prompt must enforce our field schema. Output maps to exact column names. This guarantees uniform data regardless of source website quality.

**Tasks**:
- [ ] Migration: `website_url TEXT` on centres
- [ ] TypeScript type update
- [ ] Server action: `scrapeWebsite(url)` — fetch HTML + Claude extraction
- [ ] Add Centre form Step 1: website URL input
- [ ] Add Centre form: after Step 1, call scrape, pre-fill Steps 2-4
- [ ] Claude prompt: structured extraction matching our field schema
- [ ] Error handling: timeout, invalid URL, scrape fails → graceful fallback
- [ ] Admin edit page: show website_url as read-only link

---

### Feature C: Multi-Branch Centres

**Decision**: Parent-child centre model. Each branch = its own centre record (so slots, bookings, teachers all work as-is). A `parent_centre_id` groups branches under one brand. Centre manager links to parent, gets access to all branches.

**Why not separate records with naming convention**: Centre manager can't monitor all branches from one dashboard. Teachers overlap across branches. Shared policies/description would be duplicated 4x and hard to keep in sync.

**What to build**:

**Schema**:
- Migration: add `parent_centre_id UUID REFERENCES centres(id)` + `branch_name TEXT` to centres
- Parent record: brand-level info (name, description, policies, teachers, commission rates). `is_active=false` (not listed directly — branches are listed)
- Branch records: `parent_centre_id` set, has own address/area/MRT/parking/slots. `is_active=true`. Name inherited from parent, displayed as "Brand Name — Branch Name"

**Centre auth**:
- `centre_users.centre_id` links to the PARENT centre
- Modify `requireCentreUser()`: return `parentCentreId` + array of `branchCentreIds`
- Dashboard queries: filter by branch (with a branch picker dropdown)

**Admin onboarding**:
- Add Centre form: after Step 1, option to "Add Branch" (creates child centre record linked to parent)
- Admin edit page: show branches list with links to each branch's edit page
- Admin centres list: indent branches under parent, or show "4 branches" badge

**Public listing**:
- Each branch shows as its own card (since they have different locations/slots)
- Card shows brand name + branch name: "The Learning Lab — Bukit Timah"
- Centre detail page: banner showing "Also at: Clementi, Jurong East, Tampines" with links

**Centre dashboard**:
- Branch picker dropdown at top of dashboard (or in nav)
- Shared info (profile, policies) editable once on parent → propagates to all branches
- Location-specific info (address, MRT) editable per branch
- Slots/bookings filtered by selected branch
- Overview page: aggregate stats across all branches or per-branch toggle

**Tasks**:
- [ ] Migration: `parent_centre_id`, `branch_name` on centres
- [ ] TypeScript type update
- [ ] Modify `requireCentreUser()` to return parent + branch IDs
- [ ] Centre dashboard: branch picker dropdown
- [ ] Centre dashboard: shared info vs branch-specific info separation
- [ ] Admin: "Add Branch" flow in Add Centre or edit page
- [ ] Admin centres list: show branch grouping
- [ ] Public listing: brand + branch name display
- [ ] Public detail page: "Also at" banner with sibling branches
- [ ] Slot management: scoped to selected branch

---

## Part 3: Implementation Order

These 3 features are independent. Suggested priority:

1. **Feature A (Pricing info)** — Smallest. 1 migration + a few form fields. Can do in one session.
2. **Feature B (Auto-scrape)** — Medium. Needs Claude API integration for web content extraction. High-value for onboarding speed.
3. **Feature C (Multi-branch)** — Largest. Touches auth, dashboard, listing, admin. Build when the interested centre is ready to onboard.

---

## Verification
- TODO.md trimmed to ~250-300 lines
- 3 new feature sections clearly written with actionable tasks
- Completed work preserved as one-line summaries
- Active work easy to find at a glance
