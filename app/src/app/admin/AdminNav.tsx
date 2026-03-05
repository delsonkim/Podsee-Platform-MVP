'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/centres', label: 'Centres' },
  { href: '/admin/centres/review', label: 'Review' },
  { href: '/admin/subjects', label: 'Subjects' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/outcomes', label: 'Outcomes' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/rewards', label: 'Rewards' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/admin-users', label: 'Admin Users' },
  { href: '/admin/links', label: 'Links' },
]

export default function AdminNav({ reviewCount = 0 }: { reviewCount?: number }) {
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
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
            {href === '/admin/centres/review' && reviewCount > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full leading-none">
                {reviewCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
