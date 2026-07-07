'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'

export default function AdminViewBanner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role

  if (role !== 'director' && role !== 'coach') return null

  return (
    <div className="flex items-center justify-between gap-3 bg-[#1f2937] px-4 py-2 text-sm text-white">
      <span className="text-gray-300">
        Viewing as <span className="font-semibold text-white">Admin</span> — you are in the athlete section
      </span>
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        <IconArrowLeft size={13} /> Return to Admin
      </Link>
    </div>
  )
}
