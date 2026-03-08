'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ImageCarousel({
  images,
  centreName,
}: {
  images: string[]
  centreName: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActive(index)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {images.map((url, i) => (
          <div key={url} className="relative h-52 sm:h-64 w-full shrink-0 snap-center">
            <Image
              src={url}
              alt={`${centreName} photo ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((url, i) => (
            <span
              key={url}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                i === active ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
      <Link
        href="/centres"
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-forest hover:bg-white transition-colors shadow-sm z-10"
        aria-label="Back to centres"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  )
}
