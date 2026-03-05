import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import OutcomeVerifyForm from './OutcomeVerifyForm'

async function getOutcomes() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('trial_outcomes')
      .select(`
        id, parent_reported_status, reported_at, centre_reported_status, centre_reported_at, admin_verified, admin_verified_at, admin_notes, created_at,
        bookings(id, booking_ref, parent_name_at_booking, child_name_at_booking, child_level_at_booking, trial_fee_at_booking, centre_id, parent_id, status, centres(name))
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

export default async function OutcomesPage() {
  const outcomes = await getOutcomes()

  // Enrolled = centre or parent reported enrolled (not yet admin-verified)
  const enrolled = outcomes.filter((o: any) => !o.admin_verified && (o.centre_reported_status === 'enrolled' || o.parent_reported_status === 'enrolled'))
  // Awaiting = not enrolled by anyone, not verified
  const awaiting = outcomes.filter((o: any) => !o.admin_verified && o.centre_reported_status !== 'enrolled' && o.parent_reported_status !== 'enrolled')
  const verified = outcomes.filter((o: any) => o.admin_verified)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Trial Outcomes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enrolment outcomes reported by centres and parents.
        </p>
      </div>

      {/* Enrolled — needs verification */}
      {enrolled.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Reported Enrolled ({enrolled.length})
          </h2>
          <div className="space-y-3">
            {enrolled.map((o: any) => (
              <div key={o.id} className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/admin/bookings/${o.bookings?.id}`} className="text-sm text-blue-600 hover:underline font-mono">
                      {o.bookings?.booking_ref}
                    </Link>
                    <p className="text-sm text-gray-800 mt-0.5">
                      {o.bookings?.parent_name_at_booking} · {o.bookings?.child_name_at_booking} ({o.bookings?.child_level_at_booking})
                    </p>
                    <p className="text-sm text-gray-500">{o.bookings?.centres?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Enrolled ✓
                    </span>
                    {o.centre_reported_status === 'enrolled' && (
                      <p className="text-xs text-gray-400 mt-1">Centre reported {formatDate(o.centre_reported_at)}</p>
                    )}
                    {o.parent_reported_status === 'enrolled' && o.reported_at && (
                      <p className="text-xs text-gray-400 mt-1">Parent reported {formatDate(o.reported_at)}</p>
                    )}
                  </div>
                </div>
                <OutcomeVerifyForm outcomeId={o.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awaiting parent report */}
      {awaiting.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Awaiting Report ({awaiting.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent / Child</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {awaiting.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${o.bookings?.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {o.bookings?.booking_ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.bookings?.parent_name_at_booking}</div>
                      <div className="text-xs text-gray-400">{o.bookings?.child_name_at_booking} ({o.bookings?.child_level_at_booking})</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.bookings?.centres?.name}</td>
                    <td className="px-4 py-3">
                      {o.parent_reported_status === 'not_enrolled' ? (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Did not enrol</span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Not reported yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Verified */}
      {verified.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Verified Conversions ({verified.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent / Child</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {verified.map((o: any) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${o.bookings?.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {o.bookings?.booking_ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.bookings?.parent_name_at_booking}</div>
                      <div className="text-xs text-gray-400">{o.bookings?.child_name_at_booking}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.bookings?.centres?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{o.admin_verified_at ? formatDate(o.admin_verified_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {outcomes.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center text-gray-400">
          No trial outcomes yet. Outcomes appear when bookings are marked completed.
        </div>
      )}
    </div>
  )
}
