'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCentreUser } from '@/lib/centre-auth'
import { revalidatePath } from 'next/cache'

type Result = { success: true; isDraft: boolean } | { error: string }

/**
 * Core helper: saves fields directly (onboarding) or to draft_data (live).
 */
async function saveCentreFields(
  centreId: string,
  fields: Record<string, unknown>
): Promise<Result> {
  const supabase = createAdminClient()

  const { data: centre } = await supabase
    .from('centres')
    .select('is_active, is_trusted, draft_data')
    .eq('id', centreId)
    .single()

  if (!centre) return { error: 'Centre not found' }

  if (!centre.is_active || (centre as any).is_trusted) {
    // Onboarding or trusted centre: save directly
    const { error } = await supabase.from('centres').update(fields).eq('id', centreId)
    if (error) return { error: error.message }
    revalidatePath('/centre-dashboard/centre-info')
    return { success: true, isDraft: false }
  } else {
    // Live: merge into draft_data
    const existing = (centre.draft_data as Record<string, unknown>) ?? {}
    const { error } = await supabase
      .from('centres')
      .update({
        draft_data: { ...existing, ...fields },
        has_pending_changes: true,
      })
      .eq('id', centreId)
    if (error) return { error: error.message }
    revalidatePath('/centre-dashboard/centre-info')
    return { success: true, isDraft: true }
  }
}

// ── Profile section ──────────────────────────────────────────

export async function updateProfile(data: {
  description: string
  teaching_style: string
  track_record: string
  class_size: number | null
  years_operating: number | null
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    description: data.description || null,
    teaching_style: data.teaching_style || null,
    track_record: data.track_record || null,
    class_size: data.class_size,
    years_operating: data.years_operating,
  })
}

// ── Location section ─────────────────────────────────────────

export async function updateLocation(data: {
  address: string
  area: string
  nearest_mrt: string
  parking_info: string
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    address: data.address || null,
    area: data.area || null,
    nearest_mrt: data.nearest_mrt || null,
    parking_info: data.parking_info || null,
  })
}

// ── Policies section ─────────────────────────────────────────

export async function updatePolicies(data: {
  replacement_class_policy: string
  makeup_class_policy: string
  commitment_terms: string
  notice_period_terms: string
  payment_terms: string
  other_policies: string
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    replacement_class_policy: data.replacement_class_policy || null,
    makeup_class_policy: data.makeup_class_policy || null,
    commitment_terms: data.commitment_terms || null,
    notice_period_terms: data.notice_period_terms || null,
    payment_terms: data.payment_terms || null,
    other_policies: data.other_policies || null,
  })
}

// ── Promotions section ──────────────────────────────────────

export async function updatePromotions(data: {
  promotions_text: string
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    promotions_text: data.promotions_text || null,
  })
}

// ── Pricing section ─────────────────────────────────────────

export async function updatePricing(data: {
  rows: {
    subject_id: string
    level_id: string | null
    stream: string | null
    trial_type: 'free' | 'same_as_regular'
    trial_fee: number
    trial_lessons: number
    regular_fee: number
    lessons_per_period: number | null
    billing_display: string | null
    lesson_duration_minutes: number | null
  }[]
}): Promise<{ success: true } | { error: string }> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  // Replace strategy: delete existing then insert new
  await supabase.from('centre_pricing').delete().eq('centre_id', centreId)

  if (data.rows.length > 0) {
    const { error } = await supabase.from('centre_pricing').insert(
      data.rows.map((row) => ({
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
        lesson_duration_minutes: row.lesson_duration_minutes,
        trial_same_as_regular: row.trial_type === 'same_as_regular',
      }))
    )
    if (error) return { error: error.message }
  }

  // Auto-fill trial fees on matching slots
  if (data.rows.length > 0) {
    const { autoFillSlotTrialFees } = await import('@/lib/pricing-policies-actions')
    await autoFillSlotTrialFees(supabase, centreId, data.rows.map((r) => ({
      subject_name: '',
      subject_id: r.subject_id,
      level_label: null,
      level_id: r.level_id,
      stream: r.stream,
      trial_type: r.trial_type,
      trial_fee: r.trial_fee,
      trial_lessons: r.trial_lessons,
      regular_fee: r.regular_fee,
      lessons_per_period: r.lessons_per_period,
      billing_display: r.billing_display ?? '',
      lesson_duration_minutes: r.lesson_duration_minutes,
      regular_schedule_note: null,
    })))
  }

  revalidatePath('/centre-dashboard/centre-info')
  return { success: true }
}

// ── Structured policies (centre_policies table) ─────────────

export async function updateStructuredPolicies(data: {
  policies: { category: string; description: string }[]
}): Promise<{ success: true } | { error: string }> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  // Replace strategy: delete existing then insert new
  await supabase.from('centre_policies').delete().eq('centre_id', centreId)

  if (data.policies.length > 0) {
    const { error } = await supabase.from('centre_policies').insert(
      data.policies.map((p, i) => ({
        centre_id: centreId,
        category: p.category,
        description: p.description,
        sort_order: i,
      }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/centre-dashboard/centre-info')
  return { success: true }
}

// ── Contact & Social Links ──────────────────────────────────

export async function updateContactLinks(data: {
  website_url: string
  instagram_url: string
  tiktok_url: string
  whatsapp_number: string
  phone_number: string
  google_maps_url: string
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    website_url: data.website_url || null,
    instagram_url: data.instagram_url || null,
    tiktok_url: data.tiktok_url || null,
    whatsapp_number: data.whatsapp_number || null,
    phone_number: data.phone_number || null,
    google_maps_url: data.google_maps_url || null,
  })
}

// ── Teachers section ────────────────────────────────────────

export async function updateTeachers(data: {
  teachers: {
    id?: string
    name: string
    role: string
    is_founder: boolean
    qualifications: string
    bio: string
    years_experience: number | null
    linkedin_url: string
    students_taught: number | null
  }[]
}): Promise<{ success: true } | { error: string }> {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  const validTeachers = data.teachers.filter((t) => t.name.trim())

  // Replace strategy: delete existing then insert new
  await supabase.from('teachers').delete().eq('centre_id', centreId)

  if (validTeachers.length > 0) {
    const { error } = await supabase.from('teachers').insert(
      validTeachers.map((t, i) => ({
        centre_id: centreId,
        name: t.name.trim(),
        role: t.role || null,
        is_founder: t.is_founder,
        qualifications: t.qualifications || null,
        bio: t.bio || null,
        years_experience: t.years_experience,
        linkedin_url: t.linkedin_url || null,
        students_taught: t.students_taught,
        sort_order: t.is_founder ? 0 : i + 1,
      }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/centre-dashboard/centre-info')
  return { success: true }
}

// ── Images section ───────────────────────────────────────────

export async function updateImages(data: {
  image_urls: string[]
  paynow_qr_image_url: string | null
}): Promise<Result> {
  const { centreId } = await requireCentreUser()
  return saveCentreFields(centreId, {
    image_urls: data.image_urls,
    paynow_qr_image_url: data.paynow_qr_image_url,
  })
}
