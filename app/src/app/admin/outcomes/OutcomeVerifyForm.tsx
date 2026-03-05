'use client'

import { useTransition } from 'react'
import { verifyOutcome } from './actions'

export default function OutcomeVerifyForm({
  outcomeId,
}: {
  outcomeId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleVerify() {
    startTransition(() => verifyOutcome(outcomeId))
  }

  return (
    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
      <button
        onClick={handleVerify}
        disabled={isPending}
        className="bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? 'Verifying...' : 'Verify Enrollment'}
      </button>
      <p className="text-xs text-gray-400">Confirms this enrollment is legitimate.</p>
    </div>
  )
}
