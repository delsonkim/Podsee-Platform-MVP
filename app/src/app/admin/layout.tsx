import { requireAdminUser } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminNav from './AdminNav'
import SignOutButton from './SignOutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminUser()

  // Count centres needing review (pending changes or not yet published)
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('centres')
    .select('id', { count: 'exact', head: true })
    .or('has_pending_changes.eq.true,is_active.eq.false')
  const reviewCount = count ?? 0

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-gray-900 flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">Podsee Admin</span>
        </div>
        <AdminNav reviewCount={reviewCount} />
        <div className="mt-auto p-4 border-t border-white/10 space-y-1">
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50">{children}</main>
    </div>
  )
}
