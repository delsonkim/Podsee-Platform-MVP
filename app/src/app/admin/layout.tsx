import { requireAdminUser } from '@/lib/admin-auth'
import AdminNav from './AdminNav'
import SignOutButton from './SignOutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminUser()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">Podsee Admin</span>
        </div>
        <AdminNav />
        <div className="mt-auto p-4 border-t border-white/10 space-y-1">
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8 bg-gray-50">{children}</main>
    </div>
  )
}
