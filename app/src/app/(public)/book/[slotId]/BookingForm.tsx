'use client'

import { useRef, useState, useTransition } from 'react'
import { submitBooking } from './actions'
import type { Level } from '@/types/database'
import type { SlotDetail } from '@/lib/public-data'

const REFERRAL_OPTIONS = [
  'Google Search',
  'Facebook / Instagram',
  'Friend or family',
  'School notice',
  'Other',
]

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-display font-semibold text-forest uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full text-sm border border-linen rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-fern/30 bg-white text-forest placeholder:text-sage/50'

export default function BookingForm({
  slot,
  levels,
}: {
  slot: SlotDetail
  levels: Level[]
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await submitBooking(formData)
      } catch (err: unknown) {
        // Redirect errors must be re-thrown so Next.js can navigate
        if (err && typeof err === 'object' && 'digest' in err) throw err
        if (err instanceof Error) setError(err.message)
      }
    })
  }

  const primaryLevels = levels.filter((l) => l.level_group === 'primary')
  const secondaryLevels = levels.filter((l) => l.level_group === 'secondary')

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="slot_id" value={slot.id} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Child's name" required>
          <input
            type="text"
            name="child_name"
            required
            placeholder="E.g. Jamie Tan"
            className={inputClass}
          />
        </Field>

        <Field label="Child's level" required>
          <select name="child_level" required className={inputClass}>
            <option value="">Select level</option>
            <optgroup label="Primary">
              {primaryLevels.map((l) => (
                <option key={l.id} value={l.code}>{l.label}</option>
              ))}
            </optgroup>
            <optgroup label="Secondary">
              {secondaryLevels.map((l) => (
                <option key={l.id} value={l.code}>{l.label}</option>
              ))}
            </optgroup>
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Your name" required>
          <input
            type="text"
            name="parent_name"
            required
            placeholder="E.g. Sarah Tan"
            className={inputClass}
          />
        </Field>

        <Field label="Phone number" required>
          <input
            type="tel"
            name="parent_phone"
            required
            placeholder="+65 9123 4567"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Email address" required>
        <input
          type="email"
          name="parent_email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>

      <Field label="How did you hear about Podsee?">
        <select name="referral_source" className={inputClass}>
          <option value="">Select an option</option>
          {REFERRAL_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </Field>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-fern text-white text-sm font-display font-bold py-3.5 rounded-xl hover:bg-forest transition-colors disabled:opacity-60 shadow-lg shadow-fern/20"
      >
        {isPending ? 'Submitting…' : `Confirm booking · S$${slot.trial_fee}`}
      </button>

      <p className="text-xs text-sage text-center leading-relaxed">
        By booking, you agree that Podsee will share your details with the centre to arrange your
        trial class.
      </p>
    </form>
  )
}
