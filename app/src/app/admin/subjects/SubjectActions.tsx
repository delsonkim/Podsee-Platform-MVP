'use client'

import { useState, useTransition } from 'react'
import { renameSubject, mergeSubject, deleteSubject } from './actions'

interface SubjectRow {
  id: string
  name: string
  is_custom: boolean
  usage_count: number
}

interface Props {
  subject: SubjectRow
  allSubjects: SubjectRow[]
}

export default function SubjectActions({ subject, allSubjects }: Props) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'idle' | 'rename' | 'merge'>('idle')
  const [newName, setNewName] = useState(subject.name)
  const [mergeTarget, setMergeTarget] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleRename() {
    setError(null)
    startTransition(async () => {
      const result = await renameSubject(subject.id, newName)
      if (result?.error) setError(result.error)
      else setMode('idle')
    })
  }

  function handleMerge() {
    if (!mergeTarget) return
    setError(null)
    startTransition(async () => {
      const result = await mergeSubject(subject.id, mergeTarget)
      if (result?.error) setError(result.error)
      else setMode('idle')
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteSubject(subject.id)
      if (result?.error) setError(result.error)
    })
  }

  if (mode === 'rename') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-gray-900/20"
        />
        <button onClick={handleRename} disabled={isPending} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          {isPending ? '...' : 'Save'}
        </button>
        <button onClick={() => { setMode('idle'); setError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  if (mode === 'merge') {
    const canonicalSubjects = allSubjects.filter((s) => s.id !== subject.id)
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Merge into:</span>
        <select
          value={mergeTarget}
          onChange={(e) => setMergeTarget(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900/20"
        >
          <option value="">Select subject</option>
          {canonicalSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button onClick={handleMerge} disabled={isPending || !mergeTarget} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          {isPending ? '...' : 'Merge'}
        </button>
        <button onClick={() => { setMode('idle'); setError(null) }} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setMode('rename')} className="text-xs text-gray-500 hover:text-gray-700">
        Rename
      </button>
      {subject.is_custom && (
        <button onClick={() => setMode('merge')} className="text-xs text-blue-500 hover:text-blue-700">
          Merge
        </button>
      )}
      {subject.usage_count === 0 && (
        <button onClick={handleDelete} disabled={isPending} className="text-xs text-red-500 hover:text-red-700">
          {isPending ? '...' : 'Delete'}
        </button>
      )}
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  )
}
