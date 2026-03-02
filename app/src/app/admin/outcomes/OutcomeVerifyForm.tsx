'use client'

import { useTransition, useState } from 'react'
import { verifyOutcomeAndConvert } from './actions'

export default function OutcomeVerifyForm({
  outcomeId,
  bookingId,
  centreId,
  parentId,
  trialFee,
}: {
  outcomeId: string
  bookingId: string
  centreId: string
  parentId: string
  trialFee: number
}) {
  const [isPending, startTransition] = useTransition()
  const [commissionAmount, setCommissionAmount] = useState('')
  const [rewardAmount, setRewardAmount] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const commission = parseFloat(commissionAmount)
    const reward = parseFloat(rewardAmount)
    if (isNaN(commission) || commission <= 0) return
    if (isNaN(reward) || reward <= 0) return

    startTransition(() =>
      verifyOutcomeAndConvert(outcomeId, bookingId, commission, centreId, reward, parentId)
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 pt-2 border-t border-gray-100">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Commission to Podsee (S$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={commissionAmount}
          onChange={(e) => setCommissionAmount(e.target.value)}
          placeholder="e.g. 50.00"
          className="w-36 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Reward to Parent (S$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={rewardAmount}
          onChange={(e) => setRewardAmount(e.target.value)}
          placeholder="e.g. 20.00"
          className="w-36 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '…' : 'Verify & Convert'}
      </button>
    </form>
  )
}
