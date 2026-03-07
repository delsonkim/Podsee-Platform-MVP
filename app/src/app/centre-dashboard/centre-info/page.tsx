import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCentrePricing } from '@/lib/public-data'
import ProfileForm from './ProfileForm'
import LocationForm from './LocationForm'
import PoliciesForm from './PoliciesForm'
import ImagesForm from './ImagesForm'
import PricingSection from './PricingSection'
import PromotionsForm from './PromotionsForm'

async function getCentreDetails(centreId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('centres')
    .select(`
      *,
      centre_subjects(subjects(name)),
      centre_levels(levels(label))
    `)
    .eq('id', centreId)
    .single()
  return data
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">--</span>}</dd>
    </div>
  )
}

export default async function CentreInfoPage() {
  const { centreId } = await requireCentreUser()
  const supabase = createAdminClient()
  const centre = await getCentreDetails(centreId)

  if (!centre) {
    return <p className="text-gray-400">Centre not found.</p>
  }

  const [pricingRows, { data: allSubjects }, { data: allLevels }, { data: structuredPolicies }] = await Promise.all([
    getCentrePricing(centreId),
    supabase.from('subjects').select('id, name, sort_order').order('sort_order'),
    supabase.from('levels').select('id, label, level_group, sort_order').order('sort_order'),
    supabase.from('centre_policies').select('id, category, description, sort_order').eq('centre_id', centreId).order('sort_order'),
  ])

  const c = centre as any
  const isLive = c.is_active === true
  const draft = (c.draft_data as Record<string, unknown>) ?? {}

  // For live centres with pending changes, show draft values in forms
  const eff = (field: string) => {
    if (isLive && field in draft) return draft[field]
    return c[field]
  }

  const subjects = (c.centre_subjects as any[])
    ?.map((cs: any) => cs.subjects?.name)
    .filter(Boolean) ?? []
  const levels = (c.centre_levels as any[])
    ?.map((cl: any) => cl.levels?.label)
    .filter(Boolean) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Centre Info</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLive
            ? 'Edit your centre details. Changes will be reviewed before going live.'
            : 'Fill in your centre details. Changes save directly during onboarding.'}
        </p>
      </div>

      {c.has_pending_changes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">You have pending changes awaiting review by Podsee.</p>
        </div>
      )}

      {/* Read-only fields (admin-managed) */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Details <span className="text-gray-400 font-normal">(managed by Podsee)</span>
        </p>
        <dl>
          <Row label="Name" value={c.name} />
          <Row label="Slug" value={`/${c.slug}`} />
          <Row label="Contact Email" value={c.contact_email} />
          <Row label="Subjects" value={subjects.length > 0 ? subjects.join(', ') : null} />
          <Row label="Levels" value={levels.length > 0 ? levels.join(', ') : null} />
        </dl>
      </div>

      {/* Editable sections */}
      <ProfileForm
        initial={{
          description: (eff('description') as string) ?? '',
          teaching_style: (eff('teaching_style') as string) ?? '',
          track_record: (eff('track_record') as string) ?? '',
          class_size: (eff('class_size') as number | null) ?? null,
          years_operating: (eff('years_operating') as number | null) ?? null,
        }}
        isLive={isLive}
      />

      <LocationForm
        initial={{
          address: (eff('address') as string) ?? '',
          area: (eff('area') as string) ?? '',
          nearest_mrt: (eff('nearest_mrt') as string) ?? '',
          parking_info: (eff('parking_info') as string) ?? '',
        }}
        isLive={isLive}
      />

      <PoliciesForm structuredPolicies={structuredPolicies ?? []} />

      <ImagesForm
        initial={{
          image_urls: (eff('image_urls') as string[]) ?? [],
          paynow_qr_image_url: (eff('paynow_qr_image_url') as string | null) ?? null,
        }}
        isLive={isLive}
      />

      <PricingSection rows={pricingRows} subjects={allSubjects ?? []} levels={allLevels ?? []} />

      <PromotionsForm
        initial={(eff('promotions_text') as string) ?? ''}
        isLive={isLive}
      />
    </div>
  )
}
