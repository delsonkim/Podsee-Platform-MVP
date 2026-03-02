'use client'

import { useTransition, useState } from 'react'
import { updateRewardStatus } from './actions'
import type { RewardStatus } from '@/types/database'

export default function RewardActions({ rewardId, status }: { rewardId: string; status: RewardStatus }) {
  const [isPending, startTransition] = useTransition()
  const [method, setMethod] = useState('PayNow')
  const [reference, setReference] = useState('')

  if (status === 'paid' || status === 'rejected') return <span className="text-xs text-gray-400">—</span>

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === 'pending' && (
        <>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => updateRewardStatus(rewardId, 'approved'))}
            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 disabled:opacity-50"
          >
            {isPending ? '…' : 'Approve'}
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => updateRewardStatus(rewardId, 'rejected'))}
            className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
      {status === 'approved' && (
        <>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            <option>PayNow</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
          </select>
          <input
            type="text"
            placeholder="Ref / UEN"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(() => updateRewardStatus(rewardId, 'paid', method, reference))
            }
            className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 hover:bg-green-100 disabled:opacity-50"
          >
            {isPending ? '…' : 'Mark Paid'}
          </button>
        </>
      )}
    </div>
  )
}
