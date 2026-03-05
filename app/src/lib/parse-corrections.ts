import { createAdminClient } from '@/lib/supabase/admin'

export interface CorrectionInput {
  centre_id: string | null
  field_type: 'subject' | 'level' | 'date' | 'time'
  ai_raw_text: string
  ai_value: string | null
  ai_match_id: string | null
  ai_confidence: string | null
  user_value: string
  user_match_id: string | null
}

export interface StoredCorrection {
  field_type: string
  ai_raw_text: string
  user_value: string
  user_match_id: string | null
}

// Fetch corrections for prompt injection: global + centre-specific, deduplicated
export async function fetchCorrections(centreId?: string | null): Promise<StoredCorrection[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('parse_corrections')
    .select('field_type, ai_raw_text, user_value, user_match_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (centreId) {
    // centre-specific OR global
    query = query.or(`centre_id.eq.${centreId},centre_id.is.null`)
  } else {
    // global only
    query = query.is('centre_id', null)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Deduplicate: keep most recent correction per (field_type, ai_raw_text)
  const seen = new Map<string, StoredCorrection>()
  for (const row of data) {
    const key = `${row.field_type}:${row.ai_raw_text.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, row)
    }
  }

  return Array.from(seen.values()).slice(0, 50)
}

// Save corrections after user confirms (fire-and-forget)
export async function saveCorrections(corrections: CorrectionInput[]): Promise<void> {
  if (corrections.length === 0) return

  const supabase = createAdminClient()

  await supabase.from('parse_corrections').insert(
    corrections.map((c) => ({
      centre_id: c.centre_id,
      field_type: c.field_type,
      ai_raw_text: c.ai_raw_text,
      ai_value: c.ai_value,
      ai_match_id: c.ai_match_id,
      ai_confidence: c.ai_confidence,
      user_value: c.user_value,
      user_match_id: c.user_match_id,
    }))
  )
}
