'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  IconLayoutDashboard,
  IconCalendarPlus,
  IconCalendar,
  IconCreditCard,
  IconNotebook,
  IconTarget,
  IconMoodSmile,
  IconUser,
  IconSettings,
  IconLogout,
  IconBell,
} from '@tabler/icons-react'

const ACCENT = '#6BA3D6'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/athlete/dashboard',   icon: IconLayoutDashboard },
  { label: 'Book a Session', href: '/athlete/book',        icon: IconCalendarPlus    },
  { label: 'My Bookings',    href: '/athlete/bookings',    icon: IconCalendar        },
  { label: 'My Membership',  href: '/athlete/membership',  icon: IconCreditCard      },
  { label: 'Journal',        href: '/athlete/journal',     icon: IconNotebook        },
  { label: 'Goals',          href: '/athlete/goals',       icon: IconTarget          },
  { label: 'How We Feel',    href: '/athlete/how-we-feel', icon: IconMoodSmile       },
]

export default function AthleteNav() {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const [avatarOpen, setAvatarOpen] = useState(false)

  const name     = session?.user?.name ?? 'Athlete'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/athlete/dashboard" className="flex items-center">
            <span className="text-sm font-black tracking-tight text-gray-900">
              FORMULA<span style={{ color: ACCENT }}>14</span>
            </span>
          </Link>

          {/* Desktop nav items */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    color:           active ? ACCENT : '#6b7280',
                    backgroundColor: active ? `${ACCENT}14` : 'transparent',
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side: bell + avatar */}
          <div className="flex items-center gap-2">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
              <IconBell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setAvatarOpen(o => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                {initials}
              </button>

              {avatarOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAvatarOpen(false)} />
                  <div className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                    <div className="border-b border-gray-100 px-4 py-2.5">
                      <p className="truncate text-xs font-bold text-gray-800">{name}</p>
                      <p className="text-[11px] text-gray-400">Athlete</p>
                    </div>
                    <Link
                      href="/athlete/profile"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <IconUser size={15} /> View Profile
                    </Link>
                    <Link
                      href="/athlete/settings"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <IconSettings size={15} /> Settings
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <IconLogout size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav — horizontally scrollable */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" style={{ scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
            const Icon   = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  color:           active ? ACCENT : '#6b7280',
                  backgroundColor: active ? `${ACCENT}14` : 'transparent',
                  border:          active ? `1px solid ${ACCENT}33` : '1px solid transparent',
                }}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </header>
    </>
  )
}
