import type { SupabaseClient } from '@supabase/supabase-js'
import type { CentrePricing, CentrePolicy } from '@/types/database'
import type { StandardizedPricingRow, StandardizedPolicy, SubjectLevelPair } from './ai-standardizer'

// ── Pricing CRUD ─────────────────────────────────────────────

export async function savePricingRows(
  supabase: SupabaseClient,
  centreId: string,
  rows: StandardizedPricingRow[],
  additionalFees: string | null,
  billingRaw: string | null
): Promise<{ success: true } | { error: string }> {
  // Replace strategy: delete existing then insert new
  await supabase.from('centre_pricing').delete().eq('centre_id', centreId)

  if (rows.length > 0) {
    const { error } = await supabase.from('centre_pricing').insert(
      rows.map((row) => ({
        centre_id: centreId,
        subject_id: row.subject_id,
        level_id: row.level_id,
        stream: row.stream,
        trial_type: row.trial_type,
        trial_fee: row.trial_fee,
        trial_lessons: row.trial_lessons,
        regular_fee: row.regular_fee,
        lessons_per_period: row.lessons_per_period,
        billing_display: row.billing_display,
        billing_raw: billingRaw,
        lesson_duration_minutes: row.lesson_duration_minutes,
        trial_same_as_regular: true,
        regular_schedule_note: row.regular_schedule_note,
      }))
    )
    if (error) return { error: error.message }
  }

  // Update additional_fees on centres table
  const { error: centreError } = await supabase
    .from('centres')
    .update({ additional_fees: additionalFees })
    .eq('id', centreId)
  if (centreError) return { error: centreError.message }

  return { success: true }
}

export async function getPricingRows(
  supabase: SupabaseClient,
  centreId: string
): Promise<CentrePricing[]> {
  const { data } = await supabase
    .from('centre_pricing')
    .select('*')
    .eq('centre_id', centreId)
    .order('created_at')
  return (data ?? []) as CentrePricing[]
}

// ── Policies CRUD ────────────────────────────────────────────

export async function savePolicies(
  supabase: SupabaseClient,
  centreId: string,
  policies: StandardizedPolicy[]
): Promise<{ success: true } | { error: string }> {
  await supabase.from('centre_policies').delete().eq('centre_id', centreId)

  if (policies.length > 0) {
    const { error } = await supabase.from('centre_policies').insert(
      policies.map((p) => ({
        centre_id: centreId,
        category: p.category,
        description: p.description,
        sort_order: p.sort_order,
      }))
    )
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function getPolicies(
  supabase: SupabaseClient,
  centreId: string
): Promise<CentrePolicy[]> {
  const { data } = await supabase
    .from('centre_policies')
    .select('*')
    .eq('centre_id', centreId)
    .order('sort_order')
  return (data ?? []) as CentrePolicy[]
}

// ── Auto-fill slot trial fees from pricing ──────────────────

export async function autoFillSlotTrialFees(
  supabase: SupabaseClient,
  centreId: string,
  pricingRows: StandardizedPricingRow[]
): Promise<void> {
  for (const row of pricingRows) {
    // Compute effective trial fee
    let trialFee: number
    switch (row.trial_type) {
      case 'free':
        trialFee = 0
        break
      case 'same_as_regular':
        trialFee = row.regular_fee
        break
      case 'discounted':
      case 'multi_lesson':
        trialFee = row.trial_fee
        break
      default:
        trialFee = 0
    }

    // Build match filter
    let query = supabase
      .from('trial_slots')
      .update({ trial_fee: trialFee })
      .eq('centre_id', centreId)
      .eq('subject_id', row.subject_id)

    if (row.level_id) {
      query = query.eq('level_id', row.level_id)
    } else {
      query = query.is('level_id', null)
    }

    await query
  }
}

// ── Subject+Level pair fetcher (for AI context) ──────────────

export async function getSubjectLevelPairs(
  supabase: SupabaseClient,
  centreId: string
): Promise<SubjectLevelPair[]> {
  const { data } = await supabase
    .from('centre_subject_levels')
    .select('subject_id, level_id, subjects(id, name), levels(id, label)')
    .eq('centre_id', centreId)

  if (!data || data.length === 0) return []

  // Get streams from trial_slots for these pairs
  const { data: slots } = await supabase
    .from('trial_slots')
    .select('subject_id, level_id, stream')
    .eq('centre_id', centreId)
    .not('stream', 'is', null)

  const streamMap = new Map<string, string>()
  for (const slot of slots ?? []) {
    if (slot.stream) {
      streamMap.set(`${slot.subject_id}:${slot.level_id}`, slot.stream)
    }
  }

  return data.map((row: any) => ({
    subject_id: row.subject_id,
    subject_name: row.subjects?.name ?? '',
    level_id: row.level_id,
    level_label: row.levels?.label ?? null,
    stream: streamMap.get(`${row.subject_id}:${row.level_id}`) ?? null,
  }))
}
