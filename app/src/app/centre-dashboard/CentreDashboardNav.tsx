'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/centre-dashboard', label: 'Overview' },
  { href: '/centre-dashboard/bookings', label: 'Bookings' },
  { href: '/centre-dashboard/slots', label: 'Trial Slots' },
  { href: '/centre-dashboard/centre-info', label: 'Centre Info' },
  { href: '/centre-dashboard/team', label: 'Team' },
]

export default function CentreDashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {links.map(({ href, label }) => {
        const active =
          href === '/centre-dashboard' ? pathname === '/centre-dashboard' : pathname.startsWith(href)
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
