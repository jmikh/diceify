'use client'

// Route-group error boundary for /editor: a crash in any step component lands here (reported once per error),
// keeping the marketing pages' root boundary out of it. "Reload editor" re-renders the segment; the stores keep
// their state, so the draft/project survives.

import { useEffect } from 'react'
import Link from 'next/link'
import { reportError } from '@/lib/report-error'

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { where: 'editor-boundary', extra: { digest: error.digest } })
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400">The editor hit an unexpected error. Your work is kept; reloading usually fixes it.</p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left">
              <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="block w-full bg-accent-pink hover:bg-accent-pink-light text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Reload editor
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
