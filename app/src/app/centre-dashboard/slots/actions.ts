'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCentreUser } from '@/lib/centre-auth'
import { revalidatePath } from 'next/cache'
import { parseScheduleWithAI, parseScheduleImageWithAI } from '@/lib/ai-parser'
import type { AIParseResult } from '@/types/ai-parser'
import { fetchCorrections, saveCorrections, type CorrectionInput } from '@/lib/parse-corrections'

// Re-use shared parse / custom-subject logic (same as admin actions)

export async function parseSchedule(rawText: string, weeksAhead?: number): Promise<AIParseResult> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  const [{ data: subjects }, { data: levels }, corrections] = await Promise.all([
    supabase.from('subjects').select('id, name'),
    supabase.from('levels').select('id, code, label'),
    fetchCorrections(centreId),
  ])

  return parseScheduleWithAI(rawText, subjects ?? [], levels ?? [], { weeksAhead, corrections })
}

export async function parseScheduleImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  weeksAhead?: number
): Promise<AIParseResult> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  const [{ data: subjects }, { data: levels }, corrections] = await Promise.all([
    supabase.from('subjects').select('id, name'),
    supabase.from('levels').select('id, code, label'),
    fetchCorrections(centreId),
  ])

  return parseScheduleImageWithAI(base64Data, mediaType, subjects ?? [], levels ?? [], { weeksAhead, corrections })
}

export async function saveParseCorrections(corrections: CorrectionInput[]): Promise<void> {
  await requireCentreUser()
  await saveCorrections(corrections)
}

export async function createCustomSubject(
  name: string
): Promise<{ id: string; name: string } | { error: string }> {
  await requireCentreUser()
  const supabase = createAdminClient()
  const trimmed = name.trim()

  if (!trimmed) return { error: 'Subject name is required.' }

  const { data: existing } = await supabase
    .from('subjects')
    .select('id, name')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return { id: existing.id, name: existing.name }

  const { data: maxSort } = await supabase
    .from('subjects')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name: trimmed,
      is_custom: true,
      sort_order: (maxSort?.sort_order ?? 999) + 1,
    })
    .select('id, name')
    .single()

  if (error) return { error: error.message }
  return data
}

// ── Add draft slots (bulk — from AI parser / SlotUploader) ──

export interface DraftSlotInput {
  subject_id: string | null
  level_id: string | null
  age_min: number | null
  age_max: number | null
  custom_level: string | null
  date: string
  start_time: string
  end_time: string
  trial_fee: number
  max_students: number
  notes: string
}

export async function addDraftSlots(
  slots: DraftSlotInput[]
): Promise<{ count: number } | { error: string }> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  const valid = slots.filter((s) => s.subject_id && s.date && s.start_time && s.end_time)
  if (valid.length === 0) return { error: 'No valid slots to add.' }

  // Check if centre is trusted (bypass draft)
  const { data: centreRow } = await supabase
    .from('centres')
    .select('is_trusted')
    .eq('id', centreId)
    .single()
  const isTrusted = (centreRow as any)?.is_trusted === true

  const { error } = await supabase.from('trial_slots').insert(
    valid.map((s) => ({
      centre_id: centreId,
      subject_id: s.subject_id,
      level_id: s.level_id,
      age_min: s.age_min,
      age_max: s.age_max,
      custom_level: s.custom_level,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      trial_fee: s.trial_fee,
      max_students: s.max_students,
      spots_remaining: s.max_students,
      notes: s.notes || null,
      is_draft: !isTrusted,
    }))
  )

  if (error) return { error: error.message }

  // If trusted, re-derive centre_subjects/levels from all live slots
  if (isTrusted) {
    await rederiveCentreSubjectsAndLevels(supabase, centreId)
  }

  revalidatePath('/centre-dashboard/slots')
  return { count: valid.length }
}

async function rederiveCentreSubjectsAndLevels(supabase: any, centreId: string) {
  const { data: allSlots } = await supabase
    .from('trial_slots')
    .select('subject_id, level_id')
    .eq('centre_id', centreId)
    .eq('is_draft', false)

  if (!allSlots) return

  const uniqueSubjectIds = [...new Set(allSlots.map((s: any) => s.subject_id).filter(Boolean))] as string[]
  await supabase.from('centre_subjects').delete().eq('centre_id', centreId)
  if (uniqueSubjectIds.length > 0) {
    await supabase.from('centre_subjects').insert(
      uniqueSubjectIds.map((sid) => ({ centre_id: centreId, subject_id: sid, display_name: null }))
    )
  }

  const uniqueLevelIds = [...new Set(allSlots.map((s: any) => s.level_id).filter(Boolean))] as string[]
  await supabase.from('centre_levels').delete().eq('centre_id', centreId)
  if (uniqueLevelIds.length > 0) {
    await supabase.from('centre_levels').insert(
      uniqueLevelIds.map((lid) => ({ centre_id: centreId, level_id: lid }))
    )
  }

  const pairingSet = new Set<string>()
  const pairings: { centre_id: string; subject_id: string; level_id: string }[] = []
  for (const slot of allSlots) {
    if (!slot.subject_id || !slot.level_id) continue
    const key = `${slot.subject_id}:${slot.level_id}`
    if (pairingSet.has(key)) continue
    pairingSet.add(key)
    pairings.push({ centre_id: centreId, subject_id: slot.subject_id, level_id: slot.level_id })
  }
  await supabase.from('centre_subject_levels').delete().eq('centre_id', centreId)
  if (pairings.length > 0) {
    await supabase.from('centre_subject_levels').insert(pairings)
  }
}

// ── Add single draft slot (individual form) ──

export async function addSingleDraftSlot(slot: DraftSlotInput): Promise<{ success: true } | { error: string }> {
  const result = await addDraftSlots([slot])
  if ('error' in result) return result
  return { success: true }
}
