import { createAdminClient } from '@/lib/supabase/admin'
import AddAdminUserForm from './AddAdminUserForm'
import { removeAdminUser } from './actions'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('id, auth_user_id, email, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage who can access the admin panel.</p>
      </div>

      <AddAdminUserForm />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Linked</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(!adminUsers || adminUsers.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No admin users yet.</td>
              </tr>
            )}
            {adminUsers?.map((au: any) => (
              <tr key={au.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">{au.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    au.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {au.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {au.auth_user_id ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(au.created_at)}</td>
                <td className="px-4 py-3">
                  <form action={async () => {
                    'use server'
                    await removeAdminUser(au.id)
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
