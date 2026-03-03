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

/* Expected statuses that don't need a visible badge (reduces parent anxiety) */
const QUIET_STATUSES: BookingStatus[] = ['pending', 'confirmed']

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/centres')

  const admin = createAdminClient()

  const { data: parent } = await admin
    .from('parents')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

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

  // Split bookings into upcoming and past
  const today = new Date(new Date().toDateString())
  const upcoming = bookings.filter((b: any) => b.trial_slots && new Date(b.trial_slots.date) >= today)
  const past = bookings.filter((b: any) => !b.trial_slots || new Date(b.trial_slots.date) < today)

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display font-extrabold text-2xl text-forest mb-1">
        My Bookings
      </h1>
      <p className="text-sm text-sage mb-8">
        Hi {userName} — {upcoming.length > 0
          ? `you have ${upcoming.length} upcoming trial${upcoming.length === 1 ? '' : 's'}.`
          : 'here are your trial class bookings.'}
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
        <div className="space-y-8">
          {/* Upcoming section */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
                Upcoming
              </p>
              <div className="space-y-4">
                {upcoming.map((booking: any) => (
                  <BookingCard key={booking.id} booking={booking} variant="upcoming" />
                ))}
              </div>
            </div>
          )}

          {/* No upcoming CTA */}
          {upcoming.length === 0 && (
            <div className="bg-mint/30 border border-fern/10 rounded-2xl p-6 text-center">
              <p className="text-sm text-sage mb-3">No upcoming trials.</p>
              <Link
                href="/centres"
                className="inline-flex items-center text-sm text-fern font-display font-semibold hover:underline"
              >
                Browse centres to book your next trial →
              </Link>
            </div>
          )}

          {/* Past section */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
                Past bookings
              </p>
              <div className="space-y-4">
                {past.map((booking: any) => (
                  <BookingCard key={booking.id} booking={booking} variant="past" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking, variant }: { booking: any; variant: 'upcoming' | 'past' }) {
  const slot = booking.trial_slots
  const centre = slot?.centres
  const subject = slot?.subjects
  const level = slot?.levels
  const status = booking.status as BookingStatus
  const showBadge = !QUIET_STATUSES.includes(status)

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
        variant === 'upcoming'
          ? 'border-linen border-l-4 border-l-fern'
          : 'border-linen opacity-60'
      }`}
    >
      <div className="px-5 py-4">
        {/* Centre name + status badge */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            {centre && (
              <Link
                href={`/centres/${centre.slug}`}
                className="font-display font-bold text-forest text-base hover:text-fern transition-colors"
              >
                {centre.name}
              </Link>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
            {showBadge && (
              <span className={`text-xs font-display font-bold px-2.5 py-1 rounded-full ${BOOKING_STATUS_COLOR[status]}`}>
                {BOOKING_STATUS_LABEL[status]}
              </span>
            )}
            <p className="font-display font-bold text-forest mt-1">
              S${Number(booking.trial_fee_at_booking).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Date & time — prominent */}
        {slot && (
          <div className="flex items-center gap-4 text-sm mt-3">
            <div className="flex items-center gap-1.5 text-forest font-display font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatDate(slot.date)}
            </div>
            <div className="flex items-center gap-1.5 text-forest font-display font-semibold">
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

        {/* Centre address for upcoming — in a sub-card */}
        {variant === 'upcoming' && centre?.address && (
          <div className="mt-3 bg-paper rounded-lg p-3">
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

        {/* Booking ref — bottom, muted */}
        <p className="text-xs text-sage/50 mt-3 font-mono">
          Ref: {booking.booking_ref}
        </p>
      </div>
    </div>
  )
}
