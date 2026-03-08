'use client'

import { useState, useMemo } from 'react'
import type { ParsedSlot } from '@/components/SlotUploader'

// SG 2026 public holidays (MOM gazette)
const SG_PUBLIC_HOLIDAYS_2026 = new Set([
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year
  '2026-02-18', // Chinese New Year
  '2026-03-21', // Hari Raya Puasa
  '2026-04-03', // Good Friday
  '2026-05-01', // Labour Day
  '2026-05-27', // Hari Raya Haji
  '2026-06-01', // Vesak Day (observed Mon)
  '2026-08-10', // National Day (observed Mon)
  '2026-11-09', // Deepavali (observed Mon)
  '2026-12-25', // Christmas Day
])

interface ClassGroup {
  key: string
  label: string
  dayOfWeek: number
  time: string
  baseSlot: ParsedSlot
  dates: string[] // generated dates across N weeks
}

interface Props {
  baseSlots: ParsedSlot[]
  onConfirm: (slots: ParsedSlot[]) => void
  onBack: () => void
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

function formatDay(dayOfWeek: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export default function WeekDuplicationStep({ baseSlots, onConfirm, onBack }: Props) {
  const [weeks, setWeeks] = useState(4)
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())

  // Group base slots by class identity
  const groups: ClassGroup[] = useMemo(() => {
    const map = new Map<string, ParsedSlot[]>()

    for (const slot of baseSlots) {
      const dow = getDayOfWeek(slot.date)
      const key = `${slot.subject_name}|${slot.level_label}|${slot.stream ?? ''}|${dow}|${slot.start_time}`
      const existing = map.get(key) ?? []
      existing.push(slot)
      map.set(key, existing)
    }

    return Array.from(map.entries()).map(([key, slots]) => {
      const base = slots[0]
      const dow = getDayOfWeek(base.date)
      const dates: string[] = []
      for (let w = 0; w < weeks; w++) {
        dates.push(addWeeks(base.date, w))
      }

      const levelPart = base.level_label ? ` — ${base.level_label}` : ''
      const streamPart = base.stream ? ` (${base.stream})` : ''

      return {
        key,
        label: `${base.subject_name}${levelPart}${streamPart}`,
        dayOfWeek: dow,
        time: base.start_time,
        baseSlot: base,
        dates,
      }
    })
  }, [baseSlots, weeks])

  function toggleDate(groupKey: string, date: string) {
    const id = `${groupKey}::${date}`
    setExcludedDates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function isExcluded(groupKey: string, date: string): boolean {
    return excludedDates.has(`${groupKey}::${date}`)
  }

  // Count stats
  const totalSlots = groups.reduce(
    (sum, g) => sum + g.dates.filter((d) => !isExcluded(g.key, d)).length,
    0
  )
  const phSlots = groups.reduce(
    (sum, g) => sum + g.dates.filter((d) => SG_PUBLIC_HOLIDAYS_2026.has(d) && !isExcluded(g.key, d)).length,
    0
  )

  function handleConfirm() {
    const finalSlots: ParsedSlot[] = []
    for (const group of groups) {
      for (const date of group.dates) {
        if (isExcluded(group.key, date)) continue
        finalSlots.push({
          ...group.baseSlot,
          date,
        })
      }
    }
    onConfirm(finalSlots)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Duplicate Schedule</h3>
        <p className="text-xs text-gray-500 mt-1">
          Your 1-week schedule has been parsed. Choose how many weeks to duplicate, then toggle off any dates you don&apos;t need.
        </p>
      </div>

      {/* Weeks input */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
        <label className="text-xs text-gray-600 whitespace-nowrap">Duplicate for</label>
        <input
          type="number"
          min={1}
          max={12}
          value={weeks}
          onChange={(e) => {
            setWeeks(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))
            setExcludedDates(new Set()) // reset exclusions when weeks change
          }}
          className="w-14 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-gray-900/20 focus:border-gray-400"
        />
        <span className="text-xs text-gray-600">weeks</span>
      </div>

      {/* Class groups */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-900">{group.label}</span>
              <span className="text-xs text-gray-400">
                {formatDay(group.dayOfWeek)} {group.time}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.dates.map((date) => {
                const isPH = SG_PUBLIC_HOLIDAYS_2026.has(date)
                const excluded = isExcluded(group.key, date)
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => toggleDate(group.key, date)}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      excluded
                        ? 'bg-gray-50 text-gray-300 border-gray-100 line-through'
                        : isPH
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                    title={isPH ? 'Public holiday — click to exclude' : excluded ? 'Click to include' : 'Click to exclude'}
                  >
                    {!excluded && (
                      <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {excluded && (
                      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {formatDate(date)}
                    {isPH && !excluded && <span className="text-[10px]">PH</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
        Total: <span className="font-medium text-gray-900">{totalSlots} slots</span>
        {phSlots > 0 && (
          <span className="ml-2 text-amber-600">
            ({phSlots} on public holiday{phSlots !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium px-4 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={totalSlots === 0}
          className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
            totalSlots > 0
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Confirm {totalSlots} slots
        </button>
      </div>
    </div>
  )
}
