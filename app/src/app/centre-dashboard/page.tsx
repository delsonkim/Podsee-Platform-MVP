import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'
import Link from 'next/link'

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'converted', 'no_show', 'cancelled']

async function getStats(centreId: string) {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [statusCounts, thisMonthResult, recentBookings, upcomingSlots] = await Promise.all([
      Promise.all(
        STATUSES.map(async (status) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('centre_id', centreId)
            .eq('status', status)
          return { status, count: count ?? 0 }
        })
      ),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('centre_id', centreId)
        .gte('created_at', monthStart),
      supabase
        .from('bookings')
        .select('id, booking_ref, parent_name_at_booking, child_name_at_booking, child_level_at_booking, status, created_at, trial_slots(date, start_time)')
        .eq('centre_id', centreId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('trial_slots')
        .select('id, date, start_time, end_time, max_students, spots_remaining, subjects(name), levels(label)')
        .eq('centre_id', centreId)
        .gte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5),
    ])

    const totalBookings = statusCounts.reduce((sum, { count }) => sum + count, 0)

    return {
      statusCounts: Object.fromEntries(statusCounts.map(({ status, count }) => [status, count])) as Record<BookingStatus, number>,
      totalBookings,
      thisMonth: thisMonthResult.count ?? 0,
      recentBookings: recentBookings.data ?? [],
      upcomingSlots: upcomingSlots.data ?? [],
    }
  } catch {
    const empty = { pending: 0, confirmed: 0, completed: 0, converted: 0, no_show: 0, cancelled: 0 } as Record<BookingStatus, number>
    return { statusCounts: empty, totalBookings: 0, thisMonth: 0, recentBookings: [], upcomingSlots: [] }
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default async function CentreDashboardOverview() {
  const { centreId } = await requireCentreUser()
  const { statusCounts, totalBookings, thisMonth, recentBookings, upcomingSlots } = await getStats(centreId)

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Your centre's bookings and activity from Podsee.</p>
      </div>

      {/* Leads summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Leads from Podsee (all time)</p>
          <p className="text-3xl font-bold text-gray-900">{totalBookings}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">This month</p>
          <p className="text-3xl font-bold text-blue-600">{thisMonth}</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Pending" count={statusCounts.pending} color="text-amber-600" />
        <StatCard label="Confirmed" count={statusCounts.confirmed} color="text-blue-600" />
        <StatCard label="Completed" count={statusCounts.completed} color="text-purple-600" />
        <StatCard label="Converted" count={statusCounts.converted} color="text-green-600" />
        <StatCard label="No Shows" count={statusCounts.no_show} color="text-red-600" />
        <StatCard label="Cancelled" count={statusCounts.cancelled} color="text-gray-500" />
      </div>

      {/* Upcoming trials */}
      {upcomingSlots.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Upcoming Trials</h2>
            <Link href="/centre-dashboard/slots" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingSlots.map((s: any) => {
                  const booked = s.max_students - s.spots_remaining
                  const pct = s.max_students > 0 ? (booked / s.max_students) * 100 : 0
                  const barColor = s.spots_remaining === 0 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500'
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{s.subjects?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.levels?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(s.date)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(s.start_time)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{booked}/{s.max_students}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/centre-dashboard/bookings" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Parent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Child</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Trial Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No bookings yet.</td>
                </tr>
              )}
              {recentBookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/centre-dashboard/bookings/${b.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {b.booking_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{b.parent_name_at_booking}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.child_name_at_booking}
                    <span className="ml-1 text-gray-400 text-xs">({b.child_level_at_booking})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(b.trial_slots as any)?.date ? formatDate((b.trial_slots as any).date) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_STATUS_COLOR[b.status as BookingStatus]}`}>
                      {BOOKING_STATUS_LABEL[b.status as BookingStatus]}
                    </span>
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
