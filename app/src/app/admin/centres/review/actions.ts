'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteCentre(centreId: string) {
  const supabase = createAdminClient()

  // Delete draft slots first (FK constraint)
  await supabase
    .from('trial_slots')
    .delete()
    .eq('centre_id', centreId)

  // Delete the centre
  const { error } = await supabase
    .from('centres')
    .delete()
    .eq('id', centreId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/centres/review')
  revalidatePath('/admin/centres')
}
