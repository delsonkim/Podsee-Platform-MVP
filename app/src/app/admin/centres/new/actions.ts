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

export interface ProgrammeInput {
  subject_id: string
  display_name: string
  level_ids: string[]
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
}

export async function createCentre(formPayload: {
  // Step 1: Basic Info
  name: string
  address: string
  area: string
  nearest_mrt: string
  years_operating: number | null

  // Step 2: Centre Type & Programmes
  centre_type: 'academic' | 'enrichment' | 'both'
  programmes: ProgrammeInput[]

  // Step 3: About & Teaching (structured questions)
  specialisation: string
  student_types: string[]
  teaching_approach: string
  results: string
  class_size: number | null

  // Step 4: Team
  teachers: TeacherInput[]

  // Step 5: Policies
  replacement_class_policy: string
  makeup_class_policy: string
  commitment_terms: string
  notice_period_terms: string
  payment_terms: string
  other_policies: string

  // Step 6: Trial Slots
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

  // 4. Insert centre_subjects (unique subjects from programmes)
  const uniqueSubjects = new Map<string, string>()
  for (const p of formPayload.programmes) {
    uniqueSubjects.set(p.subject_id, p.display_name)
  }
  if (uniqueSubjects.size > 0) {
    await supabase.from('centre_subjects').insert(
      Array.from(uniqueSubjects.entries()).map(([sid, displayName]) => ({
        centre_id: centreId,
        subject_id: sid,
        display_name: displayName || null,
      }))
    )
  }

  // 5. Insert centre_levels (unique levels across all programmes)
  const allLevelIds = new Set(formPayload.programmes.flatMap((p) => p.level_ids))
  if (allLevelIds.size > 0) {
    await supabase.from('centre_levels').insert(
      Array.from(allLevelIds).map((lid) => ({
        centre_id: centreId,
        level_id: lid,
      }))
    )
  }

  // 6. Insert centre_subject_levels (precise pairings)
  const pairings = formPayload.programmes.flatMap((p) =>
    p.level_ids.map((lid) => ({
      centre_id: centreId,
      subject_id: p.subject_id,
      level_id: lid,
    }))
  )
  if (pairings.length > 0) {
    await supabase.from('centre_subject_levels').insert(pairings)
  }

  // 7. Insert teachers
  for (const teacher of formPayload.teachers) {
    if (!teacher.name) continue

    const { data: teacherRow, error: teacherError } = await supabase
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
      .select('id')
      .single()

    if (teacherError || !teacherRow) continue

    if (teacher.subject_ids.length > 0) {
      await supabase.from('teacher_subjects').insert(
        teacher.subject_ids.map((sid) => ({
          teacher_id: teacherRow.id,
          subject_id: sid,
        }))
      )
    }

    if (teacher.level_ids.length > 0) {
      await supabase.from('teacher_levels').insert(
        teacher.level_ids.map((lid) => ({
          teacher_id: teacherRow.id,
          level_id: lid,
        }))
      )
    }
  }

  // 8. Insert trial slots
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

  revalidatePath('/admin/centres')
  redirect('/admin/centres')
}
