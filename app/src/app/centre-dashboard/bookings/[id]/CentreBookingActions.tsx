'use client'

import { useState, useTransition } from 'react'
import { centreCancelBooking, centreMarkAttended, centreMarkNoShow, centreMarkEnrolled } from './actions'

export default function CentreBookingActions({
  bookingId,
  status,
  trialDate,
}: {
  bookingId: string
  status: string
  trialDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [showCancel, setShowCancel] = useState(false)
  const [showAttendanceConfirm, setShowAttendanceConfirm] = useState<'attended' | 'no_show' | null>(null)
  const [showEnrolledConfirm, setShowEnrolledConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canAct = status === 'confirmed' || status === 'completed'
  if (!canAct) return null

  const today = new Date().toISOString().split('T')[0]
  const isTrialDay = trialDate ? trialDate <= today : false
  const isBeforeTrial = trialDate ? trialDate > today : true

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      try {
        await centreCancelBooking(bookingId, cancelReason)
      } catch (e: any) {
        setError(e.message)
        setShowCancel(false)
      }
    })
  }

  const handleMarkAttended = () => {
    setError(null)
    startTransition(async () => {
      try {
        await centreMarkAttended(bookingId)
      } catch (e: any) {
        setError(e.message)
      }
      setShowAttendanceConfirm(null)
    })
  }

  const handleMarkNoShow = () => {
    setError(null)
    startTransition(async () => {
      try {
        await centreMarkNoShow(bookingId)
      } catch (e: any) {
        setError(e.message)
      }
      setShowAttendanceConfirm(null)
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Actions</h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}

      {/* Default: show action buttons */}
      {!showCancel && !showAttendanceConfirm && !showEnrolledConfirm && (
        <div className="flex gap-2 flex-wrap">
          {status === 'confirmed' && isTrialDay && (
            <>
              <button
                onClick={() => setShowAttendanceConfirm('attended')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Mark Attended
              </button>
              <button
                onClick={() => setShowAttendanceConfirm('no_show')}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
              >
                Mark No-Show
              </button>
            </>
          )}
          {status === 'confirmed' && isBeforeTrial && (
            <button
              onClick={() => setShowCancel(true)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel Booking
            </button>
          )}
          {status === 'completed' && (
            <button
              onClick={() => setShowEnrolledConfirm(true)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Mark Enrolled
            </button>
          )}
        </div>
      )}

      {/* Cancel confirmation with reason */}
      {showCancel && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-red-800 font-medium">Cancel this booking?</p>
          <p className="text-xs text-red-600">The parent will be notified and the spot will be released.</p>
          <input
            type="text"
            placeholder="Reason for cancellation (required)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full text-sm border border-red-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending || !cancelReason.trim()}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
            <button
              onClick={() => { setShowCancel(false); setCancelReason('') }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Attendance confirmation */}
      {showAttendanceConfirm === 'attended' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-green-800 font-medium">Confirm the child attended this trial?</p>
          <p className="text-xs text-green-600">The parent will be prompted to share feedback on their experience.</p>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAttended}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Yes, attended'}
            </button>
            <button
              onClick={() => setShowAttendanceConfirm(null)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {showAttendanceConfirm === 'no_show' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-orange-800 font-medium">Mark this booking as a no-show?</p>
          <p className="text-xs text-orange-600">The booking will be flagged for admin review.</p>
          <div className="flex gap-2">
            <button
              onClick={handleMarkNoShow}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Yes, no-show'}
            </button>
            <button
              onClick={() => setShowAttendanceConfirm(null)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Enrolled confirmation */}
      {showEnrolledConfirm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <p className="text-sm text-green-800 font-medium">Confirm this child has enrolled?</p>
          <p className="text-xs text-green-600">The parent will be able to dispute this within 14 days if incorrect.</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  try {
                    await centreMarkEnrolled(bookingId)
                  } catch (e: any) {
                    setError(e.message)
                  }
                  setShowEnrolledConfirm(false)
                })
              }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Yes, enrolled'}
            </button>
            <button
              onClick={() => setShowEnrolledConfirm(false)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
