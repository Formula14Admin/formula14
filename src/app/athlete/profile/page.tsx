'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AthleteProfilePage() {
  const { data: session } = useSession()
  const name  = session?.user?.name ?? 'Athlete'
  const email = session?.user?.email ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: '#6BA3D6' }}
        >
          {initials}
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Profile</p>
        <p className="text-sm text-gray-400">Full profile editing coming soon.</p>
      </div>

      <div className="mt-4">
        <Link
          href="/athlete/dashboard"
          className="block text-center rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
