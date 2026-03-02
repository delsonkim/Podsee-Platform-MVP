import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'

async function getStats() {
  try {
    const supabase = createAdminClient()

    const statuses: BookingStatus[] = ['pending', 'confirmed', 'completed', 'converted', 'no_show', 'cancelled']

    const [statusCounts, flaggedResult, recentBookings] = await Promise.all([
      Promise.all(
        statuses.map(async (status) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', status)
          return { status, count: count ?? 0 }
        })
      ),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('is_flagged', true),
      supabase
        .from('bookings')
        .select('id, booking_ref, parent_name_at_booking, child_name_at_booking, child_level_at_booking, status, is_flagged, created_at, centres(name), trial_slots(date)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    return {
      statusCounts: Object.fromEntries(statusCounts.map(({ status, count }) => [status, count])) as Record<BookingStatus, number>,
      flaggedCount: flaggedResult.count ?? 0,
      recentBookings: recentBookings.data ?? [],
    }
  } catch {
    const empty = { pending: 0, confirmed: 0, completed: 0, converted: 0, no_show: 0, cancelled: 0 } as Record<BookingStatus, number>
    return { statusCounts: empty, flaggedCount: 0, recentBookings: [] }
  }
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{count}</p>
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminDashboard() {
  const { statusCounts, flaggedCount, recentBookings } = await getStats()

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all bookings and activity.</p>
      </div>

      {flaggedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700 font-medium">
            {flaggedCount} flagged {flaggedCount === 1 ? 'booking' : 'bookings'} require review
          </p>
          <Link href="/admin/bookings?status=flagged" className="text-sm text-red-700 underline">
            View flagged
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Pending" count={statusCounts.pending} color="text-amber-600" />
        <StatCard label="Confirmed" count={statusCounts.confirmed} color="text-blue-600" />
        <StatCard label="Completed" count={statusCounts.completed} color="text-purple-600" />
        <StatCard label="Converted" count={statusCounts.converted} color="text-green-600" />
        <StatCard label="No Shows" count={statusCounts.no_show} color="text-red-600" />
        <StatCard label="Cancelled" count={statusCounts.cancelled} color="text-gray-500" />
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Parent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Child</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Centre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Trial Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No bookings yet.</td>
                </tr>
              )}
              {recentBookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {b.booking_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{b.parent_name_at_booking}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.child_name_at_booking}
                    <span className="ml-1 text-gray-400 text-xs">({b.child_level_at_booking})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{(b.centres as any)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{(b.trial_slots as any)?.date ? formatDate((b.trial_slots as any).date) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus]}`}>
                      {BOOKING_STATUS_LABEL[b.status as BookingStatus]}
                    </span>
                    {b.is_flagged && <span className="ml-1 text-xs text-red-600 font-medium">⚑</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
