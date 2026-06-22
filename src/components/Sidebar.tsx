'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { type ComponentType, type CSSProperties } from 'react'
import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconReportMoney,
  IconId,
  IconCreditCard,
  IconLayoutKanban,
  IconForms,
  IconFileText,
  IconNotebook,
  IconTarget,
  IconBallBasketball,
  IconArrowsExchange,
  IconChartBar,
  IconFlask,
  IconLogout,
} from '@tabler/icons-react'

// ─── Nav types ────────────────────────────────────────────────────────────────

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }

type NavLeaf = {
  label: string
  href: string
  icon: ComponentType<IconProps>
}

type NavSection = {
  section: string
  href?: string   // when set, the section label itself is a nav link (no items)
  items: NavLeaf[]
}

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    section: 'MAIN',
    items: [
      { label: 'Dashboard',               href: '/dashboard',             icon: IconLayoutDashboard },
      { label: 'Athletes',                href: '/athletes',              icon: IconUsers },
      { label: 'Bookings & Availability', href: '/bookings',              icon: IconCalendar },
      { label: 'Bookkeeping',             href: '/bookkeeping',           icon: IconReportMoney },
      { label: 'Memberships',             href: '/memberships',           icon: IconId },
      { label: 'Pricing & Payments',      href: '/pricing',               icon: IconCreditCard },
      { label: 'Boards',                  href: '/boards',                icon: IconLayoutKanban },
      { label: 'Forms',                   href: '/forms',                 icon: IconForms },
      { label: 'Policies & Procedures',   href: '/policies-procedures',   icon: IconFileText },
    ],
  },
  {
    section: 'ATHLETES',
    items: [
      { label: 'Book a Session',                href: '/portal',        icon: IconCalendar },
      { label: 'Journal',                       href: '/journal',       icon: IconNotebook },
      { label: 'Shooting Test & Leaderboards',  href: '/shooting-test', icon: IconTarget },
    ],
  },
  {
    section: 'COACHING TOOLS',
    items: [
      { label: 'FormulaDraw', href: '/formula-draw', icon: IconBallBasketball },
      { label: 'FormulaSub',  href: '/formula-sub',  icon: IconArrowsExchange },
      { label: 'FormulaStat', href: '/formula-stat',  icon: IconChartBar },
    ],
  },
  {
    section: 'THE LEARNING LAB',
    href: '/learning-lab',
    items: [],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Logo */}
      <div className="px-4 py-5">
        <Image
          src="/Updated Primary Logo.png"
          alt="Formula14"
          width={0}
          height={0}
          sizes="224px"
          style={{ width: '100%', height: 'auto' }}
          priority
        />
      </div>

      <div className="mx-4 border-b border-white/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ section, href: sectionHref, items }) => (
          <div key={section} className="mb-6">
            {/* Section label — clickable if sectionHref is set */}
            {sectionHref ? (
              <Link
                href={sectionHref}
                className={[
                  'mb-2 flex items-center gap-2 rounded-lg border-l-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-150',
                  pathname === sectionHref || pathname.startsWith(sectionHref + '/')
                    ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-[#6BA3D6]'
                    : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-200',
                ].join(' ')}
              >
                <IconFlask size={15} strokeWidth={1.75} />
                {section}
              </Link>
            ) : (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                {section}
              </p>
            )}

            {/* Nav items */}
            {items.length > 0 && (
              <ul className="space-y-0.5">
                {items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          active
                            ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-white'
                            : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
                        ].join(' ')}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          style={active ? { color: '#6BA3D6' } : {}}
                        />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {session?.user?.email && (
          <p className="mb-1 truncate px-3 text-xs text-gray-500">
            {session.user.email}
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-100"
        >
          <IconLogout size={18} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
