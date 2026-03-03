'use client'

import { useState } from 'react'

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/centre-dashboard`
    : '/centre-dashboard'

  function handleCopy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs font-medium transition-colors ${
        copied ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'
      }`}
    >
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
