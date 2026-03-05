'use client'

import { useTransition, useState } from 'react'
import { initiateCommission } from './actions'

export default function CommissionForm({
  bookingId,
  centreId,
  bookingStatus,
  trialRate,
  conversionRate,
  existingTrialCommission,
  existingConversionCommission,
}: {
  bookingId: string
  centreId: string
  bookingStatus: string
  trialRate: number
  conversionRate: number
  existingTrialCommission: number | null
  existingConversionCommission: number | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [trialDone, setTrialDone] = useState(existingTrialCommission !== null)
  const [conversionDone, setConversionDone] = useState(existingConversionCommission !== null)

  const canInitiateConversion = !conversionDone && bookingStatus === 'converted'

  function handleInitiate(type: 'trial' | 'conversion') {
    setError(null)
    const amount = type === 'trial' ? trialRate : conversionRate
    if (!amount || amount <= 0) {
      setError(`No ${type} commission rate set for this centre`)
      return
    }
    startTransition(async () => {
      try {
        await initiateCommission(bookingId, centreId, type, amount)
        if (type === 'trial') setTrialDone(true)
        else setConversionDone(true)
      } catch (e: any) {
        setError(e.message ?? 'Failed to create commission')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Trial commission */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Trial Commission</p>
          <p className="text-sm font-medium text-gray-900">S${trialRate.toFixed(2)}</p>
        </div>
        {trialDone ? (
          <span className="text-sm text-green-600 font-medium">
            S${(existingTrialCommission ?? trialRate).toFixed(2)} — created
          </span>
        ) : trialRate > 0 ? (
          <button
            disabled={isPending}
            onClick={() => handleInitiate('trial')}
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? '...' : 'Initiate'}
          </button>
        ) : (
          <span className="text-xs text-gray-400">Rate not set</span>
        )}
      </div>

      {/* Conversion commission */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Conversion Commission</p>
          <p className="text-sm font-medium text-gray-900">S${conversionRate.toFixed(2)}</p>
        </div>
        {conversionDone ? (
          <span className="text-sm text-green-600 font-medium">
            S${(existingConversionCommission ?? conversionRate).toFixed(2)} — created
          </span>
        ) : canInitiateConversion && conversionRate > 0 ? (
          <button
            disabled={isPending}
            onClick={() => handleInitiate('conversion')}
            className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? '...' : 'Initiate'}
          </button>
        ) : bookingStatus !== 'converted' ? (
          <span className="text-xs text-gray-400">Available after conversion</span>
        ) : (
          <span className="text-xs text-gray-400">Rate not set</span>
        )}
      </div>

      {error && <p className="text-sm text-red-600 pt-1">{error}</p>}
    </div>
  )
}
