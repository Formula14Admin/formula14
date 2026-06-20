'use client'

import { useState, useMemo } from 'react'
import {
  IconLock,
  IconLockOpen,
  IconClock,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconPlus,
  IconCurrencyDollar,
  IconSettings,
  IconShieldCheck,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconBan,
  IconUsers,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType = 'small-group' | 'individual' | 'team-training' | 'casual-shooting' | 'volume-shooting' | 'development-programs' | 'social-programs'
type AttendanceStatus = 'attended' | 'no-show' | 'excused' | null
type PaymentStatus = 'paid' | 'payment-required' | 'overdue' | 'waived' | 'refunded' | 'pending'
type PaymentMethod = 'automatic' | 'pay-at-venue'

interface PricingTier {
  id: string
  min: number
  max: number | null
  pricePerAthlete: number
}

interface SessionPricingConfig {
  sessionType: SessionType
  tiers: PricingTier[]
}

interface PricingSettings {
  lockoutMinutes: number
  chargeNoShow: boolean
  chargeExcusedAbsence: boolean
}

interface AthleteRecord {
  id: string
  name: string
  paymentMethod: PaymentMethod
}

interface SessionAthlete {
  athleteId: string
  attendanceStatus: AttendanceStatus
  paymentStatus: PaymentStatus
  lockedPrice: number | null
}

interface Session {
  id: string
  date: string
  startTime: string
  sessionType: SessionType
  athletes: SessionAthlete[]
  status: 'upcoming' | 'locked' | 'completed'
  completedAt: string | null
  lockedPricePerAthlete: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const DEMO_NOW = new Date('2026-06-20T11:00:00')

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  'small-group':          'Small Group Session',
  'individual':           'Individual Work Out',
  'team-training':        'Team Training',
  'casual-shooting':      'Casual Shooting',
  'volume-shooting':      'Volume Shooting',
  'development-programs': 'Development Programs',
  'social-programs':      'Social Programs',
}

const SESSION_TYPE_COLORS: Record<SessionType, { bg: string; color: string }> = {
  'small-group':          { bg: '#dbeafe', color: '#1d4ed8' },
  'individual':           { bg: '#dcfce7', color: '#15803d' },
  'team-training':        { bg: '#ede9fe', color: '#6d28d9' },
  'casual-shooting':      { bg: '#fef3c7', color: '#b45309' },
  'volume-shooting':      { bg: '#fee2e2', color: '#b91c1c' },
  'development-programs': { bg: '#ccfbf1', color: '#0f766e' },
  'social-programs':      { bg: '#fce7f3', color: '#be185d' },
}

const PAY_STATUS: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
  paid:               { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  'payment-required': { bg: '#fef9c3', color: '#92400e', label: 'Payment Required' },
  overdue:            { bg: '#fee2e2', color: '#b91c1c', label: 'Overdue' },
  waived:             { bg: '#f3f4f6', color: '#6b7280', label: 'Waived' },
  refunded:           { bg: '#e0e7ff', color: '#4338ca', label: 'Refunded' },
  pending:            { bg: '#f9fafb', color: '#9ca3af', label: 'Pending' },
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

const TABS = [
  { key: 'sessions' as const, label: 'Sessions' },
  { key: 'pricing' as const, label: 'Pricing Config' },
  { key: 'summary' as const, label: 'Admin Summary' },
]

// ─── Sample Data ─────────────────────────────────────────────────────────────

const ATHLETES: AthleteRecord[] = [
  { id: 'a1',  name: 'Liam Carter',      paymentMethod: 'automatic' },
  { id: 'a2',  name: 'Jordan Williams',  paymentMethod: 'pay-at-venue' },
  { id: 'a3',  name: 'Aisha Thompson',   paymentMethod: 'automatic' },
  { id: 'a4',  name: 'Marcus Davies',    paymentMethod: 'automatic' },
  { id: 'a5',  name: 'Devon Knox',       paymentMethod: 'pay-at-venue' },
  { id: 'a6',  name: 'Kai Okafor',       paymentMethod: 'automatic' },
  { id: 'a7',  name: 'Tyler Ross',       paymentMethod: 'pay-at-venue' },
  { id: 'a8',  name: 'Priya Mehta',      paymentMethod: 'automatic' },
  { id: 'a9',  name: 'Sam Liu',          paymentMethod: 'automatic' },
  { id: 'a10', name: 'Zara Obi',         paymentMethod: 'pay-at-venue' },
]

const INIT_PRICING: SessionPricingConfig[] = [
  {
    sessionType: 'small-group',
    tiers: [
      { id: 't1', min: 1, max: 1, pricePerAthlete: 50 },
      { id: 't2', min: 2, max: 2, pricePerAthlete: 45 },
      { id: 't3', min: 3, max: 3, pricePerAthlete: 40 },
      { id: 't4', min: 4, max: 6, pricePerAthlete: 35 },
    ],
  },
  {
    sessionType: 'individual',
    tiers: [
      { id: 't5', min: 1, max: 1, pricePerAthlete: 75 },
    ],
  },
  {
    sessionType: 'team-training',
    tiers: [
      { id: 't7', min: 7, max: 10, pricePerAthlete: 80 },
    ],
  },
  {
    sessionType: 'casual-shooting',
    tiers: [
      { id: 't10', min: 1, max: null, pricePerAthlete: 10 },
    ],
  },
  {
    sessionType: 'volume-shooting',
    tiers: [], // duration-based pricing — see VOLUME_SHOOTING_PRICES below
  },
  {
    sessionType: 'development-programs',
    tiers: [
      { id: 'dp1', min: 1, max: 1, pricePerAthlete: 80 },
      { id: 'dp2', min: 2, max: 2, pricePerAthlete: 70 },
      { id: 'dp3', min: 3, max: 4, pricePerAthlete: 60 },
    ],
  },
  {
    sessionType: 'social-programs',
    tiers: [
      { id: 'sp1', min: 1, max: 1, pricePerAthlete: 40 },
      { id: 'sp2', min: 2, max: 2, pricePerAthlete: 35 },
      { id: 'sp3', min: 3, max: 6, pricePerAthlete: 30 },
    ],
  },
]

// Volume Shooting = Shooting Machine — priced by duration, not athlete count
const VOLUME_SHOOTING_PRICES = [
  { duration: 30, label: '30 minutes', price: 30 },
  { duration: 45, label: '45 minutes', price: 40 },
  { duration: 60, label: '60 minutes', price: 50 },
]


const INIT_SETTINGS: PricingSettings = {
  lockoutMinutes: 120,
  chargeNoShow: true,
  chargeExcusedAbsence: false,
}

const INIT_SESSIONS: Session[] = [
  // Upcoming — Small Group, 2pm today. Lockout at noon (1h away at 11am).
  {
    id: 's1',
    date: '2026-06-20',
    startTime: '14:00',
    sessionType: 'small-group',
    athletes: [
      { athleteId: 'a1', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null },
      { athleteId: 'a2', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null },
      { athleteId: 'a3', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null },
    ],
    status: 'upcoming',
    completedAt: null,
    lockedPricePerAthlete: null,
  },
  // Locked — Individual Workout, noon today. Lockout was 10am (now 11am → LOCKED).
  {
    id: 's2',
    date: '2026-06-20',
    startTime: '12:00',
    sessionType: 'individual',
    athletes: [
      { athleteId: 'a4', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: 75 },
    ],
    status: 'locked',
    completedAt: null,
    lockedPricePerAthlete: 75,
  },
  // Locked — Small Group Session, 9am today (4 athletes → Small Group, not Team Training). Awaiting completion.
  {
    id: 's3',
    date: '2026-06-20',
    startTime: '09:00',
    sessionType: 'small-group',
    athletes: [
      { athleteId: 'a5', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: 35 },
      { athleteId: 'a6', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: 35 },
      { athleteId: 'a7', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: 35 },
      { athleteId: 'a8', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: 35 },
    ],
    status: 'locked',
    completedAt: null,
    lockedPricePerAthlete: 35,
  },
  // Upcoming — Casual Shooting, 10am tomorrow.
  {
    id: 's4',
    date: '2026-06-21',
    startTime: '10:00',
    sessionType: 'casual-shooting',
    athletes: [
      { athleteId: 'a9',  attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null },
      { athleteId: 'a10', attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null },
    ],
    status: 'upcoming',
    completedAt: null,
    lockedPricePerAthlete: null,
  },
  // Completed — Volume Shooting, June 18.
  {
    id: 's5',
    date: '2026-06-18',
    startTime: '15:00',
    sessionType: 'volume-shooting',
    athletes: [
      { athleteId: 'a1', attendanceStatus: 'attended', paymentStatus: 'paid',               lockedPrice: 45 },
      { athleteId: 'a2', attendanceStatus: 'attended', paymentStatus: 'payment-required',   lockedPrice: 45 },
      { athleteId: 'a3', attendanceStatus: 'no-show',  paymentStatus: 'paid',               lockedPrice: 45 },
      { athleteId: 'a4', attendanceStatus: 'attended', paymentStatus: 'paid',               lockedPrice: 45 },
      { athleteId: 'a5', attendanceStatus: 'excused',  paymentStatus: 'waived',             lockedPrice: 45 },
    ],
    status: 'completed',
    completedAt: '2026-06-18T16:30:00',
    lockedPricePerAthlete: 45,
  },
  // Completed — Small Group Session, June 17.
  {
    id: 's6',
    date: '2026-06-17',
    startTime: '11:00',
    sessionType: 'small-group',
    athletes: [
      { athleteId: 'a6', attendanceStatus: 'attended', paymentStatus: 'paid',             lockedPrice: 40 },
      { athleteId: 'a7', attendanceStatus: 'attended', paymentStatus: 'payment-required', lockedPrice: 40 },
      { athleteId: 'a8', attendanceStatus: 'no-show',  paymentStatus: 'waived',           lockedPrice: 40 },
    ],
    status: 'completed',
    completedAt: '2026-06-17T12:15:00',
    lockedPricePerAthlete: 40,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPriceForCount(tiers: PricingTier[], count: number): number | null {
  const tier = tiers.find(t => count >= t.min && (t.max === null || count <= t.max))
  return tier?.pricePerAthlete ?? null
}

function getSessionDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

function getLockoutDate(sessionStart: Date, lockoutMinutes: number): Date {
  return new Date(sessionStart.getTime() - lockoutMinutes * 60 * 1000)
}

function msUntilLockout(session: Session, now: Date, lockoutMinutes: number): number {
  const start = getSessionDateTime(session.date, session.startTime)
  return getLockoutDate(start, lockoutMinutes).getTime() - now.getTime()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
}

function lockoutTimeStr(session: Session, lockoutMinutes: number): string {
  const start = getSessionDateTime(session.date, session.startTime)
  const lockout = getLockoutDate(start, lockoutMinutes)
  return `${lockout.getHours().toString().padStart(2, '0')}:${lockout.getMinutes().toString().padStart(2, '0')}`
}

// ─── Toggle Component ─────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${on ? 'bg-[#6BA3D6]' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const pricingConfigs = INIT_PRICING
  const [settings, setSettings] = useState<PricingSettings>(INIT_SETTINGS)
  const [sessions, setSessions] = useState<Session[]>(INIT_SESSIONS)
  const [tab, setTab] = useState<'sessions' | 'pricing' | 'summary'>('sessions')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'locked' | 'completed'>('all')
  const [addingTo, setAddingTo] = useState<string | null>(null)

  const now = DEMO_NOW

  // Derive live computed state per session
  const computed = useMemo(() => sessions.map(s => {
    if (s.status === 'completed') return { ...s, computedState: 'completed' as const, lockMs: 0 }
    const lockMs = msUntilLockout(s, now, settings.lockoutMinutes)
    return { ...s, computedState: lockMs <= 0 ? ('locked' as const) : ('upcoming' as const), lockMs }
  }), [sessions, settings.lockoutMinutes])

  const filtered = useMemo(() => {
    if (sessionFilter === 'all') return computed
    return computed.filter(s => s.computedState === sessionFilter)
  }, [computed, sessionFilter])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function markAttendance(sessionId: string, athleteId: string, status: AttendanceStatus) {
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      athletes: s.athletes.map(sa => sa.athleteId === athleteId ? { ...sa, attendanceStatus: status } : sa),
    }))
  }

  function completeSession(sessionId: string) {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      const updated = s.athletes.map(sa => {
        const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
        let paymentStatus: PaymentStatus = 'pending'
        if (sa.attendanceStatus === 'attended') {
          paymentStatus = athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required'
        } else if (sa.attendanceStatus === 'no-show') {
          paymentStatus = settings.chargeNoShow
            ? (athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required')
            : 'waived'
        } else if (sa.attendanceStatus === 'excused') {
          paymentStatus = settings.chargeExcusedAbsence
            ? (athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required')
            : 'waived'
        }
        return { ...sa, paymentStatus }
      })
      return { ...s, athletes: updated, status: 'completed', completedAt: now.toISOString() }
    }))
  }

  function overridePayment(sessionId: string, athleteId: string, status: PaymentStatus) {
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      athletes: s.athletes.map(sa => sa.athleteId === athleteId ? { ...sa, paymentStatus: status } : sa),
    }))
  }

  function removeAthlete(sessionId: string, athleteId: string) {
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      athletes: s.athletes.filter(sa => sa.athleteId !== athleteId),
    }))
  }

  function addAthlete(sessionId: string, athleteId: string) {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId || s.athletes.some(sa => sa.athleteId === athleteId)) return s
      return { ...s, athletes: [...s.athletes, { athleteId, attendanceStatus: null, paymentStatus: 'pending', lockedPrice: null }] }
    }))
    setAddingTo(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pricing &amp; Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Session pricing, lockout management, attendance, and payment tracking</p>
      </div>

      {/* Demo Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Demo Mode — Payment processing requires Stripe integration</p>
          <p className="text-xs text-amber-700 mt-0.5">
            All pricing tiers, lockout logic, attendance marking, and payment status tracking are fully operational.
            Actual charges will not be processed until Stripe is connected.
            Demo reference time: <strong>Sat 20 Jun 2026, 11:00am</strong>
          </p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={tab === key ? { backgroundColor: ACCENT } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: SESSIONS
          ════════════════════════════════════════════════════════════════════ */}
      {tab === 'sessions' && (
        <div>
          {/* Filter pills */}
          <div className="mb-4 flex gap-2">
            {(['all', 'upcoming', 'locked', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setSessionFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${sessionFilter === f ? 'text-white' : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                style={sessionFilter === f ? { backgroundColor: ACCENT } : {}}
              >
                {f === 'all' ? 'All Sessions' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Session cards */}
          <div className="space-y-3">
            {filtered.map(session => {
              const config = pricingConfigs.find(c => c.sessionType === session.sessionType)!
              const count = session.athletes.length
              const estPrice = config ? getPriceForCount(config.tiers, count) : null
              const isExpanded = expandedSession === session.id
              const state = session.computedState
              const typeColor = SESSION_TYPE_COLORS[session.sessionType]
              const usedIds = new Set(session.athletes.map(sa => sa.athleteId))
              const available = ATHLETES.filter(a => !usedIds.has(a.id))
              const allMarked = count > 0 && session.athletes.every(sa => sa.attendanceStatus !== null)
              const sessionStarted = getSessionDateTime(session.date, session.startTime) <= now

              return (
                <div key={session.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {/* Card header */}
                  <button
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    {/* State dot */}
                    <span className={`h-2 w-2 shrink-0 rounded-full ${state === 'completed' ? 'bg-green-500' : state === 'locked' ? 'bg-red-500' : 'bg-blue-400'}`} />

                    {/* Session type */}
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                      {SESSION_TYPE_LABELS[session.sessionType]}
                    </span>

                    {/* Date & time */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <IconCalendar size={14} />
                      {fmtDate(session.date)} · {fmtTime(session.startTime)}
                    </div>

                    {/* Athlete count */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <IconUsers size={14} />
                      {count} {count === 1 ? 'athlete' : 'athletes'}
                    </div>

                    {/* Right-side status */}
                    <div className="ml-auto flex items-center gap-3">
                      {state === 'completed' && (
                        <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          <IconShieldCheck size={13} /> Completed
                        </span>
                      )}
                      {state === 'locked' && (
                        <>
                          <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            <IconLock size={13} /> {sessionStarted ? 'Awaiting Completion' : 'Locked'}
                          </span>
                          {session.lockedPricePerAthlete != null && (
                            <span className="text-sm font-semibold text-gray-800">
                              Locked: ${session.lockedPricePerAthlete}/athlete
                            </span>
                          )}
                        </>
                      )}
                      {state === 'upcoming' && (
                        <>
                          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                            <IconClock size={13} />
                            {session.lockMs < 3_600_000 ? `Locks in ${formatCountdown(session.lockMs)}` : 'Unlocked'}
                          </span>
                          {estPrice != null && count > 0 && (
                            <span className="text-sm text-gray-400">Est. ${estPrice}/athlete</span>
                          )}
                        </>
                      )}
                      {isExpanded ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4">

                      {/* ── UPCOMING: add/remove athletes, estimated price ── */}
                      {state === 'upcoming' && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Registered Athletes</p>
                            <span className="flex items-center gap-1 text-xs text-blue-500">
                              <IconLockOpen size={12} />
                              Estimated price — locks at {fmtTime(lockoutTimeStr(session, settings.lockoutMinutes))}
                            </span>
                          </div>

                          <div className="mb-4 space-y-2">
                            {session.athletes.map(sa => {
                              const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
                              const price = config ? getPriceForCount(config.tiers, count) : null
                              return (
                                <div key={sa.athleteId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <IconUser size={14} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800">{athlete.name}</span>
                                    <span className="text-xs text-gray-400">
                                      {athlete.paymentMethod === 'automatic' ? '· Auto charge' : '· Pay at venue'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500">{price != null ? `Est. $${price}` : '—'}</span>
                                    <button onClick={() => removeAthlete(session.id, sa.athleteId)} className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500">
                                      <IconX size={14} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                            {count === 0 && (
                              <p className="text-xs text-gray-400 italic">No athletes registered yet.</p>
                            )}
                          </div>

                          {/* Add athlete picker */}
                          {available.length > 0 && (
                            addingTo === session.id ? (
                              <div className="mb-4 flex flex-wrap gap-2">
                                {available.map(a => (
                                  <button key={a.id} onClick={() => addAthlete(session.id, a.id)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                                    + {a.name}
                                  </button>
                                ))}
                                <button onClick={() => setAddingTo(null)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-400 hover:text-gray-700">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setAddingTo(session.id)} className="mb-4 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                                <IconPlus size={13} /> Add Athlete
                              </button>
                            )
                          )}

                          {/* Estimated total */}
                          {estPrice != null && count > 0 && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                              <p className="text-xs font-medium text-blue-700">
                                Estimated total: <strong>${(estPrice * count).toFixed(0)}</strong> ({count} × ${estPrice}/athlete)
                                — price locks at {fmtTime(lockoutTimeStr(session, settings.lockoutMinutes))}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* ── LOCKED: mark attendance + complete ── */}
                      {state === 'locked' && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mark Attendance</p>
                            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                              <IconLock size={12} /> Roster locked — no athlete changes allowed
                            </span>
                          </div>

                          <div className="mb-4 space-y-2">
                            {session.athletes.map(sa => {
                              const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
                              return (
                                <div key={sa.athleteId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <IconUser size={14} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800">{athlete.name}</span>
                                    <span className="text-xs text-gray-400">
                                      {session.lockedPricePerAthlete != null ? `Locked: $${session.lockedPricePerAthlete}` : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {(['attended', 'no-show', 'excused'] as AttendanceStatus[]).map(status => (
                                      <button
                                        key={status as string}
                                        onClick={() => markAttendance(session.id, sa.athleteId, status)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                          sa.attendanceStatus === status
                                            ? status === 'attended' ? 'border-green-400 bg-green-100 text-green-700'
                                            : status === 'no-show' ? 'border-red-400 bg-red-100 text-red-700'
                                            : 'border-amber-400 bg-amber-100 text-amber-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                        }`}
                                      >
                                        {status === 'attended' ? '✓ Attended' : status === 'no-show' ? '✗ No Show' : '~ Excused'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex items-center justify-between">
                            {!allMarked && count > 0 && (
                              <p className="text-xs text-amber-600">Mark attendance for all athletes to enable completion</p>
                            )}
                            <button
                              disabled={!allMarked}
                              onClick={() => completeSession(session.id)}
                              className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${allMarked ? 'hover:opacity-90' : 'cursor-not-allowed opacity-40'}`}
                              style={{ backgroundColor: ACCENT }}
                            >
                              <IconShieldCheck size={16} /> Complete Session
                            </button>
                          </div>
                        </>
                      )}

                      {/* ── COMPLETED: attendance + payment summary ── */}
                      {state === 'completed' && (
                        <>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Attendance &amp; Payment</p>
                            {session.completedAt && (
                              <p className="text-xs text-gray-400">
                                Completed {new Date(session.completedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            )}
                          </div>

                          <div className="mb-4 space-y-2">
                            {session.athletes.map(sa => {
                              const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
                              const ps = PAY_STATUS[sa.paymentStatus]
                              return (
                                <div key={sa.athleteId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <IconUser size={14} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-800">{athlete.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      sa.attendanceStatus === 'attended' ? 'bg-green-100 text-green-700'
                                      : sa.attendanceStatus === 'no-show' ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {sa.attendanceStatus === 'attended' ? '✓ Attended' : sa.attendanceStatus === 'no-show' ? '✗ No Show' : '~ Excused'}
                                    </span>
                                    {sa.lockedPrice != null && (
                                      <span className="text-xs text-gray-400">${sa.lockedPrice}/session</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: ps.bg, color: ps.color }}>
                                      {ps.label}
                                    </span>
                                    {/* Admin action icons */}
                                    <div className="flex items-center gap-0.5">
                                      {sa.paymentStatus !== 'paid' && sa.paymentStatus !== 'waived' && sa.paymentStatus !== 'refunded' && (
                                        <button title="Mark as Paid" onClick={() => overridePayment(session.id, sa.athleteId, 'paid')} className="rounded p-1 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600">
                                          <IconCheck size={13} />
                                        </button>
                                      )}
                                      {sa.paymentStatus === 'paid' && (
                                        <button title="Issue Refund" onClick={() => overridePayment(session.id, sa.athleteId, 'refunded')} className="rounded p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                                          <IconRefresh size={13} />
                                        </button>
                                      )}
                                      {sa.paymentStatus !== 'waived' && (
                                        <button title="Waive Fee" onClick={() => overridePayment(session.id, sa.athleteId, 'waived')} className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700">
                                          <IconBan size={13} />
                                        </button>
                                      )}
                                      {(sa.paymentStatus === 'waived' || sa.paymentStatus === 'refunded') && (
                                        <button title="Override — require payment" onClick={() => overridePayment(session.id, sa.athleteId, 'payment-required')} className="rounded p-1 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600">
                                          <IconCurrencyDollar size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Payment summary strip */}
                          <div className="grid grid-cols-4 gap-3">
                            {(['paid', 'payment-required', 'waived', 'refunded'] as PaymentStatus[]).map(status => {
                              const n = session.athletes.filter(sa => sa.paymentStatus === status).length
                              const ps = PAY_STATUS[status]
                              return (
                                <div key={status} className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: ps.bg }}>
                                  <p className="text-xl font-bold" style={{ color: ps.color }}>{n}</p>
                                  <p className="text-xs font-medium" style={{ color: ps.color }}>{ps.label}</p>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-400">
                No sessions match this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: PRICING CONFIG
          ════════════════════════════════════════════════════════════════════ */}
      {tab === 'pricing' && (
        <div className="space-y-6">

          {/* Global settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
              <IconSettings size={17} style={{ color: ACCENT }} /> Global Settings
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className={LABEL}>Lockout Period</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={settings.lockoutMinutes}
                    onChange={e => setSettings(s => ({ ...s, lockoutMinutes: parseInt(e.target.value) || 120 }))}
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                  />
                  <span className="text-sm text-gray-500">minutes before session</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Default: 120 min (2 hours)</p>
              </div>

              <div>
                <label className={LABEL}>No Show Charge</label>
                <div className="mt-2 flex items-center gap-3">
                  <Toggle on={settings.chargeNoShow} onToggle={() => setSettings(s => ({ ...s, chargeNoShow: !s.chargeNoShow }))} />
                  <span className="text-sm text-gray-700">
                    {settings.chargeNoShow ? 'No Shows are charged' : 'No Shows are not charged'}
                  </span>
                </div>
              </div>

              <div>
                <label className={LABEL}>Excused Absence Charge</label>
                <div className="mt-2 flex items-center gap-3">
                  <Toggle on={settings.chargeExcusedAbsence} onToggle={() => setSettings(s => ({ ...s, chargeExcusedAbsence: !s.chargeExcusedAbsence }))} />
                  <span className="text-sm text-gray-700">
                    {settings.chargeExcusedAbsence ? 'Excused Absences are charged' : 'Excused Absences are not charged'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-type pricing grids — standard session types */}
          <div className="grid grid-cols-2 gap-4">
            {pricingConfigs.map(config => {
              const typeColor = SESSION_TYPE_COLORS[config.sessionType]
              return (
                <div key={config.sessionType} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-4">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                      {SESSION_TYPE_LABELS[config.sessionType]}
                    </span>
                  </div>

                  {config.sessionType === 'volume-shooting' ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Flat Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {VOLUME_SHOOTING_PRICES.map(row => (
                          <tr key={row.duration} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{row.label}</td>
                            <td className="py-2 font-semibold text-gray-900">${row.price}.00</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="pt-2 text-xs text-gray-400">Flat booking fee — not per athlete</td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Athletes</th>
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Price / Athlete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.tiers.map(tier => (
                          <tr key={tier.id} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">
                              {tier.max === null
                                ? `${tier.min}+ athletes`
                                : tier.min === tier.max
                                ? `${tier.min} athlete`
                                : `${tier.min}–${tier.max} athletes`}
                            </td>
                            <td className="py-2 font-semibold text-gray-900">${tier.pricePerAthlete.toFixed(0)} / each</td>
                          </tr>
                        ))}
                        {config.tiers.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-4 text-center text-xs text-gray-400">No tiers configured</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: ADMIN SUMMARY
          ════════════════════════════════════════════════════════════════════ */}
      {tab === 'summary' && (
        <div className="space-y-6">

          {/* Settings at a glance */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className={LABEL}>Lockout Period</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {settings.lockoutMinutes}
                <span className="ml-1 text-base font-normal text-gray-400">min</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">{(settings.lockoutMinutes / 60).toFixed(1)} hours before session start</p>
            </div>
            <div className="rounded-xl border p-4" style={{ backgroundColor: settings.chargeNoShow ? '#dcfce7' : '#f9fafb', borderColor: settings.chargeNoShow ? '#86efac' : '#e5e7eb' }}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: settings.chargeNoShow ? '#15803d' : '#6b7280' }}>No Show Policy</p>
              <p className="text-xl font-bold" style={{ color: settings.chargeNoShow ? '#15803d' : '#374151' }}>{settings.chargeNoShow ? 'Charged' : 'Not Charged'}</p>
              <p className="mt-1 text-xs" style={{ color: settings.chargeNoShow ? '#16a34a' : '#9ca3af' }}>
                {settings.chargeNoShow ? 'Athletes are billed for missed sessions' : 'No-show athletes are not billed'}
              </p>
            </div>
            <div className="rounded-xl border p-4" style={{ backgroundColor: settings.chargeExcusedAbsence ? '#dcfce7' : '#f9fafb', borderColor: settings.chargeExcusedAbsence ? '#86efac' : '#e5e7eb' }}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: settings.chargeExcusedAbsence ? '#15803d' : '#6b7280' }}>Excused Absence Policy</p>
              <p className="text-xl font-bold" style={{ color: settings.chargeExcusedAbsence ? '#15803d' : '#374151' }}>{settings.chargeExcusedAbsence ? 'Charged' : 'Not Charged'}</p>
              <p className="mt-1 text-xs" style={{ color: settings.chargeExcusedAbsence ? '#16a34a' : '#9ca3af' }}>
                {settings.chargeExcusedAbsence ? 'Excused absences incur full session fee' : 'Excused absences are waived'}
              </p>
            </div>
          </div>

          {/* Pricing structure overview table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Pricing Structure — All Session Types</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Session Type</th>
                    {[1, 2, 3, 4, 5, 8, 10, 12].map(n => (
                      <th key={n} className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricingConfigs.map(config => {
                    const typeColor = SESSION_TYPE_COLORS[config.sessionType]
                    const isVolume = config.sessionType === 'volume-shooting'
                    return (
                      <tr key={config.sessionType} className="border-b border-gray-100">
                        <td className="py-2.5">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                            {SESSION_TYPE_LABELS[config.sessionType]}
                          </span>
                        </td>
                        {isVolume ? (
                          <td colSpan={8} className="py-2.5 text-xs text-gray-500">
                            Duration-based flat fee — 30 min $30 · 45 min $40 · 60 min $50
                          </td>
                        ) : (
                          [1, 2, 3, 4, 5, 8, 10, 12].map(n => {
                            const price = getPriceForCount(config.tiers, n)
                            return (
                              <td key={n} className="py-2.5 text-center text-gray-700">
                                {price != null ? `$${price}` : <span className="text-gray-300">—</span>}
                              </td>
                            )
                          })
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={9} className="pt-3 text-xs text-gray-400">
                      Values show price per athlete at each athlete count. — means no tier configured for that count.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Recent completed sessions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-800">Recent Completed Sessions</h2>
            {sessions.filter(s => s.status === 'completed').length === 0 ? (
              <p className="text-sm text-gray-400">No completed sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.filter(s => s.status === 'completed').map(session => {
                  const typeColor = SESSION_TYPE_COLORS[session.sessionType]
                  const attended = session.athletes.filter(sa => sa.attendanceStatus === 'attended').length
                  const noShow   = session.athletes.filter(sa => sa.attendanceStatus === 'no-show').length
                  const excused  = session.athletes.filter(sa => sa.attendanceStatus === 'excused').length
                  const paid     = session.athletes.filter(sa => sa.paymentStatus === 'paid').length
                  const required = session.athletes.filter(sa => sa.paymentStatus === 'payment-required').length
                  const waived   = session.athletes.filter(sa => sa.paymentStatus === 'waived').length
                  const revenue  = session.athletes
                    .filter(sa => sa.paymentStatus === 'paid' && sa.lockedPrice != null)
                    .reduce((sum, sa) => sum + (sa.lockedPrice ?? 0), 0)

                  return (
                    <div key={session.id} className="rounded-lg border border-gray-100 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                            {SESSION_TYPE_LABELS[session.sessionType]}
                          </span>
                          <span className="text-sm text-gray-600">{fmtDate(session.date)} · {fmtTime(session.startTime)}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">${revenue.toFixed(0)} collected</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">{attended} Attended</span>
                        {noShow > 0 && <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">{noShow} No Show</span>}
                        {excused > 0 && <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">{excused} Excused</span>}
                        <span className="text-gray-300">·</span>
                        {paid > 0 && <span className="rounded px-2 py-0.5" style={{ backgroundColor: PAY_STATUS.paid.bg, color: PAY_STATUS.paid.color }}>{paid} Paid</span>}
                        {required > 0 && <span className="rounded px-2 py-0.5" style={{ backgroundColor: PAY_STATUS['payment-required'].bg, color: PAY_STATUS['payment-required'].color }}>{required} Payment Required</span>}
                        {waived > 0 && <span className="rounded px-2 py-0.5" style={{ backgroundColor: PAY_STATUS.waived.bg, color: PAY_STATUS.waived.color }}>{waived} Waived</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
