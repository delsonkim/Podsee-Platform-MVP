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
        centres(name, area, address, trial_commission_rate, conversion_commission_rate),
        trial_slots(date, start_time, end_time, trial_fee, subjects(name), levels(label))
      `)
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

async function getRescheduledPair(booking: any) {
  const supabase = createAdminClient()

  // If this booking was rescheduled FROM another, fetch the old one
  let rescheduledFrom = null
  if (booking.rescheduled_from) {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_ref, trial_slots(date, start_time, end_time, subjects(name), levels(label))')
      .eq('id', booking.rescheduled_from)
      .single()
    rescheduledFrom = data
  }

  // If this booking was rescheduled TO a new one, fetch it
  let rescheduledTo = null
  if (booking.cancelled_by === 'reschedule') {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_ref, trial_slots(date, start_time, end_time, subjects(name), levels(label))')
      .eq('rescheduled_from', booking.id)
      .single()
    rescheduledTo = data
  }

  return { rescheduledFrom, rescheduledTo }
}

async function getCommissions(bookingId: string) {
  const supabase = createAdminClient()
  const { data: outcome } = await supabase
    .from('trial_outcomes')
    .select('id')
    .eq('booking_id', bookingId)
    .single()
  if (!outcome) return { trial: null, conversion: null }

  const { data: commissions } = await supabase
    .from('commissions')
    .select('commission_type, commission_amount')
    .eq('trial_outcome_id', outcome.id)

  const trial = commissions?.find((c: any) => c.commission_type === 'trial')
  const conversion = commissions?.find((c: any) => c.commission_type === 'conversion')
  return {
    trial: trial ? Number(trial.commission_amount) : null,
    conversion: conversion ? Number(conversion.commission_amount) : null,
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
  const { rescheduledFrom, rescheduledTo } = await getRescheduledPair(booking)
  const isRescheduled = booking.status === 'cancelled' && booking.cancelled_by === 'reschedule'
  const showCommission = ['completed', 'converted'].includes(booking.status)
  const commissions = showCommission ? await getCommissions(booking.id) : { trial: null, conversion: null }

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
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isRescheduled ? 'bg-blue-50 text-blue-600' : BOOKING_STATUS_COLOR[booking.status as BookingStatus]
          }`}>
            {isRescheduled ? 'Rescheduled' : BOOKING_STATUS_LABEL[booking.status as BookingStatus]}
          </span>
          {booking.is_flagged && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">⚑ Flagged</span>
          )}
        </div>
      </div>

      {/* Status actions */}
      {booking.status === 'confirmed' && (
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

      {/* Cancellation info */}
      {booking.status === 'cancelled' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cancellation</p>
          <dl>
            <Row label="Cancelled by" value={
              booking.cancelled_by === 'parent' ? 'Parent' :
              booking.cancelled_by === 'centre' ? 'Centre' :
              booking.cancelled_by === 'reschedule' ? 'Reschedule' :
              booking.cancelled_by ?? '—'
            } />
            <Row label="Cancelled at" value={booking.cancelled_at ? formatDateTime(booking.cancelled_at) : null} />
            {booking.cancel_reason && <Row label="Reason" value={booking.cancel_reason} />}
          </dl>
        </div>
      )}

      {/* Reschedule pair */}
      {(rescheduledFrom || rescheduledTo) && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-3">Reschedule History</p>
          {rescheduledFrom && (() => {
            const fromSlot = (rescheduledFrom as any).trial_slots
            return (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Rescheduled from:</span>
                <Link href={`/admin/bookings/${(rescheduledFrom as any).id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {(rescheduledFrom as any).booking_ref}
                </Link>
                {fromSlot && (
                  <span className="text-gray-500 text-xs">
                    ({formatDate(fromSlot.date)} {formatTime(fromSlot.start_time)} — {fromSlot.subjects?.name} {fromSlot.levels?.label})
                  </span>
                )}
              </div>
            )
          })()}
          {rescheduledTo && (() => {
            const toSlot = (rescheduledTo as any).trial_slots
            return (
              <div className="flex items-center gap-3 text-sm mt-2">
                <span className="text-gray-500">Rescheduled to:</span>
                <Link href={`/admin/bookings/${(rescheduledTo as any).id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {(rescheduledTo as any).booking_ref}
                </Link>
                {toSlot && (
                  <span className="text-gray-500 text-xs">
                    ({formatDate(toSlot.date)} {formatTime(toSlot.start_time)} — {toSlot.subjects?.name} {toSlot.levels?.label})
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Commission (read-only — auto-created when rates are set) */}
      {showCommission && (commissions.trial !== null || commissions.conversion !== null) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Commission</p>
          <div className="space-y-2">
            {commissions.trial !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Trial</span>
                <span className="text-sm font-medium text-gray-900">S${commissions.trial.toFixed(2)}</span>
              </div>
            )}
            {commissions.conversion !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Conversion</span>
                <span className="text-sm font-medium text-gray-900">S${commissions.conversion.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment screenshot */}
      {booking.payment_screenshot_url && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Payment Screenshot</p>
          <a href={booking.payment_screenshot_url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={booking.payment_screenshot_url}
              alt="Payment screenshot"
              className="max-w-xs rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
            />
          </a>
        </div>
      )}

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
