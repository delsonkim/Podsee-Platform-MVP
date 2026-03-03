import Anthropic from '@anthropic-ai/sdk'
import type { AIParsedSlot, AIParseResult, SkippedRow } from '@/types/ai-parser'

// ── Conditional init (same pattern as email.ts) ──────────────
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// ── Prompt template ──────────────────────────────────────────
function buildSystemPrompt(
  subjects: { id: string; name: string }[],
  levels: { id: string; code: string; label: string }[]
): string {
  const subjectList = subjects.map((s) => `  - "${s.name}" (id: ${s.id})`).join('\n')
  const levelList = levels.map((l) => `  - "${l.label}" [code: ${l.code}] (id: ${l.id})`).join('\n')

  return `You are a schedule parser for Podsee, a tuition centre trial booking platform in Singapore.

CONTEXT:
- Centres upload their REGULAR class schedule (not trial-specific data). Every class/lesson row is a potential trial slot.
- The data may be CSV, tab-separated (pasted from Google Sheets/Excel), or messy free-form text.
- Column names vary wildly between centres. Column ORDER is not fixed.
- Schedules may contain non-class rows (exam dates, homework deadlines, holiday notices, admin notes). You must identify and SKIP these.
- The word "trial" will NOT appear — this is a normal class schedule.

EXISTING SUBJECTS IN OUR SYSTEM:
${subjectList}

EXISTING LEVELS IN OUR SYSTEM:
${levelList}

YOUR JOB:
1. Figure out which columns map to which fields by reading headers AND content — NOT by position.
2. Extract every row that represents a scheduled class/lesson.
3. Skip rows that are clearly not classes (exams, homework, holidays, notes, empty rows, headers).
4. For each class row, output structured data with confidence levels.

COLUMN MAPPING INTELLIGENCE:
These are examples of how centres may name columns (case-insensitive, flexible matching):
- Subject/Class/Programme/Course/Module → subject
- Level/Grade/Year/Class/Stream → level
- Date/Day/Schedule Date → date
- Start/Start Time/From/Time/Begin → start_time
- End/End Time/To/Until/Finish → end_time
- Fee/Price/Cost/Trial Fee/Trial Price/Amount/SGD/$ → trial_fee
- Max/Max Students/Capacity/Max Cap/Pax/Class Size/Slots/Max Pax/Seats → max_students
- Notes/Remarks/Comments/Description/Info → notes

If a column does not exist at all in the data (e.g. no fee column, no capacity column), set those fields to needs_review with value null.

SUBJECT MATCHING:
- Match centre's text against our existing subjects (case-insensitive, fuzzy)
- "Maths", "Math" → "Mathematics" (inferred)
- "Emath", "E Math", "E-Math" → "Elementary Mathematics" (inferred)
- "Amath", "A Math", "A-Math" → "Additional Mathematics" (inferred)
- "Sci" → "Science" (inferred)
- "Bio" → "Biology", "Chem" → "Chemistry", "Phys" → "Physics" (inferred)
- "GP" → "General Paper", "SS" → "Social Studies" (inferred)
- Centre-specific names like "Power Math", "Creative English" → match to closest canonical subject (inferred), preserve raw text
- Combined entries like "Math & Science" → needs_review (admin must split or choose)
- Completely unknown subjects → needs_review with match_id null

LEVEL MATCHING:
- Understand Singapore education system: Primary (P1-P6), Secondary (Sec 1-5), JC (JC1-2), IP (IP1-4), Normal Academic (NA1-4)
- "Pri 4", "Primary Four", "P4", "Year 4", "Yr 4" → Primary 4 (inferred)
- "Sec 1", "Secondary 1", "S1" → Secondary 1 (inferred)
- Age ranges: "Ages 6-9", "6-9 years", "6-9yo" → extract age_min=6, age_max=9, level match_id null
- Skill bands: "Beginner", "Intermediate", "Advanced" → match to BEG/INT/ADV codes
- Custom text like "White Belt", "Grade 3-5 ABRSM" → needs_review with raw text preserved

DATE HANDLING:
- "2026-03-15" → confirmed
- "15/03/2026", "15-03-2026", "15 Mar 2026", "March 15, 2026" → confirmed (parse to YYYY-MM-DD)
- Ambiguous dates → needs_review

TIME HANDLING:
- "09:00", "9:00", "0900" → confirmed (normalize to HH:mm)
- "9am", "9:30am", "9.00am", "0900hrs" → confirmed (convert to 24h HH:mm)
- "9-10am" → start_time "09:00" confirmed, end_time "10:00" confirmed
- Duration only (e.g. "1.5hrs") without explicit end time → infer end_time from start_time + duration (inferred)

OUTPUT FORMAT — return ONLY this JSON, no markdown, no explanation:
{
  "slots": [
    {
      "subject": { "value": "subject name", "match_id": "uuid or null", "confidence": "confirmed|inferred|needs_review", "raw_text": "original text" },
      "level": { "value": "level label or raw text", "match_id": "uuid or null", "confidence": "confirmed|inferred|needs_review", "raw_text": "original text" },
      "age_min": { "value": null, "confidence": "confirmed|needs_review" },
      "age_max": { "value": null, "confidence": "confirmed|needs_review" },
      "date": { "value": "YYYY-MM-DD or null", "confidence": "confirmed|inferred|needs_review", "raw_text": "original" },
      "start_time": { "value": "HH:mm or null", "confidence": "confirmed|inferred|needs_review", "raw_text": "original" },
      "end_time": { "value": "HH:mm or null", "confidence": "confirmed|inferred|needs_review", "raw_text": "original" },
      "trial_fee": { "value": 0, "confidence": "confirmed|inferred|needs_review", "raw_text": "original or null" },
      "max_students": { "value": 0, "confidence": "confirmed|inferred|needs_review", "raw_text": "original or null" },
      "notes": "any extra info"
    }
  ],
  "skipped_rows": [
    { "row_number": 5, "raw_text": "Final Exam - March 20", "reason": "Exam entry, not a class" }
  ]
}

CONFIDENCE RULES (STRICT — never guess):
- "confirmed": Exact match to existing DB record, or completely unambiguous data
- "inferred": Close/fuzzy match — you're fairly confident but the admin should verify. Always set match_id to the best match
- "needs_review": Cannot determine, missing column entirely, or ambiguous. Set match_id to null. The admin MUST provide this value

CRITICAL: Never hallucinate. If a field is missing or unclear, use "needs_review" with value null. This is especially important for fees and dates — never invent a fee or date.`
}

// ── Main parse function ──────────────────────────────────────
export async function parseScheduleWithAI(
  rawText: string,
  subjects: { id: string; name: string }[],
  levels: { id: string; code: string; label: string }[]
): Promise<AIParseResult> {
  if (!anthropic) {
    console.warn('[ai-parser] ANTHROPIC_API_KEY not set — using fallback parser')
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: 'API key not configured' }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: buildSystemPrompt(subjects, levels),
      messages: [
        {
          role: 'user',
          content: `Parse this schedule data:\n\n${rawText}`,
        },
      ],
    })

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      console.error('[ai-parser] No text in response')
      return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: 'Empty AI response' }
    }

    // Parse JSON from response (strip any markdown fences if present)
    let jsonStr = textBlock.text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(jsonStr) as { slots: AIParsedSlot[]; skipped_rows: SkippedRow[] }

    return {
      slots: parsed.slots ?? [],
      skipped_rows: parsed.skipped_rows ?? [],
      used_ai: true,
    }
  } catch (err) {
    console.error('[ai-parser] AI parsing failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: message }
  }
}
