'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadCentreImage, uploadPaynowQr } from '@/lib/image-actions'
import { updateImages } from './actions'

interface Props {
  initial: {
    image_urls: string[]
    paynow_qr_image_url: string | null
  }
  isLive: boolean
}

export default function ImagesForm({ initial, isLive }: Props) {
  const [editing, setEditing] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>(initial.image_urls ?? [])
  const [paynowQr, setPaynowQr] = useState<string | null>(initial.paynow_qr_image_url)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  function handleCancel() {
    setImageUrls(initial.image_urls ?? [])
    setPaynowQr(initial.paynow_qr_image_url)
    setEditing(false)
    setMessage(null)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageUrls.length >= 3) {
      setMessage({ type: 'error', text: 'Maximum 3 images allowed' })
      return
    }

    setUploading(true)
    setMessage(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadCentreImage(fd)
    setUploading(false)

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setImageUrls((prev) => [...prev, result.url])
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPaynowQr(fd)
    setUploading(false)

    if ('error' in result) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setPaynowQr(result.url)
    }
    if (qrInputRef.current) qrInputRef.current.value = ''
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await updateImages({
      image_urls: imageUrls,
      paynow_qr_image_url: paynowQr,
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

  const hasPhotos = imageUrls.length > 0
  const hasQr = !!paynowQr

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Images</p>
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
        /* ── View mode ── */
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">Centre Photos</p>
            {hasPhotos ? (
              <div className="flex flex-wrap gap-3">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                    <Image src={url} alt={`Centre photo ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-300">--</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">PayNow QR Code</p>
            {hasQr ? (
              <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                <Image src={paynowQr!} alt="PayNow QR" fill className="object-contain" />
              </div>
            ) : (
              <p className="text-sm text-gray-300">--</p>
            )}
          </div>
        </div>
      ) : (
        /* ── Edit mode ── */
        <>
          {/* Centre photos */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Centre Photos <span className="text-gray-400 font-normal">(up to 3)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={url} alt={`Centre photo ${i + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                  >
                    x
                  </button>
                </div>
              ))}
              {imageUrls.length < 3 && (
                <label className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-xs text-gray-400 mt-1">Add photo</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* PayNow QR */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">PayNow QR Code</label>
            <div className="flex items-start gap-3">
              {paynowQr ? (
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={paynowQr} alt="PayNow QR" fill className="object-contain" />
                  <button
                    type="button"
                    onClick={() => setPaynowQr(null)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                  >
                    x
                  </button>
                </div>
              ) : (
                <label className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-xs text-gray-400 mt-1">Upload QR</span>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {uploading && <p className="text-sm text-gray-500 mb-3">Uploading...</p>}

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving || uploading}
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
