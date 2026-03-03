import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Checks that the current user is a centre user and returns their centre info.
 * Redirects to sign-in if not authenticated, or to /centres if not a centre user.
 *
 * On first login, links the auth user to an existing centre_users record by email.
 */
export async function requireCentreUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/centre-login')
  }

  const admin = createAdminClient()

  // Try to find by auth_user_id first
  const { data: centreUser } = await admin
    .from('centre_users')
    .select('id, auth_user_id, centre_id, role, email, centres(id, name, slug)')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single()

  if (centreUser) {
    return {
      user,
      centreUser,
      centreId: centreUser.centre_id,
      centreName: (centreUser.centres as any)?.name ?? 'My Centre',
      role: centreUser.role as 'owner' | 'staff',
    }
  }

  // First-time login: try matching by email and backfill auth_user_id
  const email = user.email?.toLowerCase()
  if (email) {
    const { data: pendingUser } = await admin
      .from('centre_users')
      .select('id, centre_id, role, email, centres(id, name, slug)')
      .eq('email', email)
      .is('auth_user_id', null)
      .limit(1)
      .single()

    if (pendingUser) {
      // Link this Google account to the centre_users record
      await admin
        .from('centre_users')
        .update({ auth_user_id: user.id })
        .eq('id', pendingUser.id)

      return {
        user,
        centreUser: { ...pendingUser, auth_user_id: user.id },
        centreId: pendingUser.centre_id,
        centreName: (pendingUser.centres as any)?.name ?? 'My Centre',
        role: pendingUser.role as 'owner' | 'staff',
      }
    }
  }

  // Not a centre user
  redirect('/centres?error=not_centre_user')
}
