import { getCentres, getAllSubjects, getAllLevels } from '@/lib/public-data'
import CentreFilters from './CentreFilters'
import Link from 'next/link'

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
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-2xl text-forest">
          Trial classes near you
        </h1>
        <p className="text-sm text-sage mt-1">
          {filtered.length} {filtered.length === 1 ? 'centre' : 'centres'} available
        </p>
      </div>

      <CentreFilters areas={areas} subjects={subjects} levels={levels} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sage">
            No centres match your filters. Try removing one.
          </div>
        )}
        {filtered.map((centre) => (
          <div
            key={centre.id}
            className="bg-white rounded-2xl border border-linen p-5 flex flex-col gap-3 hover:border-fern/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display font-bold text-base text-forest">{centre.name}</h2>
                <span className="shrink-0 text-xs text-sage bg-paper border border-linen rounded-full px-2.5 py-0.5">
                  {centre.area}
                </span>
              </div>
              {centre.years_operating && (
                <p className="text-xs text-sage mt-0.5">{centre.years_operating} years operating</p>
              )}
            </div>

            <p className="text-sm text-sage line-clamp-2 leading-relaxed">{centre.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {centre.subjects.map((s) => (
                <span
                  key={s.id}
                  className="text-xs bg-mint text-fern border border-fern/15 rounded-full px-2.5 py-0.5 font-medium"
                >
                  {s.name}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {centre.levels.slice(0, 5).map((l) => (
                <span key={l.id} className="text-xs bg-cream text-sage rounded-full px-2.5 py-0.5">
                  {l.label}
                </span>
              ))}
              {centre.levels.length > 5 && (
                <span className="text-xs text-sage px-1">+{centre.levels.length - 5} more</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-linen">
              <p className="text-sm text-sage">
                From{' '}
                <span className="font-display font-bold text-forest">S${centre.min_fee}</span>
                <span className="text-sage/60"> / trial</span>
              </p>
              <Link
                href={`/centres/${centre.slug}`}
                className="text-xs font-display font-semibold text-fern border border-fern/30 bg-mint rounded-lg px-3 py-1.5 hover:bg-fern hover:text-white transition-colors"
              >
                View centre →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
