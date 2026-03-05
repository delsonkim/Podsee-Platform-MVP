import { Resend } from 'resend'
import { SupabaseClient } from '@supabase/supabase-js'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = 'Podsee <bookings@podsee.sg>'

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://podsee-trial-platform.vercel.app'
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

// ─── Shared HTML builders ───

function emailShell(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#2d4a3e;letter-spacing:-0.3px;">Podsee</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;">
      ${content}
    </div>
    <div style="text-align:center;padding:24px 0;font-size:11px;color:#8a8477;">
      <p style="margin:0;">&copy; 2026 Podsee. Singapore.</p>
    </div>
  </div>
</body>
</html>`.trim()
}

function headerBlock(bg: string, title: string, subtitle: string, icon?: string) {
  return `
      <div style="background:${bg};padding:24px 24px 20px;text-align:center;">
        ${icon ? `<div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;"><span style="font-size:24px;">${icon}</span></div>` : ''}
        <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 4px;">${title}</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">${subtitle}</p>
      </div>`
}

function refBlock(bookingRef: string) {
  return `
      <div style="padding:16px 24px;background:#faf8f5;border-bottom:1px solid #e8e2d9;text-align:center;">
        <span style="font-size:11px;color:#8a8477;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Booking Reference</span>
        <div style="font-size:18px;font-weight:700;color:#2d4a3e;letter-spacing:1px;margin-top:4px;">${bookingRef}</div>
      </div>`
}

function detailRow(label: string, value: string) {
  return `
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;width:100px;">${label}</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;font-weight:500;">${value}</td>
          </tr>`
}

function detailsBlock(rows: string) {
  return `
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${rows}
        </table>
      </div>`
}

function stepsBlock(steps: string[], color = '#4a7556') {
  const rows = steps.map((s, i) => `
            <tr>
              <td style="padding:4px 8px 4px 0;font-size:13px;color:${color};font-weight:700;vertical-align:top;width:16px;">${i + 1}</td>
              <td style="padding:4px 0;font-size:13px;color:#5a6b5e;">${s}</td>
            </tr>`).join('')
  return `
      <div style="padding:0 24px 24px;">
        <div style="background:#eef6f0;border:1px solid rgba(74,117,86,0.1);border-radius:12px;padding:16px;">
          <p style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 12px;">What to do</p>
          <table style="width:100%;border-collapse:collapse;">
            ${rows}
          </table>
        </div>
      </div>`
}

function bodyText(text: string) {
  return `
      <div style="padding:24px 24px 0;">
        <p style="font-size:14px;color:#2d4a3e;line-height:1.6;margin:0;">${text}</p>
      </div>`
}

function noteBlock(text: string) {
  return `
      <div style="padding:0 24px 24px;">
        <p style="font-size:13px;color:#8a8477;line-height:1.5;margin:0;font-style:italic;">${text}</p>
      </div>`
}

function ctaBlock(label: string, url: string, bg = '#2d4a3e') {
  return `
      <div style="padding:0 24px 24px;text-align:center;">
        <a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:10px;">
          ${label}
        </a>
      </div>`
}

function footerLinks(links: { label: string; url: string }[]) {
  const items = links.map(l => `<a href="${l.url}" style="color:#4a7556;text-decoration:none;">${l.label}</a>`).join(' &nbsp;&middot;&nbsp; ')
  return `
      <div style="padding:0 24px 16px;text-align:center;font-size:11px;">
        ${items}
      </div>`
}

function earlyAdopterFooter(variant: 'parent' | 'centre') {
  const msg = variant === 'parent'
    ? "Thanks for being one of our earliest parents on Podsee. We're on a mission to help every parent in Singapore find the right tuition centre — your feedback means the world to us."
    : "Thank you for being one of our earliest partner centres. We're building Podsee to bring more families to your door — and we're just getting started."
  return noteBlock(msg)
}

async function sendEmail(to: string | string[], subject: string, html: string) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return
  }
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  })
  if (error) {
    console.error(`[email] Failed to send "${subject}":`, error)
  }
}

// ─── Shared data helpers ───

export async function fetchBookingEmailData(supabase: SupabaseClient, bookingId: string) {
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, booking_ref, status, payment_screenshot_url,
      parent_name_at_booking, parent_email_at_booking, parent_phone_at_booking,
      child_name_at_booking, child_level_at_booking, trial_fee_at_booking,
      trial_slot_id,
      trial_slots(date, start_time, end_time, subjects(name)),
      centres(id, name, slug, address, nearest_mrt, contact_email)
    `)
    .eq('id', bookingId)
    .single()
  return data as any
}

export async function fetchAdminEmails(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('admin_users').select('email')
  return (data ?? []).map((r: any) => r.email)
}

// ─── E1: Booking Confirmed → Centre ───

export async function sendCentreNewBooking(supabase: SupabaseClient, bookingId: string) {
  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return
  const centreEmail = b.centres?.contact_email
  if (!centreEmail) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const date = formatDate(s.date)
  const time = `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`

  const html = emailShell(
    headerBlock('#2d4a3e', "You've got a new booking!", 'A parent just booked a trial through Podsee.') +
    refBlock(b.booking_ref) +
    detailsBlock(
      detailRow('Parent', b.parent_name_at_booking) +
      detailRow('Phone', b.parent_phone_at_booking || '—') +
      detailRow('Email', b.parent_email_at_booking) +
      detailRow('Child', `${b.child_name_at_booking} (${b.child_level_at_booking})`) +
      detailRow('Subject', s.subjects?.name ?? '') +
      detailRow('Date', date) +
      detailRow('Time', time) +
      detailRow('Fee', `S$${Number(b.trial_fee_at_booking).toFixed(0)}`) +
      (b.payment_screenshot_url ? detailRow('Payment proof', `<a href="${b.payment_screenshot_url}" style="color:#4a7556;text-decoration:underline;">View screenshot</a>`) : '')
    ) +
    stepsBlock([
      `Save the date — the parent will be there on ${date} at ${time}.`,
      `If you need to reach them, their phone number is ${b.parent_phone_at_booking || 'not provided'}.`,
      ...(b.payment_screenshot_url ? ['Check the payment screenshot above to verify the trial fee was paid.'] : []),
      'After the trial, log in to your dashboard to mark attendance.',
    ]) +
    earlyAdopterFooter('centre') +
    ctaBlock('Go to Your Dashboard', `${siteUrl}/centre-dashboard/bookings`) +
    footerLinks([{ label: 'Your Dashboard', url: `${siteUrl}/centre-dashboard` }])
  )

  await sendEmail(centreEmail, `You've got a new trial booking! — ${b.booking_ref}`, html)
}

// ─── E2: Booking Confirmed → Parent (updated copy) ───

interface BookingEmailData {
  parentName: string
  parentEmail: string
  childName: string
  childLevel: string
  bookingRef: string
  centreName: string
  centreAddress: string | null
  centreSlug: string
  nearestMrt: string | null
  subjectName: string
  date: string
  startTime: string
  endTime: string
  trialFee: number
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const {
    parentName,
    parentEmail,
    childName,
    childLevel,
    bookingRef,
    centreName,
    centreAddress,
    centreSlug,
    nearestMrt,
    subjectName,
    date,
    startTime,
    endTime,
    trialFee,
  } = data

  const formattedDate = formatDate(date)
  const formattedTime = `${formatTime(startTime)} – ${formatTime(endTime)}`
  const siteUrl = getSiteUrl()

  const html = emailShell(
    headerBlock('#4a7556', "You're all set!", 'Your trial is confirmed — no further action needed.', '&#10003;') +
    refBlock(bookingRef) +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Subject', subjectName) +
      detailRow('Date', formattedDate) +
      detailRow('Time', formattedTime) +
      detailRow('Child', `${childName} (${childLevel})`) +
      detailRow('Trial Fee', `S$${trialFee.toFixed(0)}`) +
      (centreAddress ? detailRow('Address', `${centreAddress}${nearestMrt ? `<br/><span style="color:#8a8477;">Nearest MRT: ${nearestMrt}</span>` : ''}`) : '')
    ) +
    stepsBlock([
      'Show up and enjoy the class — your spot is confirmed.',
      'Need to change plans? You can reschedule or cancel anytime from My Bookings.',
      "After the trial, we'd love to hear how it went!",
    ]) +
    earlyAdopterFooter('parent') +
    ctaBlock('View My Bookings', `${siteUrl}/my-bookings`) +
    footerLinks([
      { label: 'My Bookings', url: `${siteUrl}/my-bookings` },
      { label: 'Browse Centres', url: `${siteUrl}/centres` },
    ])
  )

  await sendEmail(parentEmail, `You're all set! Trial at ${centreName} on ${formattedDate}`, html)
}

// ─── E3: Parent Cancels → Centre ───

export async function sendCentreBookingCancelled(supabase: SupabaseClient, bookingId: string) {
  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return
  const centreEmail = b.centres?.contact_email
  if (!centreEmail) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const date = formatDate(s.date)
  const time = `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`

  const html = emailShell(
    headerBlock('#2d4a3e', 'A booking has been cancelled', 'A parent has cancelled their upcoming trial.') +
    refBlock(b.booking_ref) +
    bodyText('Just a heads up — a parent has cancelled their upcoming trial. The spot has been freed up for other families.') +
    detailsBlock(
      detailRow('Parent', b.parent_name_at_booking) +
      detailRow('Child', `${b.child_name_at_booking} (${b.child_level_at_booking})`) +
      detailRow('Subject', s.subjects?.name ?? '') +
      detailRow('Date', date) +
      detailRow('Time', time)
    ) +
    noteBlock('No action needed — the slot is automatically available again for new bookings.') +
    ctaBlock('Go to Your Dashboard', `${siteUrl}/centre-dashboard/bookings`)
  )

  await sendEmail(centreEmail, `Heads up — a booking was cancelled (${b.booking_ref})`, html)
}

// ─── E4: Parent Reschedules → Centre ───

export async function sendCentreBookingRescheduled(
  supabase: SupabaseClient,
  oldBookingId: string,
  newBookingId: string,
) {
  const oldB = await fetchBookingEmailData(supabase, oldBookingId)
  const newB = await fetchBookingEmailData(supabase, newBookingId)
  if (!oldB || !newB) return
  const centreEmail = newB.centres?.contact_email
  if (!centreEmail) return

  const siteUrl = getSiteUrl()
  const oldS = oldB.trial_slots
  const newS = newB.trial_slots
  const oldDate = formatDate(oldS.date)
  const oldTime = `${formatTime(oldS.start_time)} – ${formatTime(oldS.end_time)}`
  const newDate = formatDate(newS.date)
  const newTime = `${formatTime(newS.start_time)} – ${formatTime(newS.end_time)}`

  const html = emailShell(
    headerBlock('#2d4a3e', 'A booking has been rescheduled', 'A parent has moved their trial to a different slot.') +
    refBlock(newB.booking_ref) +
    bodyText('A parent has moved their trial to a different slot. The old slot has been freed up. Here are the updated details:') +
    detailsBlock(
      detailRow('Parent', newB.parent_name_at_booking) +
      detailRow('Child', `${newB.child_name_at_booking} (${newB.child_level_at_booking})`) +
      detailRow('Subject', newS.subjects?.name ?? '') +
      detailRow('Was', `${oldDate}, ${oldTime}`) +
      detailRow('Now', `<strong>${newDate}, ${newTime}</strong>`) +
      detailRow('Old Ref', oldB.booking_ref) +
      detailRow('New Ref', `<strong>${newB.booking_ref}</strong>`)
    ) +
    stepsBlock([
      `Update your records — the parent will now attend on ${newDate} at ${newTime}.`,
      'The old slot is available again for new bookings.',
    ]) +
    ctaBlock('Go to Your Dashboard', `${siteUrl}/centre-dashboard/bookings`)
  )

  await sendEmail(centreEmail, `Booking rescheduled — ${newB.booking_ref}`, html)
}

// ─── E5: Centre Cancels → Parent ───

export async function sendParentTrialCancelled(supabase: SupabaseClient, bookingId: string, reason: string) {
  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const date = formatDate(s.date)
  const time = `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`
  const centreName = b.centres?.name ?? ''

  const html = emailShell(
    headerBlock('#4a7556', 'Your trial has been cancelled', `We're sorry — ${centreName} has had to cancel your upcoming trial.`) +
    refBlock(b.booking_ref) +
    bodyText(`Here's what they shared:`) +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Subject', s.subjects?.name ?? '') +
      detailRow('Date', date) +
      detailRow('Time', time) +
      detailRow('Reason', reason)
    ) +
    bodyText("Don't worry — there are other great centres on Podsee. Browse available trials and find one that works for you.") +
    `<div style="height:16px;"></div>` +
    ctaBlock('Browse Other Trials', `${siteUrl}/centres`, '#4a7556') +
    footerLinks([
      { label: 'My Bookings', url: `${siteUrl}/my-bookings` },
      { label: 'Browse Centres', url: `${siteUrl}/centres` },
    ])
  )

  await sendEmail(b.parent_email_at_booking, `Update on your trial — ${b.booking_ref}`, html)
}

// ─── E6: Centre Marks Attended → Parent ───

export async function sendParentTrialCompleted(supabase: SupabaseClient, bookingId: string) {
  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const date = formatDate(s.date)
  const centreName = b.centres?.name ?? ''

  const html = emailShell(
    headerBlock('#4a7556', 'Hope the trial went well!', `Your trial at ${centreName} has been marked as attended.`) +
    refBlock(b.booking_ref) +
    bodyText("We'd love to hear how it went — your feedback helps other parents make better decisions, and helps us improve Podsee for everyone.") +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Subject', s.subjects?.name ?? '') +
      detailRow('Date', date)
    ) +
    stepsBlock([
      'Head to My Bookings and find this trial.',
      'Leave a quick rating and tell us what you thought.',
      'Let us know if your child is enrolling — it only takes a moment.',
    ]) +
    earlyAdopterFooter('parent') +
    ctaBlock('Share Your Experience', `${siteUrl}/my-bookings`) +
    footerLinks([
      { label: 'My Bookings', url: `${siteUrl}/my-bookings` },
      { label: 'Browse Centres', url: `${siteUrl}/centres` },
    ])
  )

  await sendEmail(b.parent_email_at_booking, `How was the trial at ${centreName}? — ${b.booking_ref}`, html)
}

// ─── E7: No-Show → Admin ───

export async function sendAdminNoShowAlert(supabase: SupabaseClient, bookingId: string) {
  const admins = await fetchAdminEmails(supabase)
  if (admins.length === 0) return

  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const date = formatDate(s.date)
  const centreName = b.centres?.name ?? ''

  const html = emailShell(
    headerBlock('#b45309', 'No-Show Alert', 'A centre has flagged a no-show.') +
    refBlock(b.booking_ref) +
    bodyText('A centre has flagged a no-show. The booking has been auto-flagged for your review.') +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Parent', `${b.parent_name_at_booking} (${b.parent_email_at_booking})`) +
      detailRow('Child', `${b.child_name_at_booking} (${b.child_level_at_booking})`) +
      detailRow('Subject', s.subjects?.name ?? '') +
      detailRow('Date', date)
    ) +
    ctaBlock('Review Booking', `${siteUrl}/admin/bookings/${bookingId}`)
  )

  await sendEmail(admins, `No-show flagged — ${b.booking_ref}`, html)
}

// ─── E8: Centre Marks Enrolled → Admin ───

export async function sendAdminConversionAlert(supabase: SupabaseClient, bookingId: string) {
  const admins = await fetchAdminEmails(supabase)
  if (admins.length === 0) return

  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const centreName = b.centres?.name ?? ''

  const html = emailShell(
    headerBlock('#4a7556', 'Conversion!', 'A centre has confirmed a student enrolled after their trial.') +
    refBlock(b.booking_ref) +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Parent', `${b.parent_name_at_booking} (${b.parent_email_at_booking})`) +
      detailRow('Child', `${b.child_name_at_booking} (${b.child_level_at_booking})`) +
      detailRow('Subject', s.subjects?.name ?? '')
    ) +
    ctaBlock('View Booking', `${siteUrl}/admin/bookings/${bookingId}`)
  )

  await sendEmail(admins, `New conversion — ${b.booking_ref}`, html)
}

// ─── E9: Parent Disputes → Admin ───

export async function sendAdminDisputeAlert(supabase: SupabaseClient, bookingId: string) {
  const admins = await fetchAdminEmails(supabase)
  if (admins.length === 0) return

  const b = await fetchBookingEmailData(supabase, bookingId)
  if (!b) return

  const siteUrl = getSiteUrl()
  const s = b.trial_slots
  const centreName = b.centres?.name ?? ''

  const html = emailShell(
    headerBlock('#dc2626', 'Dispute Filed', "A parent has disputed the centre's enrollment claim.") +
    refBlock(b.booking_ref) +
    bodyText('A parent has disputed the centre\'s enrollment claim. The booking is flagged for your review.') +
    detailsBlock(
      detailRow('Centre', centreName) +
      detailRow('Parent', `${b.parent_name_at_booking} (${b.parent_email_at_booking})`) +
      detailRow('Child', `${b.child_name_at_booking} (${b.child_level_at_booking})`) +
      detailRow('Subject', s.subjects?.name ?? '')
    ) +
    ctaBlock('Review Booking', `${siteUrl}/admin/bookings/${bookingId}`)
  )

  await sendEmail(admins, `Enrollment dispute — ${b.booking_ref}`, html)
}

// ─── Centre Invite (unchanged) ───

export async function sendCentreInvite({
  email,
  centreName,
}: {
  email: string
  centreName: string
}) {
  const siteUrl = getSiteUrl()

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#2d4a3e;letter-spacing:-0.3px;">Podsee</span>
    </div>

    <div style="background:#ffffff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;">
      <div style="background:#2d4a3e;padding:24px 24px 20px;text-align:center;">
        <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 4px;">Welcome to Podsee!</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">Your centre dashboard is ready.</p>
      </div>

      <div style="padding:24px;">
        <p style="font-size:14px;color:#2d4a3e;line-height:1.6;margin:0 0 16px;">
          <strong>${centreName}</strong> has been added to the Podsee platform. You can now access your centre dashboard to view trial bookings, track leads, and monitor slot capacity.
        </p>
        <p style="font-size:14px;color:#2d4a3e;line-height:1.6;margin:0 0 24px;">
          Sign in with your Google account (<strong>${email}</strong>) to get started:
        </p>
        <div style="text-align:center;">
          <a href="${siteUrl}/centre-dashboard" style="display:inline-block;background:#4a7556;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:10px;">
            Sign in to your Dashboard
          </a>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0;font-size:11px;color:#8a8477;">
      <p style="margin:0;">&copy; 2026 Podsee. Singapore.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping centre invite email')
    return
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${centreName} — Your Podsee centre dashboard is ready`,
    html,
  })

  if (error) {
    console.error('[email] Failed to send centre invite:', error)
  }
}
