import Link from 'next/link'

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

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; centre?: string; subject?: string; date?: string; time?: string }>
}) {
  const { ref, centre, subject, date, time } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      {/* Check mark */}
      <div className="w-16 h-16 bg-mint rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a7556" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="font-display font-extrabold text-2xl text-forest mb-2">
        Your trial is confirmed!
      </h1>
      <p className="text-sm text-sage mb-8">
        You&apos;ll receive a confirmation email shortly with all the details.
      </p>

      {/* Booking summary card */}
      <div className="bg-paper border border-linen rounded-2xl px-6 py-5 mb-8 text-left">
        {ref && (
          <div className="text-center mb-4 pb-4 border-b border-linen">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-1">
              Booking reference
            </p>
            <p className="font-display font-bold text-xl text-forest tracking-wide">{ref}</p>
          </div>
        )}
        {(centre || subject || date) && (
          <dl className="space-y-2">
            {centre && (
              <div className="flex justify-between text-sm">
                <dt className="text-sage">Centre</dt>
                <dd className="font-medium text-forest">{centre}</dd>
              </div>
            )}
            {subject && (
              <div className="flex justify-between text-sm">
                <dt className="text-sage">Subject</dt>
                <dd className="font-medium text-forest">{subject}</dd>
              </div>
            )}
            {date && (
              <div className="flex justify-between text-sm">
                <dt className="text-sage">Date</dt>
                <dd className="font-medium text-forest">{formatDate(date)}</dd>
              </div>
            )}
            {time && (
              <div className="flex justify-between text-sm">
                <dt className="text-sage">Time</dt>
                <dd className="font-medium text-forest">{formatTime(time)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* What happens next */}
      <div className="bg-mint/50 border border-fern/10 rounded-2xl p-5 text-left mb-8">
        <p className="text-xs font-display font-semibold text-fern uppercase tracking-widest mb-4">
          What happens next
        </p>
        <ol className="space-y-3">
          {[
            'The centre has been notified — your spot is secured.',
            "Check your email for the centre's address and preparation notes.",
            'After the trial, let us know how it went!',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-sage">
              <span className="font-display font-bold text-fern shrink-0">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/my-bookings"
          className="inline-flex items-center justify-center text-sm text-white bg-fern font-display font-bold rounded-xl px-6 py-3 hover:bg-forest transition-colors shadow-lg shadow-fern/20"
        >
          View my bookings
        </Link>
        <Link
          href="/centres"
          className="inline-flex items-center justify-center text-sm text-sage border border-linen rounded-xl px-6 py-3 hover:bg-paper transition-colors font-display font-medium"
        >
          Browse more centres
        </Link>
      </div>
    </div>
  )
}
