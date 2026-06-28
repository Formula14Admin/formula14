'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, type ComponentType, type CSSProperties } from 'react'
import {
  IconLayoutDashboard,
  IconCalendarPlus,
  IconCalendar,
  IconCreditCard,
  IconNotebook,
  IconTarget,
  IconMoodSmile,
  IconLogout,
  IconMenu2,
  IconX,
} from '@tabler/icons-react'

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }

type NavItem = {
  label: string
  href: string
  icon: ComponentType<IconProps>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       href: '/athlete/dashboard',   icon: IconLayoutDashboard },
  { label: 'Book a Session',  href: '/athlete/book',        icon: IconCalendarPlus    },
  { label: 'My Bookings',     href: '/athlete/bookings',    icon: IconCalendar        },
  { label: 'My Membership',   href: '/athlete/membership',  icon: IconCreditCard      },
  { label: 'Journal',         href: '/athlete/journal',     icon: IconNotebook        },
  { label: 'Goals & Habits',  href: '/athlete/goals',       icon: IconTarget          },
  { label: 'How We Feel',     href: '/athlete/how-we-feel', icon: IconMoodSmile       },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const name  = session?.user?.name  ?? ''
  const email = session?.user?.email ?? ''

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Logo + close button (mobile) */}
      <div className="flex items-center justify-between px-4 py-5">
        <Image
          src="/Updated Primary Logo.png"
          alt="Formula14"
          width={0}
          height={0}
          sizes="180px"
          style={{ width: '180px', height: 'auto' }}
          priority
        />
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-gray-100"
            aria-label="Close menu"
          >
            <IconX size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <div className="mx-4 border-b border-white/10" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
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
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {name && (
          <p className="truncate px-3 text-xs font-semibold text-gray-300">{name}</p>
        )}
        {email && (
          <p className="mb-1 truncate px-3 text-xs text-gray-500">{email}</p>
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

export default function AthleteSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden h-screen md:flex">
        <SidebarContent />
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:hidden"
        style={{ backgroundColor: '#1a1a1a' }}
        aria-label="Open menu"
      >
        <IconMenu2 size={20} strokeWidth={1.75} style={{ color: '#6BA3D6' }} />
      </button>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
