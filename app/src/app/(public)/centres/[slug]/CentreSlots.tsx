'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { SlotDetail } from '@/lib/public-data'
import { getStreamDisplay } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { signInWithGoogle } from '@/lib/auth'

/* ── Date / time helpers ── */

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function relativeLabel(d: string): string | null {
  const [y, m, day] = d.split('-').map(Number)
  const slotDate = new Date(y, m - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((slotDate.getTime() - today.getTime()) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1 && diff <= 6) {
    return `This ${slotDate.toLocaleDateString('en-SG', { weekday: 'long' })}`
  }
  return null
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m}${ampm}`
}

function duration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  const h = Math.floor(mins / 60)
  const mn = mins % 60
  return mn > 0 ? `${h}h ${mn}min` : `${h}h`
}

export default function CentreSlots({ slots }: { slots: SlotDetail[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checking, setChecking] = useState(false)
  const [bookedSlotIds, setBookedSlotIds] = useState<Set<string>>(new Set())

  const minFee =
    slots.length > 0 ? Math.min(...slots.map((s) => Number(s.trial_fee))) : null

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setIsLoggedIn(true)
      // Fetch this parent's active bookings on these slots
      const slotIds = slots.map((s) => s.id)
      if (slotIds.length === 0) return
      const { data: bookings } = await supabase
        .from('bookings')
        .select('slot_id')
        .eq('parent_id', data.user.id)
        .in('slot_id', slotIds)
        .in('status', ['confirmed', 'completed', 'converted'])
      if (bookings) {
        setBookedSlotIds(new Set(bookings.map((b: any) => b.slot_id)))
      }
    })
  }, [slots])

  async function handleBookClick() {
    if (!selected) return
    setChecking(true)

    const supabase = createClient()
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      router.push(`/book/${selected}`)
    } else {
      signInWithGoogle(`/book/${selected}`)
    }
  }

  // Only show stream badges if this centre has mixed streams (e.g. both G2 and G3 slots)
  // If all slots have the same stream (or null), badges add no info and may confuse parents
  const distinctStreams = new Set(slots.map((s) => s.stream).filter(Boolean))
  const showStreamBadges = distinctStreams.size > 1

  const slotsByDate = slots.reduce<Record<string, SlotDetail[]>>((acc, slot) => {
    acc[slot.date] = [...(acc[slot.date] ?? []), slot]
    return acc
  }, {})
  const sortedDates = Object.keys(slotsByDate).sort()
  const selectedSlot = slots.find((s) => s.id === selected)

  return (
    <>
      {sortedDates.length === 0 ? (
        <p className="text-sm text-sage">No trial slots available right now. Check back soon.</p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const rel = relativeLabel(date)
            return (
              <div key={date}>
                {/* Date header with relative label */}
                <div className="mb-3">
                  {rel && (
                    <p className="font-display font-bold text-forest text-sm">{rel}</p>
                  )}
                  <p className={`text-xs font-display font-semibold text-sage uppercase tracking-widest ${rel ? 'mt-0.5' : ''}`}>
                    {formatDate(date)}
                  </p>
                </div>

                <div className="space-y-2">
                  {slotsByDate[date].map((slot) => {
                    const filled = slot.max_students - slot.spots_remaining
                    const pct = Math.round((filled / slot.max_students) * 100)
                    const isFull = slot.spots_remaining === 0
                    const isLow = !isFull && slot.spots_remaining <= 2
                    const isSelected = selected === slot.id
                    const isBooked = bookedSlotIds.has(slot.id)

                    return (
                      <button
                        key={slot.id}
                        disabled={isFull}
                        onClick={() => setSelected(isSelected ? null : slot.id)}
                        className={`relative w-full p-4 rounded-xl border-[1.5px] text-left transition-all ${
                          isFull
                            ? 'opacity-50 cursor-not-allowed bg-paper border-linen'
                            : isSelected
                            ? 'border-fern bg-mint'
                            : 'border-linen bg-white hover:border-fern/50'
                        }`}
                      >
                        {/* Selected checkmark */}
                        {isSelected && !isBooked && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-fern rounded-full flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}

                        {/* Already booked badge */}
                        {isBooked && (
                          <span className="absolute top-3 right-3 inline-flex items-center text-[10px] font-display font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            Already booked
                          </span>
                        )}

                        {/* Top row: time + price */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-display font-bold text-forest text-sm">
                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                            </p>
                            <p className="text-xs text-sage mt-1 flex items-center gap-1 flex-wrap">
                              <span>{slot.subject.name} · {slot.level.label}</span>
                              {showStreamBadges && (() => {
                                const sd = getStreamDisplay(slot.stream)
                                return sd ? <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${sd.color}`}>{sd.shortLabel}</span> : null
                              })()}
                              <span>· {duration(slot.start_time, slot.end_time)}</span>
                            </p>
                          </div>
                          <span className="font-display font-bold text-forest text-base shrink-0">
                            S${slot.trial_fee}
                          </span>
                        </div>

                        {/* Urgency badge */}
                        {isFull ? (
                          <span className="inline-block text-xs font-display font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full mb-2">
                            Full
                          </span>
                        ) : isLow ? (
                          <span className="inline-block text-xs font-display font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-full mb-2 animate-pulse">
                            Only {slot.spots_remaining} spot{slot.spots_remaining === 1 ? '' : 's'} left!
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-display font-semibold text-fern mb-2">
                            {slot.spots_remaining} spot{slot.spots_remaining === 1 ? '' : 's'} left
                          </span>
                        )}

                        {/* Thin capacity bar */}
                        <div className="h-[3px] bg-linen rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull ? 'bg-red-400' : isLow ? 'bg-amber' : 'bg-fern'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Notes */}
                        {slot.notes && (
                          <p className="text-xs text-sage italic mt-2 border-t border-linen/60 pt-2">
                            {slot.notes}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Sticky bottom CTA ── */}
      {/* Mobile: always visible | Desktop: only when slot selected */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-linen px-6 py-4 transition-transform duration-300 z-20 translate-y-0 ${
          !selected ? 'lg:translate-y-full' : ''
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {selectedSlot ? (
            /* Slot selected state */
            <>
              <div className="min-w-0">
                <p className="text-xs text-sage">{bookedSlotIds.has(selectedSlot.id) ? 'You already have a booking' : 'Selected slot'}</p>
                <p className="font-display font-bold text-forest text-sm leading-tight mt-0.5 truncate flex items-center gap-1">
                  <span>{selectedSlot.subject.name} · {selectedSlot.level.label}</span>
                  {showStreamBadges && (() => {
                    const sd = getStreamDisplay(selectedSlot.stream)
                    return sd ? <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${sd.color}`}>{sd.shortLabel}</span> : null
                  })()}
                  <span className="text-sage font-normal">
                    · {formatDate(selectedSlot.date)}, {formatTime(selectedSlot.start_time)}
                  </span>
                </p>
                {bookedSlotIds.has(selectedSlot.id) && (
                  <p className="text-xs text-blue-600 mt-1">Have another child? You can still book for a different child.</p>
                )}
              </div>
              <button
                onClick={handleBookClick}
                disabled={checking}
                className="bg-fern text-white font-display font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-forest transition-colors whitespace-nowrap shadow-xl shadow-fern/20 disabled:opacity-60 shrink-0"
              >
                {checking ? 'Loading…' : bookedSlotIds.has(selectedSlot.id) ? 'Book for Another Child' : `Book Trial · S$${selectedSlot.trial_fee}`}
              </button>
            </>
          ) : (
            /* Default state (mobile only — hidden on desktop via lg:translate-y-full) */
            <>
              <div>
                {minFee !== null && (
                  <p className="font-display font-bold text-forest text-sm">
                    From S${minFee} <span className="font-normal text-sage text-xs">/ trial</span>
                  </p>
                )}
                <p className="text-xs text-sage mt-0.5">
                  {slots.length} slot{slots.length === 1 ? '' : 's'} available
                </p>
              </div>
              <span className="text-sm font-display font-semibold text-sage bg-paper border border-linen px-6 py-3.5 rounded-xl shrink-0">
                Select a slot above
              </span>
            </>
          )}
        </div>
      </div>

      {/* Spacer for sticky CTA */}
      <div className="h-20" />
    </>
  )
}
