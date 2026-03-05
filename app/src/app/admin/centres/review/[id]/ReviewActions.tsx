'use client'

import { useTransition } from 'react'
import {
  approveDraftData,
  rejectDraftData,
  approveDraftSlots,
  rejectDraftSlots,
  publishCentre,
} from './actions'

export function DraftDataActions({ centreId }: { centreId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle(action: 'approve' | 'reject') {
    startTransition(async () => {
      try {
        if (action === 'approve') await approveDraftData(centreId)
        else await rejectDraftData(centreId)
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
        className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Approve All Changes'}
      </button>
      <button
        disabled={isPending}
        onClick={() => handle('reject')}
        className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Reject All Changes'}
      </button>
    </div>
  )
}

export function DraftSlotActions({ centreId }: { centreId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle(action: 'approve' | 'reject') {
    startTransition(async () => {
      try {
        if (action === 'approve') await approveDraftSlots(centreId)
        else await rejectDraftSlots(centreId)
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
        className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Approve All Slots'}
      </button>
      <button
        disabled={isPending}
        onClick={() => handle('reject')}
        className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Reject All Slots'}
      </button>
    </div>
  )
}

export function PublishButton({ centreId }: { centreId: string }) {
  const [isPending, startTransition] = useTransition()

  function handle() {
    startTransition(async () => {
      try {
        await publishCentre(centreId)
      } catch (e: any) {
        alert(e.message ?? 'Failed to publish')
      }
    })
  }

  return (
    <button
      disabled={isPending}
      onClick={handle}
      className="text-sm font-medium bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Publishing...' : 'Publish Centre'}
    </button>
  )
}
