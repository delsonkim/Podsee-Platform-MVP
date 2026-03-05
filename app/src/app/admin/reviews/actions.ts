'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function approveReview(reviewId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', reviewId)

  if (error) throw new Error('Failed to approve review')

  revalidatePath('/admin/reviews')
  // Revalidate centre pages so approved review shows up
  revalidatePath('/centres', 'layout')
}

export async function rejectReview(reviewId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'rejected' })
    .eq('id', reviewId)

  if (error) throw new Error('Failed to reject review')

  revalidatePath('/admin/reviews')
}
