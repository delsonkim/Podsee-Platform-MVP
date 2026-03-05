'use client'

import { useState, useCallback } from 'react'
import { updatePolicies } from './actions'

interface PolicyFields {
  replacement_class_policy: string
  makeup_class_policy: string
  commitment_terms: string
  notice_period_terms: string
  payment_terms: string
  other_policies: string
}

interface Props {
  initial: PolicyFields
  isLive: boolean
}

function ViewRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">--</span>}</dd>
    </div>
  )
}

export default function PoliciesForm({ initial, isLive }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PolicyFields>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updateField = useCallback((field: keyof PolicyFields, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  function handleCancel() {
    setForm(initial)
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updatePolicies(form)
    setSaving(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({
        type: 'success',
        text: result.isDraft ? 'Submitted for review' : 'Changes saved',
      })
      setEditing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Policies</p>
        {!editing && (
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
        )}
      </div>

      {message && (
        <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}

      {!editing ? (
        <dl>
          <ViewRow label="Replacement Class" value={form.replacement_class_policy || null} />
          <ViewRow label="Makeup Class" value={form.makeup_class_policy || null} />
          <ViewRow label="Commitment" value={form.commitment_terms || null} />
          <ViewRow label="Notice Period" value={form.notice_period_terms || null} />
          <ViewRow label="Payment" value={form.payment_terms || null} />
          <ViewRow label="Other" value={form.other_policies || null} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Class Policy</label>
              <textarea
                value={form.replacement_class_policy}
                onChange={(e) => updateField('replacement_class_policy', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Your replacement class policy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Makeup Class Policy</label>
              <textarea
                value={form.makeup_class_policy}
                onChange={(e) => updateField('makeup_class_policy', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Your makeup class policy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Terms</label>
              <textarea
                value={form.commitment_terms}
                onChange={(e) => updateField('commitment_terms', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Minimum commitment period, if any..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
              <textarea
                value={form.notice_period_terms}
                onChange={(e) => updateField('notice_period_terms', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Notice required to withdraw..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <textarea
                value={form.payment_terms}
                onChange={(e) => updateField('payment_terms', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Payment frequency, methods accepted..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Policies</label>
              <textarea
                value={form.other_policies}
                onChange={(e) => updateField('other_policies', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Any other policies parents should know..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            {isLive && (
              <p className="text-xs text-gray-400 ml-auto">Changes will be reviewed before going live.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
