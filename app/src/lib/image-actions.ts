'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadCentreImage(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  if (!file.type.startsWith('image/'))
    return { error: 'File must be an image' }
  if (file.size > 7 * 1024 * 1024)
    return { error: 'Image must be under 7MB' }

  const supabase = createAdminClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `heroes/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('centre-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from('centre-images').getPublicUrl(path)

  return { url: publicUrl }
}

export async function uploadPaynowQr(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'No file provided' }

  if (!file.type.startsWith('image/'))
    return { error: 'File must be an image' }
  if (file.size > 5 * 1024 * 1024)
    return { error: 'Image must be under 5MB' }

  const supabase = createAdminClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `paynow-qr/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('centre-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from('centre-images').getPublicUrl(path)

  return { url: publicUrl }
}
