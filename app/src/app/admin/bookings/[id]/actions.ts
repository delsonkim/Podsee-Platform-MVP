'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { BookingStatus } from '@/types/database'

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const supabase = createAdminClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'confirmed') {
    updates.acknowledged_at = new Date().toISOString()
  }
  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  }

  await supabase.from('bookings').update(updates).eq('id', bookingId)

  // Restore spot when booking is cancelled
  if (status === 'cancelled') {
    const { data: booking } = await supabase
      .from('bookings')
      .select('trial_slot_id')
      .eq('id', bookingId)
      .single()
    if (booking) {
      await supabase.rpc('increment_spots', { slot_id: booking.trial_slot_id })
    }
  }

  // When marking completed, create the trial_outcome row so the parent can report
  if (status === 'completed') {
    await supabase.from('trial_outcomes').upsert(
      { booking_id: bookingId },
      { onConflict: 'booking_id', ignoreDuplicates: true }
    )
  }

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin')
}

export async function flagBooking(bookingId: string, reason: string) {
  const supabase = createAdminClient()
  await supabase
    .from('bookings')
    .update({ is_flagged: true, flag_reason: reason || null })
    .eq('id', bookingId)
  revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function unflagBooking(bookingId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('bookings')
    .update({ is_flagged: false, flag_reason: null })
    .eq('id', bookingId)
  revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function updateAdminNotes(bookingId: string, notes: string) {
  const supabase = createAdminClient()
  await supabase
    .from('bookings')
    .update({ admin_notes: notes || null })
    .eq('id', bookingId)
  revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function initiateCommission(
  bookingId: string,
  centreId: string,
  commissionType: 'trial' | 'conversion',
  amount: number,
) {
  if (amount <= 0) throw new Error('Commission amount must be greater than 0')

  const supabase = createAdminClient()

  // Verify booking status — trial commission needs completed+, conversion needs converted
  const { data: booking } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found')

  const validStatuses =
    commissionType === 'trial'
      ? ['completed', 'converted']
      : ['converted']

  if (!validStatuses.includes(booking.status)) {
    throw new Error(
      commissionType === 'trial'
        ? 'Trial commission requires a completed or converted booking'
        : 'Conversion commission requires a converted booking',
    )
  }

  // Get the trial_outcome for this booking
  const { data: outcome } = await supabase
    .from('trial_outcomes')
    .select('id')
    .eq('booking_id', bookingId)
    .single()

  if (!outcome) throw new Error('No trial outcome found for this booking')

  // Create commission record (upsert to prevent duplicates per type)
  const { error } = await supabase.from('commissions').upsert(
    {
      trial_outcome_id: outcome.id,
      centre_id: centreId,
      commission_amount: amount,
      commission_type: commissionType,
      status: 'pending',
    },
    { onConflict: 'trial_outcome_id,commission_type', ignoreDuplicates: false }
  )

  if (error) {
    if (error.code === '23505') throw new Error(`${commissionType === 'trial' ? 'Trial' : 'Conversion'} commission already exists`)
    throw new Error('Failed to create commission')
  }

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath('/admin/commissions')
  revalidatePath('/admin')
}
