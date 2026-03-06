'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendCentreInvite } from '@/lib/email'
import { parseScheduleWithAI, parseScheduleImageWithAI } from '@/lib/ai-parser'
import type { AIParseResult } from '@/types/ai-parser'
import { fetchCorrections, saveCorrections, type CorrectionInput } from '@/lib/parse-corrections'

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
  stream: string | null
  date: string
  start_time: string
  end_time: string
  trial_fee: number
  max_students: number
  notes: string
  raw_subject_text: string
}

// ── NEW: Step 1 — Create minimal centre + owner account ───────

export async function createMinimalCentre(payload: {
  name: string
  contact_email: string
  address: string
  area: string
  nearest_mrt: string
  years_operating: number | null
  image_urls: string[]
  trial_type: 'free' | 'paid'
  paynow_qr_image_url: string | null
  trial_commission_rate: number
  conversion_commission_rate: number
}): Promise<{ centreId: string } | { error: string }> {
  const supabase = createAdminClient()

  let slug = slugify(payload.name)
  const { data: existing } = await supabase
    .from('centres')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  }

  const { data: centre, error: centreError } = await supabase
    .from('centres')
    .insert({
      name: payload.name,
      slug,
      contact_email: payload.contact_email || null,
      address: payload.address || null,
      area: payload.area || null,
      nearest_mrt: payload.nearest_mrt || null,
      years_operating: payload.years_operating,
      image_urls: payload.image_urls,
      trial_type: payload.trial_type,
      paynow_qr_image_url: payload.paynow_qr_image_url,
      trial_commission_rate: payload.trial_commission_rate,
      conversion_commission_rate: payload.conversion_commission_rate,
      is_active: false,
      is_paused: false,
    })
    .select('id')
    .single()

  if (centreError || !centre) {
    return { error: centreError?.message ?? 'Failed to create centre.' }
  }

  if (payload.contact_email) {
    await supabase.from('centre_users').insert({
      auth_user_id: null,
      centre_id: centre.id,
      role: 'owner',
      email: payload.contact_email,
    })

    sendCentreInvite({
      email: payload.contact_email,
      centreName: payload.name,
    }).catch(() => {})
  }

  revalidatePath('/admin/centres')
  return { centreId: centre.id }
}

// ── NEW: Steps 2-4 — Update centre profile data ───────────────

export async function updateCentreStep(
  centreId: string,
  stepData: {
    specialisation?: string
    student_types?: string[]
    teaching_approach?: string
    results?: string
    class_size?: number | null
    teachers?: TeacherInput[]
    replacement_class_policy?: string
    makeup_class_policy?: string
    commitment_terms?: string
    notice_period_terms?: string
    payment_terms?: string
    other_policies?: string
  }
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}

  if (stepData.specialisation !== undefined) {
    const studentTypeMap: Record<string, string> = {
      struggling: 'students who are struggling and need to catch up',
      average: 'average students aiming to improve by one or two grades',
      'high-achievers': 'high-achievers preparing for top schools or competitions',
      all: 'students of all levels',
    }
    const types = (stepData.student_types ?? []).map((t) => studentTypeMap[t] ?? t)
    const typesStr = types.length > 0 ? ` We work primarily with ${types.join(', ')}.` : ''
    update.description = stepData.specialisation ? `${stepData.specialisation}${typesStr}` : null
  }

  if (stepData.teaching_approach !== undefined) update.teaching_style = stepData.teaching_approach || null
  if (stepData.results !== undefined) update.track_record = stepData.results || null
  if (stepData.class_size !== undefined) update.class_size = stepData.class_size
  if (stepData.replacement_class_policy !== undefined) update.replacement_class_policy = stepData.replacement_class_policy || null
  if (stepData.makeup_class_policy !== undefined) update.makeup_class_policy = stepData.makeup_class_policy || null
  if (stepData.commitment_terms !== undefined) update.commitment_terms = stepData.commitment_terms || null
  if (stepData.notice_period_terms !== undefined) update.notice_period_terms = stepData.notice_period_terms || null
  if (stepData.payment_terms !== undefined) update.payment_terms = stepData.payment_terms || null
  if (stepData.other_policies !== undefined) update.other_policies = stepData.other_policies || null

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('centres').update(update).eq('id', centreId)
    if (error) return { error: error.message }
  }

  // Upsert teachers: delete existing and re-insert
  if (stepData.teachers) {
    const validTeachers = stepData.teachers.filter((t) => t.name.trim())
    await supabase.from('teachers').delete().eq('centre_id', centreId)

    if (validTeachers.length > 0) {
      const { data: insertedTeachers } = await supabase
        .from('teachers')
        .insert(
          validTeachers.map((teacher) => ({
            centre_id: centreId,
            name: teacher.name,
            role: teacher.role || null,
            is_founder: teacher.is_founder,
            qualifications: teacher.qualifications || null,
            bio: teacher.bio || null,
            years_experience: teacher.years_experience,
            sort_order: teacher.is_founder ? 0 : 1,
          }))
        )
        .select('id')

      if (insertedTeachers) {
        const teacherSubjectRows: { teacher_id: string; subject_id: string }[] = []
        const teacherLevelRows: { teacher_id: string; level_id: string }[] = []
        insertedTeachers.forEach((row, i) => {
          const input = validTeachers[i]
          for (const sid of input.subject_ids) teacherSubjectRows.push({ teacher_id: row.id, subject_id: sid })
          for (const lid of input.level_ids) teacherLevelRows.push({ teacher_id: row.id, level_id: lid })
        })
        if (teacherSubjectRows.length > 0) await supabase.from('teacher_subjects').insert(teacherSubjectRows)
        if (teacherLevelRows.length > 0) await supabase.from('teacher_levels').insert(teacherLevelRows)
      }
    }
  }

  revalidatePath('/admin/centres')
  return { success: true }
}

// ── NEW: Step 5 — Add trial slots + derive subjects/levels ─────

export async function addSlotsForCentre(
  centreId: string,
  slots: TrialSlotInput[]
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient()

  const validSlots = slots.filter((s) => s.subject_id && s.date && s.start_time && s.end_time)
  if (validSlots.length === 0) return { error: 'No valid slots to import.' }

  const { error: slotError } = await supabase.from('trial_slots').insert(
    validSlots.map((slot) => ({
      centre_id: centreId,
      subject_id: slot.subject_id,
      level_id: slot.level_id,
      age_min: slot.age_min,
      age_max: slot.age_max,
      custom_level: slot.custom_level,
      stream: slot.stream || null,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      trial_fee: slot.trial_fee,
      max_students: slot.max_students,
      spots_remaining: slot.max_students,
      notes: slot.notes || null,
    }))
  )
  if (slotError) return { error: slotError.message }

  // Derive centre_subjects
  const uniqueSubjectIds = [...new Set(slots.map((s) => s.subject_id).filter(Boolean))] as string[]
  const { data: subjectRows } = uniqueSubjectIds.length > 0
    ? await supabase.from('subjects').select('id, name').in('id', uniqueSubjectIds)
    : { data: [] }
  const subjectNameMap = new Map((subjectRows ?? []).map((s) => [s.id, s.name]))

  const subjectDisplayNames = new Map<string, string | null>()
  for (const slot of slots) {
    if (!slot.subject_id || subjectDisplayNames.has(slot.subject_id)) continue
    const canonical = subjectNameMap.get(slot.subject_id) ?? ''
    const raw = slot.raw_subject_text.trim()
    subjectDisplayNames.set(slot.subject_id, raw && raw.toLowerCase() !== canonical.toLowerCase() ? raw : null)
  }

  if (subjectDisplayNames.size > 0) {
    await supabase.from('centre_subjects').delete().eq('centre_id', centreId)
    await supabase.from('centre_subjects').insert(
      Array.from(subjectDisplayNames.entries()).map(([sid, displayName]) => ({
        centre_id: centreId, subject_id: sid, display_name: displayName,
      }))
    )
  }

  // Derive centre_levels
  const uniqueLevelIds = new Set<string>()
  for (const slot of slots) { if (slot.level_id) uniqueLevelIds.add(slot.level_id) }
  if (uniqueLevelIds.size > 0) {
    await supabase.from('centre_levels').delete().eq('centre_id', centreId)
    await supabase.from('centre_levels').insert(
      Array.from(uniqueLevelIds).map((lid) => ({ centre_id: centreId, level_id: lid }))
    )
  }

  // Derive centre_subject_levels
  const pairingSet = new Set<string>()
  const pairings: { centre_id: string; subject_id: string; level_id: string }[] = []
  for (const slot of slots) {
    if (!slot.subject_id || !slot.level_id) continue
    const key = `${slot.subject_id}:${slot.level_id}`
    if (pairingSet.has(key)) continue
    pairingSet.add(key)
    pairings.push({ centre_id: centreId, subject_id: slot.subject_id, level_id: slot.level_id })
  }
  if (pairings.length > 0) {
    await supabase.from('centre_subject_levels').delete().eq('centre_id', centreId)
    await supabase.from('centre_subject_levels').insert(pairings)
  }

  revalidatePath('/admin/centres')
  return { success: true }
}

// ── ORIGINAL: Full createCentre (unchanged, still works) ───────

export async function createCentre(formPayload: {
  // Step 1: Basic Info
  name: string
  contact_email: string
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

  // Centre images (up to 3, optional)
  image_urls: string[]

  // Trial type + PayNow QR
  trial_type: 'free' | 'paid'
  paynow_qr_image_url: string | null

  // Commission rates
  trial_commission_rate: number
  conversion_commission_rate: number

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
      contact_email: formPayload.contact_email || null,
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
      image_urls: formPayload.image_urls,
      trial_type: formPayload.trial_type,
      paynow_qr_image_url: formPayload.paynow_qr_image_url,
      trial_commission_rate: formPayload.trial_commission_rate,
      conversion_commission_rate: formPayload.conversion_commission_rate,
      is_active: true,
      is_paused: false,
    })
    .select('id')
    .single()

  if (centreError || !centre) {
    return { error: centreError?.message ?? 'Failed to create centre.' }
  }

  const centreId = centre.id

  // 3b. Auto-provision centre user + send invite email
  if (formPayload.contact_email) {
    await supabase.from('centre_users').insert({
      auth_user_id: null,
      centre_id: centreId,
      role: 'owner',
      email: formPayload.contact_email,
    })

    // Fire-and-forget — don't block centre creation
    sendCentreInvite({
      email: formPayload.contact_email,
      centreName: formPayload.name,
    }).catch(() => {})
  }

  // 4. Insert teachers (batch) and link to subjects/levels
  const validTeachers = formPayload.teachers.filter((t) => t.name)
  if (validTeachers.length > 0) {
    const { data: insertedTeachers } = await supabase
      .from('teachers')
      .insert(
        validTeachers.map((teacher) => ({
          centre_id: centreId,
          name: teacher.name,
          role: teacher.role || null,
          is_founder: teacher.is_founder,
          qualifications: teacher.qualifications || null,
          bio: teacher.bio || null,
          years_experience: teacher.years_experience,
          sort_order: teacher.is_founder ? 0 : 1,
        }))
      )
      .select('id')

    // Link teachers to their subjects and levels
    if (insertedTeachers) {
      const teacherSubjectRows: { teacher_id: string; subject_id: string }[] = []
      const teacherLevelRows: { teacher_id: string; level_id: string }[] = []

      insertedTeachers.forEach((row, i) => {
        const input = validTeachers[i]
        for (const sid of input.subject_ids) {
          teacherSubjectRows.push({ teacher_id: row.id, subject_id: sid })
        }
        for (const lid of input.level_ids) {
          teacherLevelRows.push({ teacher_id: row.id, level_id: lid })
        }
      })

      if (teacherSubjectRows.length > 0) {
        await supabase.from('teacher_subjects').insert(teacherSubjectRows)
      }
      if (teacherLevelRows.length > 0) {
        await supabase.from('teacher_levels').insert(teacherLevelRows)
      }
    }
  }

  // 5. Insert trial slots (batch)
  const validSlots = formPayload.trial_slots.filter(
    (s) => s.subject_id && s.date && s.start_time && s.end_time
  )
  if (validSlots.length > 0) {
    await supabase.from('trial_slots').insert(
      validSlots.map((slot) => ({
        centre_id: centreId,
        subject_id: slot.subject_id,
        level_id: slot.level_id,
        age_min: slot.age_min,
        age_max: slot.age_max,
        custom_level: slot.custom_level,
        stream: slot.stream || null,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        trial_fee: slot.trial_fee,
        max_students: slot.max_students,
        spots_remaining: slot.max_students,
        notes: slot.notes || null,
      }))
    )
  }

  // 6. Derive centre_subjects from trial slots (batch subject lookup)
  const uniqueSubjectIds = [...new Set(
    formPayload.trial_slots.map((s) => s.subject_id).filter(Boolean)
  )] as string[]

  const { data: subjectRows } = uniqueSubjectIds.length > 0
    ? await supabase.from('subjects').select('id, name').in('id', uniqueSubjectIds)
    : { data: [] }

  const subjectNameMap = new Map((subjectRows ?? []).map((s) => [s.id, s.name]))

  const subjectDisplayNames = new Map<string, string | null>()
  for (const slot of formPayload.trial_slots) {
    if (!slot.subject_id) continue
    if (subjectDisplayNames.has(slot.subject_id)) continue

    const canonical = subjectNameMap.get(slot.subject_id) ?? ''
    const raw = slot.raw_subject_text.trim()
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

export async function parseSchedule(
  rawText: string,
  centreId?: string,
  weeksAhead?: number
): Promise<AIParseResult> {
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
  centreId?: string,
  weeksAhead?: number
): Promise<AIParseResult> {
  const supabase = createAdminClient()

  const [{ data: subjects }, { data: levels }, corrections] = await Promise.all([
    supabase.from('subjects').select('id, name'),
    supabase.from('levels').select('id, code, label'),
    fetchCorrections(centreId),
  ])

  return parseScheduleImageWithAI(base64Data, mediaType, subjects ?? [], levels ?? [], { weeksAhead, corrections })
}

export async function saveParseCorrections(corrections: CorrectionInput[]): Promise<void> {
  await saveCorrections(corrections)
}

export async function createCustomSubject(
  name: string
): Promise<{ id: string; name: string } | { error: string }> {
  const supabase = createAdminClient()
  const trimmed = name.trim()

  if (!trimmed) return { error: 'Subject name is required.' }

  // Check if subject already exists (case-insensitive)
  const { data: existing } = await supabase
    .from('subjects')
    .select('id, name')
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) return { id: existing.id, name: existing.name }

  // Get max sort_order for placement at end
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
