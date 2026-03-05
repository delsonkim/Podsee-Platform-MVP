import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AddTeamMemberForm, RemoveTeamMemberButton } from './TeamActions'

async function getTeamMembers(centreId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('centre_users')
    .select('id, auth_user_id, email, role, created_at')
    .eq('centre_id', centreId)
    .order('created_at', { ascending: true })
  return data ?? []
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function TeamPage() {
  const { centreId, role } = await requireCentreUser()
  const members = await getTeamMembers(centreId)
  const isOwner = role === 'owner'

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        <p className="text-sm text-gray-500 mt-1">People who can access this centre&apos;s dashboard.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {members.length === 0 ? (
          <p className="text-sm text-gray-400">No team members yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Added</th>
                {isOwner && <th className="py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 text-gray-800">{m.email}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.role === 'owner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {m.auth_user_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Linked</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-400 text-xs">{formatDate(m.created_at)}</td>
                  {isOwner && (
                    <td className="py-2.5 text-right">
                      <RemoveTeamMemberButton centreUserId={m.id} centreId={centreId} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isOwner && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Add a team member</p>
          <p className="text-xs text-gray-400 mb-4">
            Enter their Google email. They&apos;ll be able to sign in and access this centre&apos;s dashboard.
          </p>
          <AddTeamMemberForm centreId={centreId} />
        </div>
      )}
    </div>
  )
}
