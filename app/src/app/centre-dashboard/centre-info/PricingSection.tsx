'use client'

import { useState } from 'react'
import type { CentrePricing, TrialType } from '@/types/database'
import { updatePricing } from './actions'

type PricingRow = CentrePricing & { subject_name: string; level_label: string | null }

interface Subject { id: string; name: string }
interface Level { id: string; label: string; level_group: string }

interface EditableRow {
  key: string // client-side key for React
  subject_id: string
  level_id: string
  stream: string
  trial_type: TrialType
  trial_fee: string
  trial_lessons: string
  regular_fee: string
  lessons_per_period: string
  billing_display: string
  lesson_duration_minutes: string
}

function rowFromPricing(row: PricingRow): EditableRow {
  return {
    key: row.id,
    subject_id: row.subject_id,
    level_id: row.level_id ?? '',
    stream: row.stream ?? '',
    trial_type: row.trial_type,
    trial_fee: String(row.trial_fee),
    trial_lessons: String(row.trial_lessons),
    regular_fee: String(row.regular_fee),
    lessons_per_period: row.lessons_per_period?.toString() ?? '',
    billing_display: row.billing_display ?? '',
    lesson_duration_minutes: row.lesson_duration_minutes?.toString() ?? '',
  }
}

function emptyRow(): EditableRow {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    subject_id: '',
    level_id: '',
    stream: '',
    trial_type: 'free',
    trial_fee: '0',
    trial_lessons: '1',
    regular_fee: '',
    lessons_per_period: '',
    billing_display: '',
    lesson_duration_minutes: '',
  }
}

export default function PricingSection({
  rows: initialRows,
  subjects,
  levels,
}: {
  rows: PricingRow[]
  subjects: Subject[]
  levels: Level[]
}) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<EditableRow[]>(() =>
    initialRows.length > 0 ? initialRows.map(rowFromPricing) : []
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Group levels by level_group
  const levelGroups: Record<string, Level[]> = {}
  for (const l of levels) {
    const g = l.level_group || 'Other'
    if (!levelGroups[g]) levelGroups[g] = []
    levelGroups[g].push(l)
  }

  function getSubjectName(id: string) {
    return subjects.find((s) => s.id === id)?.name ?? '—'
  }
  function getLevelLabel(id: string) {
    return levels.find((l) => l.id === id)?.label ?? '—'
  }

  function updateRow(key: string, field: keyof EditableRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function handleCancel() {
    setRows(initialRows.length > 0 ? initialRows.map(rowFromPricing) : [])
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    // Validate: every row needs a subject and regular fee
    for (const r of rows) {
      if (!r.subject_id) {
        setMessage({ type: 'error', text: 'Every row needs a subject selected.' })
        return
      }
      if (!r.regular_fee || isNaN(Number(r.regular_fee))) {
        setMessage({ type: 'error', text: `Regular fee is required for ${getSubjectName(r.subject_id)}.` })
        return
      }
    }

    setSaving(true)
    setMessage(null)
    const result = await updatePricing({
      rows: rows.map((r) => ({
        subject_id: r.subject_id,
        level_id: r.level_id || null,
        stream: r.stream || null,
        trial_type: r.trial_type,
        trial_fee: Number(r.trial_fee) || 0,
        trial_lessons: Number(r.trial_lessons) || 1,
        regular_fee: Number(r.regular_fee) || 0,
        lessons_per_period: r.lessons_per_period ? Number(r.lessons_per_period) : null,
        billing_display: r.billing_display || null,
        lesson_duration_minutes: r.lesson_duration_minutes ? Number(r.lesson_duration_minutes) : null,
      })),
    })
    setSaving(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Pricing saved' })
      setEditing(false)
    }
  }

  // ── Read-only view ──
  if (!editing) {
    // Group rows by subject for display
    const bySubject = new Map<string, EditableRow[]>()
    for (const row of rows) {
      const name = getSubjectName(row.subject_id)
      if (!bySubject.has(name)) bySubject.set(name, [])
      bySubject.get(name)!.push(row)
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pricing</p>
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

        {rows.length === 0 ? (
          <p className="text-sm text-gray-400">No pricing set yet. Click Edit to add your pricing.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(bySubject.entries()).map(([subject, subjectRows]) => (
              <div key={subject}>
                <p className="text-sm font-semibold text-gray-900 mb-1.5">{subject}</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Level</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Regular Fee</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Trial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subjectRows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 text-gray-700">
                            {row.level_id ? getLevelLabel(row.level_id) : 'All levels'}
                            {row.stream && <span className="text-gray-400 text-xs ml-1">({row.stream})</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-900 font-medium">
                            S${row.regular_fee}
                            {row.billing_display && <span className="text-gray-400 text-xs ml-1">/{row.billing_display}</span>}
                          </td>
                          <td className="px-3 py-2">
                            {row.trial_type === 'free' ? (
                              <span className="text-green-600 font-medium">Free</span>
                            ) : (
                              <span className="text-gray-900">S${row.trial_fee}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Editing view ──
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pricing</p>
      </div>

      {message && (
        <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.key} className="border border-gray-200 rounded-lg p-3 relative">
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
              title="Remove row"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="text-xs text-gray-400 mb-2">Row {idx + 1}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <select
                  value={row.subject_id}
                  onChange={(e) => updateRow(row.key, 'subject_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                >
                  <option value="">Select...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                <select
                  value={row.level_id}
                  onChange={(e) => updateRow(row.key, 'level_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                >
                  <option value="">All levels</option>
                  {Object.entries(levelGroups).map(([group, lvls]) => (
                    <optgroup key={group} label={group}>
                      {lvls.map((l) => (
                        <option key={l.id} value={l.id}>{l.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Stream (only show when secondary level selected) */}
              {row.level_id && levels.find((l) => l.id === row.level_id)?.level_group === 'Secondary' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stream</label>
                  <select
                    value={row.stream}
                    onChange={(e) => updateRow(row.key, 'stream', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  >
                    <option value="">None</option>
                    <option value="G3">G3 (Express)</option>
                    <option value="G2">G2 (Normal Academic)</option>
                    <option value="G1">G1 (Foundational)</option>
                    <option value="IP">IP</option>
                    <option value="IB">IB</option>
                  </select>
                </div>
              )}

              {/* Regular Fee */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Regular Fee (S$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.regular_fee}
                  onChange={(e) => updateRow(row.key, 'regular_fee', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. 280"
                />
              </div>

              {/* Billing Display */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Per</label>
                <input
                  type="text"
                  value={row.billing_display}
                  onChange={(e) => updateRow(row.key, 'billing_display', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. month, 4 lessons"
                />
              </div>

              {/* Trial Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trial Type</label>
                <select
                  value={row.trial_type}
                  onChange={(e) => {
                    const val = e.target.value as TrialType
                    updateRow(row.key, 'trial_type', val)
                    if (val === 'free') updateRow(row.key, 'trial_fee', '0')
                    if (val === 'same_as_regular') updateRow(row.key, 'trial_fee', row.regular_fee)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                >
                  <option value="free">Free trial</option>
                  <option value="discounted">Discounted trial</option>
                  <option value="same_as_regular">Same as regular</option>
                  <option value="multi_lesson">Multi-lesson trial</option>
                </select>
              </div>

              {/* Trial Fee (only if not free) */}
              {row.trial_type !== 'free' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trial Fee (S$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.trial_fee}
                    onChange={(e) => updateRow(row.key, 'trial_fee', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    placeholder="e.g. 30"
                    disabled={row.trial_type === 'same_as_regular'}
                  />
                  {row.trial_type === 'same_as_regular' && (
                    <p className="text-xs text-gray-400 mt-0.5">Uses regular fee</p>
                  )}
                </div>
              )}

              {/* Lessons per period */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lessons/Period</label>
                <input
                  type="number"
                  min="1"
                  value={row.lessons_per_period}
                  onChange={(e) => updateRow(row.key, 'lessons_per_period', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                  placeholder="e.g. 4"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add row button */}
      <button
        type="button"
        onClick={addRow}
        className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add pricing row
      </button>

      {/* Save / Cancel */}
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Pricing'}
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
