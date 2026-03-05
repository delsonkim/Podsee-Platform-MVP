'use client'

import { useState, useTransition } from 'react'
import { centreMarkAttended, centreMarkNoShow, centreMarkEnrolled } from './[id]/actions'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'

export default function InlineStatusActions({
  bookingId,
  status,
  trialDate,
}: {
  bookingId: string
  status: string
  trialDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const isTrialDay = trialDate ? trialDate <= today : false

  const canMarkAttendance = status === 'confirmed' && isTrialDay
  const canMarkEnrolled = status === 'completed'

  const handleAction = (action: () => Promise<void>) => {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[status as BookingStatus]}`}>
        {BOOKING_STATUS_LABEL[status as BookingStatus]}
      </span>

      {canMarkAttendance && (
        <>
          <button
            onClick={() => handleAction(() => centreMarkAttended(bookingId))}
            disabled={isPending}
            className="px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-green-700 hover:underline transition-colors disabled:opacity-50"
          >
            {isPending ? '…' : '✓ Attended'}
          </button>
          <button
            onClick={() => handleAction(() => centreMarkNoShow(bookingId))}
            disabled={isPending}
            className="px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-orange-700 hover:underline transition-colors disabled:opacity-50"
          >
            {isPending ? '…' : '✗ No-Show'}
          </button>
        </>
      )}

      {canMarkEnrolled && (
        <button
          onClick={() => handleAction(() => centreMarkEnrolled(bookingId))}
          disabled={isPending}
          className="px-1.5 py-0.5 text-[11px] text-gray-500 hover:text-green-700 hover:underline transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : '→ Enrolled'}
        </button>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  )
}
