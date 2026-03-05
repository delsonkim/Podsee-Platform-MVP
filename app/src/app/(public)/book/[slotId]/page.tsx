import { getSlotById, getAllLevels } from '@/lib/public-data'
import { getStreamDisplay } from '@/types/database'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import BookingForm from './BookingForm'
import { createClient } from '@/lib/supabase/server'

function centreGradient(slug: string): string {
  const gradients = [
    'from-forest/80 to-fern/60',
    'from-fern/70 to-mint',
    'from-forest to-sage/70',
    'from-sage/60 to-fern/80',
    'from-fern/80 to-forest/60',
  ]
  let hash = 0
  for (const ch of slug) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return gradients[Math.abs(hash) % gradients.length]
}

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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/centres`)

  const [slot, levels] = await Promise.all([
    getSlotById(slotId),
    Promise.resolve(getAllLevels()),
  ])

  if (!slot) notFound()

  const userProfile = {
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    email: user.email ?? '',
    phone: user.user_metadata?.phone ?? '',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <p className="text-xs text-sage mb-6 font-display">
        <Link href="/centres" className="hover:text-fern transition-colors">Browse</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/centres/${slot.centre.slug}`} className="hover:text-fern transition-colors">
          {slot.centre.name}
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-forest font-semibold">Complete booking</span>
      </p>

      {/* Desktop: 2-col | Mobile: single col */}
      <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-12 md:items-start">

        {/* Left col — slot summary (sticky on desktop) */}
        <div className="md:sticky md:top-24">
          <h1 className="font-display font-extrabold text-2xl text-forest mb-1">
            Book your trial class
          </h1>
          <p className="text-sm text-sage mb-6">
            We&apos;ll confirm your slot within 1 business day via email.
          </p>

          <div className="border border-linen rounded-2xl overflow-hidden">
            {/* Gradient banner */}
            <div className={`h-16 bg-gradient-to-br ${centreGradient(slot.centre.slug)}`} />

            <div className="p-5">
              <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
                Your trial
              </p>
              <dl className="space-y-2.5">
                {[
                  { label: 'Centre', value: slot.centre.name },
                  { label: 'Subject', value: slot.subject.name },
                  { label: 'Level', value: slot.level.label, stream: slot.stream },
                  { label: 'Date', value: formatDate(slot.date) },
                  { label: 'Time', value: `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}` },
                ].map(({ label, value, stream }) => {
                  const sd = stream ? getStreamDisplay(stream) : null
                  return (
                    <div key={label} className="flex justify-between text-sm gap-4">
                      <dt className="text-sage shrink-0">{label}</dt>
                      <dd className="font-medium text-forest text-right flex items-center gap-1.5">
                        <span>{value}</span>
                        {sd && <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${sd.color}`}>{sd.shortLabel}</span>}
                      </dd>
                    </div>
                  )
                })}
                <div className="flex justify-between pt-2.5 border-t border-linen">
                  <dt className="text-sm text-sage">Trial fee</dt>
                  <dd className="font-display font-bold text-lg text-forest">S${slot.trial_fee}</dd>
                </div>
              </dl>

              {slot.spots_remaining <= 3 && slot.spots_remaining > 0 && (
                <p className="text-xs text-red-600 font-display font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
                  Only {slot.spots_remaining} spot{slot.spots_remaining === 1 ? '' : 's'} left!
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Right col — booking form */}
        <div className="mt-8 md:mt-0">
          <BookingForm slot={slot} levels={levels} userProfile={userProfile} isPaidTrial={slot.centre.trial_type === 'paid'} paynowQrUrl={slot.centre.paynow_qr_image_url} />
        </div>
      </div>
    </div>
  )
}
