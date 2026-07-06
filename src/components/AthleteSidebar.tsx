'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useRef, useEffect, type ComponentType, type CSSProperties } from 'react'
import {
  IconLayoutDashboard,
  IconCalendarPlus,
  IconCalendar,
  IconCreditCard,
  IconNotebook,
  IconTarget,
  IconMoodSmile,
  IconUser,
  IconLogout,
  IconMenu2,
  IconX,
  IconClock,
  IconChevronDown,
  IconCheck,
  IconPlus,
  IconUserPlus,
} from '@tabler/icons-react'
import { useModuleVisibility } from '@/components/ModuleVisibilityProvider'
import { useActiveAthlete } from '@/lib/activeAthlete'
import type { AthleteModuleKey } from '@/lib/module-visibility'

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }
type NavItem = { label: string; href: string; icon: ComponentType<IconProps>; moduleKey: AthleteModuleKey }

const ACCENT = '#6BA3D6'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '/athlete/dashboard',   icon: IconLayoutDashboard, moduleKey: 'dashboard'    },
  { label: 'Book a Session', href: '/athlete/book',        icon: IconCalendarPlus,    moduleKey: 'book'         },
  { label: 'My Bookings',    href: '/athlete/bookings',    icon: IconCalendar,        moduleKey: 'bookings'     },
  { label: 'My Membership',  href: '/athlete/membership',  icon: IconCreditCard,      moduleKey: 'membership'   },
  { label: 'Journal',        href: '/athlete/journal',     icon: IconNotebook,        moduleKey: 'journal'      },
  { label: 'Goals & Habits', href: '/athlete/goals',       icon: IconTarget,          moduleKey: 'goals'        },
  { label: 'How We Feel',    href: '/athlete/how-we-feel', icon: IconMoodSmile,       moduleKey: 'how-we-feel'  },
  { label: 'My Profile',     href: '/athlete/profile',     icon: IconUser,            moduleKey: 'profile'      },
]

const AVATAR_COLORS = [
  '#6BA3D6','#6BAD6B','#D4A843','#B06BAD',
  '#14b8a6','#f97316','#7C3AED','#AD6B7A',
]

function avatarBg(id: string) {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?'
}

// ── Add Child Modal ────────────────────────────────────────────────────────────

function AddChildModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [dob,       setDob]       = useState('')
  const [gender,    setGender]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) { setError('First name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/athletes/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), dob: dob || null, gender: gender || null }),
      })
      const json = await res.json() as { athleteId?: string; error?: string }
      if (json.error) { setError(json.error); return }
      onAdded(json.athleteId!)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const INP = 'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]'
  const INP_STYLE = { backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <IconUserPlus size={18} style={{ color: ACCENT }} />
            <h2 className="text-sm font-bold text-white">Add Another Child</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-400">First Name *</label>
              <input className={INP} style={INP_STYLE} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jordan" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-400">Last Name</label>
              <input className={INP} style={INP_STYLE} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-400">Date of Birth</label>
            <input type="date" className={INP} style={{ ...INP_STYLE, colorScheme: 'dark' }} value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-400">Gender</label>
            <select className={INP} style={{ ...INP_STYLE, colorScheme: 'dark' }} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-gray-400 transition hover:bg-white/10">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}>
              {saving ? 'Adding…' : 'Add Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Athlete Switcher ───────────────────────────────────────────────────────────

function AthleteSwitcher() {
  const { athletes, activeId, activeAthlete, switchAthlete, reload } = useActiveAthlete()
  const [open,         setOpen]         = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Only show switcher when there's more than one athlete (or always for parents)
  if (athletes.length === 0) return null

  const active = activeAthlete

  async function handleAdded(newId: string) {
    await reload()
    switchAthlete(newId)
    setShowAddModal(false)
    setOpen(false)
  }

  return (
    <>
      <div ref={ref} className="relative px-3 pb-2">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {active && (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: avatarBg(active.id) }}
            >
              {initials(active.firstName, active.lastName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {active ? `${active.firstName} ${active.lastName}`.trim() : 'Select athlete'}
            </p>
            {athletes.length > 1 && (
              <p className="text-[10px] text-gray-500">{athletes.length} athletes · tap to switch</p>
            )}
          </div>
          <IconChevronDown
            size={14}
            className="shrink-0 text-gray-500 transition"
            style={{ transform: open ? 'rotate(180deg)' : undefined }}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1.5 overflow-hidden rounded-xl shadow-2xl"
            style={{ backgroundColor: '#242424', border: '1px solid rgba(255,255,255,0.1)', zIndex: 50 }}
          >
            <p className="px-3 pb-1 pt-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-600">Switch Athlete</p>
            {athletes.map(a => {
              const isActive = a.id === activeId
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { switchAthlete(a.id); setOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: avatarBg(a.id) }}
                  >
                    {initials(a.firstName, a.lastName)}
                  </div>
                  <span className={`flex-1 text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {`${a.firstName} ${a.lastName}`.trim()}
                  </span>
                  {isActive && <IconCheck size={13} style={{ color: ACCENT }} />}
                </button>
              )
            })}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                type="button"
                onClick={() => { setShowAddModal(true); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(107,163,214,0.15)' }}>
                  <IconPlus size={13} style={{ color: ACCENT }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: ACCENT }}>Add Another Child</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddChildModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  )
}

// ── Sidebar content ────────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname   = usePathname()
  const { data: session } = useSession()
  const visibility = useModuleVisibility()
  const { athletes } = useActiveAthlete()

  const email = session?.user?.email ?? ''
  const hasMultiple = athletes.length > 1

  const visibleItems = NAV_ITEMS.filter(item => {
    const state = visibility.athlete[item.moduleKey]
    return state?.enabled !== false
  })

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <Image src="/Updated Primary Logo.png" alt="Formula14" width={0} height={0} sizes="180px" style={{ width: '180px', height: 'auto' }} priority />
        {onClose && (
          <button onClick={onClose} className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-gray-100" aria-label="Close menu">
            <IconX size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Athlete switcher — shown when there are multiple children or always for context */}
      {athletes.length > 0 && (
        <>
          <AthleteSwitcher />
          <div className="mx-4 border-b border-white/10 mb-1" />
        </>
      )}

      {athletes.length === 0 && <div className="mx-4 border-b border-white/10" />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map(item => {
            const active     = pathname === item.href || pathname.startsWith(item.href + '/')
            const comingSoon = visibility.athlete[item.moduleKey]?.comingSoon === true
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
                  <item.icon size={18} strokeWidth={1.75} style={active ? { color: ACCENT } : {}} />
                  <span className="flex-1">{item.label}</span>
                  {comingSoon && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                      <IconClock size={9} />
                      Soon
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {!hasMultiple && email && (
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
      <div className="hidden h-screen md:flex">
        <SidebarContent />
      </div>

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg shadow-md md:hidden"
        style={{ backgroundColor: '#1a1a1a' }}
        aria-label="Open menu"
      >
        <IconMenu2 size={20} strokeWidth={1.75} style={{ color: ACCENT }} />
      </button>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
