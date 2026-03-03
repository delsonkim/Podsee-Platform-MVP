'use client'

import { useState } from 'react'

const sections = [
  {
    title: 'Parent-Facing',
    description: 'Share these with parents',
    links: [
      { label: 'Homepage', path: '/' },
      { label: 'Browse Centres', path: '/centres' },
      { label: 'My Bookings', path: '/my-bookings' },
    ],
  },
  {
    title: 'Centre-Facing',
    description: 'Share with centre owners to access their dashboard',
    links: [
      { label: 'Centre Login', path: '/centre-login' },
      { label: 'Centre Dashboard', path: '/centre-dashboard' },
    ],
  },
  {
    title: 'Admin',
    description: 'Internal Podsee team links',
    links: [
      { label: 'Admin Login', path: '/admin-login' },
      { label: 'Admin Dashboard', path: '/admin' },
      { label: 'Add New Centre', path: '/admin/centres/new' },
      { label: 'Manage Subjects', path: '/admin/subjects' },
      { label: 'Manage Centre Users', path: '/admin/centre-users' },
      { label: 'Manage Admin Users', path: '/admin/admin-users' },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
        copied
          ? 'text-green-700 bg-green-50'
          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
      }`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function LinksPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Platform Links</h1>
        <p className="text-sm text-gray-500 mt-1">
          All platform URLs in one place. Copy and share as needed.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
            {section.title}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{section.description}</p>

          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {section.links.map((link) => {
              const fullUrl = `${origin}${link.path}`
              return (
                <div
                  key={link.path}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{link.label}</p>
                    <p className="text-xs text-gray-400 truncate">{fullUrl}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={link.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                    >
                      Open
                    </a>
                    <CopyButton text={fullUrl} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
