'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconSparkles, IconArrowLeft } from '@tabler/icons-react'
import { useModuleVisibility } from '@/components/ModuleVisibilityProvider'
import type { AthleteModuleKey } from '@/lib/module-visibility'

const ACCENT = '#6BA3D6'

const ROUTE_TO_MODULE: Record<string, AthleteModuleKey> = {
  '/athlete/book':        'book',
  '/athlete/bookings':    'bookings',
  '/athlete/membership':  'membership',
  '/athlete/journal':     'journal',
  '/athlete/goals':       'goals',
  '/athlete/how-we-feel': 'how-we-feel',
}

const MODULE_LABELS: Record<AthleteModuleKey, string> = {
  dashboard:    'Dashboard',
  book:         'Book a Session',
  bookings:     'My Bookings',
  membership:   'My Membership',
  journal:      'Journal',
  goals:        'Goals & Habits',
  'how-we-feel':'How We Feel',
  leaderboards: 'Leaderboards',
  programs:     'Programs',
  profile:      'My Profile',
}

function ComingSoonPage({ moduleKey }: { moduleKey: AthleteModuleKey }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${ACCENT}1a` }}
      >
        <IconSparkles size={36} style={{ color: ACCENT }} />
      </div>
      <p className="mb-1 text-sm font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
        Coming Soon
      </p>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">{MODULE_LABELS[moduleKey]}</h1>
      <p className="mb-8 max-w-sm text-sm text-gray-500">
        We&rsquo;re working on this feature and will let you know as soon as it&rsquo;s ready.
      </p>
      <Link
        href="/athlete/dashboard"
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: ACCENT }}
      >
        <IconArrowLeft size={15} />
        Back to Dashboard
      </Link>
    </div>
  )
}

export default function AthleteModuleGuard({ children }: { children: ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const visibility = useModuleVisibility()

  const moduleKey = ROUTE_TO_MODULE[pathname]
  const state     = moduleKey ? visibility.athlete[moduleKey] : null

  useEffect(() => {
    if (state && !state.enabled) {
      router.replace('/athlete/dashboard')
    }
  }, [state, router])

  // Unknown route or dashboard — always render
  if (!state) return <>{children}</>

  // Disabled → blank while redirect happens
  if (!state.enabled) return null

  // Coming soon → show placeholder page
  if (state.comingSoon) return <ComingSoonPage moduleKey={moduleKey!} />

  return <>{children}</>
}
