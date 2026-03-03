import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function CapacityBar({ max, remaining }: { max: number; remaining: number }) {
  const booked = max - remaining
  const pct = max > 0 ? (booked / max) * 100 : 0
  const color = remaining === 0 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{booked}/{max} booked</span>
    </div>
  )
}

function SlotTable({ slots, emptyMessage }: { slots: any[]; emptyMessage: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Capacity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Spots Left</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {slots.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-400">{emptyMessage}</td>
            </tr>
          )}
          {slots.map((s: any) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-800 font-medium">{s.subjects?.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{s.levels?.label ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{formatDate(s.date)}</td>
              <td className="px-4 py-3 text-gray-500">{formatTime(s.start_time)} – {formatTime(s.end_time)}</td>
              <td className="px-4 py-3 text-gray-700">S${Number(s.trial_fee).toFixed(0)}</td>
              <td className="px-4 py-3">
                <CapacityBar max={s.max_students} remaining={s.spots_remaining} />
              </td>
              <td className="px-4 py-3">
                {s.spots_remaining === 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Full</span>
                ) : (
                  <span className="text-sm text-gray-700 font-medium">{s.spots_remaining}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function CentreSlotsPage() {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from('trial_slots')
      .select('id, date, start_time, end_time, trial_fee, max_students, spots_remaining, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('trial_slots')
      .select('id, date, start_time, end_time, trial_fee, max_students, spots_remaining, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Trial Slots</h1>
        <p className="text-sm text-gray-500 mt-1">Your upcoming and past trial class slots with capacity.</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Upcoming ({upcoming?.length ?? 0})
        </h2>
        <SlotTable slots={upcoming ?? []} emptyMessage="No upcoming trial slots." />
      </div>

      {(past?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Past (last 20)
          </h2>
          <SlotTable slots={past ?? []} emptyMessage="No past trial slots." />
        </div>
      )}
    </div>
  )
}
