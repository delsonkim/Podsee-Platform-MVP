import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function CentreReviewListPage() {
  const supabase = createAdminClient()

  // Centres that need attention
  const { data: centres } = await supabase
    .from('centres')
    .select('id, name, slug, is_active, has_pending_changes, created_at')
    .or('has_pending_changes.eq.true,is_active.eq.false')
    .order('created_at', { ascending: false })

  const centreIds = (centres ?? []).map((c) => c.id)

  // Count draft slots per centre
  const { data: draftSlotRows } = centreIds.length > 0
    ? await supabase
        .from('trial_slots')
        .select('centre_id')
        .in('centre_id', centreIds)
        .eq('is_draft', true)
    : { data: [] }

  const draftCountMap = new Map<string, number>()
  for (const row of draftSlotRows ?? []) {
    draftCountMap.set(row.centre_id, (draftCountMap.get(row.centre_id) ?? 0) + 1)
  }

  const enriched = (centres ?? []).map((c) => ({
    ...c,
    draft_slot_count: draftCountMap.get(c.id) ?? 0,
  }))

  // Summary counts
  const pendingProfileCount = enriched.filter((c) => c.has_pending_changes).length
  const draftSlotCount = enriched.filter((c) => c.draft_slot_count > 0).length
  const readyToPublishCount = enriched.filter((c) => !c.is_active).length

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Centre Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review pending changes, draft slots, and publish new centres.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profile Changes</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingProfileCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Draft Slots</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{draftSlotCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ready to Publish</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{readyToPublishCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Centre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Needs Review</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Added</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enriched.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No centres need review right now.</td>
              </tr>
            )}
            {enriched.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  {c.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Onboarding</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.has_pending_changes && (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">Profile Changes</span>
                    )}
                    {c.draft_slot_count > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 font-medium">
                        {c.draft_slot_count} Draft Slot{c.draft_slot_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {!c.is_active && (
                      <span className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 font-medium">Unpublished</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(c.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/centres/review/${c.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Review &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
