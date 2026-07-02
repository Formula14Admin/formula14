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
  IconBell,
  IconClipboardList,
  IconChevronRight,
  IconCreditCard,
  IconCheck,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionStatus = 'past' | 'current' | 'upcoming'

type TodayBooking = {
  id: string
  start_mins: number
  session_type: string
  coach_id: string
  athlete_names: string[]
  space: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNow(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const dateStr = now.toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Real data ──────────────────────────────────────────────────────────────
  const [athleteCount, setAthleteCount] = useState(0)
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

    async function fetchData() {
      const [athleteRes, bookingsRes] = await Promise.all([
        supabase
          .from('athletes')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('bookings')
          .select('id, start_mins, session_type, coach_id, athlete_names, space')
          .eq('date', today)
          .order('start_mins'),
      ])

      setAthleteCount(athleteRes.count ?? 0)
      setTodayBookings((bookingsRes.data as TodayBooking[]) ?? [])
      setStatsLoaded(true)
    }

    fetchData()
  }, [])

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

  const enrichedSessions = todayBookings.map(s => ({
    ...s,
    status: (
      nowMins > s.start_mins + 90 ? 'past' :
      nowMins >= s.start_mins     ? 'current' :
                                    'upcoming'
    ) as SessionStatus,
  }))

  const nowIdx = enrichedSessions.findIndex(s => s.status !== 'past')

  const QUICK_ACTIONS: { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; onClick: () => void; badge?: number; disabled?: boolean }[] = [
    { label: 'Add Athlete',     icon: IconUserPlus,       onClick: () => router.push('/athletes') },
    { label: 'Add Transaction', icon: IconCurrencyDollar, onClick: () => router.push('/bookkeeping') },
    { label: 'Join Requests',   icon: IconClipboardList,  onClick: openJoinRequests, badge: pendingJoinCount },
    { label: 'New Booking',     icon: IconCalendarPlus,   onClick: () => router.push('/bookings') },
    {
      label:    paymentsRan ? 'Payments Ran!' : 'Run Payments',
      icon:     paymentsRan ? IconCheck : IconCreditCard,
      onClick:  runPayments,
      disabled: pendingPaymentCount === 0,
      badge:    paymentsRan ? undefined : pendingPaymentCount,
    },
    { label: 'Send Prompt',     icon: IconBell,           onClick: () => {} },
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
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500">Active Athletes</p>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#6BA3D61a' }}
            >
              <IconUsers size={18} style={{ color: '#6BA3D6' }} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statsLoaded ? athleteCount : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">Active members</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500">Sessions Today</p>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#10b9811a' }}
            >
              <IconCalendar size={18} style={{ color: '#10b981' }} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statsLoaded ? todayBookings.length : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">Booked for today</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500">Revenue This Month</p>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#6BA3D61a' }}
            >
              <IconCurrencyDollar size={18} style={{ color: '#6BA3D6' }} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">$0</p>
          <p className="mt-1 text-xs text-gray-400">No transactions recorded</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500">Outstanding Invoices</p>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#f59e0b1a' }}
            >
              <IconReceipt size={18} style={{ color: '#f59e0b' }} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">$0</p>
          <p className="mt-1 text-xs text-gray-400">No outstanding invoices</p>
        </div>
      </div>

      {/* ── Schedule + Quick Actions ── */}
      <div className="mb-6 grid grid-cols-5 gap-6">

        {/* Today's Schedule */}
        <div className="col-span-3 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Today&apos;s Schedule</h2>

          <div>
            {enrichedSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No sessions scheduled today</p>
            ) : (
              enrichedSessions.map((s, i) => {
                const isPast    = s.status === 'past'
                const isCurrent = s.status === 'current'
                const showNow   = i === nowIdx

                return (
                  <div key={s.id}>
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
                        {fmtNow(s.start_mins)}
                      </span>
                      <div className="flex flex-col items-center pt-1">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                          style={{
                            borderColor:     isCurrent ? '#6BA3D6' : isPast ? '#d1d5db' : '#9ca3af',
                            backgroundColor: isCurrent ? '#6BA3D6' : 'white',
                          }}
                        />
                        {i < enrichedSessions.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-gray-200" style={{ minHeight: 36 }} />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-semibold leading-snug ${
                              isCurrent ? 'text-[#6BA3D6]' : 'text-gray-800'
                            }`}>
                              {s.session_type}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">{s.space}</p>
                          </div>
                          <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isCurrent ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {s.session_type}
                          </span>
                        </div>
                        {s.athlete_names.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {s.athlete_names.map((a, j) => (
                              <span key={j} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {enrichedSessions.length > 0 && nowIdx === -1 && (
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
                  style={{ backgroundColor: '#6BA3D61a' }}
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
          <p className="text-sm text-gray-400">Athlete engagement tracking coming soon</p>
        </div>

        {/* Mood Check-ins */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Mood Check-ins Today</h2>
          <p className="text-sm text-gray-400">No check-ins recorded today</p>
        </div>

      </div>
    </div>
  )
}
