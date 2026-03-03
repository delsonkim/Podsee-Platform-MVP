import { createAdminClient } from '@/lib/supabase/admin'
import LinkCentreUserForm from './LinkCentreUserForm'
import CopyLinkButton from './CopyLinkButton'
import { unlinkCentreUser } from './actions'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CentreUsersPage() {
  const supabase = createAdminClient()

  const [{ data: centreUsers }, { data: centres }] = await Promise.all([
    supabase
      .from('centre_users')
      .select('id, auth_user_id, email, role, created_at, centres(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('centres')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Centre Users</h1>
        <p className="text-sm text-gray-500 mt-1">Link Google accounts to centres for dashboard access.</p>
      </div>

      <LinkCentreUserForm centres={centres ?? []} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Centre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Linked</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dashboard</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!centreUsers || centreUsers.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No centre users yet.</td>
              </tr>
            )}
            {centreUsers?.map((cu: any) => (
              <tr key={cu.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{cu.email}</td>
                <td className="px-4 py-3 text-gray-700">{cu.centres?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    cu.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cu.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {cu.auth_user_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(cu.created_at)}</td>
                <td className="px-4 py-3">
                  <CopyLinkButton />
                </td>
                <td className="px-4 py-3">
                  <form action={async () => {
                    'use server'
                    await unlinkCentreUser(cu.id)
                  }}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
