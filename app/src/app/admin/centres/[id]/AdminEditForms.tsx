'use client'

import { useState } from 'react'
import {
  updateAdminFields,
  updateCentreFieldsAsAdmin,
  approveDraftData,
  rejectDraftData,
} from './actions'

// ── Shared helpers ──────────────────────────────────────────

const pencilIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
)

function ViewRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">--</span>}</dd>
    </div>
  )
}

function SectionHeader({ title, editing, onEdit }: { title: string; editing: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      {!editing && (
        <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          {pencilIcon} Edit
        </button>
      )}
    </div>
  )
}

function SaveCancelRow({ saving, onSave, onCancel, message }: {
  saving: boolean; onSave: () => void; onCancel: () => void; message: { type: 'success' | 'error'; text: string } | null
}) {
  return (
    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
      <button onClick={onSave} disabled={saving} className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button onClick={onCancel} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
      {message && <span className={`text-sm ml-auto ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</span>}
    </div>
  )
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"

// ── Admin Controls Form ─────────────────────────────────────

interface AdminControlsProps {
  centreId: string
  initial: {
    name: string
    slug: string
    contact_email: string
    trial_type: 'free' | 'paid'
    trial_commission_rate: number
    conversion_commission_rate: number
    is_active: boolean
    is_paused: boolean
    is_trusted: boolean
  }
}

export function AdminControlsForm({ centreId, initial }: AdminControlsProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initial.name)
  const [slug, setSlug] = useState(initial.slug)
  const [contactEmail, setContactEmail] = useState(initial.contact_email)
  const [trialType, setTrialType] = useState(initial.trial_type)
  const [trialRate, setTrialRate] = useState(String(initial.trial_commission_rate))
  const [convRate, setConvRate] = useState(String(initial.conversion_commission_rate))
  const [isActive, setIsActive] = useState(initial.is_active)
  const [isPaused, setIsPaused] = useState(initial.is_paused)
  const [isTrusted, setIsTrusted] = useState(initial.is_trusted)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleCancel() {
    setName(initial.name); setSlug(initial.slug); setContactEmail(initial.contact_email)
    setTrialType(initial.trial_type); setTrialRate(String(initial.trial_commission_rate))
    setConvRate(String(initial.conversion_commission_rate)); setIsActive(initial.is_active)
    setIsPaused(initial.is_paused); setIsTrusted(initial.is_trusted)
    setEditing(false); setMessage(null)
  }

  async function handleSave() {
    setSaving(true); setMessage(null)
    try {
      await updateAdminFields(centreId, {
        name, slug, contact_email: contactEmail, trial_type: trialType,
        trial_commission_rate: parseFloat(trialRate) || 0,
        conversion_commission_rate: parseFloat(convRate) || 0,
        is_active: isActive, is_paused: isPaused, is_trusted: isTrusted,
      })
      setMessage({ type: 'success', text: 'Saved' })
      setEditing(false)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Failed' })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <SectionHeader title="Admin Controls" editing={editing} onEdit={() => { setEditing(true); setMessage(null) }} />
      {message && <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>}

      {!editing ? (
        <dl>
          <ViewRow label="Name" value={name} />
          <ViewRow label="Slug" value={`/${slug}`} />
          <ViewRow label="Contact Email" value={contactEmail} />
          <ViewRow label="Trial Type" value={trialType === 'free' ? 'Free' : 'Paid'} />
          <ViewRow label="Trial Commission" value={`S$${trialRate}`} />
          <ViewRow label="Conversion Commission" value={`S$${convRate}`} />
          <ViewRow label="Active" value={isActive ? 'Yes' : 'No'} />
          <ViewRow label="Paused" value={isPaused ? 'Yes' : 'No'} />
          <ViewRow label="Trusted" value={isTrusted ? 'Yes — edits go live immediately' : 'No — edits need review'} />
        </dl>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="text" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial Type</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={trialType === 'free'} onChange={() => setTrialType('free')} /> Free
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={trialType === 'paid'} onChange={() => setTrialType('paid')} /> Paid
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trial Commission (S$)</label>
              <input type="number" value={trialRate} onChange={(e) => setTrialRate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Commission (S$)</label>
              <input type="number" value={convRate} onChange={(e) => setConvRate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
              <div><span className="text-sm font-medium text-gray-700">Active</span><p className="text-xs text-gray-400">Visible on public listing</p></div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={isPaused} onChange={(e) => setIsPaused(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
              <div><span className="text-sm font-medium text-gray-700">Paused</span><p className="text-xs text-gray-400">Temporarily hidden</p></div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={isTrusted} onChange={(e) => setIsTrusted(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
              <div><span className="text-sm font-medium text-gray-700">Trusted</span><p className="text-xs text-gray-400">Edits go live immediately</p></div>
            </label>
          </div>
          <SaveCancelRow saving={saving} onSave={handleSave} onCancel={handleCancel} message={null} />
        </>
      )}
    </div>
  )
}

// ── Draft Data Inline Approve/Reject ────────────────────────

export function DraftDataInlineActions({ centreId }: { centreId: string }) {
  const [saving, setSaving] = useState(false)

  async function handle(action: 'approve' | 'reject') {
    setSaving(true)
    try {
      if (action === 'approve') await approveDraftData(centreId)
      else await rejectDraftData(centreId)
    } catch (e: any) {
      alert(e.message ?? 'Action failed')
    }
    setSaving(false)
  }

  return (
    <div className="flex gap-2">
      <button disabled={saving} onClick={() => handle('approve')} className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
        {saving ? '...' : 'Approve All Changes'}
      </button>
      <button disabled={saving} onClick={() => handle('reject')} className="text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
        {saving ? '...' : 'Reject All Changes'}
      </button>
    </div>
  )
}

// ── Profile Edit Section ────────────────────────────────────

export function ProfileEditForm({ centreId, initial }: {
  centreId: string
  initial: { description: string; teaching_style: string; track_record: string; class_size: number | null; years_operating: number | null }
}) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(initial.description)
  const [style, setStyle] = useState(initial.teaching_style)
  const [track, setTrack] = useState(initial.track_record)
  const [classSize, setClassSize] = useState(initial.class_size?.toString() ?? '')
  const [years, setYears] = useState(initial.years_operating?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleCancel() {
    setDesc(initial.description); setStyle(initial.teaching_style); setTrack(initial.track_record)
    setClassSize(initial.class_size?.toString() ?? ''); setYears(initial.years_operating?.toString() ?? '')
    setEditing(false); setMessage(null)
  }

  async function handleSave() {
    setSaving(true); setMessage(null)
    try {
      await updateCentreFieldsAsAdmin(centreId, {
        description: desc || null, teaching_style: style || null, track_record: track || null,
        class_size: classSize ? parseInt(classSize) : null, years_operating: years ? parseInt(years) : null,
      })
      setMessage({ type: 'success', text: 'Saved' })
      setEditing(false)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Failed' })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <SectionHeader title="Profile" editing={editing} onEdit={() => { setEditing(true); setMessage(null) }} />
      {message && <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>}

      {!editing ? (
        <dl>
          <ViewRow label="Description" value={desc} />
          <ViewRow label="Teaching Style" value={style} />
          <ViewRow label="Track Record" value={track} />
          <ViewRow label="Class Size" value={classSize ? Number(classSize) : null} />
          <ViewRow label="Years Operating" value={years ? Number(years) : null} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Teaching Style</label><textarea value={style} onChange={(e) => setStyle(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Track Record</label><textarea value={track} onChange={(e) => setTrack(e.target.value)} rows={3} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Class Size</label><input type="number" value={classSize} onChange={(e) => setClassSize(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Years Operating</label><input type="number" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} /></div>
            </div>
          </div>
          <SaveCancelRow saving={saving} onSave={handleSave} onCancel={handleCancel} message={null} />
        </>
      )}
    </div>
  )
}

// ── Location Edit Section ───────────────────────────────────

export function LocationEditForm({ centreId, initial }: {
  centreId: string
  initial: { address: string; area: string; nearest_mrt: string; parking_info: string }
}) {
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState(initial.address)
  const [area, setArea] = useState(initial.area)
  const [mrt, setMrt] = useState(initial.nearest_mrt)
  const [parking, setParking] = useState(initial.parking_info)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleCancel() {
    setAddress(initial.address); setArea(initial.area); setMrt(initial.nearest_mrt); setParking(initial.parking_info)
    setEditing(false); setMessage(null)
  }

  async function handleSave() {
    setSaving(true); setMessage(null)
    try {
      await updateCentreFieldsAsAdmin(centreId, {
        address: address || null, area: area || null, nearest_mrt: mrt || null, parking_info: parking || null,
      })
      setMessage({ type: 'success', text: 'Saved' })
      setEditing(false)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Failed' })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <SectionHeader title="Location" editing={editing} onEdit={() => { setEditing(true); setMessage(null) }} />
      {message && <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>}

      {!editing ? (
        <dl>
          <ViewRow label="Address" value={address} />
          <ViewRow label="Area" value={area} />
          <ViewRow label="Nearest MRT" value={mrt} />
          <ViewRow label="Parking Info" value={parking} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Area</label><input type="text" value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nearest MRT</label><input type="text" value={mrt} onChange={(e) => setMrt(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Parking Info</label><input type="text" value={parking} onChange={(e) => setParking(e.target.value)} className={inputCls} /></div>
          </div>
          <SaveCancelRow saving={saving} onSave={handleSave} onCancel={handleCancel} message={null} />
        </>
      )}
    </div>
  )
}

// ── Policies Edit Section ───────────────────────────────────

export function PoliciesEditForm({ centreId, initial }: {
  centreId: string
  initial: { replacement_class_policy: string; makeup_class_policy: string; commitment_terms: string; notice_period_terms: string; payment_terms: string; other_policies: string }
}) {
  const [editing, setEditing] = useState(false)
  const [replacement, setReplacement] = useState(initial.replacement_class_policy)
  const [makeup, setMakeup] = useState(initial.makeup_class_policy)
  const [commitment, setCommitment] = useState(initial.commitment_terms)
  const [notice, setNotice] = useState(initial.notice_period_terms)
  const [payment, setPayment] = useState(initial.payment_terms)
  const [other, setOther] = useState(initial.other_policies)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleCancel() {
    setReplacement(initial.replacement_class_policy); setMakeup(initial.makeup_class_policy)
    setCommitment(initial.commitment_terms); setNotice(initial.notice_period_terms)
    setPayment(initial.payment_terms); setOther(initial.other_policies)
    setEditing(false); setMessage(null)
  }

  async function handleSave() {
    setSaving(true); setMessage(null)
    try {
      await updateCentreFieldsAsAdmin(centreId, {
        replacement_class_policy: replacement || null, makeup_class_policy: makeup || null,
        commitment_terms: commitment || null, notice_period_terms: notice || null,
        payment_terms: payment || null, other_policies: other || null,
      })
      setMessage({ type: 'success', text: 'Saved' })
      setEditing(false)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Failed' })
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <SectionHeader title="Policies" editing={editing} onEdit={() => { setEditing(true); setMessage(null) }} />
      {message && <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>}

      {!editing ? (
        <dl>
          <ViewRow label="Replacement Class" value={replacement} />
          <ViewRow label="Makeup Class" value={makeup} />
          <ViewRow label="Commitment Terms" value={commitment} />
          <ViewRow label="Notice Period" value={notice} />
          <ViewRow label="Payment Terms" value={payment} />
          <ViewRow label="Other Policies" value={other} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Replacement Class Policy</label><textarea value={replacement} onChange={(e) => setReplacement(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Makeup Class Policy</label><textarea value={makeup} onChange={(e) => setMakeup(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Commitment Terms</label><textarea value={commitment} onChange={(e) => setCommitment(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notice Period Terms</label><textarea value={notice} onChange={(e) => setNotice(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label><textarea value={payment} onChange={(e) => setPayment(e.target.value)} rows={3} className={inputCls} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Other Policies</label><textarea value={other} onChange={(e) => setOther(e.target.value)} rows={3} className={inputCls} /></div>
          </div>
          <SaveCancelRow saving={saving} onSave={handleSave} onCancel={handleCancel} message={null} />
        </>
      )}
    </div>
  )
}
