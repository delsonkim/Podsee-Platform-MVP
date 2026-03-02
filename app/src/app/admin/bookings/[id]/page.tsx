import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BOOKING_STATUS_COLOR, BOOKING_STATUS_LABEL, type BookingStatus } from '@/types/database'
import { StatusActions, FlagActions, NotesForm } from './BookingActions'

async function getBooking(id: string) {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        centres(name, area, address),
        trial_slots(date, start_time, end_time, trial_fee, subjects(name), levels(label))
      `)
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await getBooking(id)

  if (!booking) notFound()

  const slot = (booking as any).trial_slots
  const centre = (booking as any).centres

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/bookings" className="text-sm text-gray-400 hover:text-gray-600">← Bookings</Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1 font-mono">{booking.booking_ref}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submitted {formatDateTime(booking.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BOOKING_STATUS_COLOR[booking.status as BookingStatus]}`}>
            {BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
          </span>
          {booking.is_flagged && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">⚑ Flagged</span>
          )}
        </div>
      </div>

      {/* Status actions */}
      {['pending', 'confirmed'].includes(booking.status) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Status Actions</p>
          <StatusActions bookingId={booking.id} status={booking.status as BookingStatus} />
          {booking.acknowledged_at && (
            <p className="text-xs text-gray-400 mt-2">Acknowledged {formatDateTime(booking.acknowledged_at)}</p>
          )}
        </div>
      )}

      {/* Parent & Child */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Parent</p>
        <dl>
          <Row label="Name" value={booking.parent_name_at_booking} />
          <Row label="Email" value={booking.parent_email_at_booking} />
          <Row label="Phone" value={booking.parent_phone_at_booking} />
          <Row label="Referral source" value={booking.referral_source} />
        </dl>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 mt-4">Child</p>
        <dl>
          <Row label="Name" value={booking.child_name_at_booking} />
          <Row label="Level" value={booking.child_level_at_booking} />
        </dl>
      </div>

      {/* Trial slot */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trial Slot</p>
        <dl>
          <Row label="Centre" value={centre?.name} />
          <Row label="Area" value={centre?.area} />
          <Row label="Address" value={centre?.address} />
          <Row label="Subject" value={slot?.subjects?.name} />
          <Row label="Level" value={slot?.levels?.label} />
          <Row label="Date" value={slot?.date ? formatDate(slot.date) : null} />
          <Row label="Time" value={slot ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}` : null} />
          <Row label="Fee (at booking)" value={`S$${Number(booking.trial_fee_at_booking).toFixed(2)}`} />
        </dl>
      </div>

      {/* Flag */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Flag</p>
        <FlagActions bookingId={booking.id} isFlagged={booking.is_flagged} flagReason={booking.flag_reason} />
      </div>

      {/* Admin notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Admin Notes</p>
        <NotesForm bookingId={booking.id} adminNotes={booking.admin_notes} />
      </div>
    </div>
  )
}
