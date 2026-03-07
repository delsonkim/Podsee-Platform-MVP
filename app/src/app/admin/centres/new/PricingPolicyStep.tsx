'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  fetchSubjectLevelPairsAction,
  standardizePoliciesAction,
  standardizePoliciesImageAction,
  savePricingAction,
  savePoliciesAction,
  updateCentreStep,
  loadPricingDataAction,
} from './actions'
import type {
  StandardizedPricingRow,
  StandardizedPolicy,
  SubjectLevelPair,
  FileMediaType,
} from '@/lib/ai-standardizer'

// Map AI categories to legacy centres table columns
const LEGACY_FIELD_MAP: Record<string, string> = {
  'Replacement & Make-Up Classes': 'replacement_class_policy',
  'Fees & Payment': 'payment_terms',
  'Withdrawal & Notice Period': 'notice_period_terms',
  'Refund Policy': 'other_policies',
  'Attendance & Conduct': 'commitment_terms',
  'Materials & Resources': 'makeup_class_policy',
}

type PolicyInputItem =
  | { type: 'text'; content: string; id: string }
  | { type: 'file'; base64: string; mediaType: FileMediaType; preview: string; fileName: string; id: string }

type PolicyPhase = 'input' | 'extracting' | 'review'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function makeEmptyRow(pair?: SubjectLevelPair): StandardizedPricingRow {
  return {
    subject_name: pair?.subject_name ?? '',
    subject_id: pair?.subject_id ?? '',
    level_label: pair?.level_label ?? null,
    level_id: pair?.level_id ?? null,
    stream: pair?.stream ?? null,
    trial_type: 'free',
    trial_fee: 0,
    trial_lessons: 1,
    regular_fee: 0,
    lessons_per_period: 4,
    billing_display: '',
    lesson_duration_minutes: null,
    regular_schedule_note: null,
  }
}

export default function PricingPolicyStep({
  centreId,
  onComplete,
}: {
  centreId?: string
  onComplete: () => void
}) {
  // ── Pricing state (manual) ──────────────────────────────────
  const [pricing, setPricing] = useState<StandardizedPricingRow[]>([])
  const [promotionsText, setPromotionsText] = useState('')
  const [additionalFees, setAdditionalFees] = useState<string | null>(null)
  const [editingPricingRow, setEditingPricingRow] = useState<number | null>(null)
  const [pairsLoaded, setPairsLoaded] = useState(false)
  const [knownPairs, setKnownPairs] = useState<SubjectLevelPair[]>([])

  // Bulk fill
  const [showBulkFill, setShowBulkFill] = useState(false)
  const [bulkScope, setBulkScope] = useState<'all' | 'subject'>('all')
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkFee, setBulkFee] = useState('')
  const [bulkBilling, setBulkBilling] = useState('')
  const [bulkLessons, setBulkLessons] = useState('')
  const [bulkTrialType, setBulkTrialType] = useState('free')
  const [bulkTrialFee, setBulkTrialFee] = useState('0')

  // Add row
  const [showAddRow, setShowAddRow] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newLevel, setNewLevel] = useState('')

  // ── Policies state (AI) ──────────────────────────────────────
  const [policyPhase, setPolicyPhase] = useState<PolicyPhase>('input')
  const [policyItems, setPolicyItems] = useState<PolicyInputItem[]>([])
  const [policyTextDraft, setPolicyTextDraft] = useState('')
  const [policyInputMode, setPolicyInputMode] = useState<'text' | 'file'>('text')
  const [policies, setPolicies] = useState<StandardizedPolicy[]>([])
  const [policyError, setPolicyError] = useState<string | null>(null)
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(null)
  const policyFileRef = useRef<HTMLInputElement>(null)

  // ── Save ──────────────────────────────────────────────────────
  const [isSaving, startSaveTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  // ── Load pairs + existing data on mount ──────────────────────
  useEffect(() => {
    if (!centreId) {
      setPairsLoaded(true)
      setDataLoaded(true)
      return
    }
    loadPricingDataAction(centreId).then((data) => {
      setKnownPairs(data.pairs)

      if (data.pricing.length > 0) {
        // Use existing saved pricing
        setPricing(
          data.pricing.map((p) => ({
            subject_name: '',
            subject_id: p.subject_id,
            level_label: null,
            level_id: p.level_id,
            stream: p.stream,
            trial_type: (p.trial_type as StandardizedPricingRow['trial_type']) ?? 'free',
            trial_fee: p.trial_fee ?? 0,
            trial_lessons: p.trial_lessons ?? 1,
            regular_fee: p.regular_fee,
            lessons_per_period: p.lessons_per_period,
            billing_display: p.billing_display ?? '',
            lesson_duration_minutes: p.lesson_duration_minutes,
            regular_schedule_note: p.regular_schedule_note,
          }))
        )
      } else if (data.pairs.length > 0) {
        // Pre-fill from schedule pairs
        setPricing(data.pairs.map((p) => makeEmptyRow(p)))
      }

      if (data.policies.length > 0) {
        setPolicies(
          data.policies.map((p) => ({
            category: p.category,
            description: p.description,
            sort_order: p.sort_order ?? 0,
          }))
        )
        setPolicyPhase('review')
      }

      if (data.promotionsText) {
        setPromotionsText(data.promotionsText)
      }

      if (data.additionalFees) setAdditionalFees(data.additionalFees)
      setPairsLoaded(true)
      setDataLoaded(true)
    })
  }, [centreId])

  // ── Pricing helpers ──────────────────────────────────────────
  function updatePricingRow(index: number, field: keyof StandardizedPricingRow, value: any) {
    setPricing((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function removePricingRow(index: number) {
    setPricing((prev) => prev.filter((_, i) => i !== index))
  }

  function addCustomRow() {
    if (!newSubject.trim()) return
    const row = makeEmptyRow()
    row.subject_name = newSubject.trim()
    row.level_label = newLevel.trim() || null
    setPricing((prev) => [...prev, row])
    setNewSubject('')
    setNewLevel('')
    setShowAddRow(false)
  }

  function applyBulkFill() {
    setPricing((prev) =>
      prev.map((row) => {
        const matches =
          bulkScope === 'all' ||
          (bulkScope === 'subject' && (row.subject_id === bulkSubject || row.subject_name === bulkSubject))

        if (!matches) return row
        return {
          ...row,
          ...(bulkFee ? { regular_fee: parseFloat(bulkFee) } : {}),
          ...(bulkBilling ? { billing_display: bulkBilling } : {}),
          ...(bulkLessons ? { lessons_per_period: parseInt(bulkLessons) } : {}),
          trial_type: bulkTrialType as StandardizedPricingRow['trial_type'],
          ...(bulkTrialFee ? { trial_fee: parseFloat(bulkTrialFee) } : {}),
        }
      })
    )
  }

  // ── Policy helpers ──────────────────────────────────────────
  function addPolicyText() {
    if (!policyTextDraft.trim()) return
    setPolicyItems((prev) => [...prev, { type: 'text', content: policyTextDraft.trim(), id: crypto.randomUUID() }])
    setPolicyTextDraft('')
  }

  async function handlePolicyFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setPolicyError('Unsupported file type. Use JPEG, PNG, GIF, WebP, or PDF.')
      return
    }
    const base64 = await fileToBase64(file)
    const preview = file.type === 'application/pdf' ? '' : URL.createObjectURL(file)
    setPolicyItems((prev) => [
      ...prev,
      { type: 'file', base64, mediaType: file.type as FileMediaType, preview, fileName: file.name, id: crypto.randomUUID() },
    ])
    if (policyFileRef.current) policyFileRef.current.value = ''
  }

  function removePolicyInput(id: string) {
    setPolicyItems((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleExtractPolicies() {
    if (policyItems.length === 0) return
    setPolicyPhase('extracting')
    setPolicyError(null)

    const textBlob = policyItems
      .filter((i): i is PolicyInputItem & { type: 'text' } => i.type === 'text')
      .map((i) => i.content)
      .join('\n\n')

    const fileItems = policyItems.filter(
      (i): i is PolicyInputItem & { type: 'file' } => i.type === 'file'
    )

    const promises: Promise<{ policies?: any }>[] = []

    if (textBlob.trim()) {
      promises.push(standardizePoliciesAction(textBlob).then((p) => ({ policies: p })))
    }

    for (const f of fileItems) {
      promises.push(standardizePoliciesImageAction(f.base64, f.mediaType).then((p) => ({ policies: p })))
    }

    const results = await Promise.allSettled(promises)

    const allPolicies: StandardizedPolicy[] = []
    const errors: string[] = []

    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(String(r.reason))
        continue
      }
      const { policies: pol } = r.value
      if (pol?.error) errors.push(`Policies: ${pol.error}`)
      if (pol?.policies) allPolicies.push(...pol.policies)
    }

    // Dedup by category
    const policyMap = new Map<string, StandardizedPolicy>()
    for (const p of allPolicies) {
      if (!policyMap.has(p.category)) policyMap.set(p.category, p)
    }

    const merged = Array.from(policyMap.values())

    if (merged.length === 0) {
      setPolicyError(errors.length > 0 ? errors.join('; ') : 'No policies extracted. Try providing more detail.')
      setPolicyPhase('input')
      return
    }

    setPolicies(merged)
    setPolicyPhase('review')
  }

  function updatePolicy(index: number, field: keyof StandardizedPolicy, value: any) {
    setPolicies((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function removePolicy(index: number) {
    setPolicies((prev) => prev.filter((_, i) => i !== index))
  }



  // ── Save ──────────────────────────────────────────────────────
  function handleSave() {
    const hasData = pricing.some((r) => r.regular_fee > 0) || policies.length > 0
    if (!hasData) return
    if (!centreId) {
      setSaveError('Centre must be created first (Step 1) before saving.')
      return
    }
    setSaveError(null)

    const cid = centreId
    startSaveTransition(async () => {
      // Save pricing if any rows have fees
      const pricingWithFees = pricing.filter((r) => r.regular_fee > 0)
      if (pricingWithFees.length > 0 || promotionsText.trim() || additionalFees) {
        const pricingResult = await savePricingAction(cid, {
          pricing: pricingWithFees,
          promotionsText: promotionsText.trim() || null,
          additionalFees,
          billingRaw: null,
        })
        if ('error' in pricingResult) {
          setSaveError(pricingResult.error)
          return
        }
      }

      // Save policies
      if (policies.length > 0) {
        const policyResult = await savePoliciesAction(cid, policies)
        if ('error' in policyResult) {
          setSaveError(policyResult.error)
          return
        }

        // Legacy field mapping
        const legacyUpdate: Record<string, string> = {}
        for (const policy of policies) {
          const legacyField = LEGACY_FIELD_MAP[policy.category]
          if (legacyField) legacyUpdate[legacyField] = policy.description
        }

        if (Object.keys(legacyUpdate).length > 0) {
          await updateCentreStep(cid, {
            replacement_class_policy: legacyUpdate.replacement_class_policy ?? '',
            makeup_class_policy: legacyUpdate.makeup_class_policy ?? '',
            commitment_terms: legacyUpdate.commitment_terms ?? '',
            notice_period_terms: legacyUpdate.notice_period_terms ?? '',
            payment_terms: legacyUpdate.payment_terms ?? '',
            other_policies: legacyUpdate.other_policies ?? '',
          })
        }
      }

      onComplete()
    })
  }

  // ── Loading state ──────────────────────────────────────────
  if (!pairsLoaded || !dataLoaded) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">Loading pricing data...</div>
    )
  }

  // Get unique subjects for bulk fill dropdown
  const uniqueSubjects = Array.from(
    new Map(pricing.map((r) => [r.subject_id || r.subject_name, { id: r.subject_id, name: r.subject_name }])).values()
  )

  const hasFilledPricing = pricing.some((r) => r.regular_fee > 0)
  const hasPolicies = policies.length > 0
  const hasAnything = hasFilledPricing || hasPolicies

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Pricing & Policies</h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill in pricing manually below. For policies, paste text or upload files and AI will extract them.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION A: PRICING (Manual Form)                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
          <div className="flex items-center gap-2">
            {pricing.length > 1 && (
              <button
                type="button"
                onClick={() => setShowBulkFill(!showBulkFill)}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1"
              >
                {showBulkFill ? 'Hide' : 'Bulk Fill'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddRow(!showAddRow)}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1"
            >
              + Add Row
            </button>
          </div>
        </div>

        {/* Bulk fill toolbar */}
        {showBulkFill && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Bulk Fill Pricing</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Apply to</label>
                <select
                  value={bulkScope === 'all' ? 'all' : bulkSubject}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setBulkScope('all')
                      setBulkSubject('')
                    } else {
                      setBulkScope('subject')
                      setBulkSubject(e.target.value)
                    }
                  }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                >
                  <option value="all">All rows</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s.id || s.name} value={s.id || s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Fee ($)</label>
                <input
                  type="number"
                  value={bulkFee}
                  onChange={(e) => setBulkFee(e.target.value)}
                  placeholder="280"
                  className="w-24 border border-gray-300 rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Lessons</label>
                <input
                  type="number"
                  value={bulkLessons}
                  onChange={(e) => setBulkLessons(e.target.value)}
                  placeholder="4"
                  className="w-16 border border-gray-300 rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Billing</label>
                <input
                  type="text"
                  value={bulkBilling}
                  onChange={(e) => setBulkBilling(e.target.value)}
                  placeholder="$280/month (4 lessons)"
                  className="w-48 border border-gray-300 rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Trial</label>
                <select
                  value={bulkTrialType}
                  onChange={(e) => setBulkTrialType(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                >
                  <option value="free">Free</option>
                  <option value="discounted">Discounted</option>
                  <option value="same_as_regular">Same as regular</option>
                </select>
              </div>
              {bulkTrialType === 'discounted' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Trial Fee</label>
                  <input
                    type="number"
                    value={bulkTrialFee}
                    onChange={(e) => setBulkTrialFee(e.target.value)}
                    className="w-20 border border-gray-300 rounded px-2 py-1.5 text-xs"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={applyBulkFill}
                className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Add custom row */}
        {showAddRow && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Add Custom Row</p>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs w-40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Level (optional)</label>
                <input
                  type="text"
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="e.g. Secondary 2"
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs w-40"
                />
              </div>
              <button
                type="button"
                onClick={addCustomRow}
                disabled={!newSubject.trim()}
                className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Pricing table */}
        {pricing.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">
              {centreId
                ? 'No subjects/levels found from the Schedule step. Add rows manually.'
                : 'Create a centre first to auto-fill subjects from the Schedule step, or add rows manually.'}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700">Subject</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700">Level</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700 w-24">Fee ($)</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700 w-20">Lessons</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700">Billing Display</th>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-700 w-28">Trial</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-700 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pricing.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      {editingPricingRow === i ? (
                        <>
                          <td className="px-3 py-2" colSpan={6}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Regular Fee ($)</label>
                                <input
                                  type="number"
                                  value={row.regular_fee || ''}
                                  onChange={(e) => updatePricingRow(i, 'regular_fee', parseFloat(e.target.value) || 0)}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Lessons/Period</label>
                                <input
                                  type="number"
                                  value={row.lessons_per_period ?? ''}
                                  onChange={(e) => updatePricingRow(i, 'lessons_per_period', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Trial Type</label>
                                <select
                                  value={row.trial_type}
                                  onChange={(e) => updatePricingRow(i, 'trial_type', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                >
                                  <option value="free">Free</option>
                                  <option value="discounted">Discounted</option>
                                  <option value="same_as_regular">Same as regular</option>
                                  <option value="multi_lesson">Multi-lesson pack</option>
                                </select>
                              </div>
                              {(row.trial_type === 'discounted' || row.trial_type === 'multi_lesson') && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-0.5">Trial Fee ($)</label>
                                  <input
                                    type="number"
                                    value={row.trial_fee}
                                    onChange={(e) => updatePricingRow(i, 'trial_fee', parseFloat(e.target.value) || 0)}
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                  />
                                </div>
                              )}
                              {row.trial_type === 'multi_lesson' && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-0.5">Trial Lessons</label>
                                  <input
                                    type="number"
                                    value={row.trial_lessons}
                                    onChange={(e) => updatePricingRow(i, 'trial_lessons', parseInt(e.target.value) || 1)}
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Duration (min)</label>
                                <input
                                  type="number"
                                  value={row.lesson_duration_minutes ?? ''}
                                  onChange={(e) => updatePricingRow(i, 'lesson_duration_minutes', e.target.value ? parseInt(e.target.value) : null)}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-500 mb-0.5">Billing Display</label>
                                <input
                                  type="text"
                                  value={row.billing_display}
                                  onChange={(e) => updatePricingRow(i, 'billing_display', e.target.value)}
                                  placeholder="e.g. $280/month (4 x 2hr lessons)"
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            <button
                              type="button"
                              onClick={() => setEditingPricingRow(null)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Done
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-gray-900 font-medium">{row.subject_name || '—'}</td>
                          <td className="px-3 py-2.5 text-gray-600">{row.level_label ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              value={row.regular_fee || ''}
                              onChange={(e) => updatePricingRow(i, 'regular_fee', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              value={row.lessons_per_period ?? ''}
                              onChange={(e) => updatePricingRow(i, 'lessons_per_period', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder="4"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.billing_display}
                              onChange={(e) => updatePricingRow(i, 'billing_display', e.target.value)}
                              placeholder="$280/month"
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={row.trial_type}
                              onChange={(e) => updatePricingRow(i, 'trial_type', e.target.value)}
                              className="w-full border border-gray-200 rounded px-1 py-1 text-xs"
                            >
                              <option value="free">Free</option>
                              <option value="discounted">Discounted</option>
                              <option value="same_as_regular">Regular rate</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingPricingRow(i)}
                                className="text-xs text-gray-400 hover:text-gray-700"
                                title="More options"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removePricingRow(i)}
                                className="text-xs text-red-400 hover:text-red-700"
                              >
                                X
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Promotions */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Promotions (optional)</label>
          <textarea
            value={promotionsText}
            onChange={(e) => setPromotionsText(e.target.value)}
            rows={2}
            placeholder="e.g. Sibling discount 10%. Free trial for new Sec 1 students. Early bird 5% off first term."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>

        {/* Additional fees */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Additional Fees (optional)</label>
          <textarea
            value={additionalFees ?? ''}
            onChange={(e) => setAdditionalFees(e.target.value || null)}
            rows={2}
            placeholder="e.g. Registration: $100. Deposit: 1 month. Materials: $50/term."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION B: POLICIES (AI Extraction)                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Policies</h3>
        <p className="text-xs text-gray-400 mb-3">
          Paste the centre&apos;s terms &amp; conditions or upload a screenshot/PDF. AI will extract and categorize policies.
        </p>

        {policyPhase === 'input' || policyPhase === 'extracting' ? (
          <div className="space-y-3">
            {/* Mode tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                type="button"
                onClick={() => setPolicyInputMode('text')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  policyInputMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setPolicyInputMode('file')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  policyInputMode === 'file' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload File
              </button>
            </div>

            {/* Text input */}
            {policyInputMode === 'text' && (
              <div>
                <textarea
                  value={policyTextDraft}
                  onChange={(e) => setPolicyTextDraft(e.target.value)}
                  rows={5}
                  disabled={policyPhase === 'extracting'}
                  placeholder="Paste policy text, T&C documents, WhatsApp messages..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={addPolicyText}
                  disabled={!policyTextDraft.trim() || policyPhase === 'extracting'}
                  className={`mt-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    policyTextDraft.trim() ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  + Add to queue
                </button>
              </div>
            )}

            {/* File input */}
            {policyInputMode === 'file' && (
              <div>
                <button
                  type="button"
                  onClick={() => policyFileRef.current?.click()}
                  disabled={policyPhase === 'extracting'}
                  className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  Click to upload an image or PDF
                </button>
                <input
                  ref={policyFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={handlePolicyFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Queue */}
            {policyItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Queued ({policyItems.length})</p>
                <div className="space-y-2">
                  {policyItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {item.type === 'text' ? (
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Text</span>
                          <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {item.mediaType === 'application/pdf' ? (
                            <div className="w-10 h-10 rounded border border-gray-200 bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-400">PDF</div>
                          ) : (
                            <img src={item.preview} alt="Uploaded" className="w-10 h-10 object-cover rounded border border-gray-200" />
                          )}
                          <span className="text-xs text-gray-500 truncate">{item.fileName}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePolicyInput(item.id)}
                        disabled={policyPhase === 'extracting'}
                        className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {policyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{policyError}</div>
            )}

            {policyPhase === 'extracting' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">Extracting policies...</div>
            )}

            <button
              type="button"
              onClick={handleExtractPolicies}
              disabled={policyItems.length === 0 || policyPhase === 'extracting'}
              className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
                policyPhase === 'extracting'
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : policyItems.length > 0
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {policyPhase === 'extracting' ? 'Extracting...' : 'Extract Policies with AI'}
            </button>
          </div>
        ) : (
          /* Policy review */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {policies.length} polic{policies.length !== 1 ? 'ies' : 'y'} extracted. Edit as needed.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPolicyPhase('input')
                  setPolicies([])
                  setPolicyItems([])
                  setEditingPolicyIndex(null)
                }}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1"
              >
                Re-extract
              </button>
            </div>

            {policies.map((policy, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  {editingPolicyIndex === i ? (
                    <input
                      type="text"
                      value={policy.category}
                      onChange={(e) => updatePolicy(i, 'category', e.target.value)}
                      className="text-sm font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 w-64"
                    />
                  ) : (
                    <h4 className="text-sm font-semibold text-gray-900">{policy.category}</h4>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPolicyIndex(editingPolicyIndex === i ? null : i)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {editingPolicyIndex === i ? 'Done' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePolicy(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  {editingPolicyIndex === i ? (
                    <textarea
                      value={policy.description}
                      onChange={(e) => updatePolicy(i, 'description', e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-line">{policy.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SAVE / SKIP                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasAnything}
          className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
            isSaving
              ? 'bg-gray-300 text-gray-500 cursor-wait'
              : hasAnything
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : 'Confirm & Save'}
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
