'use client'

import { useState, useTransition } from 'react'
import { cancelBooking, getAvailableSlots, rescheduleBooking } from './actions'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m}${ampm}`
}

export default function BookingActions({
  bookingId,
  centreId,
  slotId,
  subjectId,
  levelId,
}: {
  bookingId: string
  centreId: string
  slotId: string
  subjectId: string
  levelId: string
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [slots, setSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        await cancelBooking(bookingId)
      } catch (e: any) {
        setError(e.message)
      }
      setShowCancelConfirm(false)
    })
  }

  const handleOpenReschedule = async () => {
    setError(null)
    setLoadingSlots(true)
    setShowReschedule(true)
    try {
      const available = await getAvailableSlots(centreId, slotId, subjectId, levelId)
      setSlots(available)
    } catch {
      setError('Could not load available slots')
    }
    setLoadingSlots(false)
  }

  const handleReschedule = (newSlotId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await rescheduleBooking(bookingId, newSlotId)
      } catch (e: any) {
        setError(e.message)
      }
      setShowReschedule(false)
    })
  }

  return (
    <div className="mt-3 pt-3 border-t border-linen">
      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Default state: show action buttons */}
      {!showCancelConfirm && !showReschedule && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={isPending}
            className="text-xs font-display font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Cancel Trial
          </button>
          <button
            onClick={handleOpenReschedule}
            disabled={isPending}
            className="text-xs font-display font-semibold text-fern hover:text-forest border border-fern/20 rounded-lg px-3 py-1.5 hover:bg-mint/30 transition-colors disabled:opacity-50"
          >
            Reschedule
          </button>
        </div>
      )}

      {/* Cancel confirmation */}
      {showCancelConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800 font-medium mb-2">
            Are you sure you want to cancel this trial? Your spot will be released.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs font-display font-bold text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Cancelling...' : 'Yes, cancel'}
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              disabled={isPending}
              className="text-xs font-display font-semibold text-sage border border-linen rounded-lg px-3 py-1.5 hover:bg-paper transition-colors"
            >
              Keep booking
            </button>
          </div>
        </div>
      )}

      {/* Reschedule slot picker */}
      {showReschedule && (
        <div className="bg-mint/20 border border-fern/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-forest font-display font-semibold">
              Select a new slot:
            </p>
            <button
              onClick={() => setShowReschedule(false)}
              className="text-xs text-sage hover:text-forest"
            >
              Cancel
            </button>
          </div>

          {loadingSlots && (
            <p className="text-xs text-sage py-2">Loading available slots...</p>
          )}

          {!loadingSlots && slots.length === 0 && (
            <p className="text-xs text-sage py-2">No other slots available at this centre.</p>
          )}

          {!loadingSlots && slots.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {slots.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => handleReschedule(s.id)}
                  disabled={isPending}
                  className="w-full text-left text-xs bg-white border border-linen rounded-lg p-2.5 hover:border-fern/30 hover:bg-mint/10 transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-display font-semibold text-forest">
                      {formatDate(s.date)}
                    </span>
                    <span className="text-sage mx-1.5">|</span>
                    <span className="text-forest">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </span>
                    {s.subjects?.name && (
                      <>
                        <span className="text-sage mx-1.5">|</span>
                        <span className="text-fern">{s.subjects.name}</span>
                      </>
                    )}
                    {s.levels?.label && (
                      <span className="text-sage ml-1">({s.levels.label})</span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-sage">{s.spots_remaining} spot{s.spots_remaining === 1 ? '' : 's'}</span>
                    <span className="text-fern font-display font-bold">
                      {isPending ? '...' : 'Select'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
