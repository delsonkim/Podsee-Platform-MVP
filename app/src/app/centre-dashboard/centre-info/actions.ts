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
