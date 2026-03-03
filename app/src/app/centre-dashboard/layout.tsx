import { requireCentreUser } from '@/lib/centre-auth'
import CentreDashboardNav from './CentreDashboardNav'
import SignOutButton from './SignOutButton'

export default async function CentreDashboardLayout({ children }: { children: React.ReactNode }) {
  const { centreName, user } = await requireCentreUser()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">{centreName}</span>
          <p className="text-gray-500 text-xs mt-0.5">Centre Dashboard</p>
        </div>
        <CentreDashboardNav />
        <div className="mt-auto p-4 border-t border-white/10 space-y-1">
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8 bg-gray-50">{children}</main>
    </div>
  )
}
