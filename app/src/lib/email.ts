import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = 'Podsee <bookings@podsee.sg>'

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
  date: string // ISO date string
  startTime: string // HH:mm:ss
  endTime: string // HH:mm:ss
  trialFee: number
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podsee.sg'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#2d4a3e;letter-spacing:-0.3px;">Podsee</span>
    </div>

    <!-- Main card -->
    <div style="background:#ffffff;border:1px solid #e8e2d9;border-radius:16px;overflow:hidden;">

      <!-- Green header -->
      <div style="background:#4a7556;padding:24px 24px 20px;text-align:center;">
        <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:24px;">&#10003;</span>
        </div>
        <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 4px;">Trial class booked!</h1>
        <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0;">We'll confirm your spot within 1 business day.</p>
      </div>

      <!-- Booking ref -->
      <div style="padding:16px 24px;background:#faf8f5;border-bottom:1px solid #e8e2d9;text-align:center;">
        <span style="font-size:11px;color:#8a8477;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Booking Reference</span>
        <div style="font-size:18px;font-weight:700;color:#2d4a3e;letter-spacing:1px;margin-top:4px;">${bookingRef}</div>
      </div>

      <!-- Details -->
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;width:100px;">Centre</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;font-weight:600;">${centreName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Subject</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;">${subjectName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Date</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Time</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Child</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;">${childName} (${childLevel})</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Trial Fee</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;font-weight:600;">S$${trialFee.toFixed(0)}</td>
          </tr>
          ${centreAddress ? `
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8a8477;vertical-align:top;">Address</td>
            <td style="padding:8px 0;font-size:13px;color:#2d4a3e;">${centreAddress}${nearestMrt ? `<br/><span style="color:#8a8477;">Nearest MRT: ${nearestMrt}</span>` : ''}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- What happens next -->
      <div style="padding:0 24px 24px;">
        <div style="background:#eef6f0;border:1px solid rgba(74,117,86,0.1);border-radius:12px;padding:16px;">
          <p style="font-size:11px;color:#4a7556;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;margin:0 0 12px;">What happens next</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px 4px 0;font-size:13px;color:#4a7556;font-weight:700;vertical-align:top;width:16px;">1</td>
              <td style="padding:4px 0;font-size:13px;color:#5a6b5e;">Podsee contacts the centre to confirm your spot.</td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0;font-size:13px;color:#4a7556;font-weight:700;vertical-align:top;">2</td>
              <td style="padding:4px 0;font-size:13px;color:#5a6b5e;">You'll receive a confirmation with any preparation notes.</td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0;font-size:13px;color:#4a7556;font-weight:700;vertical-align:top;">3</td>
              <td style="padding:4px 0;font-size:13px;color:#5a6b5e;">After the trial, tell us if your child is enrolling — and earn a cash reward.</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- CTA -->
      <div style="padding:0 24px 24px;text-align:center;">
        <a href="${siteUrl}/my-bookings" style="display:inline-block;background:#2d4a3e;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:10px;">
          View My Bookings
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;font-size:11px;color:#8a8477;">
      <p style="margin:0;">&copy; 2026 Podsee. Singapore.</p>
      <p style="margin:4px 0 0;">
        <a href="${siteUrl}/centres/${centreSlug}" style="color:#4a7556;text-decoration:none;">View centre</a>
        &nbsp;&middot;&nbsp;
        <a href="${siteUrl}/my-bookings" style="color:#4a7556;text-decoration:none;">My bookings</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()

  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: parentEmail,
    subject: `Trial booked — ${centreName} on ${formattedDate}`,
    html,
  })

  if (error) {
    console.error('[email] Failed to send booking confirmation:', error)
  }
}

export async function sendCentreInvite({
  email,
  centreName,
}: {
  email: string
  centreName: string
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podsee.sg'

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
