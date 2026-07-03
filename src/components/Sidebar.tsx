'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect, useCallback, type ComponentType, type CSSProperties } from 'react'
import {
  IconLayoutDashboard,
  IconCalendar,
  IconUsers,
  IconCreditCard,
  IconLayoutKanban,
  IconForms,
  IconFileText,
  IconClipboardList,
  IconNotebook,
  IconTarget,
  IconBallBasketball,
  IconArrowsExchange,
  IconChartBar,
  IconFlask,
  IconLogout,
  IconChevronDown,
  IconSpeakerphone,
  IconCash,
  IconSettings,
  IconChecklist,
  IconBriefcase,
  IconTrophy,
  IconReceipt,
  IconTag,
} from '@tabler/icons-react'

// ─── Nav types ────────────────────────────────────────────────────────────────

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }

type NavChild = {
  label: string
  href: string
  icon: ComponentType<IconProps>
}

type NavLeaf = {
  label: string
  href: string
  icon: ComponentType<IconProps>
  children?: NavChild[]
}

type NavSection = {
  section: string
  href?: string
  items: NavLeaf[]
}

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    section: 'MAIN',
    items: [
      { label: 'Dashboard',                   href: '/dashboard',           icon: IconLayoutDashboard },
      { label: 'Athletes',                    href: '/athletes',            icon: IconUsers },
      { label: 'Boards',                      href: '/boards',              icon: IconLayoutKanban },
      { label: 'Bookings',                    href: '/bookings',            icon: IconCalendar },
      {
        label: 'Finances',
        href: '/finances',
        icon: IconCash,
        children: [
          { label: 'Overview',     href: '/finances',              icon: IconLayoutDashboard },
          { label: 'Transactions', href: '/finances/transactions', icon: IconReceipt },
          { label: 'Payments',     href: '/pricing',               icon: IconCreditCard },
          { label: 'Pricing',      href: '/pricing?tab=pricing',   icon: IconTag },
        ],
      },
      { label: 'Forms',                       href: '/forms',               icon: IconForms },
      { label: 'HR',                          href: '/hr',                  icon: IconBriefcase },
      {
        label: 'Policies & Procedures',
        href: '/policies-procedures',
        icon: IconFileText,
        children: [
          { label: 'Policies',   href: '/policies',   icon: IconFileText },
          { label: 'Procedures', href: '/procedures', icon: IconClipboardList },
        ],
      },
      { label: 'Social Media & Advertising',  href: '/social-media',        icon: IconSpeakerphone },
      { label: 'Sponsorships',               href: '/sponsorships',        icon: IconTrophy },
      { label: 'To Do',                       href: '/todo',                icon: IconChecklist },
    ],
  },
  {
    section: 'ATHLETES',
    items: [
      { label: 'Book a Session',                href: '/portal',        icon: IconCalendar },
      { label: 'Goal Setting',                  href: '/goals',         icon: IconTrophy  },
      { label: 'Journal',                       href: '/journal',       icon: IconNotebook },
      { label: 'Shooting Test & Leaderboards',  href: '/shooting-test', icon: IconTarget },
    ],
  },
  {
    section: 'COACHING TOOLS',
    items: [
      { label: 'FormulaDraw', href: '/formula-draw', icon: IconBallBasketball },
      { label: 'FormulaStat', href: '/formula-stat', icon: IconChartBar },
      { label: 'FormulaSub',  href: '/formula-sub',  icon: IconArrowsExchange },
    ],
  },
  {
    section: 'THE LEARNING LAB',
    href: '/learning-lab',
    items: [],
  },
]

// ─── Active detection (supports query-param hrefs like /pricing?tab=pricing) ──

function isChildActive(href: string, pathname: string, searchStr: string): boolean {
  const qIdx = href.indexOf('?')
  if (qIdx === -1) {
    // No query in href — active when path matches.
    // If the URL has a 'tab' query that belongs to a sibling at the same path,
    // stay inactive so the sibling can claim active instead.
    if (pathname !== href) return false
    const urlParams = new URLSearchParams(searchStr)
    const tab = urlParams.get('tab')
    // Only suppress if another sibling uses ?tab= for the same path
    if (!tab) return true
    // Check if any other NAV child uses this path with ?tab=<something>
    for (const { items } of NAV) {
      for (const item of items) {
        for (const c of item.children ?? []) {
          if (c.href !== href && c.href.startsWith(href + '?tab=')) return false
        }
      }
    }
    return true
  }
  const hrefPath = href.slice(0, qIdx)
  if (hrefPath !== pathname) return false
  const hrefParams = new URLSearchParams(href.slice(qIdx + 1))
  const urlParams = new URLSearchParams(searchStr)
  for (const [key, val] of hrefParams.entries()) {
    if (urlParams.get(key) !== val) return false
  }
  return true
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const rawSearchParams = useSearchParams()
  const searchStr = rawSearchParams.toString()
  const { data: session } = useSession()

  // Notification badge counts keyed by nav href
  const [badges, setBadges] = useState<Record<string, number>>({})

  const refreshBadges = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const b: Record<string, number> = {}

    // Join requests → Dashboard + Bookings
    const joinCount = parseInt(localStorage.getItem('f14_pendingJoinCount') ?? '0', 10) || 0
    if (joinCount > 0) { b['/dashboard'] = joinCount; b['/bookings'] = joinCount }

    // Pending payments → Pricing & Payments
    const payCount = parseInt(localStorage.getItem('f14_pendingPaymentCount') ?? '0', 10) || 0
    if (payCount > 0) b['/pricing'] = payCount

    // Pending pay runs → HR
    try {
      const runs = JSON.parse(localStorage.getItem('f14_team_pay_runs') ?? '[]') as { status: string }[]
      const n = runs.filter(r => r.status === 'pending').length
      if (n > 0) b['/hr'] = n
    } catch { /* ignore parse errors */ }

    // Overdue + due-today incomplete tasks → To Do
    try {
      const tasks = JSON.parse(localStorage.getItem('f14_todo_tasks') ?? '[]') as { completed: boolean; dueDate: string | null }[]
      const n = tasks.filter(t => !t.completed && t.dueDate !== null && t.dueDate <= today).length
      if (n > 0) b['/todo'] = n
    } catch { /* ignore parse errors */ }

    // Overdue goals → Goals
    try {
      const goals = JSON.parse(localStorage.getItem('f14_goals') ?? '[]') as { targetDate: string; milestones: { completed: boolean }[] }[]
      const n = goals.filter(g => {
        const allDone = g.milestones.length > 0 && g.milestones.every(m => m.completed)
        return !allDone && g.targetDate < today
      }).length
      if (n > 0) b['/goals'] = n
    } catch { /* ignore parse errors */ }

    setBadges(b)
  }, [])

  useEffect(() => {
    refreshBadges()
    window.addEventListener('storage', refreshBadges)
    // Also poll so badges update when changed by the same tab
    const id = setInterval(refreshBadges, 2000)
    return () => {
      window.removeEventListener('storage', refreshBadges)
      clearInterval(id)
    }
  }, [refreshBadges])

  // Track which expandable items are open (keyed by href)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    NAV.forEach(({ items }) =>
      items.forEach(item => {
        if (item.children?.some(c => isChildActive(c.href, pathname, searchStr))) {
          initial.add(item.href)
        }
      })
    )
    return initial
  })

  // Keep expanded in sync when pathname/search changes
  useEffect(() => {
    NAV.forEach(({ items }) =>
      items.forEach(item => {
        if (item.children?.some(c => isChildActive(c.href, pathname, searchStr))) {
          setExpanded(prev => new Set(prev).add(item.href))
        }
      })
    )
  }, [pathname, searchStr])

  function toggleExpanded(href: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
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
        {NAV.map(({ section, href: sectionHref, items }) => (
          <div key={section} className="mb-6">
            {/* Section label */}
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
                  const hasChildren = !!item.children?.length
                  const childActive = hasChildren && item.children!.some(
                    c => isChildActive(c.href, pathname, searchStr)
                  )
                  const active = pathname === item.href || pathname.startsWith(item.href + '/') || childActive
                  const open = expanded.has(item.href)

                  const badgeCount = badges[item.href] ?? 0

                  return (
                    <li key={item.href}>
                      {/* Parent row */}
                      <div className="flex items-stretch">
                        <Link
                          href={item.href}
                          className={[
                            'flex flex-1 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
                            hasChildren ? 'rounded-r-none' : '',
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
                          <span className="flex-1">{item.label}</span>
                          {badgeCount > 0 && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {badgeCount}
                            </span>
                          )}
                        </Link>

                        {/* Chevron toggle (only for items with children) */}
                        {hasChildren && (
                          <button
                            onClick={() => toggleExpanded(item.href)}
                            className={[
                              'flex items-center justify-center rounded-r-lg px-2 transition-all duration-150',
                              active
                                ? 'bg-[#6BA3D6]/10 text-gray-400 hover:text-gray-200'
                                : 'text-gray-600 hover:bg-white/[0.06] hover:text-gray-400',
                            ].join(' ')}
                            aria-label="Toggle submenu"
                          >
                            <IconChevronDown
                              size={14}
                              strokeWidth={2}
                              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Children */}
                      {hasChildren && open && (
                        <ul className="mt-0.5 space-y-0.5 pl-4">
                          {item.children!.map(child => {
                            const childIsActive = isChildActive(child.href, pathname, searchStr)
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={[
                                    'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-all duration-150',
                                    childIsActive
                                      ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-white'
                                      : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
                                  ].join(' ')}
                                >
                                  <child.icon
                                    size={16}
                                    strokeWidth={1.75}
                                    style={childIsActive ? { color: '#6BA3D6' } : {}}
                                  />
                                  {child.label}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
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
        <Link
          href="/settings"
          className={[
            'flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
            pathname === '/settings' || pathname.startsWith('/settings/')
              ? 'border-[#6BA3D6] bg-[#6BA3D6]/10 text-white'
              : 'border-transparent text-gray-400 hover:bg-white/[0.06] hover:text-gray-100',
          ].join(' ')}
        >
          <IconSettings
            size={18}
            strokeWidth={1.75}
            style={pathname === '/settings' || pathname.startsWith('/settings/') ? { color: '#6BA3D6' } : {}}
          />
          Settings
        </Link>
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
