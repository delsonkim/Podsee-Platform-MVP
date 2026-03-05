import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  AdminControlsForm,
  DraftDataInlineActions,
  ProfileEditForm,
  LocationEditForm,
  PoliciesEditForm,
} from './AdminEditForms'

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

export default async function AdminCentreEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: centre } = await supabase
    .from('centres')
    .select('*')
    .eq('id', id)
    .single()

  if (!centre) notFound()

  const c = centre as any
  const draft = (c.has_pending_changes && c.draft_data)
    ? c.draft_data as Record<string, unknown>
    : null

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/centres" className="text-gray-400 hover:text-gray-600 text-sm">&larr; Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900">{centre.name}</h1>
      </div>

      {/* Section A: Admin Controls */}
      <AdminControlsForm
        centreId={centre.id}
        initial={{
          name: centre.name,
          slug: centre.slug,
          contact_email: centre.contact_email ?? '',
          trial_type: centre.trial_type ?? 'free',
          trial_commission_rate: centre.trial_commission_rate ?? 0,
          conversion_commission_rate: centre.conversion_commission_rate ?? 0,
          is_active: centre.is_active,
          is_paused: centre.is_paused,
          is_trusted: c.is_trusted ?? false,
        }}
      />

      {/* Section B: Pending Draft Changes */}
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
                  const current = c[key]
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
            <DraftDataInlineActions centreId={centre.id} />
          </div>
        </div>
      )}

      {/* Section C: Editable Profile Sections */}
      <ProfileEditForm
        centreId={centre.id}
        initial={{
          description: centre.description ?? '',
          teaching_style: centre.teaching_style ?? '',
          track_record: centre.track_record ?? '',
          class_size: centre.class_size ?? null,
          years_operating: centre.years_operating ?? null,
        }}
      />

      <LocationEditForm
        centreId={centre.id}
        initial={{
          address: centre.address ?? '',
          area: centre.area ?? '',
          nearest_mrt: centre.nearest_mrt ?? '',
          parking_info: centre.parking_info ?? '',
        }}
      />

      <PoliciesEditForm
        centreId={centre.id}
        initial={{
          replacement_class_policy: centre.replacement_class_policy ?? '',
          makeup_class_policy: centre.makeup_class_policy ?? '',
          commitment_terms: centre.commitment_terms ?? '',
          notice_period_terms: centre.notice_period_terms ?? '',
          payment_terms: centre.payment_terms ?? '',
          other_policies: c.other_policies ?? '',
        }}
      />
    </div>
  )
}
