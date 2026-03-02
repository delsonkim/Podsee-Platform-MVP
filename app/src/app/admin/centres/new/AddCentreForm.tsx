'use client'

import { useState, useTransition } from 'react'
import { createCentre, type TeacherInput, type ProgrammeInput, type TrialSlotInput } from './actions'
import SubjectTypeahead from './SubjectTypeahead'
import SlotUploader, { type ParsedSlot } from './SlotUploader'

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

interface Programme {
  subject_id: string
  subject_name: string
  display_name: string
  level_ids: string[]
}

const STEPS = [
  'Basic Info',
  'Programmes',
  'About',
  'Team',
  'Policies',
  'Schedule',
]

type CentreType = 'academic' | 'enrichment' | 'both'

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

  // Step 1: Basic Info
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [nearestMrt, setNearestMrt] = useState('')
  const [yearsOperating, setYearsOperating] = useState('')

  // Step 2: Programmes
  const [centreType, setCentreType] = useState<CentreType | null>(null)
  const [programmes, setProgrammes] = useState<Programme[]>([])

  // Step 3: About
  const [specialisation, setSpecialisation] = useState('')
  const [studentTypes, setStudentTypes] = useState<Set<string>>(new Set())
  const [teachingApproach, setTeachingApproach] = useState('')
  const [results, setResults] = useState('')
  const [classSize, setClassSize] = useState('')

  // Step 4: Team
  const [teachers, setTeachers] = useState<TeacherInput[]>([
    { ...emptyTeacher, is_founder: true, role: 'Founder' },
  ])

  // Step 5: Policies
  const [replacementPolicy, setReplacementPolicy] = useState('')
  const [makeupPolicy, setMakeupPolicy] = useState('')
  const [commitmentTerms, setCommitmentTerms] = useState('')
  const [noticePeriod, setNoticePeriod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [otherPolicies, setOtherPolicies] = useState('')

  // Step 6: Schedule
  const [importedSlots, setImportedSlots] = useState<ParsedSlot[]>([])

  // ── Derived data ──────────────────────────────────────────────

  // Filter subjects by centre type
  const filteredSubjects = centreType
    ? subjects.filter((s) => {
        if (centreType === 'academic') return s.sort_order < 100
        if (centreType === 'enrichment') return s.sort_order >= 100
        return true
      })
    : subjects

  // Filter levels by centre type
  const academicLevelGroups = ['primary', 'secondary', 'jc']
  const filteredLevels = centreType
    ? levels.filter((l) => {
        if (centreType === 'academic') return academicLevelGroups.includes(l.level_group)
        if (centreType === 'enrichment') return l.level_group === 'other'
        return true
      })
    : levels

  // Group filtered levels
  const levelGroups: { label: string; group: string; items: Level[] }[] = [
    { label: 'Primary', group: 'primary', items: filteredLevels.filter((l) => l.level_group === 'primary') },
    { label: 'Secondary', group: 'secondary', items: filteredLevels.filter((l) => l.level_group === 'secondary') },
    { label: 'JC', group: 'jc', items: filteredLevels.filter((l) => l.level_group === 'jc') },
    { label: 'Age Groups / Skill / Music', group: 'other', items: filteredLevels.filter((l) => l.level_group === 'other') },
  ].filter((g) => g.items.length > 0)

  const selectedSubjectIds = new Set(programmes.map((p) => p.subject_id))

  // ── Handlers ──────────────────────────────────────────────────

  function addProgramme(subject: Subject) {
    setProgrammes((prev) => [
      ...prev,
      { subject_id: subject.id, subject_name: subject.name, display_name: '', level_ids: [] },
    ])
  }

  function removeProgramme(subjectId: string) {
    setProgrammes((prev) => prev.filter((p) => p.subject_id !== subjectId))
  }

  function updateProgrammeDisplayName(subjectId: string, displayName: string) {
    setProgrammes((prev) =>
      prev.map((p) => (p.subject_id === subjectId ? { ...p, display_name: displayName } : p))
    )
  }

  function toggleProgrammeLevel(subjectId: string, levelId: string) {
    setProgrammes((prev) =>
      prev.map((p) => {
        if (p.subject_id !== subjectId) return p
        const ids = p.level_ids.includes(levelId)
          ? p.level_ids.filter((id) => id !== levelId)
          : [...p.level_ids, levelId]
        return { ...p, level_ids: ids }
      })
    )
  }

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

  function toggleTeacherSubject(teacherIndex: number, subjectId: string) {
    setTeachers((prev) =>
      prev.map((t, i) => {
        if (i !== teacherIndex) return t
        const ids = t.subject_ids.includes(subjectId)
          ? t.subject_ids.filter((id) => id !== subjectId)
          : [...t.subject_ids, subjectId]
        return { ...t, subject_ids: ids }
      })
    )
  }

  function toggleTeacherLevel(teacherIndex: number, levelId: string) {
    setTeachers((prev) =>
      prev.map((t, i) => {
        if (i !== teacherIndex) return t
        const ids = t.level_ids.includes(levelId)
          ? t.level_ids.filter((id) => id !== levelId)
          : [...t.level_ids, levelId]
        return { ...t, level_ids: ids }
      })
    )
  }

  function handleSlotsImported(slots: ParsedSlot[]) {
    setImportedSlots(slots)
  }

  // ── Validation ────────────────────────────────────────────────

  function canProceed(): boolean {
    if (step === 0) return name.trim().length > 0
    if (step === 1) return centreType !== null && programmes.length > 0 && programmes.every((p) => p.level_ids.length > 0)
    if (step === 2) return specialisation.trim().length > 0
    if (step === 3) return teachers.some((t) => t.name.trim().length > 0)
    return true
  }

  // ── Submit ────────────────────────────────────────────────────

  function handleSubmit() {
    setError(null)

    const trialSlots: TrialSlotInput[] = importedSlots.map((s) => ({
      subject_id: s.subject_id,
      level_id: s.level_id,
      age_min: s.age_min,
      age_max: s.age_max,
      custom_level: s.custom_level,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      trial_fee: s.trial_fee,
      max_students: s.max_students,
      notes: s.notes,
    }))

    const programmeInputs: ProgrammeInput[] = programmes.map((p) => ({
      subject_id: p.subject_id,
      display_name: p.display_name,
      level_ids: p.level_ids,
    }))

    startTransition(async () => {
      const result = await createCentre({
        name: name.trim(),
        address: address.trim(),
        area: area.trim(),
        nearest_mrt: nearestMrt.trim(),
        years_operating: yearsOperating ? parseInt(yearsOperating) : null,
        centre_type: centreType!,
        programmes: programmeInputs,
        specialisation: specialisation.trim(),
        student_types: Array.from(studentTypes),
        teaching_approach: teachingApproach.trim(),
        results: results.trim(),
        class_size: classSize ? parseInt(classSize) : null,
        teachers,
        replacement_class_policy: replacementPolicy.trim(),
        makeup_class_policy: makeupPolicy.trim(),
        commitment_terms: commitmentTerms.trim(),
        notice_period_terms: noticePeriod.trim(),
        payment_terms: paymentTerms.trim(),
        other_policies: otherPolicies.trim(),
        trial_slots: trialSlots,
      })
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  // All programme levels for teacher linking
  const allProgrammeLevelIds = new Set(programmes.flatMap((p) => p.level_ids))

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
              i === step
                ? 'text-gray-900'
                : i < step
                ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                : 'text-gray-300'
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
            {i < STEPS.length - 1 && <span className="text-gray-200 mx-1">\u2014</span>}
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
              <p className="text-sm text-gray-500 mt-1">From the centre&apos;s onboarding form — Section 1.</p>
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
            </div>
          </div>
        )}

        {/* ── Step 2: Centre Type & Programmes ───────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Centre Type &amp; Programmes</h2>
              <p className="text-sm text-gray-500 mt-1">What does this centre offer?</p>
            </div>

            {/* Centre type selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">What type of centre is this?</p>
              <div className="flex gap-2">
                {(['academic', 'enrichment', 'both'] as CentreType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCentreType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      centreType === type
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject typeahead */}
            {centreType && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Add subjects</p>
                <SubjectTypeahead
                  subjects={filteredSubjects}
                  excludeIds={selectedSubjectIds}
                  onSelect={addProgramme}
                  placeholder={`Type to search ${centreType === 'enrichment' ? 'enrichment' : centreType === 'academic' ? 'academic' : ''} subjects...`}
                />
              </div>
            )}

            {/* Programme cards */}
            {programmes.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  {programmes.length} programme{programmes.length !== 1 ? 's' : ''} added
                </p>
                {programmes.map((prog) => (
                  <div key={prog.subject_id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900">{prog.subject_name}</h3>
                      <button
                        type="button"
                        onClick={() => removeProgramme(prog.subject_id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Display name <span className="text-gray-400">(optional — centre&apos;s own name)</span>
                      </label>
                      <input
                        type="text"
                        value={prog.display_name}
                        onChange={(e) => updateProgrammeDisplayName(prog.subject_id, e.target.value)}
                        placeholder={`e.g. "Creative Writing & Comprehension" instead of "${prog.subject_name}"`}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Levels <span className="text-red-500">*</span>
                        {prog.level_ids.length > 0 && (
                          <span className="text-gray-400 ml-1">({prog.level_ids.length} selected)</span>
                        )}
                      </p>
                      {levelGroups.map((group) => (
                        <div key={group.group} className="mb-2">
                          <p className="text-xs text-gray-400 mb-1">{group.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.items.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => toggleProgrammeLevel(prog.subject_id, l.id)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  prog.level_ids.includes(l.id)
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {centreType && programmes.length === 0 && (
              <p className="text-xs text-gray-400">Search and add at least one subject to continue.</p>
            )}
          </div>
        )}

        {/* ── Step 3: About & Teaching ───────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">About &amp; Teaching</h2>
              <p className="text-sm text-gray-500 mt-1">Answer these questions to build the centre&apos;s listing description.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                In one sentence, what does this centre specialise in? <span className="text-red-500">*</span>
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
              <p className="text-sm font-medium text-gray-700 mb-2">What type of student do they help most?</p>
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
                What makes their teaching approach different?
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
                What results have their students achieved?
              </label>
              <p className="text-xs text-gray-400 mb-2">
                e.g. &quot;80% of P6 students improved by at least one grade band.&quot;
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

        {/* ── Step 4: Team ───────────────────────────────────────── */}
        {step === 3 && (
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

                {/* Teacher subjects (from programmes) */}
                {programmes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Subjects this teacher handles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {programmes.map((p) => (
                        <button
                          key={p.subject_id}
                          type="button"
                          onClick={() => toggleTeacherSubject(idx, p.subject_id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            teacher.subject_ids.includes(p.subject_id)
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {p.display_name || p.subject_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher levels (from programmes) */}
                {allProgrammeLevelIds.size > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Levels this teacher handles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {levels
                        .filter((l) => allProgrammeLevelIds.has(l.id))
                        .map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleTeacherLevel(idx, l.id)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              teacher.level_ids.includes(l.id)
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
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

        {/* ── Step 5: Policies ───────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Policies</h2>
              <p className="text-sm text-gray-500 mt-1">From Section 6 — parents always ask about these.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Class Policy</label>
              <textarea
                value={replacementPolicy}
                onChange={(e) => setReplacementPolicy(e.target.value)}
                rows={2}
                placeholder="e.g. Free replacement class if cancelled 24 hours in advance"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Makeup Class Policy</label>
              <textarea
                value={makeupPolicy}
                onChange={(e) => setMakeupPolicy(e.target.value)}
                rows={2}
                placeholder="e.g. 1 makeup class per month, must be used within the same month"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Terms</label>
              <textarea
                value={commitmentTerms}
                onChange={(e) => setCommitmentTerms(e.target.value)}
                rows={2}
                placeholder="e.g. Month-to-month, no lock-in contract"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
              <textarea
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                rows={2}
                placeholder="e.g. 1 month notice required to withdraw"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                rows={2}
                placeholder="e.g. PayNow or bank transfer before the start of each month"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Policies <span className="text-gray-400 font-normal">(anything else)</span>
              </label>
              <textarea
                value={otherPolicies}
                onChange={(e) => setOtherPolicies(e.target.value)}
                rows={3}
                placeholder="Any other policies or important info parents should know (e.g. late arrival, sibling discounts, attire, trial-to-enrolment process)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>
          </div>
        )}

        {/* ── Step 6: Schedule ───────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Trial Slot Schedule</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload the centre&apos;s trial class schedule. This step is optional — you can add slots later.
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
                programmes={programmes}
                onSlotsReady={handleSlotsImported}
              />
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className={`text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
            step === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          {/* Create Centre button always visible on last step, also available on step 5+ */}
          {step >= 4 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
                isPending
                  ? 'bg-gray-300 text-gray-500 cursor-wait'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {isPending ? 'Creating...' : step === 5 ? 'Create Centre' : 'Skip Schedule & Create'}
            </button>
          )}

          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className={`text-sm font-medium px-6 py-2.5 rounded-lg transition-colors ${
                canProceed()
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
