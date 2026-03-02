'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/centres', label: 'Centres' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/outcomes', label: 'Outcomes' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/rewards', label: 'Rewards' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map(({ href, label }) => {
        const active =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
