'use client'

export default function CentreDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4 text-center">
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-lg">!</div>
      <div>
        <p className="text-sm font-medium text-gray-800">Something went wrong</p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          There was a problem loading this page. Please try again.
        </p>
        {error.message && (
          <p className="text-xs text-red-400 mt-2 font-mono">{error.message}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="text-xs text-gray-500 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50"
      >
        Retry
      </button>
    </div>
  )
}
