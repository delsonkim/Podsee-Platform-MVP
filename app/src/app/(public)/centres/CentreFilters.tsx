'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Subject, Level } from '@/types/database'

const selectClass =
  'text-sm border border-linen rounded-xl px-3 py-2 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-fern/30 font-display font-medium'

export default function CentreFilters({
  areas,
  subjects,
  levels,
}: {
  areas: string[]
  subjects: Subject[]
  levels: Level[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const primaryLevels = levels.filter((l) => l.level_group === 'primary')
  const secondaryLevels = levels.filter((l) => l.level_group === 'secondary')
  const hasFilters =
    searchParams.get('area') || searchParams.get('subject') || searchParams.get('level')

  return (
    <div className="flex flex-wrap gap-2.5 items-center">
      <select
        value={searchParams.get('area') ?? ''}
        onChange={(e) => update('area', e.target.value)}
        className={selectClass}
      >
        <option value="">All areas</option>
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <select
        value={searchParams.get('subject') ?? ''}
        onChange={(e) => update('subject', e.target.value)}
        className={selectClass}
      >
        <option value="">All subjects</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.name}>{s.name}</option>
        ))}
      </select>

      <select
        value={searchParams.get('level') ?? ''}
        onChange={(e) => update('level', e.target.value)}
        className={selectClass}
      >
        <option value="">All levels</option>
        <optgroup label="Primary">
          {primaryLevels.map((l) => (
            <option key={l.id} value={l.code}>{l.label}</option>
          ))}
        </optgroup>
        <optgroup label="Secondary">
          {secondaryLevels.map((l) => (
            <option key={l.id} value={l.code}>{l.label}</option>
          ))}
        </optgroup>
      </select>

      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-sage hover:text-forest underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
