import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import DeleteCentreButton from './review/DeleteCentreButton'

export default async function CentresPage() {
  const supabase = createAdminClient()

  const { data: centres } = await supabase
    .from('centres')
    .select(`
      id, name, slug, area, is_active, is_paused, has_pending_changes, created_at,
      centre_subjects(subjects(name)),
      centre_levels(levels(label))
    `)
    .order('name')

  const list = (centres ?? []) as any[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centres</h1>
          <p className="text-sm text-gray-500 mt-1">
            {list.length} centre{list.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/admin/centres/new"
          className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Centre
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">No centres yet.</p>
          <Link
            href="/admin/centres/new"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first centre
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Centre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Area</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Subjects</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((c) => {
                const subjects = (c.centre_subjects as any[])
                  .map((cs: any) => cs.subjects?.name)
                  .filter(Boolean)
                const status = !c.is_active
                  ? { label: 'Onboarding', color: 'bg-blue-100 text-blue-800' }
                  : c.is_paused
                  ? { label: 'Paused', color: 'bg-amber-100 text-amber-800' }
                  : c.has_pending_changes
                  ? { label: 'Active', color: 'bg-green-100 text-green-800', dot: 'bg-amber-400' }
                  : { label: 'Active', color: 'bg-green-100 text-green-800' }

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/centres/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">/{c.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.area || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {subjects.slice(0, 3).map((s: string) => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                            {s}
                          </span>
                        ))}
                        {subjects.length > 3 && (
                          <span className="text-xs text-gray-400">+{subjects.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color} inline-flex items-center gap-1`}>
                        {'dot' in status && <span className={`w-1.5 h-1.5 rounded-full ${(status as any).dot}`} />}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString('en-SG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteCentreButton centreId={c.id} centreName={c.name} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
