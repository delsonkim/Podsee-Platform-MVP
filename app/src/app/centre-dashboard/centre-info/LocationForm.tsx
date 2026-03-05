'use client'

import { useState } from 'react'
import { updateLocation } from './actions'

interface Props {
  initial: {
    address: string
    area: string
    nearest_mrt: string
    parking_info: string
  }
  isLive: boolean
}

function ViewRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex py-2.5 border-b border-gray-100 last:border-0">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">--</span>}</dd>
    </div>
  )
}

export default function LocationForm({ initial, isLive }: Props) {
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState(initial.address)
  const [area, setArea] = useState(initial.area)
  const [nearestMrt, setNearestMrt] = useState(initial.nearest_mrt)
  const [parkingInfo, setParkingInfo] = useState(initial.parking_info)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleCancel() {
    setAddress(initial.address)
    setArea(initial.area)
    setNearestMrt(initial.nearest_mrt)
    setParkingInfo(initial.parking_info)
    setEditing(false)
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateLocation({
      address,
      area,
      nearest_mrt: nearestMrt,
      parking_info: parkingInfo,
    })
    setSaving(false)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({
        type: 'success',
        text: result.isDraft ? 'Submitted for review' : 'Changes saved',
      })
      setEditing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
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
        <dl>
          <ViewRow label="Address" value={address || null} />
          <ViewRow label="Area" value={area || null} />
          <ViewRow label="Nearest MRT" value={nearestMrt || null} />
          <ViewRow label="Parking" value={parkingInfo || null} />
        </dl>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Full address including postal code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="e.g. Buona Vista, Tampines"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nearest MRT</label>
              <input
                type="text"
                value={nearestMrt}
                onChange={(e) => setNearestMrt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="e.g. Buona Vista MRT (EW21), 5-min walk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parking Info</label>
              <input
                type="text"
                value={parkingInfo}
                onChange={(e) => setParkingInfo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none"
                placeholder="Parking availability and rates"
              />
            </div>
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
            {isLive && (
              <p className="text-xs text-gray-400 ml-auto">Changes will be reviewed before going live.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
