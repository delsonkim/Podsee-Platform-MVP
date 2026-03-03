'use server'

import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendBookingConfirmation } from '@/lib/email'

// Generates a readable booking ref: PSE-YYMMDD-XXXX (crypto-safe)
function generateRef(): string {
  const now = new Date()
  const date = now.toISOString().slice(2, 10).replace(/-/g, '')
  const rand = randomBytes(3).toString('base64url').slice(0, 4).toUpperCase()
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

  // Verify the user is authenticated
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) {
    throw new Error('You must be logged in to book a trial.')
  }

  const supabase = createAdminClient()

  // Upsert parent record — link to auth user, update name/phone if changed
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .upsert(
      {
        email: parentEmail,
        name: parentName,
        phone: parentPhone || null,
        auth_user_id: user.id,
      },
      { onConflict: 'email' }
    )
    .select('id')
    .single()

  if (parentError) {
    throw new Error('Could not create your account. Please try again.')
  }

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

  // Atomic decrement — prevents overbooking under concurrent requests
  const { data: decremented, error: decError } = await supabase.rpc('decrement_spots', { slot_id: slotId })
  if (decError || decremented === 0) {
    throw new Error('Sorry, this slot just filled up. Please choose another.')
  }

  // Insert booking with retry on ref collision (up to 3 attempts)
  let bookingRef = ''
  let insertError = null
  for (let attempt = 0; attempt < 3; attempt++) {
    bookingRef = generateRef()
    const result = await supabase.from('bookings').insert({
      booking_ref: bookingRef,
      trial_slot_id: slotId,
      centre_id: slot.centre_id,
      parent_id: parent.id,
      parent_name_at_booking: parentName,
      parent_email_at_booking: parentEmail,
      parent_phone_at_booking: parentPhone || null,
      child_name_at_booking: childName,
      child_level_at_booking: childLevel,
      trial_fee_at_booking: slot.trial_fee,
      referral_source: referralSource || null,
      status: 'pending',
    })
    insertError = result.error
    if (!insertError) break
    // If it's not a unique constraint violation, don't retry
    if (!insertError.message?.includes('unique') && !insertError.code?.includes('23505')) break
  }

  if (insertError) {
    // Restore the spot since booking failed
    await supabase.rpc('increment_spots', { slot_id: slotId })
    throw new Error('Booking failed. Please try again.')
  }

  // Send confirmation email (fire-and-forget — don't block the redirect)
  const { data: fullSlot } = await supabase
    .from('trial_slots')
    .select('date, start_time, end_time, subjects(name), centres(name, slug, address, nearest_mrt)')
    .eq('id', slotId)
    .single()

  if (fullSlot) {
    const s = fullSlot as any
    sendBookingConfirmation({
      parentName,
      parentEmail,
      childName,
      childLevel,
      bookingRef,
      centreName: s.centres?.name ?? '',
      centreAddress: s.centres?.address ?? null,
      centreSlug: s.centres?.slug ?? '',
      nearestMrt: s.centres?.nearest_mrt ?? null,
      subjectName: s.subjects?.name ?? '',
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      trialFee: Number(slot.trial_fee),
    }).catch(() => {}) // swallow — email failure shouldn't break booking
  }

  redirect(`/book/success?ref=${bookingRef}`)
}
