'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Feature toggles — flip to true when ready to auto-create financial records on verification
const AUTO_CREATE_COMMISSION = false
const AUTO_CREATE_REWARD = false

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

  // 2. Mark booking as converted (if not already)
  await supabase.from('bookings').update({ status: 'converted' }).eq('id', bookingId)

  // 3. Create commission (toggled OFF during free onboarding period)
  if (AUTO_CREATE_COMMISSION && commissionAmount > 0) {
    await supabase.from('commissions').upsert(
      {
        trial_outcome_id: outcomeId,
        centre_id: centreId,
        commission_amount: commissionAmount,
        commission_type: 'conversion',
        status: 'pending',
      },
      { onConflict: 'trial_outcome_id,commission_type', ignoreDuplicates: true }
    )
  }

  // 4. Create reward (toggled OFF — cash rewards not active)
  if (AUTO_CREATE_REWARD && rewardAmount > 0) {
    await supabase.from('rewards').upsert(
      {
        trial_outcome_id: outcomeId,
        parent_id: parentId,
        reward_amount: rewardAmount,
        status: 'pending',
      },
      { onConflict: 'trial_outcome_id', ignoreDuplicates: true }
    )
  }

  revalidatePath('/admin/outcomes')
  revalidatePath('/admin/commissions')
  revalidatePath('/admin/rewards')
  revalidatePath('/admin')
}

// Simplified verify — just marks outcome as admin verified (no financial records)
export async function verifyOutcome(outcomeId: string) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  await supabase
    .from('trial_outcomes')
    .update({ admin_verified: true, admin_verified_at: now })
    .eq('id', outcomeId)

  revalidatePath('/admin/outcomes')
  revalidatePath('/admin')
}

export async function updateOutcomeNotes(outcomeId: string, notes: string) {
  const supabase = createAdminClient()
  await supabase.from('trial_outcomes').update({ admin_notes: notes || null }).eq('id', outcomeId)
  revalidatePath('/admin/outcomes')
}
