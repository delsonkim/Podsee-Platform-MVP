import Link from 'next/link'

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      {/* Check mark */}
      <div className="w-16 h-16 bg-mint rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a7556" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="font-display font-extrabold text-2xl text-forest mb-2">
        Your trial is booked
      </h1>
      <p className="text-sm text-sage mb-8">
        We&apos;ll confirm your slot within 1 business day via email.
      </p>

      {ref && (
        <div className="bg-paper border border-linen rounded-2xl px-6 py-5 mb-8 inline-block">
          <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-2">
            Booking reference
          </p>
          <p className="font-display font-bold text-xl text-forest tracking-wide">{ref}</p>
        </div>
      )}

      {/* What happens next */}
      <div className="bg-mint/50 border border-fern/10 rounded-2xl p-5 text-left mb-8">
        <p className="text-xs font-display font-semibold text-fern uppercase tracking-widest mb-4">
          What happens next
        </p>
        <ol className="space-y-3">
          {[
            'Podsee contacts the centre to confirm your spot.',
            "You'll receive a confirmation email with the centre's address and any preparation notes.",
            'After the trial, let us know if your child is enrolling — and earn a cash reward.',
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
