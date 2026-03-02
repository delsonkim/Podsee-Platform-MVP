import Link from 'next/link'

const STEPS = [
  {
    number: '01',
    title: 'Browse centres',
    description:
      'Filter by subject, level, and area. Read about the teacher, class size, and teaching approach before you decide.',
  },
  {
    number: '02',
    title: 'Book a trial class',
    description:
      'Pick a slot and submit your details. We coordinate with the centre and confirm your spot within 1 business day.',
  },
  {
    number: '03',
    title: 'Enrol if you love it',
    description:
      "If the fit is right, enrol. If not, no pressure — you only commit when you're sure. And earn a cash reward when you do.",
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-parchment border-b border-linen">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 lg:py-36">
          <div className="max-w-2xl">
            <p className="text-xs font-display font-semibold text-fern mb-4 tracking-widest uppercase">
              Singapore tuition &amp; enrichment
            </p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-forest leading-tight tracking-tight">
              Find the right tuition centre.
              <br />
              <span className="text-fern">Try before you commit.</span>
            </h1>
            <p className="mt-6 text-base text-sage leading-relaxed max-w-xl">
              Podsee connects you to tuition and enrichment centres through structured trial
              classes — so you can make a confident decision, not a guess.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/centres"
                className="inline-flex items-center bg-fern text-white px-6 py-3 rounded-xl text-sm font-display font-bold hover:bg-forest transition-colors shadow-lg shadow-fern/20"
              >
                Browse centres
              </Link>
              <p className="text-sm text-sage">No account needed</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        <h2 className="font-display font-bold text-forest text-xl mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="font-display font-extrabold text-4xl text-linen mb-3 leading-none">
                {step.number}
              </p>
              <h3 className="font-display font-bold text-forest text-base mb-2">{step.title}</h3>
              <p className="text-sm text-sage leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust callout */}
      <section className="bg-mint border-y border-linen">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-16">
          <div>
            <p className="font-display font-bold text-forest text-sm mb-1">
              No upfront cost for centres
            </p>
            <p className="text-sm text-sage leading-relaxed">
              Centres only pay Podsee when a trial converts to an enrolled student. That means
              every centre here is genuinely open to being evaluated — not just collecting fees.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/centres"
              className="inline-flex items-center bg-white border border-linen text-forest px-5 py-2.5 rounded-xl text-sm font-display font-semibold hover:bg-parchment transition-colors whitespace-nowrap"
            >
              See all centres →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
