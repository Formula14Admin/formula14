'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, type ComponentType, type CSSProperties } from 'react'
import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconLayoutKanban,
  IconForms,
  IconReportMoney,
  IconId,
  IconCreditCard,
  IconSchool,
  IconNotebook,
  IconBallBasketball,
  IconLogout,
  IconFileText,
  IconChevronRight,
} from '@tabler/icons-react'

// ─── Nav types ────────────────────────────────────────────────────────────────

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }

type NavLeaf = {
  type?: 'link'
  label: string
  href: string
  icon: ComponentType<IconProps>
}

type NavGroup = {
  type: 'group'
  label: string
  icon: ComponentType<IconProps>
  children: { label: string; href: string }[]
}

type NavEntry = NavLeaf | NavGroup

type NavSection = {
  section: string
  items: NavEntry[]
}

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    section: 'MAIN',
    items: [
      { label: 'Dashboard',               href: '/dashboard', icon: IconLayoutDashboard },
      { label: 'Bookings & Availability', href: '/bookings',  icon: IconCalendar },
      { label: 'Athletes',                href: '/athletes',  icon: IconUsers },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { label: 'Bookkeeping',        href: '/bookkeeping', icon: IconReportMoney },
      { label: 'Memberships',        href: '/memberships', icon: IconId },
      { label: 'Pricing & Payments', href: '/pricing',     icon: IconCreditCard },
    ],
  },
  {
    section: 'ATHLETES',
    items: [
      { label: 'Book a Session', href: '/portal', icon: IconCalendar },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { label: 'Boards',       href: '/boards',       icon: IconLayoutKanban },
      { label: 'Forms',        href: '/forms',        icon: IconForms },
      { label: 'Pocket Plays', href: '/pocket-plays', icon: IconBallBasketball },
      { label: 'Learning Lab', href: '/learning-lab', icon: IconSchool },
      { label: 'Journal',      href: '/journal',      icon: IconNotebook },
      {
        type: 'group',
        label: 'Policies & Procedures',
        icon: IconFileText,
        children: [
          { label: 'Policies',   href: '/policies'   },
          { label: 'Procedures', href: '/procedures' },
        ],
      },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // Auto-open the group if a child route is active
    const open = new Set<string>()
    for (const section of NAV) {
      for (const item of section.items) {
        if (item.type === 'group' && item.children.some(c => pathname === c.href)) {
          open.add(item.label)
        }
      }
    }
    return open
  })

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

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
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(item => {
                if (item.type === 'group') {
                  const isOpen = openGroups.has(item.label)
                  const anyChildActive = item.children.some(c => pathname === c.href)

                  return (
                    <li key={item.label}>
                      {/* Group header button */}
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={[
                          'flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          anyChildActive
                            ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-white'
                            : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
                        ].join(' ')}
                      >
                        <item.icon
                          size={18}
                          strokeWidth={1.75}
                          style={anyChildActive ? { color: '#6BA3D6' } : {}}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                        <IconChevronRight
                          size={14}
                          className="shrink-0 transition-transform duration-200"
                          style={{
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                            color: anyChildActive ? '#6BA3D6' : undefined,
                          }}
                        />
                      </button>

                      {/* Children */}
                      {isOpen && (
                        <ul className="mt-0.5 space-y-0.5 pl-9">
                          {item.children.map(child => {
                            const active = pathname === child.href
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={[
                                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                                    active
                                      ? 'bg-[#6BA3D6]/10 text-white'
                                      : 'text-gray-500 hover:bg-white/[0.06] hover:text-gray-100',
                                  ].join(' ')}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                }

                // Regular leaf item
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
