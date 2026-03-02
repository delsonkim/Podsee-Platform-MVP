'use client'

import { useTransition, useState } from 'react'
import { updateCommissionStatus } from './actions'
import type { CommissionStatus } from '@/types/database'

export default function CommissionActions({ commissionId, status }: { commissionId: string; status: CommissionStatus }) {
  const [isPending, startTransition] = useTransition()
  const [invoiceNumber, setInvoiceNumber] = useState('')

  if (status === 'paid' || status === 'waived') return <span className="text-xs text-gray-400">—</span>

  return (
    <div className="flex items-center gap-2">
      {status === 'pending' && (
        <>
          <input
            type="text"
            placeholder="Invoice #"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(() => updateCommissionStatus(commissionId, 'invoiced', invoiceNumber))
            }
            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 disabled:opacity-50"
          >
            {isPending ? '…' : 'Mark Invoiced'}
          </button>
        </>
      )}
      {(status === 'invoiced' || status === 'overdue') && (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() => updateCommissionStatus(commissionId, 'paid'))
          }
          className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 hover:bg-green-100 disabled:opacity-50"
        >
          {isPending ? '…' : 'Mark Paid'}
        </button>
      )}
    </div>
  )
}
