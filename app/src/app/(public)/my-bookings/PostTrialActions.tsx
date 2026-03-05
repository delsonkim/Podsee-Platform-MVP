'use client'

import { useState, useTransition } from 'react'
import { disputeEnrollment, submitReview } from './actions'

export default function PostTrialActions({
  bookingId,
  centreId,
  status,
  centreReportedAt,
  trialDate,
  hasReview,
}: {
  bookingId: string
  centreId: string
  status: string
  centreReportedAt: string | null
  trialDate: string | null
  hasReview: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDispute, setShowDispute] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(hasReview)

  const today = new Date()

  // Dispute: only for converted bookings within 14 days of centre reporting
  const canDispute = status === 'converted' && centreReportedAt &&
    (today.getTime() - new Date(centreReportedAt).getTime()) / (1000 * 60 * 60 * 24) <= 14

  // Review: completed/converted, within 14 days of trial, no existing review
  const canReview = (status === 'completed' || status === 'converted') && trialDate && !reviewSubmitted &&
    (today.getTime() - new Date(trialDate).getTime()) / (1000 * 60 * 60 * 24) <= 14

  const handleDispute = () => {
    setError(null)
    startTransition(async () => {
      try {
        await disputeEnrollment(bookingId)
        setSuccess('Dispute submitted. The booking has been flagged for admin review.')
        setShowDispute(false)
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  const handleSubmitReview = () => {
    if (rating === 0) {
      setError('Please select a star rating')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await submitReview(bookingId, centreId, rating, reviewText || undefined)
        setReviewSubmitted(true)
        setShowReview(false)
        setSuccess('Thank you for your review!')
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  if (!canDispute && !canReview && !success) return null

  return (
    <div className="mt-3 pt-3 border-t border-linen space-y-2">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-xs text-fern font-medium">{success}</p>
      )}

      {/* Default buttons */}
      {!showDispute && !showReview && !success && (
        <div className="flex gap-2 flex-wrap">
          {canDispute && (
            <button
              onClick={() => setShowDispute(true)}
              className="text-xs font-display font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              I didn&apos;t enrol
            </button>
          )}
          {canReview && (
            <button
              onClick={() => setShowReview(true)}
              className="text-xs font-display font-semibold text-fern hover:text-forest border border-fern/20 rounded-lg px-3 py-1.5 hover:bg-mint/30 transition-colors"
            >
              Leave a review
            </button>
          )}
        </div>
      )}

      {/* Dispute confirmation */}
      {showDispute && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-red-800 font-medium">
            You&apos;re saying your child did not enrol at this centre?
          </p>
          <p className="text-xs text-red-600">
            This will be flagged for admin review. The enrollment status will be reverted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDispute}
              disabled={isPending}
              className="text-xs font-display font-bold text-white bg-red-600 rounded-lg px-3 py-1.5 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Yes, I didn\'t enrol'}
            </button>
            <button
              onClick={() => { setShowDispute(false); setError(null) }}
              disabled={isPending}
              className="text-xs font-display font-semibold text-sage border border-linen rounded-lg px-3 py-1.5 hover:bg-paper transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Review form */}
      {showReview && (
        <div className="bg-mint/20 border border-fern/10 rounded-lg p-3 space-y-3">
          <p className="text-xs text-forest font-display font-semibold">
            How was the trial?
          </p>

          {/* Star rating */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-xl transition-colors"
              >
                <span className={
                  (hoverRating || rating) >= star
                    ? 'text-amber-400'
                    : 'text-gray-300'
                }>
                  ★
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs text-sage self-center ml-1">
                {rating}/5
              </span>
            )}
          </div>

          {/* Review text */}
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={3}
            className="w-full text-xs border border-fern/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-fern/30 resize-none bg-white"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmitReview}
              disabled={isPending || rating === 0}
              className="text-xs font-display font-bold text-white bg-fern rounded-lg px-3 py-1.5 hover:bg-forest transition-colors disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Submit review'}
            </button>
            <button
              onClick={() => { setShowReview(false); setError(null) }}
              disabled={isPending}
              className="text-xs font-display font-semibold text-sage border border-linen rounded-lg px-3 py-1.5 hover:bg-paper transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
