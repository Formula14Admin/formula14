'use client'

import Link from 'next/link'

export default function journalPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="text-5xl mb-4">📓</div>
      <h1 className="text-xl font-bold text-gray-900">Journal</h1>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-400">Track your reflections, session notes, and personal growth entries. Coming soon.</p>
      <Link
        href="/athlete/dashboard"
        className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: '#6BA3D6' }}
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
