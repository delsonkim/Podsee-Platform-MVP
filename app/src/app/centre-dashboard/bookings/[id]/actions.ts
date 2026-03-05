'use server'

import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendParentTrialCancelled, sendParentTrialCompleted, sendAdminNoShowAlert, sendAdminConversionAlert } from '@/lib/email'

async function verifyBookingOwnership(bookingId: string) {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, trial_slot_id, trial_slots(date)')
    .eq('id', bookingId)
    .eq('centre_id', centreId)
    .single()

  if (!booking) throw new Error('Booking not found')
  return { supabase, booking, centreId }
}

export async function centreCancelBooking(bookingId: string, reason: string) {
  const { supabase, booking } = await verifyBookingOwnership(bookingId)

  if (booking.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be cancelled')
  }

  const trialDate = (booking.trial_slots as any)?.date
  if (trialDate) {
    const today = new Date().toISOString().split('T')[0]
    if (trialDate <= today) {
      throw new Error('Cannot cancel a booking on or after the trial date')
    }
  }

  if (!reason.trim()) {
    throw new Error('A cancellation reason is required')
  }

  await supabase.from('bookings').update({
    status: 'cancelled',
    cancelled_by: 'centre',
    cancelled_at: new Date().toISOString(),
    cancel_reason: reason.trim(),
  }).eq('id', bookingId)

  await supabase.rpc('increment_spots', { slot_id: booking.trial_slot_id })

  // E5: Notify parent about cancellation
  sendParentTrialCancelled(supabase, bookingId, reason.trim()).catch(() => {})

  revalidatePath(`/centre-dashboard/bookings/${bookingId}`)
  revalidatePath('/centre-dashboard/bookings')
  revalidatePath('/centre-dashboard')
}

export async function centreMarkAttended(bookingId: string) {
  const { supabase, booking, centreId } = await verifyBookingOwnership(bookingId)

  if (booking.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be marked as attended')
  }

  const trialDate = (booking.trial_slots as any)?.date
  if (trialDate) {
    const today = new Date().toISOString().split('T')[0]
    if (trialDate > today) {
      throw new Error('Cannot mark attended before the trial date')
    }
  }

  await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)

  // Create trial_outcomes row + fetch centre rate in parallel
  const [{ data: outcome }, { data: centreData }] = await Promise.all([
    supabase.from('trial_outcomes').upsert(
      { booking_id: bookingId },
      { onConflict: 'booking_id', ignoreDuplicates: true }
    ).select('id').single(),
    supabase.from('centres').select('trial_commission_rate').eq('id', centreId).single(),
  ])

  // Auto-create trial commission if centre has a rate set
  if (outcome) {
    const rate = Number(centreData?.trial_commission_rate ?? 0)
    if (rate > 0) {
      await supabase.from('commissions').upsert(
        {
          trial_outcome_id: outcome.id,
          centre_id: centreId,
          commission_amount: rate,
          commission_type: 'trial',
          status: 'pending',
        },
        { onConflict: 'trial_outcome_id,commission_type', ignoreDuplicates: true }
      )
    }
  }

  // E6: Notify parent that trial was attended
  sendParentTrialCompleted(supabase, bookingId).catch(() => {})

  revalidatePath(`/centre-dashboard/bookings/${bookingId}`)
  revalidatePath('/centre-dashboard/bookings')
  revalidatePath('/centre-dashboard')
  // Also revalidate admin pages
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}

export async function centreMarkNoShow(bookingId: string) {
  const { supabase, booking } = await verifyBookingOwnership(bookingId)

  if (booking.status !== 'confirmed') {
    throw new Error('Only confirmed bookings can be marked as no-show')
  }

  const trialDate = (booking.trial_slots as any)?.date
  if (trialDate) {
    const today = new Date().toISOString().split('T')[0]
    if (trialDate > today) {
      throw new Error('Cannot mark no-show before the trial date')
    }
  }

  await supabase.from('bookings').update({
    status: 'no_show',
    is_flagged: true,
    flag_reason: 'No-show marked by centre',
  }).eq('id', bookingId)

  // E7: Notify admin about no-show
  sendAdminNoShowAlert(supabase, bookingId).catch(() => {})

  revalidatePath(`/centre-dashboard/bookings/${bookingId}`)
  revalidatePath('/centre-dashboard/bookings')
  revalidatePath('/centre-dashboard')
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}

export async function centreMarkEnrolled(bookingId: string) {
  const { supabase, booking, centreId } = await verifyBookingOwnership(bookingId)

  if (booking.status !== 'completed') {
    throw new Error('Only completed bookings can be marked as enrolled')
  }

  await supabase.from('bookings').update({ status: 'converted' }).eq('id', bookingId)

  // Update trial_outcomes with centre-reported enrollment
  await supabase.from('trial_outcomes').update({
    centre_reported_status: 'enrolled',
    centre_reported_at: new Date().toISOString(),
  }).eq('booking_id', bookingId)

  // Fetch outcome + centre rate in parallel
  const [{ data: outcome }, { data: centreData }] = await Promise.all([
    supabase.from('trial_outcomes').select('id').eq('booking_id', bookingId).single(),
    supabase.from('centres').select('conversion_commission_rate').eq('id', centreId).single(),
  ])

  if (outcome) {
    const rate = Number(centreData?.conversion_commission_rate ?? 0)
    if (rate > 0) {
      await supabase.from('commissions').upsert(
        {
          trial_outcome_id: outcome.id,
          centre_id: centreId,
          commission_amount: rate,
          commission_type: 'conversion',
          status: 'pending',
        },
        { onConflict: 'trial_outcome_id,commission_type', ignoreDuplicates: true }
      )
    }
  }

  // E8: Notify admin about conversion
  sendAdminConversionAlert(supabase, bookingId).catch(() => {})

  revalidatePath(`/centre-dashboard/bookings/${bookingId}`)
  revalidatePath('/centre-dashboard/bookings')
  revalidatePath('/centre-dashboard')
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}
