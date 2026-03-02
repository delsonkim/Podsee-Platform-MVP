'use client'

import { useState, useRef } from 'react'

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

interface Programme {
  subject_id: string
  subject_name: string
  display_name: string
  level_ids: string[]
}

export interface ParsedSlot {
  subject_id: string | null
  subject_name: string
  level_id: string | null
  level_label: string
  age_min: number | null
  age_max: number | null
  custom_level: string | null
  date: string
  start_time: string
  end_time: string
  trial_fee: number
  max_students: number
  notes: string
  status: 'ok' | 'warning' | 'error'
  issue: string | null
}

interface Props {
  subjects: Subject[]
  levels: Level[]
  programmes: Programme[]
  onSlotsReady: (slots: ParsedSlot[]) => void
}

function normalise(s: string): string {
  return s.toLowerCase().trim()
}

function matchSubject(raw: string, subjects: Subject[]): Subject | null {
  const n = normalise(raw)
  if (!n) return null
  // Exact match on name
  const exact = subjects.find((s) => normalise(s.name) === n)
  if (exact) return exact
  // Starts with
  const starts = subjects.find((s) => normalise(s.name).startsWith(n))
  if (starts) return starts
  // Contains
  const contains = subjects.find((s) => normalise(s.name).includes(n))
  if (contains) return contains
  // Known aliases
  const aliases: Record<string, string> = {
    math: 'Mathematics',
    maths: 'Mathematics',
    english: 'English Language',
    chinese: 'Chinese Language',
    malay: 'Malay Language',
    tamil: 'Tamil Language',
    bio: 'Biology',
    chem: 'Chemistry',
    phys: 'Physics',
    lit: 'Literature',
    geog: 'Geography',
    hist: 'History',
    gp: 'General Paper',
    ss: 'Social Studies',
    coding: 'Coding / Programming',
  }
  const aliased = aliases[n]
  if (aliased) return subjects.find((s) => normalise(s.name) === normalise(aliased)) ?? null
  return null
}

function matchLevel(raw: string, levels: Level[]): { level: Level | null; ageMin: number | null; ageMax: number | null; customLevel: string | null } {
  const n = normalise(raw)
  if (!n) return { level: null, ageMin: null, ageMax: null, customLevel: null }

  // Match by code (P4, SEC1, JC2, BEG, etc.)
  const byCode = levels.find((l) => normalise(l.code) === n)
  if (byCode) return { level: byCode, ageMin: null, ageMax: null, customLevel: null }

  // Match by label (Primary 4, Secondary 1, etc.)
  const byLabel = levels.find((l) => normalise(l.label) === n)
  if (byLabel) return { level: byLabel, ageMin: null, ageMax: null, customLevel: null }

  // "Primary 4" shorthand "P4" → try prefix match
  const p = n.match(/^p(\d)$/)
  if (p) {
    const match = levels.find((l) => normalise(l.code) === `p${p[1]}`)
    if (match) return { level: match, ageMin: null, ageMax: null, customLevel: null }
  }

  const sec = n.match(/^sec\s*(\d)$/)
  if (sec) {
    const match = levels.find((l) => normalise(l.code) === `sec${sec[1]}`)
    if (match) return { level: match, ageMin: null, ageMax: null, customLevel: null }
  }

  // Age range: "Ages 6-9", "6-9", "Ages 6 to 9"
  const ageMatch = n.match(/(?:ages?\s*)?(\d+)\s*[-–to]+\s*(\d+)/)
  if (ageMatch) {
    return { level: null, ageMin: parseInt(ageMatch[1]), ageMax: parseInt(ageMatch[2]), customLevel: null }
  }

  // Fallback: use as custom_level
  return { level: null, ageMin: null, ageMax: null, customLevel: raw.trim() }
}

function parseTime(raw: string): string | null {
  const t = raw.trim()

  // HH:mm or H:mm
  const hm = t.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}`

  // 9am, 10pm, 9:30am
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (ampm) {
    let hour = parseInt(ampm[1])
    const min = ampm[2] ?? '00'
    const period = ampm[3].toLowerCase()
    if (period === 'pm' && hour < 12) hour += 12
    if (period === 'am' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${min}`
  }

  return null
}

function parseDate(raw: string): string | null {
  const d = raw.trim()

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = d.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // Try native Date parse
  const parsed = new Date(d)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return null
}

function parseRows(rawText: string, subjects: Subject[], levels: Level[]): ParsedSlot[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Detect if first row is header
  const firstLine = normalise(lines[0] ?? '')
  const isHeader = firstLine.includes('subject') || firstLine.includes('level') || firstLine.includes('date')
  const dataLines = isHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
    // Split by tab (from paste) or comma (from CSV)
    const cols = line.includes('\t') ? line.split('\t') : line.split(',')
    const [rawSubject, rawLevel, rawDate, rawStart, rawEnd, rawFee, rawMax, ...rawNotes] = cols.map((c) => c.trim())

    const subjectMatch = matchSubject(rawSubject ?? '', subjects)
    const levelMatch = matchLevel(rawLevel ?? '', levels)
    const date = parseDate(rawDate ?? '')
    const startTime = parseTime(rawStart ?? '')
    const endTime = parseTime(rawEnd ?? '')
    const fee = parseFloat(rawFee ?? '')
    const maxStudents = parseInt(rawMax ?? '') || 1

    const issues: string[] = []
    if (!subjectMatch) issues.push(`Unknown subject: "${rawSubject}"`)
    if (!levelMatch.level && !levelMatch.ageMin && !levelMatch.customLevel) issues.push(`Unknown level: "${rawLevel}"`)
    if (!date) issues.push(`Invalid date: "${rawDate}"`)
    if (!startTime) issues.push(`Invalid start time: "${rawStart}"`)
    if (!endTime) issues.push(`Invalid end time: "${rawEnd}"`)
    if (isNaN(fee) || fee < 0) issues.push(`Invalid fee: "${rawFee}"`)

    return {
      subject_id: subjectMatch?.id ?? null,
      subject_name: subjectMatch?.name ?? rawSubject ?? '',
      level_id: levelMatch.level?.id ?? null,
      level_label: levelMatch.level?.label ?? rawLevel ?? '',
      age_min: levelMatch.ageMin,
      age_max: levelMatch.ageMax,
      custom_level: levelMatch.customLevel,
      date: date ?? '',
      start_time: startTime ?? '',
      end_time: endTime ?? '',
      trial_fee: isNaN(fee) ? 0 : fee,
      max_students: maxStudents,
      notes: rawNotes.join(', '),
      status: issues.length === 0 ? 'ok' : issues.some((i) => i.startsWith('Unknown subject') || i.startsWith('Invalid date')) ? 'error' : 'warning',
      issue: issues.length > 0 ? issues.join('; ') : null,
    }
  })
}

export default function SlotUploader({ subjects, levels, programmes, onSlotsReady }: Props) {
  const [tab, setTab] = useState<'csv' | 'paste'>('csv')
  const [pasteText, setPasteText] = useState('')
  const [parsed, setParsed] = useState<ParsedSlot[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Filter to only subjects/levels the centre offers
  const centreSubjectIds = new Set(programmes.map((p) => p.subject_id))
  const centreLevelIds = new Set(programmes.flatMap((p) => p.level_ids))
  const centreSubjects = subjects.filter((s) => centreSubjectIds.has(s.id))
  const centreLevels = levels.filter((l) => centreLevelIds.has(l.id))

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseRows(text, centreSubjects.length > 0 ? centreSubjects : subjects, centreLevels.length > 0 ? centreLevels : levels)
      setParsed(rows)
    }
    reader.readAsText(file)
  }

  function handlePaste() {
    if (!pasteText.trim()) return
    const rows = parseRows(pasteText, centreSubjects.length > 0 ? centreSubjects : subjects, centreLevels.length > 0 ? centreLevels : levels)
    setParsed(rows)
  }

  function downloadTemplate() {
    const header = 'Subject,Level,Date,Start Time,End Time,Trial Fee ($),Max Students,Notes'
    const example = programmes.length > 0
      ? programmes.map((p) => {
          const lvl = levels.find((l) => p.level_ids.includes(l.id))
          return `${p.subject_name},${lvl?.label ?? ''},2026-03-15,09:00,10:00,25,4,`
        }).join('\n')
      : 'Mathematics,Primary 4,2026-03-15,09:00,10:00,25,4,Bring calculator'

    const csv = `${header}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trial_slots_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function confirmImport() {
    if (!parsed) return
    const valid = parsed.filter((s) => s.status !== 'error')
    onSlotsReady(valid)
  }

  const okCount = parsed?.filter((s) => s.status === 'ok').length ?? 0
  const warnCount = parsed?.filter((s) => s.status === 'warning').length ?? 0
  const errCount = parsed?.filter((s) => s.status === 'error').length ?? 0

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => { setTab('csv'); setParsed(null) }}
          className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
            tab === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload CSV
        </button>
        <button
          type="button"
          onClick={() => { setTab('paste'); setParsed(null) }}
          className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
            tab === 'paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Paste from Sheets
        </button>
      </div>

      {/* Download template */}
      <button
        type="button"
        onClick={downloadTemplate}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        Download CSV template
      </button>

      {/* CSV upload */}
      {tab === 'csv' && !parsed && (
        <div>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            Click to upload CSV file
          </button>
        </div>
      )}

      {/* Paste */}
      {tab === 'paste' && !parsed && (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={"Subject\tLevel\tDate\tStart Time\tEnd Time\tFee\tMax Students\tNotes\nMathematics\tPrimary 4\t2026-03-15\t09:00\t10:00\t25\t4\tBring calculator"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
          <button
            type="button"
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className={`mt-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              pasteText.trim()
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Parse data
          </button>
        </div>
      )}

      {/* Preview table */}
      {parsed && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-500">
              {parsed.length} row{parsed.length !== 1 ? 's' : ''} parsed:
            </span>
            {okCount > 0 && <span className="text-xs text-green-600 font-medium">{okCount} ready</span>}
            {warnCount > 0 && <span className="text-xs text-amber-600 font-medium">{warnCount} warnings</span>}
            {errCount > 0 && <span className="text-xs text-red-600 font-medium">{errCount} errors</span>}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-6"></th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Subject</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Level</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Time</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Fee</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Max</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsed.map((slot, i) => (
                  <tr key={i} className={slot.status === 'error' ? 'bg-red-50' : slot.status === 'warning' ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2">
                      {slot.status === 'ok' && <span className="text-green-500">&#10003;</span>}
                      {slot.status === 'warning' && <span className="text-amber-500">&#9888;</span>}
                      {slot.status === 'error' && <span className="text-red-500">&#10007;</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{slot.subject_name}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {slot.level_label}
                      {slot.age_min != null && slot.age_max != null && `Ages ${slot.age_min}-${slot.age_max}`}
                      {slot.custom_level && slot.custom_level}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{slot.date}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{slot.start_time} – {slot.end_time}</td>
                    <td className="px-3 py-2 text-gray-600">S${slot.trial_fee}</td>
                    <td className="px-3 py-2 text-gray-600">{slot.max_students}</td>
                    <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{slot.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsed.some((s) => s.issue) && (
            <div className="mt-2 space-y-1">
              {parsed.filter((s) => s.issue).map((s, i) => (
                <p key={i} className={`text-xs ${s.status === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                  Row {i + 1}: {s.issue}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setParsed(null)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Re-upload
            </button>
            {okCount + warnCount > 0 && (
              <button
                type="button"
                onClick={confirmImport}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Import {okCount + warnCount} slot{okCount + warnCount !== 1 ? 's' : ''}
                {errCount > 0 && ` (skip ${errCount} error${errCount !== 1 ? 's' : ''})`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
