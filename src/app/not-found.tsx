import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center text-center px-6">
      <div>
        <div className="text-6xl mb-6">🔭</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">404 — Not Found</h1>
        <p className="text-white/40 font-mono text-sm mb-8">
          This page doesn't exist or has been moved.
        </p>
        <Link href="/"
          className="inline-flex items-center gap-2 bg-violet text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-violet/90 transition-colors">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
