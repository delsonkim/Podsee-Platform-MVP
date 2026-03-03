'use client'

import { signOut } from '@/lib/auth'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-xs text-gray-400 hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}
