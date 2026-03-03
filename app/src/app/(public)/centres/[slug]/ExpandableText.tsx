'use client'

import { useState } from 'react'

export default function ExpandableText({
  text,
  maxLength = 200,
  className = 'text-sm text-sage leading-relaxed',
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>
  }

  return (
    <p className={className}>
      {expanded ? text : `${text.slice(0, maxLength).trimEnd()}… `}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-fern font-display font-semibold hover:underline inline"
      >
        {expanded ? 'Show less' : 'more'}
      </button>
    </p>
  )
}
