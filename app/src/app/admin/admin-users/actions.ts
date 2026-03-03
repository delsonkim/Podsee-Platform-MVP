'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function addAdminUser(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as string) || 'admin'

  if (!email) {
    return { error: 'Email is required.' }
  }

  const supabase = createAdminClient()

  // Check if user has already signed in via Google — if so, link auth_user_id
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const authUser = users.find((u) => u.email?.toLowerCase() === email)

  const { error } = await supabase.from('admin_users').insert({
    auth_user_id: authUser?.id ?? null,
    email,
    role,
  })

  if (error) {
    if (error.code === '23505') return { error: 'This email is already an admin.' }
    return { error: 'Failed to add admin: ' + error.message }
  }

  revalidatePath('/admin/admin-users')
  return { success: true }
}

export async function removeAdminUser(id: string) {
  const supabase = createAdminClient()
  await supabase.from('admin_users').delete().eq('id', id)
  revalidatePath('/admin/admin-users')
}
