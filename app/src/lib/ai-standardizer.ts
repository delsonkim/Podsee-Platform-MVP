import Anthropic from '@anthropic-ai/sdk'

// ── Conditional init (same pattern as ai-parser.ts) ──────────
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// ── Types ────────────────────────────────────────────────────

export interface SubjectLevelPair {
  subject_id: string
  subject_name: string
  level_id: string | null
  level_label: string | null
  stream: string | null
}

export interface StandardizedPricingRow {
  subject_name: string
  subject_id: string
  level_label: string | null
  level_id: string | null
  stream: string | null
  trial_type: 'free' | 'discounted' | 'same_as_regular' | 'multi_lesson'
  trial_fee: number
  trial_lessons: number
  regular_fee: number
  lessons_per_period: number | null
  billing_display: string
  lesson_duration_minutes: number | null
  regular_schedule_note: string | null
}

export interface StandardizedPolicy {
  category: string
  description: string
  sort_order: number
}

export interface PolicyStandardizeResult {
  policies: StandardizedPolicy[]
  raw_preserved: string
  used_ai: boolean
  error?: string
}

// ── Shared: extract JSON from AI response ────────────────────
function extractJson(response: Anthropic.Message): string | null {
  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  let jsonStr = textBlock.text.trim()
  jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '')

  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null

  return jsonStr.slice(firstBrace, lastBrace + 1)
}

// ── Policy Standardizer ──────────────────────────────────────

const POLICY_SYSTEM_PROMPT = `You are a policy standardizer for Podsee, a tuition centre trial booking platform in Singapore.

CONTEXT:
- You receive raw, unstructured text describing a centre's terms, conditions, and policies.
- Centres write policies in wildly different formats — paragraphs, bullet points, casual WhatsApp-style text, formal T&C documents, or a mix of everything.
- Your job is to extract, categorize, and rewrite every distinct policy into clean, structured, parent-friendly language.

STANDARD POLICY CATEGORIES:
Use these category names when the policy fits. They appear across almost every centre:

1. "Replacement & Make-Up Classes" — what happens when a student misses a class (make-up options, credit notes, documentation required, caps on make-ups)
2. "Withdrawal & Notice Period" — how to withdraw, notice period required, what happens to deposit/fees on exit
3. "Fees & Payment" — when fees are due, payment methods, late payment consequences, non-refundable fees
4. "Refund Policy" — what is and isn't refundable, conditions for refunds
5. "Class Schedule & Public Holidays" — no-lesson dates, public holiday handling, rescheduling
6. "Attendance & Conduct" — punctuality expectations, behaviour standards, late pick-up fees
7. "Materials & Resources" — worksheets, textbooks, materials fees, sharing restrictions

ADDITIONAL CATEGORIES (use when content doesn't fit the 7 above):
Create descriptive category names for unique policies. Real examples from centres:
- "Extra Lessons" — for centres offering paid extra/catch-up sessions
- "Video Recordings" — for centres that record lessons for absentees
- "Instalment Plans" — for centres offering GIRO or instalment payment
- "Sibling Policy" — sibling-specific rules (e.g. pickup arrangements, shared materials)
- "Trial Class Terms" — specific conditions around trial lessons
- "Class Size" — maximum students per class, small group commitments
- "General Terms" — catch-all for miscellaneous terms (right to amend, data usage, etc.)

BREVITY IS KEY:
- Maximum 2-4 short bullet points per category. Parents won't read walls of text.
- Each bullet should be ONE clear sentence — the rule, not the explanation.
- DO NOT include: bank account numbers, UEN, GIRO details, payment screenshot instructions, specific term-by-term fee breakdowns, or any operational/admin details.
- DO NOT include pricing info (dollar amounts per subject/level) — that belongs in the pricing table, not policies.
- DO include: notice periods, refund rules, make-up conditions, withdrawal terms, attendance expectations.
- Use active voice: "4 weeks' written notice required" not "A minimum of 4 weeks' written notice is required before withdrawing"

EXAMPLES OF GOOD CONCISE OUTPUT:

Input: "payment by bank transfer uen 202603720G acct 7173008167 send screenshot to 8899 3511. fees due 1st week of term. no refund. 4 wks notice to withdraw"
Output:
- "Fees & Payment": "- Fees due by the 1st week of each term.\\n- Payment via bank transfer."
- "Refund Policy": "- All fees are non-refundable."
- "Withdrawal & Notice Period": "- 4 weeks' written notice required."
(Note: bank account, UEN, phone number are NOT included — those are operational details.)

Input: "if absent need mc, max 1 makeup per month, must take within same month"
Output:
- "Replacement & Make-Up Classes": "- MC required for illness absences.\\n- Max 1 make-up per month, within the same month."

MERGING RULES:
- Merge same-topic content into ONE policy entry
- Don't duplicate across categories
- Aim for the FEWEST categories possible — only create a category if there's a distinct rule

SORT ORDER:
- Fees & Payment → 1, Refund Policy → 2, Replacement & Make-Up Classes → 3, Withdrawal & Notice Period → 4
- Class Schedule & Public Holidays → 5, Attendance & Conduct → 6, Materials & Resources → 7
- Additional → 8+

OUTPUT — return ONLY this JSON:
{
  "policies": [
    {
      "category": "Fees & Payment",
      "description": "- Fees due by the 1st week of each term.\\n- Payment via bank transfer.",
      "sort_order": 1
    },
    {
      "category": "Replacement & Make-Up Classes",
      "description": "- MC required for illness absences.\\n- Max 1 make-up per month, within the same month.",
      "sort_order": 3
    }
  ]
}

CRITICAL RULES:
- Never invent policies not in the raw text.
- If the raw text is too vague or empty, return an empty policies array.
- Keep descriptions SHORT. If a bullet is longer than ~15 words, shorten it.
- Exclude all pricing, payment account details, and admin operational info.
- Use "\\n" for newlines within description strings (valid JSON).`

export async function standardizePolicies(
  rawText: string
): Promise<PolicyStandardizeResult> {
  const baseResult: PolicyStandardizeResult = {
    policies: [],
    raw_preserved: rawText,
    used_ai: false,
  }

  if (!anthropic) {
    return { ...baseResult, error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: POLICY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Standardize this centre's policies and terms & conditions:\n\n${rawText}`,
        },
      ],
    })

    const jsonStr = extractJson(response)
    if (!jsonStr) {
      return { ...baseResult, error: 'AI response did not contain valid JSON' }
    }

    const parsed = JSON.parse(jsonStr)
    return {
      policies: parsed.policies ?? [],
      raw_preserved: rawText,
      used_ai: true,
    }
  } catch (err) {
    console.error('[ai-standardizer] Policy standardization failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ...baseResult, error: message }
  }
}

// ── File content helper + Image-based Policy Standardizer ───

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
export type FileMediaType = ImageMediaType | 'application/pdf'

function buildFileContentBlock(base64Data: string, mediaType: FileMediaType): Anthropic.ContentBlockParam {
  if (mediaType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
    } as any
  }
  return {
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data: base64Data },
  }
}

export async function standardizePoliciesFromImage(
  base64Data: string,
  mediaType: FileMediaType
): Promise<PolicyStandardizeResult> {
  const baseResult: PolicyStandardizeResult = {
    policies: [],
    raw_preserved: mediaType === 'application/pdf' ? '[pdf input]' : '[image input]',
    used_ai: false,
  }

  if (!anthropic) {
    return { ...baseResult, error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: POLICY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            buildFileContentBlock(base64Data, mediaType),
            {
              type: 'text',
              text: "Extract and standardize this centre's policies and terms & conditions from the image/document.",
            },
          ],
        },
      ],
    })

    const jsonStr = extractJson(response)
    if (!jsonStr) {
      return { ...baseResult, error: 'AI response did not contain valid JSON' }
    }

    const parsed = JSON.parse(jsonStr)
    return {
      policies: parsed.policies ?? [],
      raw_preserved: mediaType === 'application/pdf' ? '[pdf input]' : '[image input]',
      used_ai: true,
    }
  } catch (err) {
    console.error('[ai-standardizer] Policy image standardization failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ...baseResult, error: message }
  }
}
