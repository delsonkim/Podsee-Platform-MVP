import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DraftDataActions, DraftSlotActions, PublishButton } from './ReviewActions'

const FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  teaching_style: 'Teaching Style',
  track_record: 'Track Record',
  class_size: 'Class Size',
  years_operating: 'Years Operating',
  address: 'Address',
  area: 'Area',
  nearest_mrt: 'Nearest MRT',
  parking_info: 'Parking Info',
  replacement_class_policy: 'Replacement Class Policy',
  makeup_class_policy: 'Makeup Class Policy',
  commitment_terms: 'Commitment Terms',
  notice_period_terms: 'Notice Period Terms',
  payment_terms: 'Payment Terms',
  other_policies: 'Other Policies',
  image_urls: 'Centre Images',
  paynow_qr_image_url: 'PayNow QR',
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) return `${val.length} item(s)`
  if (typeof val === 'number') return String(val)
  return String(val)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-2 border-b border-gray-100 last:border-0">
      <dt className="w-40 text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

export default async function CentreReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: centre } = await supabase
    .from('centres')
    .select('*')
    .eq('id', id)
    .single()

  if (!centre) notFound()

  const { data: draftSlots } = await supabase
    .from('trial_slots')
    .select('id, date, start_time, end_time, trial_fee, max_students, subjects(name), levels(label)')
    .eq('centre_id', id)
    .eq('is_draft', true)
    .order('date', { ascending: true })

  const draft = (centre.has_pending_changes && centre.draft_data)
    ? centre.draft_data as Record<string, unknown>
    : null

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/centres/review" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Review: {centre.name}</h1>
      </div>

      {/* Section 1: Centre Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Centre Status</p>
        <dl>
          <Row label="Name" value={centre.name} />
          <Row label="Slug" value={`/${centre.slug}`} />
          <Row label="Email" value={centre.contact_email} />
          <Row label="Status" value={
            centre.is_active
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Onboarding</span>
          } />
        </dl>
        {!centre.is_active && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">Ready to make this centre live on the public listing?</p>
            <PublishButton centreId={centre.id} />
          </div>
        )}
      </div>

      {/* Centre Profile (current live data) */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Current Profile</p>
        <dl>
          <Row label="Description" value={centre.description} />
          <Row label="Teaching Style" value={centre.teaching_style} />
          <Row label="Track Record" value={centre.track_record} />
          <Row label="Class Size" value={centre.class_size} />
          <Row label="Years Operating" value={centre.years_operating} />
          <Row label="Address" value={centre.address} />
          <Row label="Area" value={centre.area} />
          <Row label="Nearest MRT" value={centre.nearest_mrt} />
          <Row label="Parking Info" value={centre.parking_info} />
          <Row label="Trial Type" value={centre.trial_type} />
          <Row label="Trial Commission" value={centre.trial_commission_rate != null ? `S$${centre.trial_commission_rate}` : '—'} />
          <Row label="Conversion Commission" value={centre.conversion_commission_rate != null ? `S$${centre.conversion_commission_rate}` : '—'} />
        </dl>
      </div>

      {/* Section 2: Pending Profile Changes */}
      {draft && (
        <div className="bg-white rounded-lg border border-amber-200 p-5">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-3">
            Pending Profile Changes
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Field</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Current</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Proposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(draft).map(([key, proposed]) => {
                  const current = (centre as any)[key]
                  const label = FIELD_LABELS[key] ?? key
                  return (
                    <tr key={key}>
                      <td className="px-4 py-2.5 text-gray-600 font-medium">{label}</td>
                      <td className="px-4 py-2.5 text-gray-400">{formatValue(current)}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{formatValue(proposed)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-100">
            <DraftDataActions centreId={centre.id} />
          </div>
        </div>
      )}

      {/* Section 3: Pending Trial Slots */}
      {(draftSlots?.length ?? 0) > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 p-5">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-3">
            Pending Trial Slots ({draftSlots!.length})
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Level</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fee</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {draftSlots!.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{s.subjects?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{s.levels?.label ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(s.date)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatTime(s.start_time)} – {formatTime(s.end_time)}</td>
                    <td className="px-4 py-2.5 text-gray-700">S${Number(s.trial_fee).toFixed(0)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{s.max_students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-100">
            <DraftSlotActions centreId={centre.id} />
          </div>
        </div>
      )}

      {/* Nothing to review */}
      {!draft && (draftSlots?.length ?? 0) === 0 && centre.is_active && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Nothing to review for this centre.</p>
        </div>
      )}
    </div>
  )
}
