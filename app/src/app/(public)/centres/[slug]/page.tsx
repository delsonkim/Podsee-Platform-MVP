import { getCentreBySlug, getCentrePricing, getCentrePolicies } from '@/lib/public-data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CentreSlots from './CentreSlots'
import ExpandableText from './ExpandableText'
import PricingTable from './PricingTable'
import ImageCarousel from './ImageCarousel'

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

  const [pricingRows, structuredPolicies] = await Promise.all([
    getCentrePricing(centre.id),
    getCentrePolicies(centre.id),
  ])

  const minFee =
    centre.slots.length > 0
      ? Math.min(...centre.slots.map((s) => Number(s.trial_fee)))
      : null

  // Legacy policy fallback (old centre fields)
  const hasLegacyPolicies =
    centre.replacement_class_policy ||
    centre.makeup_class_policy ||
    centre.commitment_terms ||
    centre.notice_period_terms ||
    centre.payment_terms ||
    centre.other_policies

  const hasPolicies = structuredPolicies.length > 0 || hasLegacyPolicies

  const hasPractical = centre.address || centre.nearest_mrt || centre.parking_info

  return (
    <div className="bg-white">
      {/* ── Hero (full-width, ClassPass style) ── */}
      {(centre.image_urls ?? []).length > 0 ? (
        <ImageCarousel images={centre.image_urls ?? []} centreName={centre.name} />
      ) : (
        <div className="relative h-52 sm:h-64 overflow-hidden">
          <div className={`h-full bg-gradient-to-br ${centreGradient(slug)}`} />
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

          {/* Rating + review count (social proof) */}
          {centre.reviews.length > 0 && (() => {
            const avg = centre.reviews.reduce((s, r) => s + r.rating, 0) / centre.reviews.length
            const rounded = Math.round(avg)
            return (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500 text-sm tracking-tight">
                  {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
                </span>
                <span className="text-sm font-display font-bold text-forest">{avg.toFixed(1)}</span>
                <span className="text-xs text-sage">
                  ({centre.reviews.length} review{centre.reviews.length === 1 ? '' : 's'})
                </span>
              </div>
            )
          })()}

          {/* Subjects as inline dot-separated text (ClassPass style) */}
          {centre.subjects.length > 0 && (
            <p className="text-sm text-forest/80 mb-3">
              {centre.subjects.map((s) => s.name).join(' · ')}
            </p>
          )}

          {/* Location + Share buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {centre.google_maps_url ? (
              <a
                href={centre.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2 font-display font-medium hover:border-fern/50 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-500">
                  <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 7.5 4 7.5s4-4.25 4-7.5C11 2.79 9.21 1 7 1zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
                </svg>
                {centre.area ?? 'View on Map'}
              </a>
            ) : centre.area ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2 font-display font-medium">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-red-500">
                  <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 7.5 4 7.5s4-4.25 4-7.5C11 2.79 9.21 1 7 1zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
                </svg>
                {centre.area}
              </span>
            ) : null}
          </div>

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

          {/* Pricing & Promotions (moved up — parents want to see cost early) */}
          <PricingTable
            rows={pricingRows}
            promotionsText={centre.promotions_text}
            additionalFees={centre.additional_fees}
          />

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
                {centre.teachers.map((teacher) => {
                  const teacherInfo = [
                    teacher.subjects.length > 0 ? teacher.subjects.join(' · ') : null,
                    teacher.levels.length > 0 ? teacher.levels.join(', ') : null,
                  ].filter(Boolean).join(' — ')

                  return (
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
                            {teacher.linkedin_url && (
                              <a
                                href={teacher.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sage hover:text-forest transition-colors"
                                aria-label={`${teacher.name}'s LinkedIn`}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-sage mt-0.5">
                            {[
                              teacher.role,
                              teacher.years_experience && `${teacher.years_experience} years teaching`,
                              teacher.students_taught && `${teacher.students_taught}+ students taught`,
                            ].filter(Boolean).join(' · ')}
                          </p>
                          {teacherInfo && (
                            <p className="text-xs text-fern mt-1 font-display font-medium">{teacherInfo}</p>
                          )}
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
                  )
                })}
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

          {/* Contact links */}
          {(centre.website_url || centre.instagram_url || centre.tiktok_url || centre.phone_number || centre.whatsapp_number) && (
            <section className="px-6 py-5 border-b border-linen bg-white">
              <div className="flex flex-wrap gap-2">
                {centre.website_url && (
                  <a
                    href={centre.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sage">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M1.5 8h13M8 1.5c1.5 1.5 2.5 3.5 2.5 6.5s-1 5-2.5 6.5c-1.5-1.5-2.5-3.5-2.5-6.5s1-5 2.5-6.5z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Website
                  </a>
                )}
                {centre.instagram_url && (
                  <a
                    href={centre.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-sage">
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
                    </svg>
                    Instagram
                  </a>
                )}
                {centre.tiktok_url && (
                  <a
                    href={centre.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-sage">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.71a8.16 8.16 0 004.76 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
                    </svg>
                    TikTok
                  </a>
                )}
                {centre.whatsapp_number && (
                  <a
                    href={`https://wa.me/${centre.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-600">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {centre.phone_number && !centre.whatsapp_number && (
                  <a
                    href={`tel:${centre.phone_number}`}
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sage">
                      <path d="M14.5 11.35v1.95a1.3 1.3 0 01-1.42 1.3 12.87 12.87 0 01-5.61-2A12.67 12.67 0 013.5 8.65 12.87 12.87 0 011.5 3a1.3 1.3 0 011.29-1.3h1.95A1.3 1.3 0 016.04 2.8c.12.84.34 1.66.66 2.44a1.3 1.3 0 01-.29 1.37l-.83.83a10.4 10.4 0 003.97 3.97l.83-.83a1.3 1.3 0 011.37-.29c.78.32 1.6.54 2.44.66a1.3 1.3 0 011.11 1.32v.02z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Call
                  </a>
                )}
                {centre.phone_number && centre.whatsapp_number && (
                  <a
                    href={`tel:${centre.phone_number}`}
                    className="inline-flex items-center gap-2 text-sm text-forest bg-white border border-linen rounded-full px-4 py-2.5 font-display font-medium hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sage">
                      <path d="M14.5 11.35v1.95a1.3 1.3 0 01-1.42 1.3 12.87 12.87 0 01-5.61-2A12.67 12.67 0 013.5 8.65 12.87 12.87 0 011.5 3a1.3 1.3 0 011.29-1.3h1.95A1.3 1.3 0 016.04 2.8c.12.84.34 1.66.66 2.44a1.3 1.3 0 01-.29 1.37l-.83.83a10.4 10.4 0 003.97 3.97l.83-.83a1.3 1.3 0 011.37-.29c.78.32 1.6.54 2.44.66a1.3 1.3 0 011.11 1.32v.02z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Call
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Policies (accordion) */}
          <section className="px-6 py-6 border-b border-linen bg-paper">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Policies
            </p>
            {hasPolicies ? (
              <div className="bg-white border border-linen rounded-xl px-4">
                {/* Structured policies from centre_policies table */}
                {structuredPolicies.map((policy) => (
                  <PolicyAccordion key={policy.id} title={policy.category} body={policy.description} />
                ))}
                {/* Legacy fallback: old centre fields (shown only if no structured policies) */}
                {structuredPolicies.length === 0 && (
                  <>
                    {minFee !== null && (
                      <PolicyAccordion title="Trial Policy" body={`S$${minFee} for one trial class.`} />
                    )}
                    <PolicyAccordion title="Replacement Class" body={centre.replacement_class_policy} />
                    <PolicyAccordion title="Makeup Class" body={centre.makeup_class_policy} />
                    <PolicyAccordion title="Commitment Terms" body={centre.commitment_terms} />
                    <PolicyAccordion title="Notice Period" body={centre.notice_period_terms} />
                    <PolicyAccordion title="Payment" body={centre.payment_terms} />
                    <PolicyAccordion title="Other Policies" body={centre.other_policies} />
                  </>
                )}
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
                {/* Google Maps link */}
                {centre.google_maps_url ? (
                  <a
                    href={centre.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 h-12 bg-paper rounded-xl border border-linen text-sm text-fern font-display font-semibold hover:border-fern/50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-fern">
                      <path d="M7 1C4.79 1 3 2.79 3 5c0 3.25 4 7.5 4 7.5s4-4.25 4-7.5C11 2.79 9.21 1 7 1zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
                    </svg>
                    Open in Google Maps
                  </a>
                ) : (
                  <div className="mt-4 h-40 bg-paper rounded-xl border border-linen flex items-center justify-center">
                    <p className="text-xs text-sage">Map coming soon</p>
                  </div>
                )}
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
