'use client'

import { useRef, useMemo, useState, useTransition } from 'react'
import {
  createMinimalCentre,
  updateCentreStep,
  addSlotsForCentre,
  type TeacherInput,
  type TrialSlotInput,
} from './actions'
import { uploadCentreImage } from './image-actions'
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
  linkedin_url: '',
  students_taught: null,
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
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')

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

  // Step 4: Schedule (optional) — individual slots
  interface SlotEntry {
    subjectId: string
    levelId: string
    levelMode: 'standard' | 'age' | 'custom'
    ageMin: string
    ageMax: string
    customLevel: string
    stream: string
    date: string
    startTime: string
    endTime: string
    trialFee: string
    maxStudents: string
    notes: string
  }
  const [slotList, setSlotList] = useState<SlotEntry[]>([])
  const [slotSubjectId, setSlotSubjectId] = useState('')
  const [slotLevelId, setSlotLevelId] = useState('')
  const [slotLevelMode, setSlotLevelMode] = useState<'standard' | 'age' | 'custom'>('standard')
  const [slotAgeMin, setSlotAgeMin] = useState('')
  const [slotAgeMax, setSlotAgeMax] = useState('')
  const [slotCustomLevel, setSlotCustomLevel] = useState('')
  const [slotStream, setSlotStream] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [slotStartTime, setSlotStartTime] = useState('')
  const [slotEndTime, setSlotEndTime] = useState('')
  const [slotTrialFee, setSlotTrialFee] = useState('')
  const [slotMaxStudents, setSlotMaxStudents] = useState('4')
  const [slotNotes, setSlotNotes] = useState('')

  const levelGroups = useMemo(() => levels.reduce<Record<string, typeof levels>>((acc, l) => {
    const group = l.level_group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(l)
    return acc
  }, {}), [levels])

  function resetSlotForm() {
    setSlotSubjectId(''); setSlotLevelId(''); setSlotLevelMode('standard')
    setSlotAgeMin(''); setSlotAgeMax(''); setSlotCustomLevel(''); setSlotStream('')
    setSlotDate(''); setSlotStartTime(''); setSlotEndTime('')
    setSlotTrialFee(''); setSlotMaxStudents('4'); setSlotNotes('')
  }

  function addSlotToList() {
    if (!slotSubjectId || !slotDate || !slotStartTime || !slotEndTime) return
    setSlotList((prev) => [...prev, {
      subjectId: slotSubjectId, levelId: slotLevelId, levelMode: slotLevelMode,
      ageMin: slotAgeMin, ageMax: slotAgeMax, customLevel: slotCustomLevel,
      stream: slotStream, date: slotDate, startTime: slotStartTime, endTime: slotEndTime,
      trialFee: slotTrialFee, maxStudents: slotMaxStudents, notes: slotNotes,
    }])
    resetSlotForm()
  }

  function removeSlotFromList(index: number) {
    setSlotList((prev) => prev.filter((_, i) => i !== index))
  }

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

  // ── Validation ────────────────────────────────────────────

  function canProceed(): boolean {
    if (step === 0) return name.trim().length > 0 && contactEmail.trim().length > 0
    if (step === 1) return specialisation.trim().length > 0
    if (step === 2) return teachers.some((t) => t.name.trim().length > 0)
    return true
  }

  const hasSlots = slotList.length > 0

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
          trial_commission_rate: trialCommissionRate ? parseFloat(trialCommissionRate) : 0,
          conversion_commission_rate: conversionCommissionRate ? parseFloat(conversionCommissionRate) : 0,
          website_url: websiteUrl.trim(),
          instagram_url: instagramUrl.trim(),
          tiktok_url: tiktokUrl.trim(),
          whatsapp_number: whatsappNumber.trim(),
          phone_number: phoneNumber.trim(),
          google_maps_url: googleMapsUrl.trim(),
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
    if (slotList.length === 0) { setStep((s) => s + 1); return }

    const trialSlots: TrialSlotInput[] = slotList.map((s) => ({
      subject_id: s.subjectId || null,
      level_id: s.levelMode === 'standard' ? (s.levelId || null) : null,
      age_min: s.levelMode === 'age' && s.ageMin ? parseInt(s.ageMin) : null,
      age_max: s.levelMode === 'age' && s.ageMax ? parseInt(s.ageMax) : null,
      custom_level: s.levelMode === 'custom' && s.customLevel ? s.customLevel.trim() : null,
      stream: s.levelMode === 'standard' && s.stream ? s.stream : null,
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime,
      trial_fee: s.trialFee ? parseFloat(s.trialFee) : 0,
      max_students: s.maxStudents ? parseInt(s.maxStudents) : 4,
      notes: s.notes,
      raw_subject_text: '',
    }))

    startTransition(async () => {
      const result = await addSlotsForCentre(centreId, trialSlots)
      if ('error' in result) {
        setError(result.error)
      } else {
        setStep((s) => s + 1)
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
            onClick={() => i < step && setStep(i)}
            disabled={i >= step}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
              i === step
                ? 'text-gray-900'
                : i < step
                ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                : 'text-gray-400 cursor-default'
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

              {/* Contact & Social Links */}
              <div className="md:col-span-2 border-t border-gray-100 pt-5 mt-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Contact &amp; Social Links</h3>
                <p className="text-xs text-gray-400 mb-4">All optional. Parents will see these on the centre page.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Google Maps URL</label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/yourcentre"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">TikTok URL</label>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@yourcentre"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. 6591234567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 6567891234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                />
              </div>
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
                In one sentence, tell me about your centre. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                placeholder="e.g. We specialise in small-group PSLE Mathematics for P4-P6 students."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What is your teaching style in 2-5 words?
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Structured & exam-focused',
                  'Concept mastery first',
                  'Small group, high attention',
                  'Past-paper intensive',
                  'Bilingual & culturally aware',
                  'Creative & inquiry-based',
                  'Patient, confidence-building',
                  'Fast-paced, high-achiever track',
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setTeachingApproach(example)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      teachingApproach === example
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={teachingApproach}
                onChange={(e) => setTeachingApproach(e.target.value)}
                placeholder="Or type your own..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share one result you&apos;re proud of — a stat that shows what your students achieve.
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  '90% improved by 2 grades or more',
                  '85% scored B3 and above',
                  '70% of our P6s made it to their first-choice secondary',
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setResults(example)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      results === example
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={results}
                onChange={(e) => setResults(e.target.value)}
                placeholder="Or type your own..."
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Years of Teaching</label>
                    <input
                      type="number"
                      value={teacher.years_experience ?? ''}
                      onChange={(e) => updateTeacher(idx, 'years_experience', e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Students Taught</label>
                    <input
                      type="number"
                      value={teacher.students_taught ?? ''}
                      onChange={(e) => updateTeacher(idx, 'students_taught', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g. 500"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="url"
                      value={teacher.linkedin_url}
                      onChange={(e) => updateTeacher(idx, 'linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
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

        {/* ── Step 4: Schedule (optional) ──────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Trial Slot Schedule <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
              <p className="text-sm text-gray-500 mt-1">
                Add individual trial class slots. You can also add more later.
              </p>
            </div>

            {/* Added slots list */}
            {slotList.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Subject</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Level</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Time</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {slotList.map((slot, i) => {
                      const subName = subjects.find((s) => s.id === slot.subjectId)?.name ?? '—'
                      const lvlLabel = slot.levelMode === 'standard'
                        ? (levels.find((l) => l.id === slot.levelId)?.label ?? 'All')
                        : slot.levelMode === 'age'
                        ? `Ages ${slot.ageMin}–${slot.ageMax || '?'}`
                        : slot.customLevel || '—'
                      return (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-900">{subName}</td>
                          <td className="px-3 py-2 text-gray-600">{lvlLabel}{slot.stream && <span className="text-gray-400 text-xs ml-1">({slot.stream})</span>}</td>
                          <td className="px-3 py-2 text-gray-600">{slot.date}</td>
                          <td className="px-3 py-2 text-gray-600">{slot.startTime}–{slot.endTime}</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" onClick={() => removeSlotFromList(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add slot form */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700">Add a slot</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <select value={slotSubjectId} onChange={(e) => setSlotSubjectId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400">
                    <option value="">Select subject...</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5 mb-2">
                    {([['standard', 'School Level'], ['age', 'Age Range'], ['custom', 'Custom']] as const).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => { setSlotLevelMode(key); setSlotLevelId(''); setSlotStream(''); setSlotAgeMin(''); setSlotAgeMax(''); setSlotCustomLevel('') }}
                        className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors ${slotLevelMode === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {slotLevelMode === 'standard' && (
                    <>
                      <select value={slotLevelId} onChange={(e) => setSlotLevelId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400">
                        <option value="">Select level...</option>
                        {Object.entries(levelGroups).map(([group, lvls]) => (
                          <optgroup key={group} label={group}>
                            {lvls.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {slotLevelId && levels.find((l) => l.id === slotLevelId)?.level_group === 'Secondary' && (
                        <select value={slotStream} onChange={(e) => setSlotStream(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400">
                          <option value="">No stream</option>
                          <option value="G3">G3 (Express)</option>
                          <option value="G2">G2 (Normal Academic)</option>
                          <option value="G1">G1 (Foundational)</option>
                          <option value="IP">IP</option>
                          <option value="IB">IB</option>
                        </select>
                      )}
                    </>
                  )}
                  {slotLevelMode === 'age' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Ages</span>
                      <input type="number" min="3" max="25" value={slotAgeMin} onChange={(e) => setSlotAgeMin(e.target.value)} placeholder="Min" className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                      <span className="text-sm text-gray-400">to</span>
                      <input type="number" min="3" max="25" value={slotAgeMax} onChange={(e) => setSlotAgeMax(e.target.value)} placeholder="Max" className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                    </div>
                  )}
                  {slotLevelMode === 'custom' && (
                    <input type="text" value={slotCustomLevel} onChange={(e) => setSlotCustomLevel(e.target.value)} placeholder="e.g. White Belt, Grade 1, Beginner" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start <span className="text-red-500">*</span></label>
                    <input type="time" value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End <span className="text-red-500">*</span></label>
                    <input type="time" value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trial Fee (S$)</label>
                  <input type="number" min="0" step="0.01" value={slotTrialFee} onChange={(e) => setSlotTrialFee(e.target.value)} placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input type="number" min="1" value={slotMaxStudents} onChange={(e) => setSlotMaxStudents(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)} placeholder="e.g. Bring calculator" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                </div>
              </div>
              <button
                type="button"
                onClick={addSlotToList}
                disabled={!slotSubjectId || !slotDate || !slotStartTime || !slotEndTime}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                  slotSubjectId && slotDate && slotStartTime && slotEndTime
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                + Add Slot
              </button>
            </div>
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
              disabled={isPending || !centreId}
              className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
                isPending
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isPending ? 'Saving slots...' : hasSlots ? 'Save Slots & Continue' : 'Skip & Continue'}
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
