import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CentreBookingActions from './CentreBookingActions'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default async function CentreBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { centreId } = await requireCentreUser()
  const { id } = await params

  const supabase = createAdminClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, trial_slots(date, start_time, end_time, trial_fee, subjects(name), levels(label))')
    .eq('id', id)
    .eq('centre_id', centreId)
    .single()

  if (!booking) {
    notFound()
  }

  const slot = booking.trial_slots as any

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/centre-dashboard/bookings" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Booking {booking.booking_ref}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submitted {formatDate(booking.created_at)}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BOOKING_STATUS_COLOR[booking.status as BookingStatus]}`}>
          {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Parent info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Parent Details</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{' '}
              <span className="text-gray-800 font-medium">{booking.parent_name_at_booking}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="text-gray-800">{booking.parent_email_at_booking}</span>
            </div>
            {booking.parent_phone_at_booking && (
              <div>
                <span className="text-gray-500">Phone:</span>{' '}
                <span className="text-gray-800">{booking.parent_phone_at_booking}</span>
              </div>
            )}
          </div>
        </div>

        {/* Child info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Child Details</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{' '}
              <span className="text-gray-800 font-medium">{booking.child_name_at_booking}</span>
            </div>
            <div>
              <span className="text-gray-500">Level:</span>{' '}
              <span className="text-gray-800">{booking.child_level_at_booking}</span>
            </div>
          </div>
        </div>

        {/* Trial slot info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3 md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Trial Class</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Subject</span>
              <span className="text-gray-800 font-medium">{slot?.subjects?.name ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Level</span>
              <span className="text-gray-800">{slot?.levels?.label ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Date</span>
              <span className="text-gray-800">{slot?.date ? formatDate(slot.date) : '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Time</span>
              <span className="text-gray-800">
                {slot?.start_time && slot?.end_time
                  ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Trial Fee</span>
              <span className="text-gray-800 font-medium">S${Number(booking.trial_fee_at_booking).toFixed(2)}</span>
            </div>
            {booking.referral_source && (
              <div>
                <span className="text-gray-500 block">Referral Source</span>
                <span className="text-gray-800">{booking.referral_source}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Centre actions */}
      <CentreBookingActions
        bookingId={booking.id}
        status={booking.status}
        trialDate={slot?.date ?? null}
      />
    </div>
  )
}
