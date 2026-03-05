'use client'

import { useTransition } from 'react'
import { approveReview, rejectReview } from './actions'

export default function ReviewActions({ reviewId, status }: { reviewId: string; status: string }) {
  const [isPending, startTransition] = useTransition()

  if (status !== 'pending_approval') return null

  function handle(action: 'approve' | 'reject') {
    startTransition(async () => {
      try {
        if (action === 'approve') await approveReview(reviewId)
        else await rejectReview(reviewId)
      } catch (e: any) {
        alert(e.message ?? 'Action failed')
      }
    })
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => handle('approve')}
        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '...' : 'Approve'}
      </button>
      <button
        disabled={isPending}
        onClick={() => handle('reject')}
        className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? '...' : 'Reject'}
      </button>
    </div>
  )
}
