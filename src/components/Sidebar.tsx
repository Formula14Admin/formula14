'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconLayoutKanban,
  IconForms,
  IconReportMoney,
  IconId,
  IconSchool,
  IconNotebook,
} from '@tabler/icons-react'

const NAV = [
  {
    section: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboard },
      { label: 'Bookings', href: '/bookings', icon: IconCalendar },
      { label: 'Athletes', href: '/athletes', icon: IconUsers },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { label: 'Bookkeeping', href: '/bookkeeping', icon: IconReportMoney },
      { label: 'Memberships', href: '/memberships', icon: IconId },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { label: 'Boards', href: '/boards', icon: IconLayoutKanban },
      { label: 'Forms', href: '/forms', icon: IconForms },
      { label: 'Learning Lab', href: '/learning-lab', icon: IconSchool },
      { label: 'Journal', href: '/journal', icon: IconNotebook },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex h-screen w-64 shrink-0 flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Logo */}
      <div className="flex items-center px-5 py-6">
        <div className="relative h-10 w-36">
          <Image
            src="/Logo.png"
            alt="Formula14"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

      <div className="mx-4 border-b border-white/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={[
                        'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-white'
                          : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
                      ].join(' ')}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.75}
                        style={active ? { color: '#6BA3D6' } : {}}
                      />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
