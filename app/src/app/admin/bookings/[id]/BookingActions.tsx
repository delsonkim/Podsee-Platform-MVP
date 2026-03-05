'use client'

import { useTransition, useState } from 'react'
import { updateBookingStatus, flagBooking, unflagBooking, updateAdminNotes } from './actions'
import type { BookingStatus } from '@/types/database'

const TRANSITIONS: Record<BookingStatus, { label: string; next: BookingStatus; style: string }[]> = {
  pending: [],
  confirmed: [
    { label: 'Mark Completed', next: 'completed', style: 'bg-purple-600 text-white hover:bg-purple-700' },
    { label: 'No Show', next: 'no_show', style: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { label: 'Cancel', next: 'cancelled', style: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  ],
  completed: [],
  converted: [],
  no_show: [],
  cancelled: [],
}

export function StatusActions({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const [isPending, startTransition] = useTransition()
  const actions = TRANSITIONS[status]

  if (actions.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action) => (
        <button
          key={action.next}
          disabled={isPending}
          onClick={() =>
            startTransition(() => updateBookingStatus(bookingId, action.next))
          }
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}
        >
          {isPending ? '…' : action.label}
        </button>
      ))}
    </div>
  )
}

export function FlagActions({
  bookingId,
  isFlagged,
  flagReason,
}: {
  bookingId: string
  isFlagged: boolean
  flagReason: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState(flagReason ?? '')

  if (isFlagged) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 font-medium">⚑ Flagged{flagReason ? `: ${flagReason}` : ''}</p>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => unflagBooking(bookingId))}
          className="text-sm text-gray-500 underline disabled:opacity-50"
        >
          {isPending ? '…' : 'Remove flag'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="Flag reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="text-sm border border-gray-200 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <button
        disabled={isPending}
        onClick={() => startTransition(() => flagBooking(bookingId, reason))}
        className="text-sm text-red-600 border border-red-200 rounded px-3 py-1 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? '…' : 'Flag booking'}
      </button>
    </div>
  )
}

export function NotesForm({ bookingId, adminNotes }: { bookingId: string; adminNotes: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(adminNotes ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startTransition(async () => {
      await updateAdminNotes(bookingId, notes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
        placeholder="Internal notes…"
        className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
      />
      <button
        disabled={isPending}
        onClick={handleSave}
        className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
      >
        {saved ? 'Saved' : isPending ? '…' : 'Save notes'}
      </button>
    </div>
  )
}
