import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    // Create the redirect response first so we can set cookies on it directly
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      const user = data.session.user
      const email = user.email?.toLowerCase()

      // Check if this user is a centre user — use admin client for RLS bypass
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // First-time login linking: match by email where auth_user_id is null
      if (email) {
        // Centre users
        const { data: pendingCentre } = await admin
          .from('centre_users')
          .select('id')
          .eq('email', email)
          .is('auth_user_id', null)
          .limit(1)
          .maybeSingle()

        if (pendingCentre) {
          await admin
            .from('centre_users')
            .update({ auth_user_id: user.id })
            .eq('id', pendingCentre.id)
        }

        // Admin users
        const { data: pendingAdmin } = await admin
          .from('admin_users')
          .select('id')
          .eq('email', email)
          .is('auth_user_id', null)
          .limit(1)
          .maybeSingle()

        if (pendingAdmin) {
          await admin
            .from('admin_users')
            .update({ auth_user_id: user.id })
            .eq('id', pendingAdmin.id)
        }
      }

      // Helper to create a redirect response preserving cookies
      function redirectTo(path: string) {
        const r = NextResponse.redirect(`${origin}${path}`)
        response.cookies.getAll().forEach((cookie) => {
          r.cookies.set(cookie.name, cookie.value)
        })
        return r
      }

      // Check if user is an admin (by auth_user_id)
      const { data: adminUser } = await admin
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle()

      // If admin and landing on a generic page, redirect to admin dashboard
      if (adminUser && (next === '/' || next === '/centres')) {
        return redirectTo('/admin')
      }

      // Check if user has a centre_users record (by auth_user_id)
      const { data: centreUser } = await admin
        .from('centre_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .maybeSingle()

      // If centre user and landing on a generic page, redirect to dashboard
      if (centreUser && (next === '/' || next === '/centres')) {
        return redirectTo('/centre-dashboard')
      }

      return response
    }
  }

  // If something went wrong, redirect home
  return NextResponse.redirect(`${origin}/?auth_error=true`)
}
