import { getCentres, getAllSubjects, getAllLevels } from '@/lib/public-data'
import CentreFilters from './CentreFilters'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 60

/* ── Gradient placeholder (same as detail page, duplicated intentionally) ── */
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

export default async function CentresPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; subject?: string; level?: string }>
}) {
  const { area, subject, level } = await searchParams
  const [centres, subjects, levels] = await Promise.all([
    getCentres(),
    Promise.resolve(getAllSubjects()),
    Promise.resolve(getAllLevels()),
  ])

  const areas = [...new Set(centres.map((c) => c.area).filter(Boolean))] as string[]

  const filtered = centres.filter((c) => {
    if (area && c.area !== area) return false
    if (subject && !c.subjects.some((s) => s.name === subject)) return false
    if (level && !c.levels.some((l) => l.code === level)) return false
    return true
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-2xl text-forest">
          Tuition Centres
        </h1>
        <p className="text-sm text-sage mt-1">
          Book a trial class — try before you commit
        </p>
      </div>

      {/* Filters + result count */}
      <div className="flex flex-wrap items-center gap-2.5 mb-2">
        <CentreFilters areas={areas} subjects={subjects} levels={levels} />
      </div>
      <p className="text-xs text-sage mb-6">
        Showing {filtered.length} {filtered.length === 1 ? 'centre' : 'centres'}
      </p>

      {/* Centre cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-paper border border-linen rounded-2xl p-12 text-center">
            <p className="text-sm text-sage mb-3">No centres match your filters.</p>
            <Link
              href="/centres"
              className="text-sm font-display font-semibold text-fern bg-mint border border-fern/20 rounded-lg px-4 py-2 hover:bg-fern hover:text-white transition-colors"
            >
              Clear all filters
            </Link>
          </div>
        )}

        {filtered.map((centre) => (
          <Link
            key={centre.id}
            href={`/centres/${centre.slug}`}
            className="flex bg-white rounded-2xl border border-linen overflow-hidden hover:border-fern/40 hover:shadow-md transition-all group"
          >
            {/* Centre image (left side) */}
            {centre.image_urls?.[0] ? (
              <div className="w-1/3 sm:w-2/5 shrink-0 relative min-h-[160px]">
                <Image
                  src={centre.image_urls[0]}
                  alt={centre.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-1/3 sm:w-2/5 shrink-0 bg-gradient-to-br ${centreGradient(centre.slug)} min-h-[160px]`}
              />
            )}

            {/* Card content (right side) */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
              {/* Top section */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-display font-bold text-base text-forest leading-tight group-hover:text-fern transition-colors truncate">
                    {centre.name}
                  </h2>
                  <span className="shrink-0 text-xs text-sage bg-paper border border-linen rounded-full px-2.5 py-0.5">
                    {centre.area}
                  </span>
                </div>

                {/* Subjects as inline text (ClassPass style) */}
                {centre.subjects.length > 0 && (
                  <p className="text-xs text-sage mb-2 truncate">
                    {centre.subjects.map((s) => s.name).join(' · ')}
                  </p>
                )}

                {/* Trust signals */}
                <p className="text-xs text-sage/70">
                  {[
                    centre.years_operating && `Est. ${centre.years_operating} years`,
                    centre.class_size && `Max ${centre.class_size} students`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              {/* Bottom section */}
              <div className="flex items-end justify-between gap-3 mt-3 pt-3 border-t border-linen">
                <div>
                  <p className="font-display font-bold text-forest text-sm">
                    From S${centre.min_fee}
                    <span className="font-normal text-sage text-xs"> / trial</span>
                  </p>
                  {centre.slot_count <= 3 && centre.slot_count > 0 ? (
                    <p className="text-xs text-red-600 font-display font-semibold mt-0.5">
                      Limited slots!
                    </p>
                  ) : centre.slot_count > 0 ? (
                    <p className="text-xs text-sage mt-0.5">
                      {centre.slot_count} slot{centre.slot_count === 1 ? '' : 's'} available
                    </p>
                  ) : null}
                </div>
                <span className="text-xs font-display font-semibold text-fern bg-mint border border-fern/20 rounded-lg px-3 py-1.5 shrink-0 group-hover:bg-fern group-hover:text-white transition-colors">
                  Book a trial →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
