import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
  type BookingStatus,
} from '@/types/database'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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

export default async function MyBookingsPage() {
  // Auth gate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/centres')

  const admin = createAdminClient()

  // Find parent record
  const { data: parent } = await admin
    .from('parents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  // Fetch bookings with slot + centre info
  let bookings: any[] = []
  if (parent) {
    const { data } = await admin
      .from('bookings')
      .select(`
        *,
        trial_slots(*, subjects(*), levels(*), centres(*))
      `)
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: false })

    bookings = data ?? []
  }

  const userName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'there'

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display font-extrabold text-2xl text-forest mb-1">
        My Bookings
      </h1>
      <p className="text-sm text-sage mb-8">
        Hi {userName} — here are your trial class bookings.
      </p>

      {bookings.length === 0 ? (
        <div className="bg-paper border border-linen rounded-2xl p-8 text-center">
          <p className="text-sm text-sage mb-4">You haven&apos;t booked any trial classes yet.</p>
          <Link
            href="/centres"
            className="inline-flex items-center text-sm text-white bg-fern font-display font-bold rounded-xl px-5 py-2.5 hover:bg-forest transition-colors"
          >
            Browse centres
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const slot = booking.trial_slots
            const centre = slot?.centres
            const subject = slot?.subjects
            const level = slot?.levels
            const status = booking.status as BookingStatus
            const isUpcoming = slot && new Date(slot.date) >= new Date(new Date().toDateString())
            const isPast = !isUpcoming

            return (
              <div
                key={booking.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                  isPast ? 'border-linen opacity-75' : 'border-linen'
                }`}
              >
                {/* Status bar */}
                <div className="flex items-center justify-between px-5 py-3 bg-paper border-b border-linen">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-display font-bold px-2.5 py-1 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
                      {BOOKING_STATUS_LABEL[status]}
                    </span>
                    <span className="text-xs text-sage font-mono">{booking.booking_ref}</span>
                  </div>
                  {isUpcoming && (
                    <span className="text-xs bg-fern/10 text-fern font-display font-semibold px-2.5 py-1 rounded-full">
                      Upcoming
                    </span>
                  )}
                </div>

                {/* Booking details */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {centre && (
                        <Link
                          href={`/centres/${centre.slug}`}
                          className="font-display font-bold text-forest text-base hover:text-fern transition-colors"
                        >
                          {centre.name}
                        </Link>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {subject && (
                          <span className="text-xs bg-mint text-fern border border-fern/15 rounded-full px-2.5 py-0.5 font-medium">
                            {subject.name}
                          </span>
                        )}
                        {level && (
                          <span className="text-xs bg-cream text-sage rounded-full px-2.5 py-0.5">
                            {level.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-bold text-forest">
                        S${Number(booking.trial_fee_at_booking).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Date & time */}
                  {slot && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-sage">
                      <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {formatDate(slot.date)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </div>
                    </div>
                  )}

                  {/* Child info */}
                  <div className="mt-3 pt-3 border-t border-linen flex items-center gap-4 text-xs text-sage">
                    <span>Child: <span className="text-forest font-medium">{booking.child_name_at_booking}</span></span>
                    <span>Level: <span className="text-forest font-medium">{booking.child_level_at_booking}</span></span>
                  </div>

                  {/* Centre address for upcoming */}
                  {isUpcoming && centre?.address && (
                    <div className="mt-3 pt-3 border-t border-linen">
                      <p className="text-xs text-sage">
                        <span className="font-semibold text-forest">Address:</span> {centre.address}
                      </p>
                      {centre.nearest_mrt && (
                        <p className="text-xs text-sage mt-1">
                          <span className="font-semibold text-forest">MRT:</span> {centre.nearest_mrt}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
