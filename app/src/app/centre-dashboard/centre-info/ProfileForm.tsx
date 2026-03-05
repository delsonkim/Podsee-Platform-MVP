'use client'

import { useState, useCallback } from 'react'
import { updateProfile } from './actions'

interface ProfileFields {
  description: string
  teaching_style: string
  track_record: string
  class_size: string
  years_operating: string
}

interface Props {
  initial: {
    description: string
    teaching_style: string
    track_record: string
    class_size: number | null
    years_operating: number | null
  }
  isLive: boolean
}

function ViewRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">--</span>}</dd>
    </div>
  )
}

function toFormState(initial: Props['initial']): ProfileFields {
  return {
    description: initial.description,
    teaching_style: initial.teaching_style,
    track_record: initial.track_record,
    class_size: initial.class_size?.toString() ?? '',
    years_operating: initial.years_operating?.toString() ?? '',
  }
}

export default function ProfileForm({ initial, isLive }: Props) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileFields>(() => toFormState(initial))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updateField = useCallback((field: keyof ProfileFields, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  function handleCancel() {
    setForm(toFormState(initial))
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateProfile({
      description: form.description,
      teaching_style: form.teaching_style,
      track_record: form.track_record,
      class_size: form.class_size ? Number(form.class_size) : null,
      years_operating: form.years_operating ? Number(form.years_operating) : null,
    })
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
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profile</p>
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
          <ViewRow label="Description" value={form.description} />
          <ViewRow label="Teaching Style" value={form.teaching_style} />
          <ViewRow label="Track Record" value={form.track_record} />
          <ViewRow label="Class Size" value={form.class_size ? Number(form.class_size) : null} />
          <ViewRow label="Years Operating" value={form.years_operating ? Number(form.years_operating) : null} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="What makes your centre unique?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Style</label>
              <textarea
                value={form.teaching_style}
                onChange={(e) => updateField('teaching_style', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="How do you teach?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Track Record</label>
              <textarea
                value={form.track_record}
                onChange={(e) => updateField('track_record', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Results, achievements, student outcomes..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Size</label>
                <input
                  type="number"
                  value={form.class_size}
                  onChange={(e) => updateField('class_size', e.target.value)}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years Operating</label>
                <input
                  type="number"
                  value={form.years_operating}
                  onChange={(e) => updateField('years_operating', e.target.value)}
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. 5"
                />
              </div>
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
