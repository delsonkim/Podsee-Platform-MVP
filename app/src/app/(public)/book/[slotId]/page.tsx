import { getSlotById, getAllLevels } from '@/lib/public-data'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import BookingForm from './BookingForm'
import { createClient } from '@/lib/supabase/server'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:${m}${ampm}`
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slotId: string }>
}) {
  const { slotId } = await params

  // Auth gate: must be logged in to book
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // This shouldn't normally happen (CentreSlots redirects to OAuth first),
    // but just in case someone hits the URL directly
    redirect(`/centres`)
  }

  const [slot, levels] = await Promise.all([
    getSlotById(slotId),
    Promise.resolve(getAllLevels()),
  ])

  if (!slot) notFound()

  // Extract user info from Google profile for pre-filling
  const userProfile = {
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    email: user.email ?? '',
    phone: user.user_metadata?.phone ?? '',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/centres/${slot.centre.slug}`}
          className="w-8 h-8 rounded-lg border border-linen bg-white flex items-center justify-center text-forest text-sm hover:bg-paper transition-colors shrink-0"
          aria-label="Back"
        >
          ←
        </Link>
        <div>
          <p className="text-xs text-sage">Booking Trial</p>
          <p className="font-display font-bold text-forest text-sm">{slot.centre.name}</p>
        </div>
      </div>

      {/* Desktop: 2-col | Mobile: single col */}
      <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-12 md:items-start">

        {/* Left col — heading + slot summary (sticky on desktop) */}
        <div className="md:sticky md:top-24">
          <h1 className="font-display font-extrabold text-2xl text-forest mb-1">
            Book your trial class
          </h1>
          <p className="text-sm text-sage mb-6">
            We&apos;ll confirm your slot within 1 business day via email.
          </p>

          <div className="bg-paper border border-linen rounded-2xl p-5">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Your trial
            </p>
            <dl className="space-y-2.5">
              {[
                { label: 'Centre', value: slot.centre.name },
                { label: 'Subject', value: slot.subject.name },
                { label: 'Level', value: slot.level.label },
                { label: 'Date', value: formatDate(slot.date) },
                { label: 'Time', value: `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm gap-4">
                  <dt className="text-sage shrink-0">{label}</dt>
                  <dd className="font-medium text-forest text-right">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2.5 border-t border-linen">
                <dt className="text-sage">Trial fee</dt>
                <dd className="font-display font-bold text-forest">S${slot.trial_fee}</dd>
              </div>
            </dl>
            {slot.spots_remaining <= 1 && slot.spots_remaining > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                Only {slot.spots_remaining} spot left for this session
              </p>
            )}
          </div>
        </div>

        {/* Right col — booking form */}
        <div className="mt-8 md:mt-0">
          <BookingForm slot={slot} levels={levels} userProfile={userProfile} />
        </div>
      </div>
    </div>
  )
}
