'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface TeacherInput {
  name: string
  role: string
  is_founder: boolean
  qualifications: string
  bio: string
  years_experience: number | null
  subject_ids: string[]
  level_ids: string[]
}

export interface TrialSlotInput {
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
  raw_subject_text: string
}

export async function createCentre(formPayload: {
  // Step 1: Basic Info
  name: string
  address: string
  area: string
  nearest_mrt: string
  years_operating: number | null

  // Step 2: About & Teaching
  specialisation: string
  student_types: string[]
  teaching_approach: string
  results: string
  class_size: number | null

  // Step 3: Team
  teachers: TeacherInput[]

  // Step 4: Policies
  replacement_class_policy: string
  makeup_class_policy: string
  commitment_terms: string
  notice_period_terms: string
  payment_terms: string
  other_policies: string

  // Step 5: Trial Slots (required)
  trial_slots: TrialSlotInput[]
}) {
  const supabase = createAdminClient()

  // 1. Generate unique slug
  let slug = slugify(formPayload.name)
  const { data: existing } = await supabase
    .from('centres')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  // 2. Compile description from structured answers
  const studentTypeMap: Record<string, string> = {
    struggling: 'students who are struggling and need to catch up',
    average: 'average students aiming to improve by one or two grades',
    'high-achievers': 'high-achievers preparing for top schools or competitions',
    all: 'students of all levels',
  }
  const types = formPayload.student_types.map((t) => studentTypeMap[t] ?? t)
  const typesStr = types.length > 0 ? ` We work primarily with ${types.join(', ')}.` : ''
  const description = formPayload.specialisation
    ? `${formPayload.specialisation}${typesStr}`
    : null

  // 3. Insert centre
  const { data: centre, error: centreError } = await supabase
    .from('centres')
    .insert({
      name: formPayload.name,
      slug,
      address: formPayload.address || null,
      area: formPayload.area || null,
      nearest_mrt: formPayload.nearest_mrt || null,
      years_operating: formPayload.years_operating,
      description,
      teaching_style: formPayload.teaching_approach || null,
      class_size: formPayload.class_size,
      track_record: formPayload.results || null,
      replacement_class_policy: formPayload.replacement_class_policy || null,
      makeup_class_policy: formPayload.makeup_class_policy || null,
      commitment_terms: formPayload.commitment_terms || null,
      notice_period_terms: formPayload.notice_period_terms || null,
      payment_terms: formPayload.payment_terms || null,
      other_policies: formPayload.other_policies || null,
      is_active: true,
      is_paused: false,
    })
    .select('id')
    .single()

  if (centreError || !centre) {
    return { error: centreError?.message ?? 'Failed to create centre.' }
  }

  const centreId = centre.id

  // 4. Insert teachers
  for (const teacher of formPayload.teachers) {
    if (!teacher.name) continue

    await supabase
      .from('teachers')
      .insert({
        centre_id: centreId,
        name: teacher.name,
        role: teacher.role || null,
        is_founder: teacher.is_founder,
        qualifications: teacher.qualifications || null,
        bio: teacher.bio || null,
        years_experience: teacher.years_experience,
        sort_order: teacher.is_founder ? 0 : 1,
      })
  }

  // 5. Insert trial slots
  for (const slot of formPayload.trial_slots) {
    if (!slot.subject_id || !slot.date || !slot.start_time || !slot.end_time) continue

    await supabase.from('trial_slots').insert({
      centre_id: centreId,
      subject_id: slot.subject_id,
      level_id: slot.level_id,
      age_min: slot.age_min,
      age_max: slot.age_max,
      custom_level: slot.custom_level,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      trial_fee: slot.trial_fee,
      max_students: slot.max_students,
      spots_remaining: slot.max_students,
      notes: slot.notes || null,
    })
  }

  // 6. Derive centre_subjects from trial slots
  // Map subject_id → display_name (from raw CSV text if different from canonical name)
  const subjectDisplayNames = new Map<string, string | null>()
  for (const slot of formPayload.trial_slots) {
    if (!slot.subject_id) continue
    if (subjectDisplayNames.has(slot.subject_id)) continue

    // Look up canonical name
    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', slot.subject_id)
      .single()

    const canonical = subjectRow?.name ?? ''
    const raw = slot.raw_subject_text.trim()

    // If the raw CSV text differs from the canonical name, use it as display_name
    const displayName =
      raw && raw.toLowerCase() !== canonical.toLowerCase() ? raw : null

    subjectDisplayNames.set(slot.subject_id, displayName)
  }

  if (subjectDisplayNames.size > 0) {
    await supabase.from('centre_subjects').insert(
      Array.from(subjectDisplayNames.entries()).map(([sid, displayName]) => ({
        centre_id: centreId,
        subject_id: sid,
        display_name: displayName,
      }))
    )
  }

  // 7. Derive centre_levels from trial slots
  const uniqueLevelIds = new Set<string>()
  for (const slot of formPayload.trial_slots) {
    if (slot.level_id) uniqueLevelIds.add(slot.level_id)
  }

  if (uniqueLevelIds.size > 0) {
    await supabase.from('centre_levels').insert(
      Array.from(uniqueLevelIds).map((lid) => ({
        centre_id: centreId,
        level_id: lid,
      }))
    )
  }

  // 8. Derive centre_subject_levels from trial slots
  const pairingSet = new Set<string>()
  const pairings: { centre_id: string; subject_id: string; level_id: string }[] = []
  for (const slot of formPayload.trial_slots) {
    if (!slot.subject_id || !slot.level_id) continue
    const key = `${slot.subject_id}:${slot.level_id}`
    if (pairingSet.has(key)) continue
    pairingSet.add(key)
    pairings.push({ centre_id: centreId, subject_id: slot.subject_id, level_id: slot.level_id })
  }

  if (pairings.length > 0) {
    await supabase.from('centre_subject_levels').insert(pairings)
  }

  revalidatePath('/admin/centres')
  redirect('/admin/centres')
}
