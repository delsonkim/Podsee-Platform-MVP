'use client'

import { useState } from 'react'
import { updateStructuredPolicies } from './actions'

interface PolicyEntry {
  key: string
  category: string
  description: string
}

const SUGGESTED_CATEGORIES = [
  'Replacement Class',
  'Makeup Class',
  'Commitment Terms',
  'Notice Period',
  'Payment Terms',
  'Refund Policy',
  'Withdrawal Policy',
  'Attendance',
  'Materials & Resources',
]

function entryFromPolicy(p: { id: string; category: string; description: string }): PolicyEntry {
  return { key: p.id, category: p.category, description: p.description }
}

function emptyEntry(): PolicyEntry {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: '',
    description: '',
  }
}

export default function PoliciesForm({
  structuredPolicies,
}: {
  structuredPolicies: { id: string; category: string; description: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [entries, setEntries] = useState<PolicyEntry[]>(() =>
    structuredPolicies.length > 0 ? structuredPolicies.map(entryFromPolicy) : []
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateEntry(key: string, field: 'category' | 'description', value: string) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)))
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()])
  }

  function handleCancel() {
    setEntries(structuredPolicies.length > 0 ? structuredPolicies.map(entryFromPolicy) : [])
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    // Validate: each entry needs a category
    for (const e of entries) {
      if (!e.category.trim()) {
        setMessage({ type: 'error', text: 'Every policy needs a category name.' })
        return
      }
    }

    setSaving(true)
    setMessage(null)
    const result = await updateStructuredPolicies({
      policies: entries
        .filter((e) => e.category.trim())
        .map((e) => ({ category: e.category.trim(), description: e.description.trim() })),
    })
    setSaving(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Policies saved' })
      setEditing(false)
    }
  }

  // ── Read-only view ──
  if (!editing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Policies</p>
          <button
            onClick={() => { setEditing(true); setMessage(null) }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit
          </button>
        </div>

        {message && (
          <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No policies set yet. Click Edit to add your policies.</p>
        ) : (
          <dl>
            {entries.map((e) => (
              <div key={e.key} className="flex py-2.5 border-b border-gray-100 last:border-0">
                <dt className="w-44 shrink-0 text-sm text-gray-500">{e.category}</dt>
                <dd className="text-sm text-gray-900">{e.description || <span className="text-gray-300">--</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    )
  }

  // ── Editing view ──
  const usedCategories = new Set(entries.map((e) => e.category))
  const suggestions = SUGGESTED_CATEGORIES.filter((c) => !usedCategories.has(c))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Policies</p>
      </div>

      {message && (
        <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div key={entry.key} className="border border-gray-200 rounded-lg p-3 relative">
            <button
              type="button"
              onClick={() => removeEntry(entry.key)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
              title="Remove policy"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="text-xs text-gray-400 mb-2">Policy {idx + 1}</p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <input
                  type="text"
                  value={entry.category}
                  onChange={(e) => updateEntry(entry.key, 'category', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. Replacement Class, Payment Terms"
                  list={`suggestions-${entry.key}`}
                />
                {suggestions.length > 0 && (
                  <datalist id={`suggestions-${entry.key}`}>
                    {suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={entry.description}
                  onChange={(e) => updateEntry(entry.key, 'description', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="Describe this policy..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add entry button */}
      <button
        type="button"
        onClick={addEntry}
        className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add policy
      </button>

      {/* Save / Cancel */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Policies'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <p className="text-xs text-gray-400 ml-auto">Changes go live immediately.</p>
      </div>
    </div>
  )
}
