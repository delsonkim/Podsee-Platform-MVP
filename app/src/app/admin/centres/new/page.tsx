import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import AddCentreForm from './AddCentreForm'

export default async function NewCentrePage() {
  const supabase = createAdminClient()

  const [{ data: subjects }, { data: levels }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order'),
    supabase.from('levels').select('*').order('sort_order'),
  ])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/centres"
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 text-sm hover:bg-gray-50 transition-colors"
          aria-label="Back"
        >
          &larr;
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Centre</h1>
      </div>

      <AddCentreForm subjects={subjects ?? []} levels={levels ?? []} />
    </div>
  )
}
