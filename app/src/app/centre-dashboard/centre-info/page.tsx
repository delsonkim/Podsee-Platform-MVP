import { requireCentreUser } from '@/lib/centre-auth'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const centre = await getCentreDetails(centreId)

  if (!centre) {
    return <p className="text-gray-400">Centre not found.</p>
  }

  const subjects = ((centre as any).centre_subjects as any[])
    ?.map((cs: any) => cs.subjects?.name)
    .filter(Boolean) ?? []
  const levels = ((centre as any).centre_levels as any[])
    ?.map((cl: any) => cl.levels?.label)
    .filter(Boolean) ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Centre Info</h1>
        <p className="text-sm text-gray-500 mt-1">Your centre details as shown on Podsee.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Details</p>
        <dl>
          <Row label="Name" value={centre.name} />
          <Row label="Area" value={centre.area} />
          <Row label="Address" value={centre.address} />
          <Row label="Contact Email" value={centre.contact_email} />
          <Row label="Nearest MRT" value={centre.nearest_mrt} />
          <Row label="Parking" value={centre.parking_info} />
          <Row label="Class Size" value={centre.class_size} />
          <Row label="Years Operating" value={centre.years_operating} />
          <Row label="Subjects" value={subjects.length > 0 ? subjects.join(', ') : null} />
          <Row label="Levels" value={levels.length > 0 ? levels.join(', ') : null} />
        </dl>
      </div>

      {(centre.teaching_style || centre.track_record) && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Teaching</p>
          <dl>
            {centre.teaching_style && <Row label="Teaching Style" value={centre.teaching_style} />}
            {centre.track_record && <Row label="Track Record" value={centre.track_record} />}
          </dl>
        </div>
      )}

      {(centre.replacement_class_policy || centre.makeup_class_policy || centre.commitment_terms || centre.payment_terms) && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Policies</p>
          <dl>
            {centre.replacement_class_policy && <Row label="Replacement Class" value={centre.replacement_class_policy} />}
            {centre.makeup_class_policy && <Row label="Makeup Class" value={centre.makeup_class_policy} />}
            {centre.commitment_terms && <Row label="Commitment" value={centre.commitment_terms} />}
            {centre.notice_period_terms && <Row label="Notice Period" value={centre.notice_period_terms} />}
            {centre.payment_terms && <Row label="Payment" value={centre.payment_terms} />}
            {centre.other_policies && <Row label="Other" value={centre.other_policies} />}
          </dl>
        </div>
      )}
    </div>
  )
}
