'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  IconClock,
  IconCheck,
  IconX,
  IconPlus,
  IconCurrencyDollar,
  IconShieldCheck,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconBan,
  IconUsers,
  IconUser,
  IconCalendar,
  IconPencil,
  IconCreditCard,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType = 'small-group' | 'individual' | 'team-training' | 'casual-shooting' | 'volume-shooting' | 'development-programs' | 'social-programs' | 'weight-room-session' | 'film-room-session' | 'shooting-machine-session'
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
  sessionType: string  // SessionType for built-in types; custom uid string for user-added cards
  label?: string       // display label for custom cards
  tiers: PricingTier[]
  durationMins?: number
}

interface PricingSettings {
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
  status: 'upcoming' | 'completed'
  completedAt: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  'small-group':            'Small Group Session',
  'individual':             'Individual Work Out',
  'team-training':          'Team Training',
  'casual-shooting':        'Casual Shooting',
  'volume-shooting':        'Volume Shooting',
  'development-programs':   'Development Programs',
  'social-programs':        'Social Programs',
  'weight-room-session':    'Weight Room Session',
  'film-room-session':      'Film Room Session',
  'shooting-machine-session': 'Shooting Machine Session',
}

const SESSION_TYPE_COLORS: Record<SessionType, { bg: string; color: string }> = {
  'small-group':            { bg: '#dbeafe', color: '#1d4ed8' },
  'individual':             { bg: '#dcfce7', color: '#15803d' },
  'team-training':          { bg: '#ede9fe', color: '#6d28d9' },
  'casual-shooting':        { bg: '#fef3c7', color: '#b45309' },
  'volume-shooting':        { bg: '#fee2e2', color: '#b91c1c' },
  'development-programs':   { bg: '#ccfbf1', color: '#0f766e' },
  'social-programs':        { bg: '#fce7f3', color: '#be185d' },
  'weight-room-session':    { bg: '#fce8eb', color: '#9B2335' },
  'film-room-session':      { bg: '#f0ebfb', color: '#A06BD6' },
  'shooting-machine-session': { bg: '#fdf5e0', color: '#D4A520' },
}

const PAY_STATUS: Record<PaymentStatus, { bg: string; color: string; label: string }> = {
  paid:               { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  'payment-required': { bg: '#fef9c3', color: '#92400e', label: 'Payment Required' },
  overdue:            { bg: '#fee2e2', color: '#b91c1c', label: 'Overdue' },
  waived:             { bg: '#f3f4f6', color: '#6b7280', label: 'Waived' },
  refunded:           { bg: '#e0e7ff', color: '#4338ca', label: 'Refunded' },
  pending:            { bg: '#f9fafb', color: '#9ca3af', label: 'Pending' },
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

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
    durationMins: 90,
    tiers: [
      { id: 't1', min: 1, max: 1, pricePerAthlete: 50 },
      { id: 't2', min: 2, max: 2, pricePerAthlete: 45 },
      { id: 't3', min: 3, max: 3, pricePerAthlete: 40 },
      { id: 't4', min: 4, max: 6, pricePerAthlete: 35 },
    ],
  },
  {
    sessionType: 'individual',
    durationMins: 60,
    tiers: [
      { id: 't5', min: 1, max: 1, pricePerAthlete: 75 },
    ],
  },
  {
    sessionType: 'team-training',
    durationMins: 120,
    tiers: [
      { id: 't7', min: 7, max: 10, pricePerAthlete: 80 },
    ],
  },
  {
    sessionType: 'casual-shooting',
    durationMins: 60,
    tiers: [
      { id: 't10', min: 1, max: null, pricePerAthlete: 10 },
    ],
  },
  {
    sessionType: 'volume-shooting',
    durationMins: 60,
    tiers: [], // duration-based pricing — see DEFAULT_VOLUME_PRICES below
  },
  {
    sessionType: 'development-programs',
    tiers: [], // program-based pricing
  },
  {
    sessionType: 'social-programs',
    tiers: [], // program-based pricing
  },
  {
    sessionType: 'weight-room-session',
    durationMins: 60,
    tiers: [
      { id: 'tw1', min: 1, max: null, pricePerAthlete: 15 },
    ],
  },
  {
    sessionType: 'film-room-session',
    durationMins: 60,
    tiers: [
      { id: 'tf1', min: 1, max: null, pricePerAthlete: 20 },
    ],
  },
  {
    sessionType: 'shooting-machine-session',
    durationMins: 60,
    tiers: [
      { id: 'tsm1', min: 1, max: null, pricePerAthlete: 15 },
    ],
  },
]

// Volume Shooting — priced by duration, not athlete count
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_VOLUME_PRICES = [
  { duration: 30, label: '30 minutes', price: 30 },
  { duration: 45, label: '45 minutes', price: 40 },
  { duration: 60, label: '60 minutes', price: 50 },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_DURATIONS: Record<string, number> = {
  'individual': 60,
  'small-group': 90,
  'team-training': 120,
  'casual-shooting': 60,
  'volume-shooting': 60,
  'weight-room-session': 60,
  'film-room-session': 60,
  'shooting-machine-session': 60,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DURATION_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const mins = (i + 1) * 15
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const label = h > 0
    ? (m > 0 ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`)
    : `${m} min`
  return { value: mins, label }
})

// Development & Social Programs — per-program flat pricing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PROGRAM_PRICING: Record<'development-programs' | 'social-programs', { name: string; price: number; max: number }[]> = {
  'development-programs': [
    { name: 'Performance Lab',  price: 20, max: 15 },
    { name: 'Domestic Academy', price: 20, max: 15 },
    { name: 'Snipers Club',     price: 20, max: 15 },
    { name: 'Shooters Lab',     price: 20, max: 15 },
  ],
  'social-programs': [
    { name: 'Walking Basketball',    price: 15, max: 20 },
    { name: 'Mid Day Ladies Comp',   price: 15, max: 20 },
    { name: 'Adult Beginner School', price: 15, max: 20 },
  ],
}

const INIT_SETTINGS: PricingSettings = {
  chargeNoShow: true,
  chargeExcusedAbsence: false,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICING_CONFIGS_LS = 'f14_pricing_configs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function getPriceForCount(tiers: PricingTier[], count: number): number | null {
  if (!Array.isArray(tiers)) return null
  const tier = tiers.find(t => count >= t.min && (t.max === null || count <= t.max))
  return tier?.pricePerAthlete ?? null
}

function getSessionDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [pricingConfigs, setPricingConfigs] = useState<SessionPricingConfig[]>(INIT_PRICING)
  const [settings] = useState<PricingSettings>(INIT_SETTINGS)
  const [sessions, setSessions] = useState<Session[]>([])
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [sessionFilter, setSessionFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming')
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editAttendance, setEditAttendance] = useState<Record<string, AttendanceStatus>>({})

  // Load pricing configs from Supabase on mount (read-only — used to look up prices for sessions)
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('session_types').select('*')
        if (data && data.length > 0) {
          const loaded = data.map(r => {
            let tiers: PricingTier[] = []
            try {
              const raw = Array.isArray(r.tiers) ? r.tiers : JSON.parse(r.tiers as string ?? '[]')
              tiers = (raw as Record<string, unknown>[]).map(t => ({
                id:             (t.id as string) ?? '',
                min:            (t.min as number) ?? 1,
                max:            (t.max as number | null) ?? null,
                pricePerAthlete:(t.pricePerAthlete as number) ?? 0,
              }))
            } catch {}
            return {
              sessionType:  r.session_type_id as string,
              tiers,
              durationMins: (r.duration_minutes as number) ?? 60,
            } as SessionPricingConfig
          })
          setPricingConfigs(loaded)
        }
      } catch (e) { console.error('[pricing] session_types load failed:', e) }
    })()
  }, [])

  // Derive live computed state per session
  const computed = useMemo(() => sessions.map(s => ({
    ...s,
    computedState: s.status === 'completed' ? ('completed' as const) : ('upcoming' as const),
  })), [sessions])

  const filtered = useMemo(() => {
    if (sessionFilter === 'all') return computed
    return computed.filter(s => s.computedState === sessionFilter)
  }, [computed, sessionFilter])

  const totalPendingPayments = useMemo(() =>
    sessions
      .filter(s => s.status === 'completed')
      .flatMap(s => s.athletes)
      .filter(sa => sa.paymentStatus === 'payment-required').length
  , [sessions])

  // Sync pending payment count to localStorage so Dashboard can read it
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('f14_pendingPaymentCount', String(totalPendingPayments))
  }, [totalPendingPayments])

  // On mount: honour "Run Payments" signal from Dashboard quick action
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('f14_runPayments') === 'true') {
      localStorage.removeItem('f14_runPayments')
      runAllPayments()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      return { ...s, athletes: updated, status: 'completed', completedAt: new Date().toISOString() }
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

  function startEditSession(sessionId: string) {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    const attendance: Record<string, AttendanceStatus> = {}
    session.athletes.forEach(sa => { attendance[sa.athleteId] = sa.attendanceStatus })
    setEditAttendance(attendance)
    setEditingSession(sessionId)
  }

  function saveEditSession(sessionId: string) {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      const updated = s.athletes.map(sa => {
        const newAttendance = editAttendance[sa.athleteId] ?? sa.attendanceStatus
        const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
        let paymentStatus: PaymentStatus = sa.paymentStatus
        if (newAttendance === 'attended') {
          paymentStatus = athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required'
        } else if (newAttendance === 'no-show') {
          paymentStatus = settings.chargeNoShow
            ? (athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required')
            : 'waived'
        } else if (newAttendance === 'excused') {
          paymentStatus = settings.chargeExcusedAbsence
            ? (athlete.paymentMethod === 'automatic' ? 'paid' : 'payment-required')
            : 'waived'
        }
        return { ...sa, attendanceStatus: newAttendance, paymentStatus }
      })
      return { ...s, athletes: updated }
    }))
    setEditingSession(null)
    setEditAttendance({})
  }

  function cancelEditSession() {
    setEditingSession(null)
    setEditAttendance({})
  }

  function runPayments(sessionId: string) {
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      athletes: s.athletes.map(sa =>
        sa.paymentStatus === 'payment-required' ? { ...sa, paymentStatus: 'paid' as PaymentStatus } : sa
      ),
    }))
  }

  function runAllPayments() {
    setSessions(prev => prev.map(s => s.status !== 'completed' ? s : {
      ...s,
      athletes: s.athletes.map(sa =>
        sa.paymentStatus === 'payment-required' ? { ...sa, paymentStatus: 'paid' as PaymentStatus } : sa
      ),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Session attendance and payment tracking</p>
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        {(['upcoming', 'completed', 'all'] as const).map(f => (
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
          return (
            <div key={session.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Card header */}
              <button
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                {/* State dot */}
                <span className={`h-2 w-2 shrink-0 rounded-full ${state === 'completed' ? 'bg-green-500' : 'bg-blue-400'}`} />

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
                  {state === 'upcoming' && (
                    <>
                      <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                        <IconClock size={13} /> Upcoming
                      </span>
                      {estPrice != null && count > 0 && (
                        <span className="text-sm text-gray-400">${estPrice}/athlete</span>
                      )}
                    </>
                  )}
                  {isExpanded ? <IconChevronUp size={16} className="text-gray-400" /> : <IconChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4">

                  {/* ── UPCOMING: add/remove athletes, price ── */}
                  {state === 'upcoming' && (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Registered Athletes</p>
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

                      {/* Total */}
                      {estPrice != null && count > 0 && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-xs font-medium text-blue-700">
                            Total paid at booking: <strong>${(estPrice * count).toFixed(0)}</strong> ({count} × ${estPrice}/athlete)
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between">
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
                        <div className="flex items-center gap-3">
                          {session.completedAt && (
                            <p className="text-xs text-gray-400">
                              Completed {new Date(session.completedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                          {editingSession === session.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={cancelEditSession}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEditSession(session.id)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                                style={{ backgroundColor: ACCENT }}
                              >
                                <IconCheck size={12} /> Save Changes
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditSession(session.id)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                              <IconPencil size={12} /> Edit Attendance
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 space-y-2">
                        {session.athletes.map(sa => {
                          const athlete = ATHLETES.find(a => a.id === sa.athleteId)!
                          const ps = PAY_STATUS[sa.paymentStatus]
                          const isEditing = editingSession === session.id
                          const currentAttendance = isEditing
                            ? (editAttendance[sa.athleteId] ?? sa.attendanceStatus)
                            : sa.attendanceStatus
                          return (
                            <div key={sa.athleteId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                              <div className="flex items-center gap-3">
                                <IconUser size={14} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-800">{athlete.name}</span>
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    {(['attended', 'no-show', 'excused'] as AttendanceStatus[]).map(status => (
                                      <button
                                        key={status as string}
                                        onClick={() => setEditAttendance(prev => ({ ...prev, [sa.athleteId]: status }))}
                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${
                                          currentAttendance === status
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
                                ) : (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    sa.attendanceStatus === 'attended' ? 'bg-green-100 text-green-700'
                                    : sa.attendanceStatus === 'no-show' ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {sa.attendanceStatus === 'attended' ? '✓ Attended' : sa.attendanceStatus === 'no-show' ? '✗ No Show' : '~ Excused'}
                                  </span>
                                )}
                                {sa.lockedPrice != null && (
                                  <span className="text-xs text-gray-400">${sa.lockedPrice}/session</span>
                                )}
                              </div>
                              {!isEditing && (
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: ps.bg, color: ps.color }}>
                                    {ps.label}
                                  </span>
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
                              )}
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

                      {/* Run Payments */}
                      {editingSession !== session.id && session.athletes.some(sa => sa.paymentStatus === 'payment-required') && (
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-amber-800">
                              {session.athletes.filter(sa => sa.paymentStatus === 'payment-required').length} athlete{session.athletes.filter(sa => sa.paymentStatus === 'payment-required').length !== 1 ? 's' : ''} pending payment
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">Requires Stripe connection in production</p>
                          </div>
                          <button
                            onClick={() => runPayments(session.id)}
                            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            style={{ backgroundColor: '#16a34a' }}
                          >
                            <IconCreditCard size={15} /> Run Payments
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-gray-400">No sessions yet</p>
            <p className="mt-1 text-xs text-gray-400">Sessions will appear here once bookings are created</p>
          </div>
        )}
      </div>

      {/* Run All Payments */}
      {(() => {
        const totalPending = sessions
          .filter(s => s.status === 'completed')
          .flatMap(s => s.athletes)
          .filter(sa => sa.paymentStatus === 'payment-required').length
        if (totalPending === 0) return null
        return (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-green-800">
                {totalPending} outstanding payment{totalPending !== 1 ? 's' : ''} across all completed sessions
              </p>
              <p className="text-xs text-green-600 mt-0.5">Requires Stripe connection in production</p>
            </div>
            <button
              onClick={runAllPayments}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#16a34a' }}
            >
              <IconCreditCard size={15} /> Run All Payments
            </button>
          </div>
        )
      })()}
    </div>
  )
}
