'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { RewardStatus } from '@/types/database'

export async function updateRewardStatus(
  rewardId: string,
  status: RewardStatus,
  paymentMethod?: string,
  paymentReference?: string,
) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = { status }
  if (status === 'approved') updates.approved_at = now
  if (status === 'paid') {
    updates.paid_at = now
    if (paymentMethod) updates.payment_method = paymentMethod
    if (paymentReference) updates.payment_reference = paymentReference
  }

  await supabase.from('rewards').update(updates).eq('id', rewardId)
  revalidatePath('/admin/rewards')
}
