import Anthropic from '@anthropic-ai/sdk'
import type { AIParsedSlot, AIParseResult, SkippedRow } from '@/types/ai-parser'
import type { StoredCorrection } from '@/lib/parse-corrections'

// ── Conditional init ─────────────────────────────────────────
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// ── Options for parse functions ──────────────────────────────
export interface ParseOptions {
  weeksAhead?: number          // Generate dates for N weeks when only day names given
  corrections?: StoredCorrection[]  // Learned corrections to inject into prompt
}

// ── SEAB reference list (for rare subject recognition) ───────
const SEAB_SUBJECT_REFERENCE = `
FULL SEAB 2026 SUBJECT REFERENCE (for recognition only — match to our DB subjects when possible):

O-Level: English Language, Literature in English, History, Geography, Economics, Drama,
  Additional Mathematics, Mathematics, Elementary Mathematics,
  Science (Physics/Chemistry), Science (Physics/Biology), Science (Chemistry/Biology),
  Physics, Chemistry, Biology, Electronics, Music, Higher Music,
  Nutrition and Food Science, Art, Higher Art, Design & Technology,
  Business Studies, Principles of Accounts, Computing,
  Exercise and Sports Science, Biotechnology, Design Studies,
  Humanities (Social Studies + Geography), Humanities (Social Studies + History),
  Humanities (Social Studies + Literature in English),
  Humanities (Social Studies + Literature in Chinese/Malay/Tamil),
  Higher Chinese, Chinese, Chinese B, Literature in Chinese,
  Higher Malay, Malay, Malay B, Literature in Malay,
  Higher Tamil, Tamil, Tamil B, Literature in Tamil,
  Arabic, Hindi, Urdu, Gujarati, Panjabi, Bengali, Burmese, Thai, French, German, Japanese, Spanish

A-Level (H1/H2/H3): General Paper, Knowledge and Inquiry, Project Work,
  Mathematics, Further Mathematics, Physics, Chemistry, Biology,
  Economics, History, Geography, Literature in English,
  Art, Music, Computing, Theatre Studies and Drama,
  English Language and Linguistics, Management of Business,
  Principles of Accounts, China Studies in English, China Studies in Chinese,
  Chinese Language and Literature, Malay Language and Literature, Tamil Language and Literature,
  Translation (Chinese)

Common enrichment: Piano, Violin, Guitar, Drums, Vocal/Singing, Ballet, Dance,
  Taekwondo, Wushu, Swimming, Chess, Coding/Programming, Creative Writing,
  Public Speaking, Abacus/Mental Maths, Art & Craft, Drawing/Sketching, Chinese Calligraphy
`.trim()

// ── Build system prompt ──────────────────────────────────────
function buildSystemPrompt(
  subjects: { id: string; name: string }[],
  levels: { id: string; code: string; label: string }[],
  options?: ParseOptions
): string {
  const subjectList = subjects.map((s) => `  - "${s.name}" (id: ${s.id})`).join('\n')
  const levelList = levels.map((l) => `  - "${l.label}" [code: ${l.code}] (id: ${l.id})`).join('\n')

  // Build corrections section if available
  let correctionsSection = ''
  if (options?.corrections && options.corrections.length > 0) {
    const subjectCorr = options.corrections.filter((c) => c.field_type === 'subject')
    const levelCorr = options.corrections.filter((c) => c.field_type === 'level')
    const timeCorr = options.corrections.filter((c) => c.field_type === 'time')

    const parts: string[] = []
    if (subjectCorr.length > 0) {
      parts.push('SUBJECT ALIASES (learned from past corrections — use these with "confirmed" confidence):\n' +
        subjectCorr.map((c) => `  - "${c.ai_raw_text}" → "${c.user_value}"${c.user_match_id ? ` (id: ${c.user_match_id})` : ''}`).join('\n'))
    }
    if (levelCorr.length > 0) {
      parts.push('LEVEL ALIASES (learned):\n' +
        levelCorr.map((c) => `  - "${c.ai_raw_text}" → "${c.user_value}"${c.user_match_id ? ` (id: ${c.user_match_id})` : ''}`).join('\n'))
    }
    if (timeCorr.length > 0) {
      parts.push('TIME PATTERNS (learned):\n' +
        timeCorr.map((c) => `  - "${c.ai_raw_text}" → "${c.user_value}"`).join('\n'))
    }

    if (parts.length > 0) {
      correctionsSection = `\n\nLEARNED CORRECTIONS FROM PAST PARSES (treat as confirmed facts):\n${parts.join('\n\n')}`
    }
  }

  // Build date generation section
  const now = new Date()
  const sgDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' }) // YYYY-MM-DD
  const weeksAhead = options?.weeksAhead ?? 4

  const dateGenSection = `
DATE GENERATION (when only day names are given):
- Today's date (Singapore): ${sgDate}
- If the schedule only has day names (Monday, Tue, Wed, etc.) without specific dates:
  Generate the NEXT ${weeksAhead} occurrences of each day, starting from the next occurrence after today.
  Example: If today is ${sgDate} and a class is on "Monday", generate the next ${weeksAhead} Mondays.
  Each generated date becomes a SEPARATE slot (same subject/level/time, different date).
  Set date confidence to "inferred" for generated dates, with raw_text = the original day name.
- If specific dates ARE provided, use them as-is (do NOT generate additional dates).
- Some schedules mix day names and specific dates — handle both appropriately.`

  return `You are a schedule parser for Podsee, a tuition centre trial booking platform in Singapore.

CONTEXT:
- Centres upload their REGULAR class schedule (not trial-specific data). Every class/lesson row is a potential trial slot.
- The data may be CSV, tab-separated (pasted from Google Sheets/Excel), messy free-form text, or a screenshot/photo.
- Column names vary wildly between centres. Column ORDER is not fixed.
- Data may come from MULTIPLE Excel sheets concatenated together (sheet names appear as "--- Sheet: Name ---" separators).
- Schedules may contain non-class rows (exam dates, homework deadlines, holiday notices, admin notes, student names, grades, progress tracking). You must identify and SKIP these.
- Fees/prices are RARELY included in schedules. If there is no fee column at all, set trial_fee to needs_review with value null for every slot.
- The word "trial" will NOT appear — this is a normal class schedule.

EXISTING SUBJECTS IN OUR SYSTEM (match to these with their IDs):
${subjectList}

EXISTING LEVELS IN OUR SYSTEM:
${levelList}

${SEAB_SUBJECT_REFERENCE}

YOUR JOB:
1. Figure out which columns map to which fields by reading headers AND content — NOT by position.
2. Extract every row that represents a scheduled class/lesson.
3. Skip rows that are clearly not classes (exams, homework, holidays, notes, empty rows, headers, student names, grades, attendance records, progress notes, admin data).
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

If a column does not exist at all in the data, set those fields to needs_review with value null.

SUBJECT MATCHING:
- Match centre's text against our existing subjects (case-insensitive, fuzzy)
- Common abbreviations: "Maths"/"Math" → Mathematics, "Emath"/"E Math" → Elementary Mathematics, "Amath"/"A Math" → Additional Mathematics
- "Sci" → Science, "Bio" → Biology, "Chem" → Chemistry, "Phys" → Physics
- "GP" → General Paper, "SS" → Social Studies, "POA" → Principles of Accounts
- "F&N"/"FN"/"Food & Nutrition" → Nutrition and Food Science
- "D&T"/"DnT" → Design & Technology, "Biz Studies" → Business Studies
- "Comp"/"CS" → Computing (NOT "Coding / Programming" unless explicitly coding/programming enrichment)
- "Econs" → Economics, "Lit" → Literature, "Geog" → Geography, "Hist" → History
- "MOB" → Management of Business, "ELL" → English Language and Linguistics
- "FM"/"F Math"/"Further Math" → Further Mathematics
- Chinese characters: 华文 → Chinese Language, 英文 → English Language, 数学 → Mathematics, 科学 → Science, 马来文 → Malay Language, 淡米尔文 → Tamil Language
- Centre-specific branded names (e.g., "Power Math", "Super Science") → match to closest canonical subject (inferred), preserve raw text
- Combined/bundled subjects (e.g., "Math & Science", "Geog/History") → needs_review (admin must clarify which subject)
- Sub-programs (e.g., "English Creative Writing", "Math Olympiad") → match to parent subject (inferred), preserve full raw text
- Completely unknown subjects → check SEAB reference list above. If found there, set needs_review with a note. If not found at all, needs_review with match_id null.

LEVEL MATCHING:
- Singapore education system: Primary (P1-P6), Secondary (Sec 1-5), JC (JC1-2), IP (IP1-4), Normal Academic (NA1-4)
- "Pri 4", "Primary Four", "P4", "Year 4", "Yr 4" → Primary 4 (inferred)
- "Sec 1", "Secondary 1", "S1", "Year 7" → Secondary 1 (inferred)
- Age ranges: "Ages 6-9", "6-9 years", "6-9yo" → extract age_min=6, age_max=9, level match_id null
- Skill bands: "Beginner", "Intermediate", "Advanced" → match to BEG/INT/ADV codes
- Custom text like "White Belt", "Grade 3-5 ABRSM" → needs_review with raw text preserved

${dateGenSection}

DATE HANDLING (when explicit dates are given):
- "2026-03-15" → confirmed
- "15/03/2026", "15-03-2026", "15 Mar 2026", "March 15, 2026" → confirmed (parse to YYYY-MM-DD)
- Ambiguous dates → needs_review

TIME HANDLING:
- "09:00", "9:00", "0900" → confirmed (normalize to HH:mm)
- "9am", "9:30am", "9.00am", "0900hrs" → confirmed (convert to 24h HH:mm)
- "9-10am", "9am-10am", "9 to 10am" → start_time "09:00", end_time "10:00" (confirmed)
- "2-3.30pm" → start_time "14:00", end_time "15:30" (confirmed)
- Duration only (e.g. "1.5hrs", "90min") without explicit end time → infer end_time from start_time + duration (inferred)

EDGE CASES (handle these):
- MULTI-DAY ROWS: "Mon & Wed, 3-5pm" or "Mon/Wed/Fri" → create SEPARATE slots for EACH day (same subject/level/time, different dates)
- MERGED CELLS / INHERIT FROM ABOVE: If a subject cell is blank but the level/time/date cells have data, inherit the subject from the row above. This is common in Excel exports where cells are merged.
- GRID/TIMETABLE FORMAT: Some schedules have days as columns and times as rows (or vice versa). Detect this layout and pivot into individual slots.
- MULTIPLE SHEETS: Data from multiple Excel sheets is separated by "--- Sheet: Name ---" lines. The sheet name may indicate the month, week, level group, or category. Use this context when parsing.
- NON-CLASS DATA: Student names, test scores, attendance marks, progress notes, homework assignments — SKIP these rows with a clear reason in skipped_rows.
- "Free"/"FOC"/"$0" in fee → trial_fee value 0, confidence confirmed
- RECURRING INFO: "Every Monday" or "Weekly" annotations are hints for date generation, not separate data.

ROW ORDER: Output slots in the SAME ORDER as they appear in the input data. Do NOT sort or reorder. The user will compare your output against their original spreadsheet row by row.

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
- "confirmed": Exact match to existing DB record, or completely unambiguous data, or a learned correction from past parses
- "inferred": Close/fuzzy match — you're fairly confident but the admin should verify. Always set match_id to the best match
- "needs_review": Cannot determine, missing column entirely, or ambiguous. Set match_id to null. The admin MUST provide this value
${correctionsSection}
CRITICAL: Never hallucinate. If a field is missing or unclear, use "needs_review" with value null. This is especially important for fees and dates — never invent a fee or date.`
}

// ── Shared: extract JSON from AI response ────────────────────
function extractJsonFromResponse(response: Anthropic.Message): { json: string } | { error: string } {
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return { error: 'Empty AI response' }
  }

  let jsonStr = textBlock.text.trim()
  // Strip markdown fences
  jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')
  // Extract the JSON object between first { and last }
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error('[ai-parser] No JSON object found in response:', jsonStr.slice(0, 300))
    return { error: 'AI response did not contain valid JSON' }
  }
  jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)

  // Try to repair truncated JSON (when AI hits max_tokens)
  try {
    JSON.parse(jsonStr)
  } catch {
    console.warn('[ai-parser] JSON parse failed, attempting repair...')
    jsonStr = repairTruncatedJson(jsonStr)
  }

  return { json: jsonStr }
}

// ── Repair truncated JSON (close unclosed arrays/objects) ────
function repairTruncatedJson(jsonStr: string): string {
  // Find the last complete slot object (ends with })
  // Truncation usually happens mid-slot, so we cut back to the last complete one
  const slotsStart = jsonStr.indexOf('"slots"')
  if (slotsStart === -1) return jsonStr

  // Find last complete object closure "}" followed by comma or array end
  // Walk backwards from end to find last "}," or "}" that closes a slot
  let lastComplete = -1
  let braceDepth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braceDepth++
    if (ch === '}') {
      braceDepth--
      // depth 1 = closing a slot object (outer { is depth 0)
      if (braceDepth === 1) lastComplete = i
    }
  }

  if (lastComplete > 0) {
    // Cut after the last complete slot, close the arrays/object
    const repaired = jsonStr.slice(0, lastComplete + 1) + '], "skipped_rows": [] }'
    try {
      JSON.parse(repaired)
      console.log('[ai-parser] JSON repair successful — truncated slots recovered')
      return repaired
    } catch {
      // Repair didn't work either
    }
  }

  return jsonStr
}

// ── Parse result from JSON ───────────────────────────────────
function parseJsonResult(jsonStr: string): AIParseResult {
  const parsed = JSON.parse(jsonStr) as { slots: AIParsedSlot[]; skipped_rows: SkippedRow[] }
  return {
    slots: parsed.slots ?? [],
    skipped_rows: parsed.skipped_rows ?? [],
    used_ai: true,
  }
}

// ── Main parse function (text) ───────────────────────────────
export async function parseScheduleWithAI(
  rawText: string,
  subjects: { id: string; name: string }[],
  levels: { id: string; code: string; label: string }[],
  options?: ParseOptions
): Promise<AIParseResult> {
  if (!anthropic) {
    console.warn('[ai-parser] ANTHROPIC_API_KEY not set — using fallback parser')
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: 'API key not configured' }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      system: buildSystemPrompt(subjects, levels, options),
      messages: [
        {
          role: 'user',
          content: `Parse this schedule data:\n\n${rawText}`,
        },
      ],
    })

    const result = extractJsonFromResponse(response)
    if ('error' in result) {
      return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: result.error }
    }

    return parseJsonResult(result.json)
  } catch (err) {
    console.error('[ai-parser] AI parsing failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: message }
  }
}

// ── Image parse function (screenshot/photo) ──────────────────
export async function parseScheduleImageWithAI(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  subjects: { id: string; name: string }[],
  levels: { id: string; code: string; label: string }[],
  options?: ParseOptions
): Promise<AIParseResult> {
  if (!anthropic) {
    console.warn('[ai-parser] ANTHROPIC_API_KEY not set — cannot parse image')
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: 'API key not configured' }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16384,
      system: buildSystemPrompt(subjects, levels, options),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: 'Parse all the class/lesson schedule data visible in this image. Extract every row that represents a scheduled class.',
            },
          ],
        },
      ],
    })

    const result = extractJsonFromResponse(response)
    if ('error' in result) {
      return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: result.error }
    }

    return parseJsonResult(result.json)
  } catch (err) {
    console.error('[ai-parser] AI image parsing failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { slots: [], skipped_rows: [], used_ai: false, fallback_reason: message }
  }
}
