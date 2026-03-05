'use client'

import { useRef, useState, useTransition } from 'react'
import { submitBooking } from './actions'
import { uploadPaymentScreenshot } from './upload-actions'
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
  userProfile,
  isPaidTrial,
  paynowQrUrl,
}: {
  slot: SlotDetail
  levels: Level[]
  userProfile: { name: string; email: string; phone: string }
  isPaidTrial: boolean
  paynowQrUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Screenshot upload state
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [screenshotUploading, setScreenshotUploading] = useState(false)
  const [screenshotError, setScreenshotError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotError(null)
    setScreenshotUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadPaymentScreenshot(fd)
      if ('error' in result) {
        setScreenshotError(result.error)
      } else {
        setScreenshotUrl(result.url)
      }
    } catch {
      setScreenshotError('Upload failed. Please try again.')
    } finally {
      setScreenshotUploading(false)
    }
  }

  function removeScreenshot() {
    setScreenshotUrl(null)
    setScreenshotError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setAttempted(true)

    if (isPaidTrial && !screenshotUrl) return

    const formData = new FormData(e.currentTarget)
    if (screenshotUrl) formData.set('payment_screenshot_url', screenshotUrl)

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

      {/* Logged-in user info from Google */}
      <div className="bg-mint/50 border border-fern/10 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-fern rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
          {userProfile.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-forest text-sm truncate">
            {userProfile.name}
          </p>
          <p className="text-xs text-sage truncate">
            {userProfile.email} · <span className="text-sage/60">Signed in via Google</span>
          </p>
        </div>
      </div>

      {/* Hidden fields for parent info (from Google) */}
      <input type="hidden" name="parent_name" value={userProfile.name} />
      <input type="hidden" name="parent_email" value={userProfile.email} />

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

      <Field label="Phone number" required>
        <input
          type="tel"
          name="parent_phone"
          required
          defaultValue={userProfile.phone}
          placeholder="+65 9123 4567"
          className={inputClass}
        />
        <p className="text-xs text-sage/60 mt-1">We&apos;ll only contact you about this booking</p>
      </Field>

      {/* PayNow QR code — paid trials only */}
      {isPaidTrial && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-display font-semibold text-amber-700 uppercase tracking-widest mb-1">
            Payment via PayNow
          </p>
          <p className="text-sm text-amber-800 mb-3">
            Scan the QR code below to pay <span className="font-bold">S${slot.trial_fee}</span> to {slot.centre.name}.
          </p>
          <div className="flex justify-center">
            {paynowQrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={paynowQrUrl}
                alt="PayNow QR code"
                width={180}
                height={180}
                className="rounded-lg border border-amber-200"
              />
            ) : (
              <div className="w-40 h-40 sm:w-[180px] sm:h-[180px] rounded-lg border-2 border-dashed border-amber-300 flex items-center justify-center">
                <p className="text-xs text-amber-600 text-center px-3">QR code pending — contact the centre for PayNow details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment screenshot upload — paid trials only */}
      {isPaidTrial && (
        <div className="space-y-2">
          <label className="block text-xs font-display font-semibold text-forest uppercase tracking-wide">
            Payment screenshot <span className="text-red-400 ml-0.5">*</span>
          </label>

          {!screenshotUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-colors ${
                attempted && !screenshotUrl
                  ? 'border-red-300 bg-red-50'
                  : 'border-linen hover:border-fern/40 hover:bg-mint/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="hidden"
              />
              {screenshotUploading ? (
                <p className="text-sm text-sage">Uploading…</p>
              ) : (
                <>
                  <svg className="mx-auto mb-2 text-sage/50" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm text-sage">Tap to upload your PayNow screenshot</p>
                  <p className="text-xs text-sage/50 mt-1">JPG, PNG — max 5MB</p>
                </>
              )}
            </div>
          ) : (
            <div className="relative border border-linen rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt="Payment screenshot"
                className="w-full max-h-48 object-contain rounded-lg"
              />
              <button
                type="button"
                onClick={removeScreenshot}
                className="mt-2 text-xs text-red-600 hover:text-red-800 font-display font-semibold"
              >
                Remove and re-upload
              </button>
            </div>
          )}

          {screenshotError && (
            <p className="text-xs text-red-600">{screenshotError}</p>
          )}
          {attempted && !screenshotUrl && !screenshotError && (
            <p className="text-xs text-red-600">Please upload your payment screenshot</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || (isPaidTrial && !screenshotUrl)}
        className="w-full bg-fern text-white text-sm font-display font-bold py-4 rounded-xl hover:bg-forest transition-colors disabled:opacity-60 shadow-lg shadow-fern/20"
      >
        {isPending ? 'Submitting…' : `Confirm booking · S$${slot.trial_fee}`}
      </button>

      <p className="text-xs text-sage text-center leading-relaxed">
        By booking, you agree that Podsee will share your details with the centre to arrange your
        trial class.
      </p>

      {/* Referral source — optional, secondary */}
      <div className="pt-3 border-t border-linen">
        <label className="block text-xs font-display text-sage mb-1.5">
          How did you hear about Podsee? <span className="text-sage/50">(optional)</span>
        </label>
        <select name="referral_source" className={inputClass}>
          <option value="">Select an option</option>
          {REFERRAL_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    </form>
  )
}
