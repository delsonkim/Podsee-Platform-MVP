'use client'

import { useState, useRef } from 'react'
import type { AIParseResult } from '@/types/ai-parser'
import { parseSchedule } from './actions'
import SlotClarificationTable from './SlotClarificationTable'

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

export interface ParsedSlot {
  subject_id: string | null
  subject_name: string
  raw_subject_text: string
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
  onSlotsReady: (slots: ParsedSlot[]) => void
}

// ── Fallback rule-based parser (kept for when AI is unavailable) ──

function normalise(s: string): string {
  return s.toLowerCase().trim()
}

function matchSubject(raw: string, subjects: Subject[]): Subject | null {
  const n = normalise(raw)
  if (!n) return null
  const exact = subjects.find((s) => normalise(s.name) === n)
  if (exact) return exact
  const starts = subjects.find((s) => normalise(s.name).startsWith(n))
  if (starts) return starts
  const contains = subjects.find((s) => normalise(s.name).includes(n))
  if (contains) return contains
  const aliases: Record<string, string> = {
    math: 'Mathematics', maths: 'Mathematics',
    'e math': 'Elementary Mathematics', 'a math': 'Additional Mathematics',
    emath: 'Elementary Mathematics', amath: 'Additional Mathematics',
    english: 'English Language', chinese: 'Chinese Language',
    malay: 'Malay Language', tamil: 'Tamil Language',
    bio: 'Biology', chem: 'Chemistry', phys: 'Physics',
    lit: 'Literature', geog: 'Geography', hist: 'History',
    gp: 'General Paper', ss: 'Social Studies',
    coding: 'Coding / Programming', poa: 'Principles of Accounts', econs: 'Economics',
  }
  const aliased = aliases[n]
  if (aliased) return subjects.find((s) => normalise(s.name) === normalise(aliased)) ?? null
  return null
}

function matchLevel(raw: string, levels: Level[]): { level: Level | null; ageMin: number | null; ageMax: number | null; customLevel: string | null } {
  const n = normalise(raw)
  if (!n) return { level: null, ageMin: null, ageMax: null, customLevel: null }
  const byCode = levels.find((l) => normalise(l.code) === n)
  if (byCode) return { level: byCode, ageMin: null, ageMax: null, customLevel: null }
  const byLabel = levels.find((l) => normalise(l.label) === n)
  if (byLabel) return { level: byLabel, ageMin: null, ageMax: null, customLevel: null }
  const p = n.match(/^p(\d)$/)
  if (p) { const m = levels.find((l) => normalise(l.code) === `p${p[1]}`); if (m) return { level: m, ageMin: null, ageMax: null, customLevel: null } }
  const sec = n.match(/^sec\s*(\d)$/)
  if (sec) { const m = levels.find((l) => normalise(l.code) === `sec${sec[1]}`); if (m) return { level: m, ageMin: null, ageMax: null, customLevel: null } }
  const ip = n.match(/^ip\s*(?:year\s*)?(\d)$/)
  if (ip) { const m = levels.find((l) => normalise(l.code) === `ip${ip[1]}`); if (m) return { level: m, ageMin: null, ageMax: null, customLevel: null } }
  const na = n.match(/^(?:n\(?a\)?\s*|normal\s*(?:academic\s*)?)(\d)$/i)
  if (na) { const m = levels.find((l) => normalise(l.code) === `na${na[1]}`); if (m) return { level: m, ageMin: null, ageMax: null, customLevel: null } }
  const ageMatch = n.match(/(?:ages?\s*)?(\d+)\s*[-–to]+\s*(\d+)/)
  if (ageMatch) return { level: null, ageMin: parseInt(ageMatch[1]), ageMax: parseInt(ageMatch[2]), customLevel: null }
  return { level: null, ageMin: null, ageMax: null, customLevel: raw.trim() }
}

function parseTime(raw: string): string | null {
  const t = raw.trim()
  const hm = t.match(/^(\d{1,2}):(\d{2})$/)
  if (hm) return `${hm[1].padStart(2, '0')}:${hm[2]}`
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const dmy = d.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  const parsed = new Date(d)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return null
}

function parseRowsFallback(rawText: string, subjects: Subject[], levels: Level[]): ParsedSlot[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const firstLine = normalise(lines[0] ?? '')
  const isHeader = firstLine.includes('subject') || firstLine.includes('level') || firstLine.includes('date')
  const dataLines = isHeader ? lines.slice(1) : lines

  return dataLines.map((line) => {
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
      raw_subject_text: rawSubject ?? '',
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

// ── Component ────────────────────────────────────────────────

type Phase = 'input' | 'parsing' | 'review'

export default function SlotUploader({ subjects, levels, onSlotsReady }: Props) {
  const [tab, setTab] = useState<'csv' | 'paste'>('csv')
  const [pasteText, setPasteText] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [aiResult, setAiResult] = useState<AIParseResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleParse(rawText: string) {
    setPhase('parsing')
    try {
      const result = await parseSchedule(rawText)

      // If AI returned slots, show the clarification table
      if (result.slots.length > 0) {
        setAiResult(result)
        setPhase('review')
        return
      }

      // AI returned no slots — try fallback
      const fallbackSlots = parseRowsFallback(rawText, subjects, levels)
      if (fallbackSlots.length > 0) {
        // Convert fallback to AIParseResult format for the clarification table
        setAiResult(fallbackToAIResult(fallbackSlots, result.fallback_reason || 'AI returned no results'))
        setPhase('review')
      } else {
        // Nothing parseable
        setAiResult({ slots: [], skipped_rows: [], used_ai: false, fallback_reason: 'No class data found in the uploaded schedule' })
        setPhase('review')
      }
    } catch {
      // Network or other error — use fallback
      const fallbackSlots = parseRowsFallback(rawText, subjects, levels)
      setAiResult(fallbackToAIResult(fallbackSlots, 'Connection error'))
      setPhase('review')
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      handleParse(text)
    }
    reader.readAsText(file)
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return
    handleParse(pasteText)
  }

  function restart() {
    setPhase('input')
    setAiResult(null)
    setPasteText('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const header = 'Subject,Level,Date,Start Time,End Time,Trial Fee ($),Max Students,Notes'
    const example = 'Mathematics,Primary 4,2026-03-15,09:00,10:00,25,4,Bring calculator'
    const csv = `${header}\n${example}\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trial_slots_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Input phase */}
      {phase === 'input' && (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setTab('csv')}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                tab === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => setTab('paste')}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                tab === 'paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Paste from Sheets
            </button>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Download CSV template
          </button>

          {tab === 'csv' && (
            <div>
              <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" onChange={handleFileUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Click to upload CSV file
              </button>
            </div>
          )}

          {tab === 'paste' && (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder="Paste your schedule here — any format works. We'll figure out the columns automatically."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className={`mt-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                  pasteText.trim()
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Parse schedule
              </button>
            </div>
          )}
        </>
      )}

      {/* Parsing phase — loading */}
      {phase === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Analysing your schedule...</p>
        </div>
      )}

      {/* Review phase — clarification table */}
      {phase === 'review' && aiResult && (
        <SlotClarificationTable
          result={aiResult}
          subjects={subjects}
          levels={levels}
          onConfirm={onSlotsReady}
          onRestart={restart}
        />
      )}
    </div>
  )
}

// ── Helper: convert fallback ParsedSlot[] to AIParseResult ──

function fallbackToAIResult(slots: ParsedSlot[], reason: string): AIParseResult {
  return {
    slots: slots.map((s) => ({
      subject: {
        value: s.subject_name,
        confidence: s.subject_id ? 'confirmed' as const : 'needs_review' as const,
        match_id: s.subject_id,
        raw_text: s.raw_subject_text,
      },
      level: {
        value: s.level_label || s.custom_level || '',
        confidence: s.level_id ? 'confirmed' as const : (s.age_min !== null || s.custom_level ? 'confirmed' as const : 'needs_review' as const),
        match_id: s.level_id,
        raw_text: s.level_label,
      },
      age_min: { value: s.age_min, confidence: 'confirmed' as const },
      age_max: { value: s.age_max, confidence: 'confirmed' as const },
      date: {
        value: s.date,
        confidence: s.date ? 'confirmed' as const : 'needs_review' as const,
        raw_text: s.date,
      },
      start_time: {
        value: s.start_time,
        confidence: s.start_time ? 'confirmed' as const : 'needs_review' as const,
        raw_text: s.start_time,
      },
      end_time: {
        value: s.end_time,
        confidence: s.end_time ? 'confirmed' as const : 'needs_review' as const,
        raw_text: s.end_time,
      },
      trial_fee: {
        value: s.trial_fee,
        confidence: s.trial_fee > 0 ? 'confirmed' as const : 'needs_review' as const,
        raw_text: String(s.trial_fee),
      },
      max_students: {
        value: s.max_students,
        confidence: s.max_students > 0 ? 'confirmed' as const : 'needs_review' as const,
        raw_text: String(s.max_students),
      },
      notes: s.notes,
    })),
    skipped_rows: [],
    used_ai: false,
    fallback_reason: reason,
  }
}
