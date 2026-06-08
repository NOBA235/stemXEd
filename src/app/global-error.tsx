'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to your monitoring service (Sentry, etc.)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html>
      <body className="bg-[#050508] text-white font-sans min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-white/50 text-sm mb-6 font-mono leading-relaxed">
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span className="block mt-1 text-white/25">Error ID: {error.digest}</span>
            )}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="bg-[#c77dff] text-black font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#b86bf0] transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="border border-white/10 text-white/60 font-mono px-6 py-2.5 rounded-xl text-sm hover:text-white transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
