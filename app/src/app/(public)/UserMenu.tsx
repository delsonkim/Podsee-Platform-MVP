'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

export default function UserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!user) return null

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? ''
  const avatar = user.user_metadata?.avatar_url
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-sage hover:text-forest transition-colors"
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-fern text-white flex items-center justify-center text-xs font-bold">
            {initial}
          </div>
        )}
        <span className="hidden sm:inline font-medium truncate max-w-[120px]">{name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-linen rounded-xl shadow-lg py-1 z-20">
            <div className="px-3 py-2 border-b border-linen">
              <p className="text-xs text-sage truncate">{user.email}</p>
            </div>
            <a
              href="/my-bookings"
              className="block w-full text-left px-3 py-2 text-sm text-sage hover:text-forest hover:bg-paper transition-colors"
            >
              My Bookings
            </a>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-3 py-2 text-sm text-sage hover:text-forest hover:bg-paper transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
