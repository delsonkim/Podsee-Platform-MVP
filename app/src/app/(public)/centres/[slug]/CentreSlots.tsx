'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SlotDetail } from '@/lib/public-data'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
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
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function CentreSlots({ slots }: { slots: SlotDetail[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

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
          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {slotsByDate[date].map((slot) => {
                  const filled = slot.max_students - slot.spots_remaining
                  const pct = Math.round((filled / slot.max_students) * 100)
                  const isFull = slot.spots_remaining === 0
                  const isLow = !isFull && pct >= 75
                  const isSelected = selected === slot.id

                  return (
                    <button
                      key={slot.id}
                      disabled={isFull}
                      onClick={() => setSelected(isSelected ? null : slot.id)}
                      className={`w-full p-4 rounded-xl border-[1.5px] text-left transition-all ${
                        isFull
                          ? 'opacity-50 cursor-not-allowed bg-paper border-linen'
                          : isSelected
                          ? 'border-fern bg-mint'
                          : 'border-linen bg-white hover:border-fern/50'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-display font-semibold text-forest text-sm">
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-xs bg-mint text-fern border border-fern/15 rounded-full px-2.5 py-0.5 font-medium">
                              {slot.subject.name}
                            </span>
                            <span className="text-xs bg-cream text-sage rounded-full px-2.5 py-0.5">
                              {slot.level.label}
                            </span>
                            <span className="text-xs text-sage">
                              {duration(slot.start_time, slot.end_time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={`text-xs font-display font-bold px-2.5 py-1 rounded-full ${
                              isFull
                                ? 'bg-red-500 text-white'
                                : isLow
                                ? 'bg-amber text-white'
                                : 'bg-fern text-white'
                            }`}
                          >
                            {isFull
                              ? 'Full'
                              : `${slot.spots_remaining} spot${slot.spots_remaining === 1 ? '' : 's'} left`}
                          </span>
                          <span className="font-display font-bold text-forest text-sm">
                            S${slot.trial_fee}
                          </span>
                        </div>
                      </div>

                      {/* Capacity bar */}
                      <div className="h-[5px] bg-linen rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-500' : isLow ? 'bg-amber' : 'bg-fern'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-sage">
                        {filled} / {slot.max_students} enrolled
                      </p>

                      {slot.notes && (
                        <p className="text-xs text-sage italic mt-1.5 border-t border-linen/60 pt-1.5">
                          {slot.notes}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky CTA */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 border-linen px-6 py-4 transition-transform duration-300 z-20 ${
          selected ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-sage">Selected slot</p>
            {selectedSlot && (
              <p className="font-display font-bold text-forest text-sm leading-tight mt-0.5">
                {selectedSlot.subject.name} · {selectedSlot.level.label}
                <span className="text-sage font-normal">
                  {' '}· {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={() => selected && router.push(`/book/${selected}`)}
            className="bg-fern text-white font-display font-bold text-sm px-6 py-3 rounded-xl hover:bg-forest transition-colors whitespace-nowrap shadow-lg shadow-fern/25"
          >
            Book Trial · S${selectedSlot?.trial_fee}
          </button>
        </div>
      </div>

      {/* Spacer so page content isn't hidden behind sticky CTA */}
      {selected && <div className="h-20" />}
    </>
  )
}
