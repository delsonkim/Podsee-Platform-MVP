import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      <header className="border-b border-linen bg-parchment sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold text-forest tracking-tight text-base"
          >
            Podsee
          </Link>
          <Link
            href="/centres"
            className="text-sm text-sage hover:text-forest transition-colors font-medium"
          >
            Browse centres
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-linen py-8 mt-16 bg-parchment">
        <div className="max-w-5xl mx-auto px-6 text-sm text-sage">
          © 2026 Podsee. Singapore.
        </div>
      </footer>
    </div>
  )
}
