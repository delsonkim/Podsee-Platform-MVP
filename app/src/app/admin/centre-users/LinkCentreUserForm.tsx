'use client'

import { useState, useTransition } from 'react'
import { linkCentreUser } from './actions'

export default function LinkCentreUserForm({
  centres,
}: {
  centres: { id: string; name: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  const dashboardUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/centre-dashboard`
    : '/centre-dashboard'

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccessEmail(null)
    const email = formData.get('email') as string
    startTransition(async () => {
      const result = await linkCentreUser(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccessEmail(email)
        const form = document.getElementById('link-form') as HTMLFormElement
        form?.reset()
      }
    })
  }

  return (
    <form id="link-form" action={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Link a User to a Centre</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">{error}</div>
      )}
      {successEmail && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-green-700 font-medium">User linked successfully.</p>
          <p className="text-xs text-green-600">Send this link to <strong>{successEmail}</strong> so they can sign in:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-3 py-1.5 text-xs text-gray-800 select-all">{dashboardUrl}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(dashboardUrl)}
              className="shrink-0 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Google Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="owner@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Centre</label>
          <select
            name="centre_id"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          >
            <option value="">Select a centre</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            name="role"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          >
            <option value="owner">Owner</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPending
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isPending ? 'Linking...' : 'Link User'}
          </button>
        </div>
      </div>
    </form>
  )
}
