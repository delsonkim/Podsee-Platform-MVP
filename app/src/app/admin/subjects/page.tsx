import { createAdminClient } from '@/lib/supabase/admin'
import SubjectActions from './SubjectActions'

export default async function SubjectsPage() {
  const supabase = createAdminClient()

  // Fetch all subjects with usage count
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, is_custom, sort_order')
    .order('sort_order', { ascending: true })

  // Count trial_slots per subject for usage info
  const { data: usageCounts } = await supabase
    .from('trial_slots')
    .select('subject_id')

  const usageMap = new Map<string, number>()
  for (const row of usageCounts ?? []) {
    usageMap.set(row.subject_id, (usageMap.get(row.subject_id) ?? 0) + 1)
  }

  const subjectRows = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    is_custom: s.is_custom,
    usage_count: usageMap.get(s.id) ?? 0,
  }))

  const customCount = subjectRows.filter((s) => s.is_custom).length

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Subjects</h1>
        <p className="text-sm text-gray-500 mt-1">
          {subjectRows.length} subjects total
          {customCount > 0 && <span> · {customCount} custom (created by AI parser)</span>}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Used by</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subjectRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No subjects found.</td>
              </tr>
            )}
            {subjectRows.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.is_custom ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.is_custom ? 'Custom' : 'Canonical'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.usage_count > 0 ? `${s.usage_count} slot${s.usage_count !== 1 ? 's' : ''}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <SubjectActions subject={s} allSubjects={subjectRows} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
