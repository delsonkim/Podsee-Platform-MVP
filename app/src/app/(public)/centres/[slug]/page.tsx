import { getCentreBySlug } from '@/lib/public-data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CentreSlots from './CentreSlots'
import ExpandableText from './ExpandableText'

export const revalidate = 60

/* ── Gradient placeholder (swap for <Image> when uploads exist) ── */
function centreGradient(slug: string): string {
  const gradients = [
    'from-forest/80 to-fern/60',
    'from-fern/70 to-mint',
    'from-forest to-sage/70',
    'from-sage/60 to-fern/80',
    'from-fern/80 to-forest/60',
  ]
  let hash = 0
  for (const ch of slug) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return gradients[Math.abs(hash) % gradients.length]
}

/* ── Accordion policy row ── */
function PolicyAccordion({ title, body }: { title: string; body: string | null }) {
  if (!body) return null
  return (
    <details className="group border-b border-linen last:border-0">
      <summary className="flex items-center justify-between py-3.5">
        <span className="font-display font-semibold text-forest text-sm">{title}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-sage transition-transform duration-200 group-open:rotate-180 shrink-0"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="text-sm text-sage leading-relaxed pb-3.5 pr-4">{body}</p>
    </details>
  )
}

/* ── Info row for Getting There ── */
function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-2.5 border-b border-linen last:border-0">
      <dt className="w-24 shrink-0 text-xs font-display font-semibold text-sage">{label}</dt>
      <dd className="text-sm text-forest leading-relaxed">{value}</dd>
    </div>
  )
}

export default async function CentreProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const centre = await getCentreBySlug(slug)
  if (!centre) notFound()

  const minFee =
    centre.slots.length > 0
      ? Math.min(...centre.slots.map((s) => Number(s.trial_fee)))
      : null

  const hasPolicies =
    centre.replacement_class_policy ||
    centre.makeup_class_policy ||
    centre.commitment_terms ||
    centre.notice_period_terms ||
    centre.payment_terms ||
    centre.other_policies

  const hasPractical = centre.address || centre.nearest_mrt || centre.parking_info

  return (
    <div className="bg-white">
      {/* ── Hero (full-width, ClassPass style) ── */}
      {(centre.image_urls ?? []).length > 1 ? (
        <div className="relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {(centre.image_urls ?? []).map((url, i) => (
              <div key={url} className="relative h-52 sm:h-64 w-full shrink-0 snap-center">
                <Image src={url} alt={`${centre.name} photo ${i + 1}`} fill className="object-cover" priority={i === 0} />
              </div>
            ))}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {(centre.image_urls ?? []).map((url, i) => (
              <span key={url} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
          <Link
            href="/centres"
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-forest hover:bg-white transition-colors shadow-sm z-10"
            aria-label="Back to centres"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="relative h-52 sm:h-64 overflow-hidden">
          {(centre.image_urls ?? [])[0] ? (
            <Image
              src={(centre.image_urls ?? [])[0]}
              alt={centre.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className={`h-full bg-gradient-to-br ${centreGradient(slug)}`} />
          )}
          <Link
            href="/centres"
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-forest hover:bg-white transition-colors shadow-sm z-10"
            aria-label="Back to centres"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}

      {/* ── Centre header (ClassPass pattern) ── */}
      <div className="px-6 py-5 border-b border-linen">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-forest mb-1">
            {centre.name}
          </h1>
          <p className="text-sm text-sage mb-2">{centre.area}</p>

          {/* Subjects as inline dot-separated text (ClassPass style) */}
          {centre.subjects.length > 0 && (
            <p className="text-sm text-forest/80 mb-3">
              {centre.subjects.map((s) => s.name).join(' · ')}
            </p>
          )}

          {/* Social proof / urgency */}
          {centre.slots.length > 0 && (
            <p className="text-sm text-amber font-display font-semibold mb-3">
              {centre.slots.length} trial slot{centre.slots.length === 1 ? '' : 's'} available
            </p>
          )}

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-2">
            {centre.years_operating && (
              <span className="text-xs bg-paper border border-linen text-sage rounded-full px-3 py-1 font-display font-medium">
                Est. {centre.years_operating} years
              </span>
            )}
            {centre.class_size && (
              <span className="text-xs bg-paper border border-linen text-sage rounded-full px-3 py-1 font-display font-medium">
                Max {centre.class_size} per class
              </span>
            )}
            {minFee !== null && (
              <span className="text-xs bg-mint text-fern border border-fern/15 rounded-full px-3 py-1 font-display font-semibold">
                From S${minFee}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop: 2-col layout | Mobile: single col ── */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:max-w-5xl lg:mx-auto lg:items-start">
        {/* Left col — content sections */}
        <div className="lg:border-r lg:border-linen">

          {/* Mobile only: Trial slots FIRST (most actionable) */}
          <div className="lg:hidden">
            <section className="px-6 py-6 border-b border-linen bg-white">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest">
                  Available trial slots
                </p>
                <span className="text-xs text-fern font-display font-semibold">
                  {centre.slots.length} slot{centre.slots.length === 1 ? '' : 's'}
                </span>
              </div>
              <CentreSlots slots={centre.slots} />
            </section>
          </div>

          {/* About */}
          <section className="px-6 py-6 border-b border-linen bg-white">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              About
            </p>
            {centre.description ? (
              <ExpandableText text={centre.description} maxLength={200} />
            ) : (
              <p className="text-sm text-sage/60 italic">Centre description coming soon</p>
            )}
          </section>

          {/* Teaching approach callout */}
          {centre.teaching_style && (
            <div className="px-6 py-4 border-b border-linen">
              <div className="bg-mint border-l-4 border-fern rounded-r-xl px-5 py-4">
                <p className="text-xs font-display font-semibold text-fern uppercase tracking-widest mb-1.5">
                  Teaching Approach
                </p>
                <p className="text-sm text-sage leading-relaxed">{centre.teaching_style}</p>
              </div>
            </div>
          )}

          {/* Reviews */}
          {centre.reviews.length > 0 && (
            <section className="px-6 py-6 border-b border-linen bg-white">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest">
                  Parent Reviews
                </p>
                <span className="text-xs text-sage font-display">
                  {centre.reviews.length} review{centre.reviews.length === 1 ? '' : 's'}
                </span>
              </div>
              {/* Average rating */}
              {(() => {
                const avg = centre.reviews.reduce((s, r) => s + r.rating, 0) / centre.reviews.length
                return (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-amber-500 text-lg tracking-tight">
                      {'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}
                    </span>
                    <span className="text-sm font-display font-bold text-forest">{avg.toFixed(1)}</span>
                    <span className="text-xs text-sage">({centre.reviews.length})</span>
                  </div>
                )
              })()}
              <div className="space-y-3">
                {centre.reviews.map((review) => (
                  <div key={review.id} className="bg-paper border border-linen rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-display font-semibold text-forest">
                        {review.parent_name.split(' ')[0]}
                      </span>
                      <span className="text-amber-500 text-xs tracking-tight">
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-sage leading-relaxed">{review.review_text}</p>
                    )}
                    <p className="text-xs text-sage/50 mt-2">
                      {new Date(review.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Teachers */}
          <section className="px-6 py-6 border-b border-linen bg-paper">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Meet the Team
            </p>
            {centre.teachers.length > 0 ? (
              <div className="space-y-4">
                {centre.teachers.map((teacher) => (
                  <div key={teacher.id} className="bg-white border border-linen rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-fern rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-bold text-forest text-sm">
                            {teacher.name}
                          </p>
                          {teacher.is_founder && (
                            <span className="text-xs bg-amber/20 text-amber border border-amber/30 rounded-full px-2 py-0.5 font-display font-semibold">
                              Founder
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-sage mt-0.5">
                          {[
                            teacher.role,
                            teacher.years_experience && `${teacher.years_experience} years exp`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                        {teacher.qualifications && (
                          <p className="text-xs text-sage/70 mt-2 italic">{teacher.qualifications}</p>
                        )}
                        {teacher.bio && (
                          <div className="mt-2">
                            <ExpandableText text={teacher.bio} maxLength={150} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-linen border-dashed rounded-xl p-6 text-center">
                <p className="text-sm text-sage">Teacher profiles coming soon</p>
              </div>
            )}

            {/* Track record */}
            {centre.track_record && (
              <div className="mt-4 bg-mint border-l-4 border-fern rounded-r-xl px-5 py-4">
                <p className="text-xs font-display font-semibold text-fern uppercase tracking-widest mb-1.5">
                  Results
                </p>
                <p className="text-sm text-sage leading-relaxed">{centre.track_record}</p>
              </div>
            )}
          </section>

          {/* Policies (accordion) */}
          <section className="px-6 py-6 border-b border-linen bg-paper">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Policies
            </p>
            {hasPolicies ? (
              <div className="bg-white border border-linen rounded-xl px-4">
                {minFee !== null && (
                  <PolicyAccordion title="Trial Policy" body={`S$${minFee} for one trial class.`} />
                )}
                <PolicyAccordion title="Replacement Class" body={centre.replacement_class_policy} />
                <PolicyAccordion title="Makeup Class" body={centre.makeup_class_policy} />
                <PolicyAccordion title="Commitment Terms" body={centre.commitment_terms} />
                <PolicyAccordion title="Notice Period" body={centre.notice_period_terms} />
                <PolicyAccordion title="Payment" body={centre.payment_terms} />
                <PolicyAccordion title="Other Policies" body={centre.other_policies} />
              </div>
            ) : (
              <div className="bg-white border border-linen border-dashed rounded-xl p-6 text-center">
                <p className="text-sm text-sage">Policy details coming soon</p>
              </div>
            )}
          </section>

          {/* Getting there */}
          <section className="px-6 py-6 border-b border-linen bg-white">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Getting there
            </p>
            {hasPractical ? (
              <>
                <dl>
                  <InfoRow label="Address" value={centre.address} />
                  <InfoRow label="MRT" value={centre.nearest_mrt} />
                  <InfoRow label="Parking" value={centre.parking_info} />
                </dl>
                {/* Map placeholder — ready for Google Maps embed */}
                <div className="mt-4 h-40 bg-paper rounded-xl border border-linen flex items-center justify-center">
                  <p className="text-xs text-sage">Map coming soon</p>
                </div>
              </>
            ) : (
              <div className="bg-paper border border-linen border-dashed rounded-xl p-6 text-center">
                <p className="text-sm text-sage">Address details coming soon</p>
              </div>
            )}
          </section>
        </div>

        {/* Right col — trial slots (desktop only, sticky) */}
        <div className="hidden lg:block sticky top-16 px-6 py-6 border-b border-linen">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest">
              Available Trials
            </p>
            <span className="text-xs text-fern font-display font-semibold">
              {centre.slots.length} slot{centre.slots.length === 1 ? '' : 's'}
            </span>
          </div>
          <CentreSlots slots={centre.slots} />
        </div>
      </div>

      {/* Bottom padding for sticky CTA */}
      <div className="h-24 bg-white" />
    </div>
  )
}
