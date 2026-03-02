'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { CommissionStatus } from '@/types/database'

export async function updateCommissionStatus(
  commissionId: string,
  status: CommissionStatus,
  invoiceNumber?: string,
) {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = { status }
  if (status === 'invoiced') {
    updates.invoiced_at = now
    if (invoiceNumber) updates.invoice_number = invoiceNumber
  }
  if (status === 'paid') {
    updates.paid_at = now
  }

  await supabase.from('commissions').update(updates).eq('id', commissionId)
  revalidatePath('/admin/commissions')
}
