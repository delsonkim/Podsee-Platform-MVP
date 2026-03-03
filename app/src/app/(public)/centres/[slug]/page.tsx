import { getCentreBySlug } from '@/lib/public-data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CentreSlots from './CentreSlots'

function Section({
  title,
  alt,
  children,
}: {
  title: string
  alt?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`px-6 py-6 border-b border-linen ${alt ? 'bg-paper' : 'bg-white'}`}>
      <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
        {title}
      </p>
      {children}
    </section>
  )
}

function PolicyCard({ title, body }: { title: string; body: string | null }) {
  if (!body) return null
  return (
    <div className="bg-white border border-linen rounded-xl p-4">
      <p className="font-display font-bold text-forest text-xs mb-1.5">{title}</p>
      <p className="text-xs text-sage leading-relaxed">{body}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-2.5 border-b border-linen last:border-0">
      <dt className="w-24 shrink-0 text-xs text-sage">{label}</dt>
      <dd className="text-xs text-forest leading-relaxed">{value}</dd>
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
      {/* Back nav */}
      <div className="px-6 pt-5 pb-0 flex items-center gap-3 bg-parchment border-b border-linen">
        <Link
          href="/centres"
          className="w-8 h-8 rounded-lg border border-linen bg-white flex items-center justify-center text-forest text-sm hover:bg-paper transition-colors shrink-0"
          aria-label="Back"
        >
          ←
        </Link>
        <div className="pb-4">
          <p className="text-xs text-sage">Centre Profile</p>
          <p className="font-display font-bold text-forest text-base leading-tight">{centre.name}</p>
        </div>
      </div>

      {/* Centre header */}
      <div className="px-6 py-5 border-b border-linen bg-parchment">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap gap-2">
              {centre.years_operating && (
                <span className="text-xs bg-white border border-linen text-sage rounded-full px-3 py-1">
                  {centre.years_operating} years operating
                </span>
              )}
              {centre.class_size && (
                <span className="text-xs bg-white border border-linen text-sage rounded-full px-3 py-1">
                  Max {centre.class_size} per class
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-sage mb-2">{centre.area}</p>
          <div className="flex flex-wrap gap-1.5">
            {centre.subjects.map((s) => (
              <span
                key={s.id}
                className="text-xs bg-mint text-fern border border-fern/15 rounded-full px-2.5 py-0.5 font-display font-semibold"
              >
                {s.name}
              </span>
            ))}
            {centre.levels.map((l) => (
              <span key={l.id} className="text-xs bg-cream text-sage rounded-full px-2.5 py-0.5">
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: 2-col layout | Mobile: single col */}
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:max-w-5xl lg:mx-auto lg:items-start">

        {/* Left col — content sections */}
        <div className="lg:border-r lg:border-linen">
          {/* About */}
          {(centre.description || centre.teaching_style) && (
            <Section title="About">
              {centre.description && (
                <p className="text-sm text-sage leading-relaxed">{centre.description}</p>
              )}
              {centre.teaching_style && (
                <div className="mt-4 bg-mint/50 border border-fern/10 rounded-xl p-4">
                  <p className="text-xs font-display font-semibold text-fern mb-1.5">Teaching approach</p>
                  <p className="text-sm text-sage leading-relaxed">{centre.teaching_style}</p>
                </div>
              )}
            </Section>
          )}

          {/* Teacher */}
          {(centre.teacher_bio || centre.teacher_qualifications) && (
            <Section title="Teacher" alt>
              {centre.teacher_bio && (
                <p className="text-sm text-sage leading-relaxed">{centre.teacher_bio}</p>
              )}
              {centre.teacher_qualifications && (
                <p className="text-xs text-sage/70 mt-3 italic">{centre.teacher_qualifications}</p>
              )}
              {centre.track_record && (
                <div className="mt-4 bg-white border border-linen rounded-xl p-4">
                  <p className="text-xs font-display font-semibold text-forest mb-1.5">Track record</p>
                  <p className="text-sm text-sage leading-relaxed">{centre.track_record}</p>
                </div>
              )}
            </Section>
          )}

          {/* Policies */}
          {hasPolicies && (
            <Section title="Policies" alt>
              <div className="grid grid-cols-2 gap-2.5">
                <PolicyCard title="Trial policy" body={`S$${centre.slots[0]?.trial_fee ?? '—'} for one trial class.`} />
                <PolicyCard title="Replacement class" body={centre.replacement_class_policy} />
                <PolicyCard title="Makeup class" body={centre.makeup_class_policy} />
                <PolicyCard title="Commitment" body={centre.commitment_terms} />
                <PolicyCard title="Notice period" body={centre.notice_period_terms} />
                <PolicyCard title="Payment" body={centre.payment_terms} />
                <PolicyCard title="Other" body={centre.other_policies} />
              </div>
            </Section>
          )}

          {/* Getting there */}
          {hasPractical && (
            <Section title="Getting there">
              <dl>
                <InfoRow label="Address" value={centre.address} />
                <InfoRow label="MRT" value={centre.nearest_mrt} />
                <InfoRow label="Parking" value={centre.parking_info} />
              </dl>
            </Section>
          )}
        </div>

        {/* Right col — trial slots */}
        <div>
          {/* Mobile: inline section */}
          <div className="lg:hidden">
            <Section title="Available trial slots">
              <CentreSlots slots={centre.slots} />
            </Section>
          </div>
          {/* Desktop: sticky panel */}
          <div className="hidden lg:block sticky top-16 px-6 py-6 border-b border-linen">
            <p className="text-xs font-display font-semibold text-sage uppercase tracking-widest mb-4">
              Available trial slots
            </p>
            <CentreSlots slots={centre.slots} />
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-8 bg-white" />
    </div>
  )
}
