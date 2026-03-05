'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { sendCentreBookingCancelled, sendCentreBookingRescheduled, sendAdminDisputeAlert } from '@/lib/email'

function generateRef(): string {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = randomBytes(3).toString('base64url').slice(0, 4).toUpperCase()
  return `PSE-${date}-${rand}`
}

async function getAuthenticatedParent() {
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createAdminClient()
  const { data: parent } = await supabase
    .from('parents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!parent) throw new Error('Parent not found')

  return { supabase, parentId: parent.id }
}

export async function cancelBooking(bookingId: string) {
  const { supabase, parentId } = await getAuthenticatedParent()

  // Verify this booking belongs to the parent and is cancellable
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, trial_slot_id, parent_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found')
  if (booking.parent_id !== parentId) throw new Error('Not your booking')
  if (booking.status !== 'confirmed') {
    throw new Error('This booking cannot be cancelled')
  }

  // Cancel the booking
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: 'parent',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  // Restore the spot
  await supabase.rpc('increment_spots', { slot_id: booking.trial_slot_id })

  // E3: Notify centre about cancellation
  sendCentreBookingCancelled(supabase, bookingId).catch(() => {})

  revalidatePath('/my-bookings')
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}

export async function getAvailableSlots(centreId: string, excludeSlotId: string, subjectId: string, levelId: string) {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: slots } = await supabase
    .from('trial_slots')
    .select('id, date, start_time, end_time, spots_remaining, max_students, trial_fee, subjects(name), levels(label)')
    .eq('centre_id', centreId)
    .eq('subject_id', subjectId)
    .eq('level_id', levelId)
    .neq('id', excludeSlotId)
    .gt('spots_remaining', 0)
    .gte('date', today)
    .order('date')
    .order('start_time')

  return slots ?? []
}

export async function rescheduleBooking(oldBookingId: string, newSlotId: string) {
  const { supabase, parentId } = await getAuthenticatedParent()

  // Verify the old booking
  const { data: oldBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', oldBookingId)
    .single()

  if (!oldBooking) throw new Error('Booking not found')
  if (oldBooking.parent_id !== parentId) throw new Error('Not your booking')
  if (oldBooking.status !== 'confirmed') {
    throw new Error('This booking cannot be rescheduled')
  }

  // Verify the new slot has availability
  const { data: newSlot } = await supabase
    .from('trial_slots')
    .select('trial_fee, centre_id, spots_remaining')
    .eq('id', newSlotId)
    .single()

  if (!newSlot || newSlot.spots_remaining <= 0) {
    throw new Error('Selected slot is no longer available')
  }

  // Atomic decrement on new slot
  const { data: decremented, error: decError } = await supabase.rpc('decrement_spots', { slot_id: newSlotId })
  if (decError || decremented === 0) {
    throw new Error('Selected slot just filled up. Please choose another.')
  }

  // Create new booking with retry on ref collision
  let bookingRef = ''
  let newBookingId = ''
  let insertError = null
  for (let attempt = 0; attempt < 3; attempt++) {
    bookingRef = generateRef()
    const result = await supabase.from('bookings').insert({
      booking_ref: bookingRef,
      trial_slot_id: newSlotId,
      centre_id: newSlot.centre_id,
      parent_id: oldBooking.parent_id,
      parent_name_at_booking: oldBooking.parent_name_at_booking,
      parent_email_at_booking: oldBooking.parent_email_at_booking,
      parent_phone_at_booking: oldBooking.parent_phone_at_booking,
      child_name_at_booking: oldBooking.child_name_at_booking,
      child_level_at_booking: oldBooking.child_level_at_booking,
      trial_fee_at_booking: newSlot.trial_fee,
      referral_source: oldBooking.referral_source,
      status: 'confirmed',
      acknowledged_at: new Date().toISOString(),
      rescheduled_from: oldBookingId,
    }).select('id').single()
    insertError = result.error
    if (!insertError) { newBookingId = result.data?.id; break }
    if (!insertError.message?.includes('unique') && !insertError.code?.includes('23505')) break
  }

  if (insertError) {
    // Restore spot on new slot since booking failed
    await supabase.rpc('increment_spots', { slot_id: newSlotId })
    throw new Error('Reschedule failed. Please try again.')
  }

  // Cancel the old booking
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: 'reschedule',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', oldBookingId)

  // Restore spot on old slot
  await supabase.rpc('increment_spots', { slot_id: oldBooking.trial_slot_id })

  // E4: Notify centre about reschedule
  if (newBookingId) {
    sendCentreBookingRescheduled(supabase, oldBookingId, newBookingId).catch(() => {})
  }

  revalidatePath('/my-bookings')
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}

export async function disputeEnrollment(bookingId: string) {
  const { supabase, parentId } = await getAuthenticatedParent()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, parent_id, status')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found')
  if (booking.parent_id !== parentId) throw new Error('Not your booking')
  if (booking.status !== 'converted') {
    throw new Error('This booking is not marked as enrolled')
  }

  // Check 14-day dispute window
  const { data: outcome } = await supabase
    .from('trial_outcomes')
    .select('centre_reported_at')
    .eq('booking_id', bookingId)
    .single()

  if (!outcome?.centre_reported_at) {
    throw new Error('No enrollment report found')
  }

  const reportedAt = new Date(outcome.centre_reported_at)
  const daysSince = (Date.now() - reportedAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince > 14) {
    throw new Error('Dispute window has closed (14 days)')
  }

  // Revert to completed + flag for admin
  await supabase
    .from('bookings')
    .update({
      status: 'completed',
      is_flagged: true,
      flag_reason: 'Parent disputed centre enrollment claim',
    })
    .eq('id', bookingId)

  // Clear centre enrollment claim
  await supabase
    .from('trial_outcomes')
    .update({
      centre_reported_status: null,
      centre_reported_at: null,
      parent_reported_status: 'not_enrolled',
      reported_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)

  // E9: Notify admin about dispute
  sendAdminDisputeAlert(supabase, bookingId).catch(() => {})

  revalidatePath('/my-bookings')
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/outcomes')
  revalidatePath('/admin')
}

export async function submitReview(bookingId: string, centreId: string, rating: number, reviewText?: string) {
  const { supabase, parentId } = await getAuthenticatedParent()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, parent_id, status, trial_slot_id')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found')
  if (booking.parent_id !== parentId) throw new Error('Not your booking')
  if (booking.status !== 'completed' && booking.status !== 'converted') {
    throw new Error('Reviews can only be left for completed or converted bookings')
  }

  // Check 14-day window from trial date
  const { data: slot } = await supabase
    .from('trial_slots')
    .select('date')
    .eq('id', booking.trial_slot_id)
    .single()

  if (slot?.date) {
    const trialDate = new Date(slot.date)
    const daysSince = (Date.now() - trialDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 14) {
      throw new Error('Review window has closed (14 days after trial)')
    }
  }

  // Check no existing review
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .single()

  if (existing) throw new Error('You have already submitted a review')

  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5')

  await supabase.from('reviews').insert({
    booking_id: bookingId,
    parent_id: parentId,
    centre_id: centreId,
    rating,
    review_text: reviewText?.trim() || null,
    status: 'pending_approval',
  })

  revalidatePath('/my-bookings')
  revalidatePath('/admin')
}
