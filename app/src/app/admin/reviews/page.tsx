import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import ReviewActions from './ReviewActions'

async function getReviews() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, review_text, status, approved_at, created_at,
        parents(name, email),
        centres(name, slug),
        bookings(id, booking_ref)
      `)
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm tracking-tight">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

const STATUS_COLOR: Record<string, string> = {
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default async function ReviewsPage() {
  const reviews = await getReviews()

  const pending = reviews.filter((r: any) => r.status === 'pending_approval').length
  const approved = reviews.filter((r: any) => r.status === 'approved').length
  const rejected = reviews.filter((r: any) => r.status === 'rejected').length

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Moderate parent reviews before they appear on centre profiles.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{rejected}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Centre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No reviews yet.</td>
              </tr>
            )}
            {reviews.map((r: any) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/bookings/${r.bookings?.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                    {r.bookings?.booking_ref}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(r.created_at)}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-800">{r.parents?.name}</div>
                  <div className="text-xs text-gray-400">{r.parents?.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-800">{r.centres?.name}</td>
                <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                <td className="px-4 py-3 max-w-xs">
                  {r.review_text ? (
                    <p className="text-gray-700 text-xs line-clamp-2">{r.review_text}</p>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ReviewActions reviewId={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
