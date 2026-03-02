import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { REWARD_STATUS_COLOR, REWARD_STATUS_LABEL, type RewardStatus } from '@/types/database'
import RewardActions from './RewardActions'

async function getRewards() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('rewards')
      .select(`
        id, reward_amount, status, approved_at, paid_at, payment_method, payment_reference, created_at,
        parents(name, email, phone),
        trial_outcomes(
          bookings(id, booking_ref, child_name_at_booking, child_level_at_booking)
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

export default async function RewardsPage() {
  const rewards = await getRewards()

  const totalPending = rewards
    .filter((r: any) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum: number, r: any) => sum + Number(r.reward_amount), 0)

  const totalPaid = rewards
    .filter((r: any) => r.status === 'paid')
    .reduce((sum: number, r: any) => sum + Number(r.reward_amount), 0)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Rewards</h1>
        <p className="text-sm text-gray-500 mt-1">Cash rewards paid to parents who self-report enrolment.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">S${totalPending.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Paid Out</p>
          <p className="text-2xl font-bold text-green-600">S${totalPaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rewards.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No rewards yet.</td>
              </tr>
            )}
            {rewards.map((r: any) => {
              const booking = r.trial_outcomes?.bookings
              const parent = r.parents
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${booking?.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {booking?.booking_ref}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {booking?.child_name_at_booking} ({booking?.child_level_at_booking})
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{parent?.name}</div>
                    <div className="text-xs text-gray-400">{parent?.phone ?? parent?.email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">S${Number(r.reward_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.payment_method && <div>{r.payment_method}</div>}
                    {r.payment_reference && <div className="font-mono">{r.payment_reference}</div>}
                    {!r.payment_method && !r.payment_reference && '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REWARD_STATUS_COLOR[r.status as RewardStatus]}`}>
                      {REWARD_STATUS_LABEL[r.status as RewardStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RewardActions rewardId={r.id} status={r.status} />
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
