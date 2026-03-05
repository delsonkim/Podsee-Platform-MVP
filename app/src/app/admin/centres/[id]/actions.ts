'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  approveDraftData as _approveDraftData,
  rejectDraftData as _rejectDraftData,
} from '../review/[id]/actions'

// Wrap as async functions (server actions must be async function exports)
export async function approveDraftData(centreId: string) {
  return _approveDraftData(centreId)
}
export async function rejectDraftData(centreId: string) {
  return _rejectDraftData(centreId)
}

function revalidateAll(centreId: string) {
  revalidatePath(`/admin/centres/${centreId}`)
  revalidatePath('/admin/centres')
  revalidatePath('/admin/centres/review')
  revalidatePath(`/admin/centres/review/${centreId}`)
  revalidatePath('/centres', 'layout')
}

// ── Update admin-only fields (name, slug, commission, status toggles) ──

export async function updateAdminFields(
  centreId: string,
  fields: {
    name: string
    slug: string
    contact_email: string
    trial_type: 'free' | 'paid'
    trial_commission_rate: number
    conversion_commission_rate: number
    is_active: boolean
    is_paused: boolean
    is_trusted: boolean
  }
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('centres')
    .update({
      name: fields.name,
      slug: fields.slug,
      contact_email: fields.contact_email,
      trial_type: fields.trial_type,
      trial_commission_rate: fields.trial_commission_rate,
      conversion_commission_rate: fields.conversion_commission_rate,
      is_active: fields.is_active,
      is_paused: fields.is_paused,
      is_trusted: fields.is_trusted,
    })
    .eq('id', centreId)

  if (error) throw new Error('Failed to update: ' + error.message)

  revalidateAll(centreId)
}

// ── Update profile/location/policies as admin (always direct, no draft) ──

export async function updateCentreFieldsAsAdmin(
  centreId: string,
  fields: Record<string, unknown>
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('centres')
    .update(fields)
    .eq('id', centreId)

  if (error) throw new Error('Failed to update: ' + error.message)

  revalidateAll(centreId)
}
