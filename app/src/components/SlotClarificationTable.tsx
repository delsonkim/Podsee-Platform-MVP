'use client'

import { useState, useCallback } from 'react'
import type { AIParsedSlot, AIParseResult, Confidence } from '@/types/ai-parser'
import type { ParsedSlot } from './SlotUploader'
import type { CorrectionInput } from '@/lib/parse-corrections'

interface Subject {
  id: string
  name: string
}

interface Level {
  id: string
  code: string
  label: string
}

interface Props {
  result: AIParseResult
  subjects: Subject[]
  levels: Level[]
  centreId?: string
  onConfirm: (slots: ParsedSlot[]) => void
  onRestart: () => void
  createCustomSubjectFn: (name: string) => Promise<{ id: string; name: string } | { error: string }>
  saveCorrectionsFn?: (corrections: CorrectionInput[]) => Promise<void>
}

interface SlotOverrides {
  subject_id: string | null
  subject_name: string
  new_subject_name: string
  level_id: string | null
  level_label: string
  age_min: number | null
  age_max: number | null
  custom_level: string | null
  stream: string | null
  date: string
  start_time: string
  end_time: string
  trial_fee: number | null
  max_students: number | null
  notes: string
  excluded: boolean
}

function initOverrides(slot: AIParsedSlot): SlotOverrides {
  return {
    subject_id: slot.subject.match_id ?? null,
    subject_name: slot.subject.value ?? '',
    new_subject_name: '',
    level_id: slot.level.match_id ?? null,
    level_label: slot.level.value ?? '',
    age_min: slot.age_min.value,
    age_max: slot.age_max.value,
    custom_level: null,
    stream: slot.stream?.value ?? null,
    date: slot.date.value ?? '',
    start_time: slot.start_time.value ?? '',
    end_time: slot.end_time.value ?? '',
    trial_fee: slot.trial_fee.value,
    max_students: slot.max_students.value,
    notes: slot.notes ?? '',
    excluded: false,
  }
}

function fieldNeedsInput(confidence: Confidence, _value: unknown, overrideValue: unknown): boolean {
  if (confidence !== 'needs_review') return false
  return overrideValue === null || overrideValue === '' || overrideValue === undefined
}

export default function SlotClarificationTable({ result, subjects, levels, centreId, onConfirm, onRestart, createCustomSubjectFn, saveCorrectionsFn }: Props) {
  const [overrides, setOverrides] = useState<SlotOverrides[]>(() => result.slots.map(initOverrides))
  const [bulkFee, setBulkFee] = useState<string>('')
  const [bulkMax, setBulkMax] = useState<string>('')
  const [showSkipped, setShowSkipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const allFeesMissing = result.slots.length > 0 && result.slots.every((s) => s.trial_fee.confidence === 'needs_review')
  const allMaxMissing = result.slots.length > 0 && result.slots.every((s) => s.max_students.confidence === 'needs_review')

  const updateSlot = useCallback((index: number, patch: Partial<SlotOverrides>) => {
    setOverrides((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }, [])

  const includedSlots = overrides.filter((o) => !o.excluded)
  const unresolvedCount = result.slots.reduce((count, slot, i) => {
    if (overrides[i].excluded) return count
    let issues = 0
    if (slot.subject.confidence === 'needs_review' && !overrides[i].subject_id && !overrides[i].new_subject_name.trim()) issues++
    if (slot.level.confidence === 'needs_review' && !overrides[i].level_id && overrides[i].age_min === null && !overrides[i].custom_level) issues++
    if (fieldNeedsInput(slot.date.confidence, slot.date.value, overrides[i].date)) issues++
    if (fieldNeedsInput(slot.start_time.confidence, slot.start_time.value, overrides[i].start_time)) issues++
    if (fieldNeedsInput(slot.end_time.confidence, slot.end_time.value, overrides[i].end_time)) issues++
    if (!allFeesMissing || !bulkFee.trim()) {
      if (fieldNeedsInput(slot.trial_fee.confidence, slot.trial_fee.value, overrides[i].trial_fee)) issues++
    }
    if (!allMaxMissing || !bulkMax.trim()) {
      if (fieldNeedsInput(slot.max_students.confidence, slot.max_students.value, overrides[i].max_students)) issues++
    }
    return count + issues
  }, 0)

  const canSubmit = unresolvedCount === 0 && includedSlots.length > 0

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const newSubjectMap = new Map<string, string>()
      for (let i = 0; i < overrides.length; i++) {
        const o = overrides[i]
        if (o.excluded) continue
        if (o.new_subject_name.trim() && !o.subject_id) {
          const name = o.new_subject_name.trim()
          if (!newSubjectMap.has(name.toLowerCase())) {
            const res = await createCustomSubjectFn(name)
            if ('error' in res) continue
            newSubjectMap.set(name.toLowerCase(), res.id)
          }
        }
      }

      const slots: ParsedSlot[] = []
      for (let i = 0; i < result.slots.length; i++) {
        const o = overrides[i]
        if (o.excluded) continue
        const slot = result.slots[i]

        let subjectId = o.subject_id
        let subjectName = o.subject_name
        if (!subjectId && o.new_subject_name.trim()) {
          subjectId = newSubjectMap.get(o.new_subject_name.trim().toLowerCase()) ?? null
          subjectName = o.new_subject_name.trim()
        }

        let fee = o.trial_fee
        if (fee === null && allFeesMissing && bulkFee.trim()) fee = parseFloat(bulkFee)
        let max = o.max_students
        if (max === null && allMaxMissing && bulkMax.trim()) max = parseInt(bulkMax)

        slots.push({
          subject_id: subjectId,
          subject_name: subjectName,
          raw_subject_text: slot.subject.raw_text ?? o.subject_name,
          level_id: o.level_id,
          level_label: o.level_label,
          age_min: o.age_min,
          age_max: o.age_max,
          custom_level: o.custom_level,
          stream: o.stream,
          date: o.date,
          start_time: o.start_time,
          end_time: o.end_time,
          trial_fee: fee ?? 0,
          max_students: max ?? 1,
          notes: o.notes,
          status: 'ok',
          issue: null,
        })
      }
      // Capture corrections: compare AI output vs user overrides
      if (saveCorrectionsFn) {
        const corrections: CorrectionInput[] = []
        for (let i = 0; i < result.slots.length; i++) {
          const o = overrides[i]
          if (o.excluded) continue
          const slot = result.slots[i]

          if (slot.subject.confidence !== 'confirmed' && o.subject_id && o.subject_id !== '__new__' && o.subject_id !== slot.subject.match_id) {
            corrections.push({
              centre_id: centreId ?? null,
              field_type: 'subject',
              ai_raw_text: slot.subject.raw_text ?? slot.subject.value ?? '',
              ai_value: slot.subject.value,
              ai_match_id: slot.subject.match_id ?? null,
              ai_confidence: slot.subject.confidence,
              user_value: o.subject_name,
              user_match_id: o.subject_id,
            })
          }

          if (slot.level.confidence !== 'confirmed' && o.level_id && o.level_id !== slot.level.match_id) {
            corrections.push({
              centre_id: centreId ?? null,
              field_type: 'level',
              ai_raw_text: slot.level.raw_text ?? slot.level.value ?? '',
              ai_value: slot.level.value,
              ai_match_id: slot.level.match_id ?? null,
              ai_confidence: slot.level.confidence,
              user_value: o.level_label,
              user_match_id: o.level_id,
            })
          }

          if (slot.date.confidence !== 'confirmed' && o.date && o.date !== slot.date.value) {
            corrections.push({
              centre_id: centreId ?? null,
              field_type: 'date',
              ai_raw_text: slot.date.raw_text ?? slot.date.value ?? '',
              ai_value: slot.date.value,
              ai_match_id: null,
              ai_confidence: slot.date.confidence,
              user_value: o.date,
              user_match_id: null,
            })
          }

          if (slot.start_time.confidence !== 'confirmed' && o.start_time && o.start_time !== slot.start_time.value) {
            corrections.push({
              centre_id: centreId ?? null,
              field_type: 'time',
              ai_raw_text: slot.start_time.raw_text ?? slot.start_time.value ?? '',
              ai_value: slot.start_time.value,
              ai_match_id: null,
              ai_confidence: slot.start_time.confidence,
              user_value: o.start_time,
              user_match_id: null,
            })
          }
        }

        if (corrections.length > 0) {
          saveCorrectionsFn(corrections).catch(() => {})
        }
      }

      onConfirm(slots)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {!result.used_ai && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Basic matching was used{result.fallback_reason ? ` (${result.fallback_reason})` : ''}. Please review carefully.
        </div>
      )}

      {/* Summary + legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{result.slots.length} slots parsed</span>
        {unresolvedCount > 0 && <span className="text-red-600 font-medium">{unresolvedCount} field{unresolvedCount !== 1 ? 's' : ''} need your input</span>}
        {unresolvedCount === 0 && includedSlots.length > 0 && <span className="text-green-600 font-medium">Ready to submit</span>}
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> AI guess — check if wrong</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Missing — you must fill in</span>
        </span>
      </div>

      {(allFeesMissing || allMaxMissing) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-blue-900">Set defaults for all slots at once</p>
          <p className="text-xs text-blue-700">No pricing was found in the schedule. Enter your trial fee below and it will apply to every slot.</p>
          <div className="flex flex-wrap gap-4">
            {allFeesMissing && (
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Trial fee (S$)</label>
                <input type="number" min={0} step="0.01" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)} placeholder="e.g. 25" className="w-32 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            )}
            {allMaxMissing && (
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">Max students per class</label>
                <input type="number" min={1} value={bulkMax} onChange={(e) => setBulkMax(e.target.value)} placeholder="e.g. 4" className="w-32 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500 w-8"></th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Subject</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Level</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Stream</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Time</th>
              {!allFeesMissing && <th className="px-3 py-2 text-left font-medium text-gray-500">Fee</th>}
              {!allMaxMissing && <th className="px-3 py-2 text-left font-medium text-gray-500">Max</th>}
              <th className="px-3 py-2 text-left font-medium text-gray-500">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.slots.map((slot, i) => (
              <tr key={i} className={overrides[i].excluded ? 'opacity-40' : ''}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={!overrides[i].excluded} onChange={(e) => updateSlot(i, { excluded: !e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/20" />
                </td>
                <td className="px-3 py-2"><SubjectCell field={slot.subject} override={overrides[i]} subjects={subjects} onChange={(patch) => updateSlot(i, patch)} /></td>
                <td className="px-3 py-2"><LevelCell field={slot.level} override={overrides[i]} levels={levels} onChange={(patch) => updateSlot(i, patch)} /></td>
                <td className="px-3 py-2"><StreamCell stream={overrides[i].stream} onChange={(v) => updateSlot(i, { stream: v })} /></td>
                <td className="px-3 py-2"><TextCell confidence={slot.date.confidence} value={overrides[i].date} rawText={slot.date.raw_text} placeholder="YYYY-MM-DD" onChange={(v) => updateSlot(i, { date: v })} /></td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <TextCell confidence={slot.start_time.confidence} value={overrides[i].start_time} rawText={slot.start_time.raw_text} placeholder="HH:mm" onChange={(v) => updateSlot(i, { start_time: v })} className="w-16" />
                    <span className="text-gray-400">–</span>
                    <TextCell confidence={slot.end_time.confidence} value={overrides[i].end_time} rawText={slot.end_time.raw_text} placeholder="HH:mm" onChange={(v) => updateSlot(i, { end_time: v })} className="w-16" />
                  </div>
                </td>
                {!allFeesMissing && <td className="px-3 py-2"><NumberCell confidence={slot.trial_fee.confidence} value={overrides[i].trial_fee} rawText={slot.trial_fee.raw_text} placeholder="$" onChange={(v) => updateSlot(i, { trial_fee: v })} /></td>}
                {!allMaxMissing && <td className="px-3 py-2"><NumberCell confidence={slot.max_students.confidence} value={overrides[i].max_students} rawText={slot.max_students.raw_text} placeholder="#" onChange={(v) => updateSlot(i, { max_students: v })} /></td>}
                <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{overrides[i].notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.skipped_rows.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowSkipped(!showSkipped)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            {showSkipped ? 'Hide' : 'Show'} {result.skipped_rows.length} skipped row{result.skipped_rows.length !== 1 ? 's' : ''}
          </button>
          {showSkipped && (
            <div className="mt-2 space-y-1">
              {result.skipped_rows.map((row, i) => (
                <div key={i} className="text-xs text-gray-400 flex gap-2">
                  <span className="text-gray-300">Row {row.row_number}:</span>
                  <span className="truncate max-w-sm">{row.raw_text}</span>
                  <span className="text-gray-300">— {row.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onRestart} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Re-upload</button>
        <div className="flex-1 text-sm text-gray-500">
          {includedSlots.length} slot{includedSlots.length !== 1 ? 's' : ''} selected
          {unresolvedCount > 0 && <span className="text-amber-600 ml-1">· {unresolvedCount} need{unresolvedCount !== 1 ? '' : 's'} your input</span>}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit || isSubmitting}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${canSubmit && !isSubmitting ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
        >
          {isSubmitting ? 'Importing...' : `Confirm & Import${includedSlots.length > 0 ? ` (${includedSlots.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Cell Components ──────────────────────────────────────────

function ConfidenceDot({ confidence }: { confidence: Confidence }) {
  if (confidence === 'confirmed') return null
  const color = confidence === 'inferred' ? 'bg-amber-400' : 'bg-red-400'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} mr-1`} />
}

function SubjectCell({ field, override, subjects, onChange }: { field: AIParsedSlot['subject']; override: SlotOverrides; subjects: Subject[]; onChange: (patch: Partial<SlotOverrides>) => void }) {
  if (field.confidence === 'confirmed' && override.subject_id) return <span className="text-gray-900">{override.subject_name}</span>
  const showNewInput = override.subject_id === '__new__'
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <ConfidenceDot confidence={field.confidence} />
        <select
          value={override.subject_id ?? '__new__'}
          onChange={(e) => {
            const val = e.target.value
            if (val === '__new__') onChange({ subject_id: '__new__', subject_name: '' })
            else if (val === '') onChange({ subject_id: null, subject_name: '', new_subject_name: '' })
            else { const subj = subjects.find((s) => s.id === val); onChange({ subject_id: val, subject_name: subj?.name ?? '', new_subject_name: '' }) }
          }}
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400"
        >
          {field.confidence === 'needs_review' && !override.subject_id && <option value="">Which subject?</option>}
          {field.confidence === 'inferred' && field.match_id && <option value={field.match_id}>{field.value} ✓</option>}
          {subjects.filter((s) => s.id !== field.match_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="__new__">+ Create new subject</option>
        </select>
      </div>
      {showNewInput && <input type="text" value={override.new_subject_name} onChange={(e) => onChange({ new_subject_name: e.target.value })} placeholder="New subject name" className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400" />}
      {field.raw_text && field.confidence === 'inferred' && <span className="text-[10px] text-gray-400">from &ldquo;{field.raw_text}&rdquo;</span>}
    </div>
  )
}

function LevelCell({ field, override, levels, onChange }: { field: AIParsedSlot['level']; override: SlotOverrides; levels: Level[]; onChange: (patch: Partial<SlotOverrides>) => void }) {
  if (override.age_min !== null && override.age_max !== null) return <span className="text-gray-900">Ages {override.age_min}–{override.age_max}</span>
  if (override.custom_level) return <span className="text-gray-900">{override.custom_level}</span>
  if (field.confidence === 'confirmed' && override.level_id) return <span className="text-gray-900">{override.level_label}</span>
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <ConfidenceDot confidence={field.confidence} />
        <select
          value={override.level_id ?? '__custom__'}
          onChange={(e) => {
            const val = e.target.value
            if (val === '__custom__') onChange({ level_id: null, level_label: '', custom_level: field.raw_text || '' })
            else if (val === '') onChange({ level_id: null, level_label: '', custom_level: null })
            else { const lvl = levels.find((l) => l.id === val); onChange({ level_id: val, level_label: lvl?.label ?? '', custom_level: null }) }
          }}
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400"
        >
          {field.confidence === 'needs_review' && !override.level_id && <option value="">Which level?</option>}
          {field.confidence === 'inferred' && field.match_id && <option value={field.match_id}>{field.value} ✓</option>}
          {levels.filter((l) => l.id !== field.match_id).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          <option value="__custom__">Custom level</option>
        </select>
      </div>
      {override.custom_level !== null && <input type="text" value={override.custom_level} onChange={(e) => onChange({ custom_level: e.target.value || null })} placeholder="e.g. White Belt, Ages 6-9" className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400" />}
      {field.raw_text && field.confidence === 'inferred' && <span className="text-[10px] text-gray-400">from &ldquo;{field.raw_text}&rdquo;</span>}
    </div>
  )
}

const STREAM_OPTIONS = [
  { value: '', label: '—' },
  { value: 'G3', label: 'G3 (Express)' },
  { value: 'G2', label: 'G2 (Normal Academic)' },
  { value: 'G1', label: 'G1 (Foundational)' },
  { value: 'IP', label: 'IP' },
  { value: 'IB', label: 'IB' },
]

function StreamCell({ stream, onChange }: { stream: string | null; onChange: (v: string | null) => void }) {
  return (
    <select
      value={stream ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400"
    >
      {STREAM_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function TextCell({ confidence, value, rawText, placeholder, onChange, className = '' }: { confidence: Confidence; value: string; rawText?: string; placeholder: string; onChange: (v: string) => void; className?: string }) {
  if (confidence === 'confirmed' && value) return <span className="text-gray-600">{value}</span>
  return (
    <div className={`flex items-center ${className}`}>
      <ConfidenceDot confidence={confidence} />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} title={rawText ? `Original: ${rawText}` : undefined} className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400" />
    </div>
  )
}

function NumberCell({ confidence, value, rawText, placeholder, onChange }: { confidence: Confidence; value: number | null; rawText?: string; placeholder: string; onChange: (v: number | null) => void }) {
  if (confidence === 'confirmed' && value !== null) return <span className="text-gray-600">{value}</span>
  return (
    <div className="flex items-center">
      <ConfidenceDot confidence={confidence} />
      <input type="number" min={0} value={value ?? ''} onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)} placeholder={placeholder} title={rawText ? `Original: ${rawText}` : undefined} className="w-16 text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400" />
    </div>
  )
}
