import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Checks that the current user is an admin and returns their info.
 * Redirects to /admin-login if not authenticated, or home if not an admin.
 *
 * On first login, links the auth user to an existing admin_users record by email.
 */
export async function requireAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin-login')
  }

  const admin = createAdminClient()

  // Try to find by auth_user_id first
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id, auth_user_id, email, role')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single()

  if (adminUser) {
    return {
      user,
      adminUser,
      role: adminUser.role as 'admin' | 'superadmin',
    }
  }

  // First-time login: try matching by email and backfill auth_user_id
  const email = user.email?.toLowerCase()
  if (email) {
    const { data: pendingUser } = await admin
      .from('admin_users')
      .select('id, email, role')
      .eq('email', email)
      .is('auth_user_id', null)
      .limit(1)
      .single()

    if (pendingUser) {
      await admin
        .from('admin_users')
        .update({ auth_user_id: user.id })
        .eq('id', pendingUser.id)

      return {
        user,
        adminUser: { ...pendingUser, auth_user_id: user.id },
        role: pendingUser.role as 'admin' | 'superadmin',
      }
    }
  }

  // Not an admin
  redirect('/?error=not_admin')
}
