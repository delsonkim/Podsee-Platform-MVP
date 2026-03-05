'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function revalidateAll(centreId: string) {
  revalidatePath('/admin/centres/review')
  revalidatePath(`/admin/centres/review/${centreId}`)
  revalidatePath('/admin/centres')
  revalidatePath('/centres', 'layout')
}

// ── Approve draft profile data ──────────────────────────────

export async function approveDraftData(centreId: string) {
  const supabase = createAdminClient()

  const { data: centre, error: fetchError } = await supabase
    .from('centres')
    .select('draft_data')
    .eq('id', centreId)
    .single()

  if (fetchError || !centre) throw new Error('Centre not found')
  if (!centre.draft_data) throw new Error('No pending changes to approve')

  const draft = centre.draft_data as Record<string, unknown>

  const { error } = await supabase
    .from('centres')
    .update({
      ...draft,
      draft_data: null,
      has_pending_changes: false,
    })
    .eq('id', centreId)

  if (error) throw new Error('Failed to approve changes: ' + error.message)

  revalidateAll(centreId)
}

// ── Reject draft profile data ───────────────────────────────

export async function rejectDraftData(centreId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('centres')
    .update({ draft_data: null, has_pending_changes: false })
    .eq('id', centreId)

  if (error) throw new Error('Failed to reject changes: ' + error.message)

  revalidateAll(centreId)
}

// ── Approve draft trial slots ───────────────────────────────

export async function approveDraftSlots(centreId: string) {
  const supabase = createAdminClient()

  // 1. Set is_draft=false on all draft slots
  const { error: updateError } = await supabase
    .from('trial_slots')
    .update({ is_draft: false })
    .eq('centre_id', centreId)
    .eq('is_draft', true)

  if (updateError) throw new Error('Failed to approve slots: ' + updateError.message)

  // 2. Re-derive centre_subjects, centre_levels, centre_subject_levels from ALL live slots
  const { data: allSlots } = await supabase
    .from('trial_slots')
    .select('subject_id, level_id')
    .eq('centre_id', centreId)
    .eq('is_draft', false)

  if (!allSlots) { revalidateAll(centreId); return }

  // Derive centre_subjects
  const uniqueSubjectIds = [...new Set(allSlots.map((s) => s.subject_id).filter(Boolean))] as string[]
  await supabase.from('centre_subjects').delete().eq('centre_id', centreId)
  if (uniqueSubjectIds.length > 0) {
    await supabase.from('centre_subjects').insert(
      uniqueSubjectIds.map((sid) => ({ centre_id: centreId, subject_id: sid, display_name: null }))
    )
  }

  // Derive centre_levels
  const uniqueLevelIds = [...new Set(allSlots.map((s) => s.level_id).filter(Boolean))] as string[]
  await supabase.from('centre_levels').delete().eq('centre_id', centreId)
  if (uniqueLevelIds.length > 0) {
    await supabase.from('centre_levels').insert(
      uniqueLevelIds.map((lid) => ({ centre_id: centreId, level_id: lid }))
    )
  }

  // Derive centre_subject_levels
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

  revalidateAll(centreId)
}

// ── Reject draft trial slots ────────────────────────────────

export async function rejectDraftSlots(centreId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('trial_slots')
    .delete()
    .eq('centre_id', centreId)
    .eq('is_draft', true)

  if (error) throw new Error('Failed to reject draft slots: ' + error.message)

  revalidateAll(centreId)
  revalidatePath('/centre-dashboard/slots')
}

// ── Publish centre (make live) ──────────────────────────────

export async function publishCentre(centreId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('centres')
    .update({ is_active: true })
    .eq('id', centreId)

  if (error) throw new Error('Failed to publish centre: ' + error.message)

  revalidateAll(centreId)
}
