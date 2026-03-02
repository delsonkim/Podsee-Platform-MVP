'use client'

import { useState, useRef, useEffect } from 'react'

interface Subject {
  id: string
  name: string
  sort_order: number
}

interface Props {
  subjects: Subject[]
  excludeIds: Set<string>
  onSelect: (subject: Subject) => void
  placeholder?: string
}

export default function SubjectTypeahead({ subjects, excludeIds, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = query.length > 0
    ? subjects
        .filter((s) => !excludeIds.has(s.id))
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : []

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  function select(subject: Subject) {
    onSelect(subject)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(matches[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Type to search subjects...'}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
      />

      {open && matches.length > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul
            ref={listRef}
            className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1"
          >
            {matches.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === highlightIndex
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && query.length > 0 && matches.length === 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-3 px-3 text-sm text-gray-400">
            No matching subjects
          </div>
        </>
      )}
    </div>
  )
}
