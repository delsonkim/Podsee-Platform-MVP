'use client'

import { useRef, useState, useTransition } from 'react'
import {
  createMinimalCentre,
  updateCentreStep,
  addSlotsForCentre,
  type TeacherInput,
  type TrialSlotInput,
} from './actions'
import { uploadCentreImage, uploadPaynowQr } from './image-actions'
import SlotUploader, { type ParsedSlot } from '@/components/SlotUploader'
import { parseSchedule, parseScheduleImage, createCustomSubject, saveParseCorrections } from './actions'
import PricingPolicyStep from './PricingPolicyStep'

interface Subject {
  id: string
  name: string
  sort_order: number
}

interface Level {
  id: string
  code: string
  label: string
  level_group: string
  sort_order: number
}

const STEPS = [
  'Basic Info',
  'About',
  'Team',
  'Schedule',
  'Pricing & Policies',
]

const STUDENT_TYPES = [
  { key: 'struggling', label: 'Struggling — need to catch up' },
  { key: 'average', label: 'Average — aiming to improve 1-2 grades' },
  { key: 'high-achievers', label: 'High-achievers — top schools / competitions' },
  { key: 'all', label: 'All levels' },
]

const emptyTeacher: TeacherInput = {
  name: '',
  role: '',
  is_founder: false,
  qualifications: '',
  bio: '',
  years_experience: null,
  subject_ids: [],
  level_ids: [],
}

export default function AddCentreForm({
  subjects,
  levels,
}: {
  subjects: Subject[]
  levels: Level[]
}) {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [centreId, setCentreId] = useState<string | null>(null)
  const [stepSaving, setStepSaving] = useState(false)

  // Centre images (up to 3)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Basic Info
  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [nearestMrt, setNearestMrt] = useState('')
  const [yearsOperating, setYearsOperating] = useState('')
  const [trialCommissionRate, setTrialCommissionRate] = useState('')
  const [conversionCommissionRate, setConversionCommissionRate] = useState('')
  const [trialType, setTrialType] = useState<'free' | 'paid'>('free')
  const [paynowQrImageUrl, setPaynowQrImageUrl] = useState<string | null>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Step 2: About
  const [specialisation, setSpecialisation] = useState('')
  const [studentTypes, setStudentTypes] = useState<Set<string>>(new Set())
  const [teachingApproach, setTeachingApproach] = useState('')
  const [results, setResults] = useState('')
  const [classSize, setClassSize] = useState('')

  // Step 3: Team
  const [teachers, setTeachers] = useState<TeacherInput[]>([
    { ...emptyTeacher, is_founder: true, role: 'Founder' },
  ])

  // Step 4: Schedule (required)
  const [importedSlots, setImportedSlots] = useState<ParsedSlot[]>([])

  // ── Handlers ──────────────────────────────────────────────

  function toggleStudentType(key: string) {
    setStudentTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateTeacher(index: number, field: keyof TeacherInput, value: any) {
    setTeachers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  function addTeacher() {
    setTeachers((prev) => [...prev, { ...emptyTeacher }])
  }

  function removeTeacher(index: number) {
    setTeachers((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSlotsImported(slots: ParsedSlot[]) {
    setImportedSlots(slots)
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadCentreImage(fd)
    setImageUploading(false)
    if ('url' in result) setImageUrls((prev) => [...prev, result.url])
    else setError(result.error)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleQrSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPaynowQr(fd)
    setQrUploading(false)
    if ('url' in result) setPaynowQrImageUrl(result.url)
    else setError(result.error)
  }

  // ── Validation ────────────────────────────────────────────

  function canProceed(): boolean {
    if (step === 0) return name.trim().length > 0 && contactEmail.trim().length > 0
    if (step === 1) return specialisation.trim().length > 0
    if (step === 2) return teachers.some((t) => t.name.trim().length > 0)
    return true
  }

  const hasValidSlots = importedSlots.some((s) => s.status === 'ok' || s.status === 'warning')

  // ── Progressive save per step ────────────────────────────

  async function handleNext() {
    setError(null)
    setStepSaving(true)

    try {
      // Step 1 → create the centre record immediately
      if (step === 0 && !centreId) {
        const result = await createMinimalCentre({
          name: name.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          address: address.trim(),
          area: area.trim(),
          nearest_mrt: nearestMrt.trim(),
          years_operating: yearsOperating ? parseInt(yearsOperating) : null,
          image_urls: imageUrls,
          trial_type: trialType,
          paynow_qr_image_url: trialType === 'paid' ? paynowQrImageUrl : null,
          trial_commission_rate: trialCommissionRate ? parseFloat(trialCommissionRate) : 0,
          conversion_commission_rate: conversionCommissionRate ? parseFloat(conversionCommissionRate) : 0,
        })
        if ('error' in result) { setError(result.error); return }
        setCentreId(result.centreId)
        setStep((s) => s + 1)
        return
      }

      // Step 1 already created — just advance (e.g. user went back to step 1)
      if (step === 0 && centreId) {
        setStep((s) => s + 1)
        return
      }

      if (!centreId) { setError('Centre not created yet.'); return }

      // Step 2: About & Teaching
      if (step === 1) {
        const result = await updateCentreStep(centreId, {
          specialisation: specialisation.trim(),
          student_types: Array.from(studentTypes),
          teaching_approach: teachingApproach.trim(),
          results: results.trim(),
          class_size: classSize ? parseInt(classSize) : null,
        })
        if ('error' in result) { setError(result.error); return }
        setStep((s) => s + 1)
        return
      }

      // Step 3: Team
      if (step === 2) {
        const result = await updateCentreStep(centreId, { teachers })
        if ('error' in result) { setError(result.error); return }
        setStep((s) => s + 1)
        return
      }

    } finally {
      setStepSaving(false)
    }
  }

  // Step 4: Save slots and advance to Pricing & Policies
  function handleSaveSlots() {
    setError(null)
    if (!centreId) { setError('Centre not created yet.'); return }

    const trialSlots: TrialSlotInput[] = importedSlots.map((s) => ({
      subject_id: s.subject_id,
      level_id: s.level_id,
      age_min: s.age_min,
      age_max: s.age_max,
      custom_level: s.custom_level,
      stream: s.stream,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      trial_fee: s.trial_fee,
      max_students: s.max_students,
      notes: s.notes,
      raw_subject_text: s.raw_subject_text,
    }))

    startTransition(async () => {
      const result = await addSlotsForCentre(centreId, trialSlots)
      if ('error' in result) {
        setError(result.error)
      } else {
        setStep((s) => s + 1) // Advance to Pricing & Policies step
      }
    })
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i !== step && setStep(i)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
              i === step
                ? 'text-gray-900'
                : i < step
                ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                : 'text-gray-400 hover:text-gray-600 cursor-pointer'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === step
                  ? 'bg-gray-900 text-white'
                  : i < step
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? '\u2713' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {i < STEPS.length - 1 && <span className="text-gray-200 mx-1">&mdash;</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* ── Step 1: Basic Info ─────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
              <p className="text-sm text-gray-500 mt-1">Tell us about the centre.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MathPro Academy"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              {/* Centre images (up to 3) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre Photos <span className="text-gray-400 font-normal">(optional, up to 3)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Landscape photos (16:9). Max 7MB each. First photo is the main hero image.
                </p>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imageUrls.map((url, i) => (
                      <div key={url} className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img src={url} alt={`Centre photo ${i + 1}`} className="w-full h-28 object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-gray-900/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                            Main
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur text-gray-600 hover:text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imageUrls.length < 3 && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    {imageUploading ? 'Uploading...' : `Click to upload${imageUrls.length > 0 ? ' another photo' : ' a photo'}`}
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre Owner Email <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">
                  The centre owner will receive an invite to sign in with this Google email and access their dashboard.
                </p>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. owner@mathproacademy.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Blk 201 Tampines St 21, #02-01, Singapore 520201"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Tampines"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nearest MRT <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={nearestMrt}
                  onChange={(e) => setNearestMrt(e.target.value)}
                  placeholder="e.g. Tampines MRT (EW2/DT32)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years Operating</label>
                <input
                  type="number"
                  value={yearsOperating}
                  onChange={(e) => setYearsOperating(e.target.value)}
                  placeholder="e.g. 5"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial Commission (S$)</label>
                <p className="text-xs text-gray-400 mb-1">Charged per completed trial</p>
                <input
                  type="number"
                  value={trialCommissionRate}
                  onChange={(e) => setTrialCommissionRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Commission (S$)</label>
                <p className="text-xs text-gray-400 mb-1">Charged per student enrollment</p>
                <input
                  type="number"
                  value={conversionCommissionRate}
                  onChange={(e) => setConversionCommissionRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>

              {/* Trial Type */}
              <div className="md:col-span-2 border-t border-gray-100 pt-5 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial Type</label>
                <p className="text-xs text-gray-400 mb-3">Does this centre charge a fee for trial classes?</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trial_type"
                      value="free"
                      checked={trialType === 'free'}
                      onChange={() => { setTrialType('free'); setPaynowQrImageUrl(null) }}
                      className="w-4 h-4 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Free trial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trial_type"
                      value="paid"
                      checked={trialType === 'paid'}
                      onChange={() => setTrialType('paid')}
                      className="w-4 h-4 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Paid trial</span>
                  </label>
                </div>
              </div>

              {/* PayNow QR upload — only when paid */}
              {trialType === 'paid' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PayNow QR Code Screenshot
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Upload a screenshot of the centre&apos;s PayNow QR code. Parents will see this when booking a paid trial.
                  </p>
                  {paynowQrImageUrl ? (
                    <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={paynowQrImageUrl}
                        alt="PayNow QR"
                        className="w-48 h-48 object-contain bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPaynowQrImageUrl(null)
                          if (qrInputRef.current) qrInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur text-gray-600 hover:text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-sm"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      disabled={qrUploading}
                      className="w-full border-2 border-dashed border-gray-200 rounded-lg py-8 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                    >
                      {qrUploading ? 'Uploading...' : 'Click to upload PayNow QR screenshot'}
                    </button>
                  )}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: About & Teaching ───────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">About &amp; Teaching</h2>
              <p className="text-sm text-gray-500 mt-1">Answer these questions to build your listing description.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                In one sentence, what do you specialise in? <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                e.g. &quot;We specialise in small-group PSLE Mathematics for P4-P6 students.&quot;
              </p>
              <input
                type="text"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">What type of student do you help most?</p>
              <div className="space-y-2">
                {STUDENT_TYPES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={studentTypes.has(key)}
                      onChange={() => toggleStudentType(key)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What makes your teaching approach different from others?
              </label>
              <p className="text-xs text-gray-400 mb-2">
                e.g. concept mastery before drilling, structured answering techniques, past-paper focus
              </p>
              <textarea
                value={teachingApproach}
                onChange={(e) => setTeachingApproach(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What results have your students achieved?
              </label>
              <p className="text-xs text-gray-400 mb-2">
                e.g. &quot;80% of our P6 students improved by at least one grade band.&quot;
              </p>
              <textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class size</label>
              <input
                type="number"
                value={classSize}
                onChange={(e) => setClassSize(e.target.value)}
                placeholder="e.g. 8"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Team ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Team</h2>
              <p className="text-sm text-gray-500 mt-1">Founder first, then any additional teachers.</p>
            </div>

            {teachers.map((teacher, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {teacher.is_founder ? 'Founder / Director' : `Teacher ${idx}`}
                  </h3>
                  {!teacher.is_founder && (
                    <button type="button" onClick={() => removeTeacher(idx)} className="text-xs text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name {teacher.is_founder && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={teacher.name}
                      onChange={(e) => updateTeacher(idx, 'name', e.target.value)}
                      placeholder="e.g. John Tan"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <input
                      type="text"
                      value={teacher.role}
                      onChange={(e) => updateTeacher(idx, 'role', e.target.value)}
                      placeholder="e.g. Head Tutor, Math Specialist"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qualifications</label>
                    <input
                      type="text"
                      value={teacher.qualifications}
                      onChange={(e) => updateTeacher(idx, 'qualifications', e.target.value)}
                      placeholder="e.g. B.Sc. Mathematics NUS, NIE-trained"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      value={teacher.years_experience ?? ''}
                      onChange={(e) => updateTeacher(idx, 'years_experience', e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Short Bio</label>
                    <p className="text-xs text-gray-400 mb-1">2-3 sentences about their background and approach.</p>
                    <textarea
                      value={teacher.bio}
                      onChange={(e) => updateTeacher(idx, 'bio', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTeacher}
              className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              + Add another teacher
            </button>
          </div>
        )}

        {/* ── Step 4: Schedule (required) ──────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Trial Slot Schedule</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload the centre&apos;s trial class schedule. Subjects and levels will be auto-detected from the data.
              </p>
            </div>

            {importedSlots.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 font-medium">
                  {importedSlots.length} slot{importedSlots.length !== 1 ? 's' : ''} ready to import
                </p>
                <button
                  type="button"
                  onClick={() => setImportedSlots([])}
                  className="text-xs text-green-600 hover:text-green-800 mt-1"
                >
                  Clear and re-upload
                </button>
              </div>
            )}

            {importedSlots.length === 0 && (
              <SlotUploader
                subjects={subjects}
                levels={levels}
                centreId={centreId ?? undefined}
                onSlotsReady={handleSlotsImported}
                parseScheduleFn={(text, weeks) => parseSchedule(text, centreId ?? undefined, weeks)}
                parseScheduleImageFn={(b64, mt, weeks) => parseScheduleImage(b64, mt, centreId ?? undefined, weeks)}
                createCustomSubjectFn={createCustomSubject}
                saveCorrectionsFn={saveParseCorrections}
              />
            )}
          </div>
        )}

        {/* ── Step 5: Pricing & Policies ─────────────────────── */}
        {step === 4 && (
          <PricingPolicyStep
            centreId={centreId ?? undefined}
            onComplete={() => {
              window.location.href = '/admin/centres'
            }}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0 || stepSaving}
          className={`text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
            step === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {/* Schedule step: save slots and advance to Pricing & Policies */}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSaveSlots}
              disabled={isPending || !hasValidSlots || !centreId}
              className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
                isPending
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : hasValidSlots && centreId
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isPending ? 'Saving slots...' : 'Save Slots & Continue'}
            </button>
          )}

          {/* Pricing & Policies (4) step handles its own buttons */}

          {/* Steps 0-2: normal Next button */}
          {step < 3 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || stepSaving}
              className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
                stepSaving
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : canProceed()
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {stepSaving ? 'Saving...' : step === 0 && !centreId ? 'Create & Continue' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
