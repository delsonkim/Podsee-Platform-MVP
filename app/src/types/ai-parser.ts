// Shared types for AI schedule parser — type-only file, no runtime imports
// Safe to import from both server and client components

export type Confidence = 'confirmed' | 'inferred' | 'needs_review'

export interface AIField<T> {
  value: T
  confidence: Confidence
  match_id?: string | null
  raw_text?: string
}

export interface SubjectWebSuggestion {
  suggested_match_id: string | null
  suggested_name: string
  web_context: string
  is_new_subject: boolean
}

export interface AIParsedSlot {
  subject: AIField<string> & { web_suggestion?: SubjectWebSuggestion }
  level: AIField<string>
  stream: AIField<string | null>
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
  reason: string
}

export interface AIParseResult {
  slots: AIParsedSlot[]
  skipped_rows: SkippedRow[]
  used_ai: boolean
  fallback_reason?: string
}
