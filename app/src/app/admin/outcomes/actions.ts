'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function verifyOutcomeAndConvert(
  outcomeId: string,
  bookingId: string,
  commissionAmount: number,
  centreId: string,
  rewardAmount: number,
  parentId: string,
) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. Mark outcome as admin verified
  await supabase
    .from('trial_outcomes')
    .update({ admin_verified: true, admin_verified_at: now })
    .eq('id', outcomeId)

  // 2. Mark booking as converted
  await supabase.from('bookings').update({ status: 'converted' }).eq('id', bookingId)

  // 3. Create commission
  await supabase.from('commissions').upsert(
    {
      trial_outcome_id: outcomeId,
      centre_id: centreId,
      commission_amount: commissionAmount,
      status: 'pending',
    },
    { onConflict: 'trial_outcome_id', ignoreDuplicates: true }
  )

  // 4. Create reward
  await supabase.from('rewards').upsert(
    {
      trial_outcome_id: outcomeId,
      parent_id: parentId,
      reward_amount: rewardAmount,
      status: 'pending',
    },
    { onConflict: 'trial_outcome_id', ignoreDuplicates: true }
  )

  revalidatePath('/admin/outcomes')
  revalidatePath('/admin/commissions')
  revalidatePath('/admin/rewards')
  revalidatePath('/admin')
}

export async function updateOutcomeNotes(outcomeId: string, notes: string) {
  const supabase = createAdminClient()
  await supabase.from('trial_outcomes').update({ admin_notes: notes || null }).eq('id', outcomeId)
  revalidatePath('/admin/outcomes')
}
