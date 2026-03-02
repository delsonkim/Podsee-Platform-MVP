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

  await supabase.from('bookings').update(updates).eq('id', bookingId)

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
