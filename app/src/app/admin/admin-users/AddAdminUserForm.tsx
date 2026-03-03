'use client'

import { useState, useTransition } from 'react'
import { addAdminUser } from './actions'

export default function AddAdminUserForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await addAdminUser(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        const form = document.getElementById('add-admin-form') as HTMLFormElement
        form?.reset()
      }
    })
  }

  return (
    <form id="add-admin-form" action={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Add Admin User</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm text-green-700">Admin user added successfully.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Google Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="admin@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            name="role"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
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
            {isPending ? 'Adding...' : 'Add Admin'}
          </button>
        </div>
      </div>
    </form>
  )
}
