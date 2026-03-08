'use client'

import { useState, useTransition, useMemo } from 'react'
import SlotUploader, { type ParsedSlot } from '@/components/SlotUploader'
import type { CentrePricing } from '@/types/database'
import {
  parseSchedule,
  parseScheduleImage,
  createCustomSubject,
  addDraftSlots,
  addSingleDraftSlot,
  saveParseCorrections,
  type DraftSlotInput,
} from './actions'

interface Subject {
  id: string
  name: string
  sort_order: number
}

interface Level {
  id: string
  code: string
  label: string
  level_group: string
  sort_order: number
}

type PricingRow = CentrePricing & { subject_name: string; level_label: string | null }

function getTrialFeeFromPricing(row: PricingRow): number {
  switch (row.trial_type) {
    case 'free': return 0
    case 'same_as_regular': return row.trial_fee > 0 ? row.trial_fee : row.regular_fee
    default: return 0
  }
}

function getTrialFeeHint(row: PricingRow): string {
  switch (row.trial_type) {
    case 'free': return 'Free trial (from your pricing)'
    case 'same_as_regular': return `S$${row.trial_fee > 0 ? row.trial_fee : row.regular_fee} — same as regular (from your pricing)`
    default: return ''
  }
}

export default function AddSlotSection({
  subjects,
  levels,
  centreId,
  pricingRows,
}: {
  subjects: Subject[]
  levels: Level[]
  centreId: string
  pricingRows: PricingRow[]
}) {
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Single slot form state ──
  const [subjectId, setSubjectId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [levelMode, setLevelMode] = useState<'standard' | 'age' | 'custom'>('standard')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [customLevel, setCustomLevel] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [trialFee, setTrialFee] = useState('')
  const [trialFeeHint, setTrialFeeHint] = useState<string | null>(null)
  const [maxStudents, setMaxStudents] = useState('4')
  const [notes, setNotes] = useState('')
  const [stream, setStream] = useState('')

  // ── Auto-fill trial fee from pricing ──
  function lookupAndFillTrialFee(sid: string, lid: string, str: string = stream) {
    if (!sid) { setTrialFeeHint(null); return }
    // Try exact match first (subject + level + stream), then without stream
    const match = pricingRows.find(
      (r) => r.subject_id === sid && r.level_id === (lid || null) && r.stream === (str || null)
    ) ?? pricingRows.find(
      (r) => r.subject_id === sid && r.level_id === (lid || null) && !r.stream
    )
    if (match) {
      const fee = getTrialFeeFromPricing(match)
      setTrialFee(fee === 0 ? '0' : String(fee))
      setTrialFeeHint(getTrialFeeHint(match))
    } else {
      setTrialFeeHint(null)
    }
  }

  function handleSubjectChange(sid: string) {
    setSubjectId(sid)
    lookupAndFillTrialFee(sid, levelId)
  }

  function handleLevelChange(lid: string) {
    setLevelId(lid)
    lookupAndFillTrialFee(subjectId, lid)
  }


  function resetSingleForm() {
    setSubjectId('')
    setLevelId('')
    setLevelMode('standard')
    setAgeMin('')
    setAgeMax('')
    setCustomLevel('')
    setStream('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setTrialFee('')
    setTrialFeeHint(null)
    setMaxStudents('4')
    setNotes('')
  }

  // ── Bulk import handler ──
  function handleBulkReady(slots: ParsedSlot[]) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const draftSlots: DraftSlotInput[] = slots.map((s) => ({
        subject_id: s.subject_id,
        level_id: s.level_id,
        age_min: s.age_min,
        age_max: s.age_max,
        custom_level: s.custom_level,
        stream: s.stream,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        trial_fee: s.trial_fee,
        max_students: s.max_students,
        notes: s.notes,
      }))
      const result = await addDraftSlots(draftSlots)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(`${result.count} slot${result.count !== 1 ? 's' : ''} submitted for review.`)
      }
    })
  }

  // ── Single slot handler ──
  function handleSingleSubmit() {
    setError(null)
    setSuccess(null)

    if (!subjectId || !date || !startTime || !endTime) {
      setError('Subject, date, start time, and end time are required.')
      return
    }
    if (levelMode === 'custom' && !customLevel.trim()) {
      setError('Please enter a custom level label (e.g. White Belt, Grade 1).')
      return
    }
    if (levelMode === 'age' && !ageMin) {
      setError('Please enter at least a minimum age.')
      return
    }

    startTransition(async () => {
      const result = await addSingleDraftSlot({
        subject_id: subjectId,
        level_id: levelMode === 'standard' ? (levelId || null) : null,
        age_min: levelMode === 'age' && ageMin ? parseInt(ageMin) : null,
        age_max: levelMode === 'age' && ageMax ? parseInt(ageMax) : null,
        custom_level: levelMode === 'custom' && customLevel ? customLevel.trim() : null,
        stream: levelMode === 'standard' && stream ? stream : null,
        date,
        start_time: startTime,
        end_time: endTime,
        trial_fee: trialFee ? parseFloat(trialFee) : 0,
        max_students: maxStudents ? parseInt(maxStudents) : 4,
        notes,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess('Slot submitted for review.')
        resetSingleForm()
      }
    })
  }

  // Group levels by level_group for the dropdown
  const levelGroups = useMemo(() => levels.reduce<Record<string, Level[]>>((acc, l) => {
    const group = l.level_group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(l)
    return acc
  }, {}), [levels])

  return (
    <div className="space-y-4">
      {/* Success / Error banners */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-medium">
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Mode switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
            mode === 'bulk' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Bulk Import
        </button>
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
            mode === 'single' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Add Single Slot
        </button>
      </div>

      {/* Bulk import */}
      {mode === 'bulk' && (
        <SlotUploader
          subjects={subjects}
          levels={levels}
          centreId={centreId}
          onSlotsReady={handleBulkReady}
          parseScheduleFn={parseSchedule}
          parseScheduleImageFn={parseScheduleImage}
          createCustomSubjectFn={createCustomSubject}
          saveCorrectionsFn={saveParseCorrections}
        />
      )}

      {/* Single slot form */}
      {mode === 'single' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              >
                <option value="">Select subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              {/* Level mode tabs */}
              <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5 mb-2">
                {([
                  ['standard', 'School Level'],
                  ['age', 'Age Range'],
                  ['custom', 'Custom'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setLevelMode(key); setLevelId(''); setStream(''); setAgeMin(''); setAgeMax(''); setCustomLevel('') }}
                    className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${
                      levelMode === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Standard level dropdown */}
              {levelMode === 'standard' && (
                <>
                  <select
                    value={levelId}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  >
                    <option value="">Select level...</option>
                    {Object.entries(levelGroups).map(([group, lvls]) => (
                      <optgroup key={group} label={group}>
                        {lvls.map((l) => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {/* Stream dropdown for secondary levels */}
                  {levelId && levels.find((l) => l.id === levelId)?.level_group === 'Secondary' && (
                    <select
                      value={stream}
                      onChange={(e) => { setStream(e.target.value); lookupAndFillTrialFee(subjectId, levelId, e.target.value) }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    >
                      <option value="">No stream</option>
                      <option value="G3">G3 (Express)</option>
                      <option value="G2">G2 (Normal Academic)</option>
                      <option value="G1">G1 (Foundational)</option>
                      <option value="IP">IP</option>
                      <option value="IB">IB</option>
                    </select>
                  )}
                </>
              )}
              {/* Age range inputs */}
              {levelMode === 'age' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Ages</span>
                  <input
                    type="number"
                    min="3"
                    max="25"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    placeholder="Min"
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="number"
                    min="3"
                    max="25"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    placeholder="Max"
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  />
                </div>
              )}
              {/* Custom level input */}
              {levelMode === 'custom' && (
                <input
                  type="text"
                  value={customLevel}
                  onChange={(e) => setCustomLevel(e.target.value)}
                  placeholder="e.g. White Belt, Grade 1, Beginner"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial Fee (S$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={trialFee}
                onChange={(e) => { setTrialFee(e.target.value); setTrialFeeHint(null) }}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
              {trialFeeHint && (
                <p className="text-xs text-green-600 mt-1">{trialFeeHint}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
              <input
                type="number"
                min="1"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bring calculator"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSingleSubmit}
            disabled={isPending || !subjectId || !date || !startTime || !endTime}
            className={`text-sm font-medium px-5 py-2.5 rounded-lg transition-colors ${
              isPending
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : subjectId && date && startTime && endTime
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isPending ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      )}
    </div>
  )
}
