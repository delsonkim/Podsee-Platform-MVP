import { createClient } from '@/lib/supabase/client'

/**
 * Redirect to Google OAuth. After login, the user lands on the `returnTo` path.
 */
export function signInWithGoogle(returnTo: string) {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    },
  })
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}
