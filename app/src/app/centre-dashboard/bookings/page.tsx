import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import InlineStatusActions from './InlineStatusActions'

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Converted', value: 'converted' },
  { label: 'No Show', value: 'no_show' },
  { label: 'Cancelled', value: 'cancelled' },
]

async function getBookings(centreId: string, status: string) {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('bookings')
      .select('id, booking_ref, parent_name_at_booking, parent_phone_at_booking, child_name_at_booking, child_level_at_booking, trial_fee_at_booking, status, created_at, trial_slots(date, start_time)')
      .eq('centre_id', centreId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data } = await query
    return data ?? []
  } catch {
    return []
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default async function CentreBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { centreId } = await requireCentreUser()
  const { status = 'all' } = await searchParams
  const bookings = await getBookings(centreId, status)

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">{bookings.length} result{bookings.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/centre-dashboard/bookings?status=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              status === tab.value
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ref</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Child</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Trial Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No bookings found.</td>
              </tr>
            )}
            {bookings.map((b: any) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/centre-dashboard/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                    {b.booking_ref}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{b.parent_name_at_booking}</div>
                  {b.parent_phone_at_booking && (
                    <div className="text-gray-400 text-xs">{b.parent_phone_at_booking}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{b.child_name_at_booking}</div>
                  <div className="text-gray-400 text-xs">{b.child_level_at_booking}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {(b.trial_slots as any)?.date ? (
                    <>
                      <div>{formatDate((b.trial_slots as any).date)}</div>
                      <div className="text-xs text-gray-400">{formatTime((b.trial_slots as any).start_time)}</div>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">S${Number(b.trial_fee_at_booking).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <InlineStatusActions
                    bookingId={b.id}
                    status={b.status}
                    trialDate={(b.trial_slots as any)?.date ?? null}
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
