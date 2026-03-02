'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

// Generates a readable booking ref: PSE-YYMMDD-XXXX
function generateRef(): string {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `PSE-${date}-${rand}`
}

export async function submitBooking(formData: FormData) {
  const slotId = formData.get('slot_id') as string
  const childName = formData.get('child_name') as string
  const childLevel = formData.get('child_level') as string
  const parentName = formData.get('parent_name') as string
  const parentEmail = formData.get('parent_email') as string
  const parentPhone = formData.get('parent_phone') as string
  const referralSource = formData.get('referral_source') as string

  if (!slotId || !childName || !childLevel || !parentName || !parentEmail) {
    throw new Error('Missing required fields')
  }

  const supabase = createAdminClient()

  // Fetch the slot to lock the trial fee and get centre_id
  const { data: slot, error: slotError } = await supabase
    .from('trial_slots')
    .select('trial_fee, centre_id, spots_remaining')
    .eq('id', slotId)
    .single()

  if (slotError || !slot) {
    throw new Error('This slot could not be found. Please go back and try again.')
  }

  if (slot.spots_remaining <= 0) {
    throw new Error('Sorry, this slot is now full. Please choose another.')
  }

  const bookingRef = generateRef()

  const { error: insertError } = await supabase.from('bookings').insert({
    booking_ref: bookingRef,
    trial_slot_id: slotId,
    centre_id: slot.centre_id,
    parent_name_at_booking: parentName,
    parent_email_at_booking: parentEmail,
    parent_phone_at_booking: parentPhone || null,
    child_name_at_booking: childName,
    child_level_at_booking: childLevel,
    trial_fee_at_booking: slot.trial_fee,
    referral_source: referralSource || null,
    status: 'pending',
  })

  if (insertError) {
    throw new Error('Booking failed. Please try again.')
  }

  // Decrement spots_remaining (best-effort; race condition acceptable at MVP scale)
  await supabase
    .from('trial_slots')
    .update({ spots_remaining: Math.max(0, slot.spots_remaining - 1) })
    .eq('id', slotId)

  redirect(`/book/success?ref=${bookingRef}`)
}
