import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { COMMISSION_STATUS_COLOR, COMMISSION_STATUS_LABEL, type CommissionStatus } from '@/types/database'
import CommissionActions from './CommissionActions'

async function getCommissions() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('commissions')
      .select(`
        id, commission_amount, status, invoice_number, invoiced_at, paid_at, notes, created_at,
        centres(name),
        trial_outcomes(
          id,
          bookings(id, booking_ref, parent_name_at_booking, child_name_at_booking)
        )
      `)
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CommissionsPage() {
  const commissions = await getCommissions()

  const totalPending = commissions
    .filter((c: any) => c.status === 'pending' || c.status === 'invoiced' || c.status === 'overdue')
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0)

  const totalCollected = commissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500 mt-1">Track what centres owe Podsee per conversion.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">S${totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="text-2xl font-bold text-green-600">S${totalCollected.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No commissions yet.</td>
              </tr>
            )}
            {commissions.map((c: any) => {
              const booking = c.trial_outcomes?.bookings
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${booking?.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {booking?.booking_ref}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {booking?.parent_name_at_booking} · {booking?.child_name_at_booking}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.centres?.name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">S${Number(c.commission_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COMMISSION_STATUS_COLOR[c.status as CommissionStatus]}`}>
                      {COMMISSION_STATUS_LABEL[c.status as CommissionStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CommissionActions commissionId={c.id} status={c.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
