import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStreamDisplay } from '@/types/database'
import AddSlotSection from './AddSlotSection'

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
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Stream</th>
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
              <td colSpan={8} className="px-4 py-8 text-center text-gray-400">{emptyMessage}</td>
            </tr>
          )}
          {slots.map((s: any) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-800 font-medium">{s.subjects?.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{s.levels?.label ?? '—'}</td>
              <td className="px-4 py-3">
                {(() => {
                  const sd = getStreamDisplay(s.stream)
                  return sd ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${sd.color}`}>{sd.shortLabel}</span> : <span className="text-gray-300">—</span>
                })()}
              </td>
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

function DraftSlotTable({ slots }: { slots: any[] }) {
  if (slots.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-amber-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-amber-100/60 border-b border-amber-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Subject</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Level</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Stream</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Fee</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wide">Max</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {slots.map((s: any) => (
            <tr key={s.id} className="bg-amber-50/40">
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">Pending</span>
              </td>
              <td className="px-4 py-3 text-gray-800 font-medium">{s.subjects?.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{s.levels?.label ?? '—'}</td>
              <td className="px-4 py-3">
                {(() => {
                  const sd = getStreamDisplay(s.stream)
                  return sd ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${sd.color}`}>{sd.shortLabel}</span> : <span className="text-gray-300">—</span>
                })()}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(s.date)}</td>
              <td className="px-4 py-3 text-gray-500">{formatTime(s.start_time)} – {formatTime(s.end_time)}</td>
              <td className="px-4 py-3 text-gray-700">S${Number(s.trial_fee).toFixed(0)}</td>
              <td className="px-4 py-3 text-gray-700">{s.max_students}</td>
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

  const [{ data: upcoming }, { data: past }, { data: drafts }, { data: subjects }, { data: levels }] = await Promise.all([
    supabase
      .from('trial_slots')
      .select('id, date, start_time, end_time, trial_fee, max_students, spots_remaining, stream, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .eq('is_draft', false)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('trial_slots')
      .select('id, date, start_time, end_time, trial_fee, max_students, spots_remaining, stream, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .eq('is_draft', false)
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('trial_slots')
      .select('id, date, start_time, end_time, trial_fee, max_students, stream, subjects(name), levels(label)')
      .eq('centre_id', centreId)
      .eq('is_draft', true)
      .order('date', { ascending: true }),
    supabase
      .from('subjects')
      .select('id, name, sort_order')
      .order('sort_order'),
    supabase
      .from('levels')
      .select('id, code, label, level_group, sort_order')
      .order('sort_order'),
  ])

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Trial Slots</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your trial class schedule. New slots are submitted for admin review.</p>
      </div>

      {/* Add new slots */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Add New Slots</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <AddSlotSection subjects={subjects ?? []} levels={levels ?? []} centreId={centreId} />
        </div>
      </div>

      {/* Pending Review (draft slots) */}
      {(drafts?.length ?? 0) > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800 text-lg">⏳</span>
            <div>
              <h2 className="text-base font-semibold text-amber-800">
                Pending Admin Review — {drafts?.length ?? 0} slot{(drafts?.length ?? 0) !== 1 ? 's' : ''}
              </h2>
              <p className="text-xs text-amber-600">These slots will not appear publicly until approved by Podsee. You do not need to resubmit.</p>
            </div>
          </div>
          <DraftSlotTable slots={drafts ?? []} />
        </div>
      )}

      {/* Upcoming live slots */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Upcoming ({upcoming?.length ?? 0})
        </h2>
        <SlotTable slots={upcoming ?? []} emptyMessage="No upcoming trial slots." />
      </div>

      {/* Past slots */}
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
