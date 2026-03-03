'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function renameSubject(id: string, newName: string) {
  const trimmed = newName.trim()
  if (!trimmed) return { error: 'Name is required.' }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('subjects')
    .update({ name: trimmed })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'A subject with that name already exists.' }
    return { error: error.message }
  }

  revalidatePath('/admin/subjects')
  return { success: true }
}

export async function mergeSubject(customId: string, canonicalId: string) {
  if (customId === canonicalId) return { error: 'Cannot merge a subject into itself.' }

  const supabase = createAdminClient()

  // Update all FK references from custom → canonical
  // trial_slots
  await supabase
    .from('trial_slots')
    .update({ subject_id: canonicalId })
    .eq('subject_id', customId)

  // centre_subjects — delete if pairing already exists, otherwise update
  const { data: existingCS } = await supabase
    .from('centre_subjects')
    .select('centre_id')
    .eq('subject_id', canonicalId)

  const existingCentreIds = new Set((existingCS ?? []).map((r: { centre_id: string }) => r.centre_id))

  const { data: toMerge } = await supabase
    .from('centre_subjects')
    .select('id, centre_id')
    .eq('subject_id', customId)

  for (const row of toMerge ?? []) {
    if (existingCentreIds.has(row.centre_id)) {
      await supabase.from('centre_subjects').delete().eq('id', row.id)
    } else {
      await supabase.from('centre_subjects').update({ subject_id: canonicalId }).eq('id', row.id)
    }
  }

  // centre_subject_levels — same pattern
  const { data: existingCSL } = await supabase
    .from('centre_subject_levels')
    .select('centre_id, level_id')
    .eq('subject_id', canonicalId)

  const existingCSLKeys = new Set((existingCSL ?? []).map((r: { centre_id: string; level_id: string }) => `${r.centre_id}:${r.level_id}`))

  const { data: cslToMerge } = await supabase
    .from('centre_subject_levels')
    .select('id, centre_id, level_id')
    .eq('subject_id', customId)

  for (const row of cslToMerge ?? []) {
    if (existingCSLKeys.has(`${row.centre_id}:${row.level_id}`)) {
      await supabase.from('centre_subject_levels').delete().eq('id', row.id)
    } else {
      await supabase.from('centre_subject_levels').update({ subject_id: canonicalId }).eq('id', row.id)
    }
  }

  // teacher_subjects
  await supabase
    .from('teacher_subjects')
    .update({ subject_id: canonicalId })
    .eq('subject_id', customId)

  // Delete the custom subject
  await supabase.from('subjects').delete().eq('id', customId)

  revalidatePath('/admin/subjects')
  return { success: true }
}

export async function deleteSubject(id: string) {
  const supabase = createAdminClient()

  // Check if subject is in use
  const { count } = await supabase
    .from('trial_slots')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', id)

  if (count && count > 0) {
    return { error: `Cannot delete — ${count} trial slot${count !== 1 ? 's' : ''} use this subject. Merge it into another subject instead.` }
  }

  // Clean up junction tables
  await supabase.from('centre_subjects').delete().eq('subject_id', id)
  await supabase.from('centre_subject_levels').delete().eq('subject_id', id)
  await supabase.from('teacher_subjects').delete().eq('subject_id', id)

  await supabase.from('subjects').delete().eq('id', id)

  revalidatePath('/admin/subjects')
  return { success: true }
}
