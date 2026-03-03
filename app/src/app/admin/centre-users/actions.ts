'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function linkCentreUser(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const centreId = formData.get('centre_id') as string
  const role = (formData.get('role') as string) || 'owner'

  if (!email || !centreId) {
    return { error: 'Email and centre are required.' }
  }

  const supabase = createAdminClient()

  // Check if user has already signed in via Google — if so, link auth_user_id
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const authUser = users.find((u) => u.email?.toLowerCase() === email)

  const { error } = await supabase.from('centre_users').insert({
    auth_user_id: authUser?.id ?? null,
    centre_id: centreId,
    role,
    email,
  })

  if (error) {
    if (error.code === '23505') return { error: 'This user is already linked to that centre.' }
    return { error: 'Failed to link user: ' + error.message }
  }

  revalidatePath('/admin/centre-users')
  return { success: true }
}

export async function unlinkCentreUser(id: string) {
  const supabase = createAdminClient()
  await supabase.from('centre_users').delete().eq('id', id)
  revalidatePath('/admin/centre-users')
}
