'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'podsee_cancellation_banner_dismissed_at'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

export default function CancellationBanner({ cancellations }: { cancellations: any[] }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) {
      setDismissed(false)
      return
    }
    const hasNewer = cancellations.some(
      (c) => new Date(c.cancelled_at) > new Date(dismissedAt)
    )
    setDismissed(!hasNewer)
  }, [cancellations])

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    setDismissed(true)
  }

  return (
    <div className="bg-white border border-amber-300 border-l-4 border-l-amber-500 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {cancellations.length} booking{cancellations.length === 1 ? '' : 's'} cancelled by parents
            <span className="font-normal text-gray-500 ml-1">(last 7 days)</span>
          </p>
          <ul className="mt-2 space-y-1">
            {cancellations.map((c: any) => (
              <li key={c.id} className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{c.parent_name_at_booking}</span>
                {' cancelled '}
                <span className="font-medium">{c.child_name_at_booking}</span>
                {"'s "}
                {(c.trial_slots as any)?.subjects?.name && (
                  <span>{(c.trial_slots as any).subjects.name} </span>
                )}
                trial
                {c.cancelled_at && (
                  <span className="text-gray-400 ml-1">
                    on {formatDate(c.cancelled_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
