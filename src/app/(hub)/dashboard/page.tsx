'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconUsers,
  IconCalendar,
  IconCurrencyDollar,
  IconReceipt,
  IconCalendarPlus,
  IconUserPlus,
  IconLock,
  IconBell,
  IconClipboardList,
  IconChevronRight,
  IconCreditCard,
  IconCheck,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Engagement = 'High' | 'Medium' | 'Low'
type SessionStatus = 'past' | 'current' | 'upcoming'

// ─── Sample Data ──────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Active Athletes',      value: '24',      sub: '+2 this month',        icon: IconUsers,          accent: '#6BA3D6' },
  { label: 'Sessions Today',       value: '6',       sub: '2 completed',          icon: IconCalendar,       accent: '#10b981' },
  { label: 'Revenue This Month',   value: '$12,450', sub: '+18% vs last month',   icon: IconCurrencyDollar, accent: '#6BA3D6' },
  { label: 'Outstanding Invoices', value: '$2,380',  sub: '3 invoices pending',   icon: IconReceipt,        accent: '#f59e0b' },
]

const SCHEDULE = [
  { time: '07:00', end: '08:30', label: 'Morning Skills',   type: 'Skills',     location: 'Court A', athletes: ['Liam C.', 'Jordan W.', 'Aisha T.'],              coach: 'Matt' },
  { time: '09:30', end: '10:30', label: '1-on-1 Training',  type: 'Individual', location: 'Court B', athletes: ['Marcus D.'],                                      coach: 'Jade' },
  { time: '11:00', end: '12:30', label: 'Team Tactics',     type: 'Team',       location: 'Court A', athletes: ['Liam C.', 'Jordan W.', 'Aisha T.', '+5 more'],   coach: 'Matt' },
  { time: '14:00', end: '15:30', label: 'Shooting Clinic',  type: 'Skills',     location: 'Court B', athletes: ['Aisha T.', 'Devon K.', 'Kai O.'],                 coach: 'Jade' },
  { time: '16:30', end: '18:00', label: 'Evening Skills',   type: 'Skills',     location: 'Court A', athletes: ['Liam C.', 'Jordan W.', 'Marcus D.', 'Devon K.'], coach: 'Matt' },
  { time: '18:00', end: '19:30', label: 'Elite Training',   type: 'Elite',      location: 'Court A', athletes: ['Liam C.', 'Aisha T.', '+2 more'],                 coach: 'Matt' },
]

const ATHLETES = [
  { name: 'Liam Carter',      sessions: 19, total: 20, lastSeen: 'Today',       engagement: 'High'   as Engagement },
  { name: 'Jordan Williams',  sessions: 17, total: 20, lastSeen: 'Yesterday',   engagement: 'High'   as Engagement },
  { name: 'Aisha Thompson',   sessions: 14, total: 20, lastSeen: '2 days ago',  engagement: 'Medium' as Engagement },
  { name: 'Marcus Davies',    sessions: 13, total: 20, lastSeen: 'Today',       engagement: 'Medium' as Engagement },
  { name: 'Devon Knox',       sessions:  9, total: 20, lastSeen: '5 days ago',  engagement: 'Low'    as Engagement },
  { name: 'Kai Okafor',       sessions:  7, total: 20, lastSeen: '1 week ago',  engagement: 'Low'    as Engagement },
]

const CHECKINS = [
  { name: 'Liam Carter',     emoji: '😊', mood: 'Feeling great, ready to train', private: false },
  { name: 'Jordan Williams', emoji: '🔥', mood: 'Pumped and focused!',           private: false },
  { name: 'Aisha Thompson',  emoji: '😐', mood: 'Bit tired but here',            private: false },
  { name: 'Marcus Davies',   emoji: '',   mood: '',                              private: true  },
  { name: 'Devon Knox',      emoji: '😴', mood: 'Tired today',                   private: false },
  { name: 'Kai Okafor',      emoji: '',   mood: '',                              private: true  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtNow(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('')
}

const BADGE: Record<Engagement, string> = {
  High:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  Low:    'bg-red-50 text-red-600 border border-red-200',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const dateStr = now.toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // Read pending join request count from localStorage (written by bookings page)
  const [pendingJoinCount, setPendingJoinCount] = useState(0)
  useEffect(() => {
    const stored = localStorage.getItem('f14_pendingJoinCount')
    if (stored !== null) {
      setPendingJoinCount(parseInt(stored, 10) || 0)
    } else {
      // Bookings page hasn't been visited yet — use seed data total (b2×2 + b13×1)
      setPendingJoinCount(3)
    }
  }, [])

  // Read pending payment count from localStorage (written by pricing page)
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0)
  const [paymentsRan, setPaymentsRan] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('f14_pendingPaymentCount')
    if (stored !== null) {
      setPendingPaymentCount(parseInt(stored, 10) || 0)
    } else {
      // Pricing page hasn't been visited yet — seed data has 2 payment-required
      setPendingPaymentCount(2)
    }
  }, [])

  function openJoinRequests() {
    localStorage.setItem('f14_openTab', 'join-requests')
    router.push('/bookings')
  }

  function runPayments() {
    localStorage.setItem('f14_runPayments', 'true')
    localStorage.setItem('f14_pendingPaymentCount', '0')
    setPendingPaymentCount(0)
    setPaymentsRan(true)
    setTimeout(() => setPaymentsRan(false), 2500)
  }

  const sessions = SCHEDULE.map(s => ({
    ...s,
    status: (
      nowMins >= toMins(s.end)   ? 'past' :
      nowMins >= toMins(s.time)  ? 'current' :
                                   'upcoming'
    ) as SessionStatus,
  }))

  const nowIdx = sessions.findIndex(s => s.status !== 'past')

  const QUICK_ACTIONS: { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; onClick: () => void; badge?: number; disabled?: boolean }[] = [
    { label: 'New Booking',     icon: IconCalendarPlus,   onClick: () => router.push('/bookings') },
    { label: 'Add Athlete',     icon: IconUserPlus,       onClick: () => router.push('/athletes') },
    { label: 'Add Transaction', icon: IconCurrencyDollar, onClick: () => router.push('/bookkeeping') },
    { label: 'Send Prompt',     icon: IconBell,           onClick: () => {} },
    { label: 'Join Requests',   icon: IconClipboardList,  onClick: openJoinRequests, badge: pendingJoinCount },
    {
      label:    paymentsRan ? 'Payments Ran!' : 'Run Payments',
      icon:     paymentsRan ? IconCheck : IconCreditCard,
      onClick:  runPayments,
      disabled: pendingPaymentCount === 0,
    },
  ]

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">{dateStr}</p>
      </div>

      {/* ── Join Requests notification banner ── */}
      {pendingJoinCount > 0 && (
        <button
          onClick={openJoinRequests}
          className="mb-6 flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-left transition hover:border-red-300 hover:bg-red-100"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <IconClipboardList size={16} className="text-red-600" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {pendingJoinCount} athlete{pendingJoinCount !== 1 ? 's have' : ' has'} requested to join a session
            </p>
            <p className="text-xs text-red-600">Review and approve or decline in the Join Requests tab</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
            Review requests <IconChevronRight size={14} />
          </span>
        </button>
      )}

      {/* ── Stat Cards ── */}
      <div className="mb-6 grid grid-cols-4 gap-5">
        {STATS.map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: accent + '1a' }}
              >
                <Icon size={18} style={{ color: accent }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Schedule + Quick Actions ── */}
      <div className="mb-6 grid grid-cols-5 gap-6">

        {/* Today's Schedule */}
        <div className="col-span-3 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Today's Schedule</h2>

          <div>
            {sessions.map((s, i) => {
              const isPast    = s.status === 'past'
              const isCurrent = s.status === 'current'
              const showNow   = i === nowIdx

              return (
                <div key={i}>
                  {/* NOW indicator */}
                  {showNow && (
                    <div className="my-1 flex items-center gap-3">
                      <span className="w-16 shrink-0 text-right text-[10px] font-bold tracking-widest text-red-500">
                        NOW
                      </span>
                      <div className="flex flex-1 items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <div className="flex-1 border-t-2 border-dashed border-red-400" />
                        <span className="text-[10px] font-semibold text-red-500">
                          {fmtNow(nowMins)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Session row */}
                  <div className={`flex gap-3 py-2.5 ${isPast ? 'opacity-40' : ''}`}>
                    <span className={`w-16 shrink-0 pt-0.5 text-right text-xs font-medium ${
                      isCurrent ? 'text-[#6BA3D6]' : 'text-gray-400'
                    }`}>
                      {fmt12(s.time)}
                    </span>
                    <div className="flex flex-col items-center pt-1">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                        style={{
                          borderColor:     isCurrent ? '#6BA3D6' : isPast ? '#d1d5db' : '#9ca3af',
                          backgroundColor: isCurrent ? '#6BA3D6' : 'white',
                        }}
                      />
                      {i < sessions.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-gray-200" style={{ minHeight: 36 }} />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold leading-snug ${
                            isCurrent ? 'text-[#6BA3D6]' : 'text-gray-800'
                          }`}>
                            {s.label}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {s.location} · Coach {s.coach}
                          </p>
                        </div>
                        <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isCurrent ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.type}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.athletes.map((a, j) => (
                          <span key={j} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {nowIdx === -1 && (
              <div className="mt-1 flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-[10px] font-bold tracking-widest text-red-500">NOW</span>
                <div className="flex flex-1 items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <div className="flex-1 border-t-2 border-dashed border-red-400" />
                  <span className="text-[10px] font-semibold text-red-500">{fmtNow(nowMins)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, onClick, badge, disabled }) => (
              <button
                key={label}
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                title={disabled && label === 'Run Payments' ? 'No outstanding payments' : undefined}
                className={`relative flex flex-col items-center gap-3 rounded-xl border px-3 py-6 transition-colors ${
                  disabled
                    ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-40'
                    : 'border-gray-100 bg-gray-50 hover:border-[#6BA3D6]/40 hover:bg-[#6BA3D6]/5'
                }`}
              >
                {/* Red badge */}
                {badge != null && badge > 0 && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#6BA3D6' + '1a' }}
                >
                  <Icon size={20} style={{ color: '#6BA3D6' }} />
                </span>
                <span className="text-xs font-medium text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Athlete Engagement + Mood Check-ins ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Athlete Engagement */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Athlete Engagement</h2>
          <div className="space-y-4">
            {ATHLETES.map(({ name, sessions: done, total, lastSeen, engagement }) => (
              <div key={name} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#6BA3D6' }}
                >
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-800">{name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE[engagement]}`}>
                      {engagement}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${(done / total) * 100}%`, backgroundColor: '#6BA3D6' }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{done}/{total}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400">Last seen {lastSeen}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Check-ins */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Mood Check-ins Today</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              {CHECKINS.filter(c => !c.private).length}/{CHECKINS.length} responded
            </span>
          </div>
          <div className="space-y-2.5">
            {CHECKINS.map(({ name, emoji, mood, private: priv }) => (
              <div key={name} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#6BA3D6' }}
                >
                  {initials(name)}
                </div>
                {priv ? (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{name}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <IconLock size={11} />
                      Private
                    </span>
                  </>
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800">{name}</span>
                      <span className="text-base leading-none">{emoji}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{mood}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
