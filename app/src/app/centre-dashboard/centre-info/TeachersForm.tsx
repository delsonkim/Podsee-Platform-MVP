'use client'

import { useState } from 'react'
import { updateTeachers } from './actions'

interface TeacherFields {
  id?: string
  name: string
  role: string
  is_founder: boolean
  qualifications: string
  bio: string
  years_experience: number | null
  linkedin_url: string
  students_taught: number | null
}

interface Props {
  initial: TeacherFields[]
}

const emptyTeacher: TeacherFields = {
  name: '',
  role: '',
  is_founder: false,
  qualifications: '',
  bio: '',
  years_experience: null,
  linkedin_url: '',
  students_taught: null,
}

export default function TeachersForm({ initial }: Props) {
  const [editing, setEditing] = useState(false)
  const [teachers, setTeachers] = useState<TeacherFields[]>(initial.length > 0 ? initial : [{ ...emptyTeacher, is_founder: true, role: 'Founder' }])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function updateField(idx: number, field: keyof TeacherFields, value: unknown) {
    setTeachers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  function addTeacher() {
    setTeachers(prev => [...prev, { ...emptyTeacher }])
  }

  function removeTeacher(idx: number) {
    setTeachers(prev => prev.filter((_, i) => i !== idx))
  }

  function handleCancel() {
    setTeachers(initial.length > 0 ? initial : [{ ...emptyTeacher, is_founder: true, role: 'Founder' }])
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateTeachers({ teachers })
    setSaving(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Teachers updated' })
      setEditing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teachers</p>
        {!editing && (
          <button
            onClick={() => { setEditing(true); setMessage(null) }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </div>
      )}

      {!editing ? (
        teachers.length > 0 && teachers[0].name ? (
          <div className="space-y-3">
            {teachers.map((t, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium text-xs shrink-0">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {t.name}
                    {t.is_founder && <span className="text-xs text-amber-600 ml-1.5">Founder</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[
                      t.role,
                      t.years_experience && `${t.years_experience} yrs teaching`,
                      t.students_taught && `${t.students_taught}+ students`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  {t.linkedin_url && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate">{t.linkedin_url}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300">No teachers added yet.</p>
        )
      ) : (
        <>
          <div className="space-y-5">
            {teachers.map((teacher, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {teacher.is_founder ? 'Founder / Director' : `Teacher ${idx}`}
                  </h4>
                  {!teacher.is_founder && (
                    <button type="button" onClick={() => removeTeacher(idx)} className="text-xs text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={teacher.name}
                      onChange={(e) => updateField(idx, 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <input
                      type="text"
                      value={teacher.role}
                      onChange={(e) => updateField(idx, 'role', e.target.value)}
                      placeholder="e.g. Head Tutor"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Years of Teaching</label>
                    <input
                      type="number"
                      value={teacher.years_experience ?? ''}
                      onChange={(e) => updateField(idx, 'years_experience', e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Students Taught</label>
                    <input
                      type="number"
                      value={teacher.students_taught ?? ''}
                      onChange={(e) => updateField(idx, 'students_taught', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="e.g. 500"
                      min="0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qualifications</label>
                    <input
                      type="text"
                      value={teacher.qualifications}
                      onChange={(e) => updateField(idx, 'qualifications', e.target.value)}
                      placeholder="e.g. B.Sc. Mathematics NUS"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={teacher.linkedin_url}
                      onChange={(e) => updateField(idx, 'linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Short Bio</label>
                    <textarea
                      value={teacher.bio}
                      onChange={(e) => updateField(idx, 'bio', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
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

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
