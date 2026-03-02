import AdminNav from './AdminNav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">Podsee Admin</span>
        </div>
        <AdminNav />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8 bg-gray-50">{children}</main>
    </div>
  )
}
