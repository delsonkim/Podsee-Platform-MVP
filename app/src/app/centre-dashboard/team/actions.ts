'use server'

import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function addTeamMember(centreId: string, formData: FormData) {
  // Verify caller is an owner
  const { role, centreId: callerCentreId } = await requireCentreUser()
  if (role !== 'owner' || callerCentreId !== centreId) {
    return { error: 'Only owners can add team members.' }
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const memberRole = (formData.get('role') as string) || 'staff'

  if (!email) {
    return { error: 'Email is required.' }
  }

  const supabase = createAdminClient()

  // Check if user has already signed in via Google — if so, link auth_user_id
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const authUser = users.find((u) => u.email?.toLowerCase() === email)

  const { error } = await supabase.from('centre_users').insert({
    auth_user_id: authUser?.id ?? null,
    centre_id: centreId,
    role: memberRole,
    email,
  })

  if (error) {
    if (error.code === '23505') return { error: 'This user is already linked to this centre.' }
    return { error: 'Failed to add team member: ' + error.message }
  }

  revalidatePath('/centre-dashboard/team')
  return { success: true }
}

export async function removeTeamMember(centreUserId: string, centreId: string) {
  // Verify caller is an owner
  const { role, centreId: callerCentreId } = await requireCentreUser()
  if (role !== 'owner' || callerCentreId !== centreId) {
    return { error: 'Only owners can remove team members.' }
  }

  const supabase = createAdminClient()
  await supabase.from('centre_users').delete().eq('id', centreUserId).eq('centre_id', centreId)
  revalidatePath('/centre-dashboard/team')
}
