'use client'

import { useState } from 'react'
import { deleteCentre } from './actions'

export default function DeleteCentreButton({ centreId, centreName }: { centreId: string; centreName: string }) {
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${centreName}"? This will also delete all its trial slots. This cannot be undone.`)) return
    setPending(true)
    try {
      await deleteCentre(centreId)
    } catch {
      alert('Failed to delete centre.')
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'delete'}
    </button>
  )
}
