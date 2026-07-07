'use client'

import { useState, useEffect, useCallback } from 'react'
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
  IconChevronLeft,
  IconCalendarEvent,
  IconX,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type TimeStatus = 'past' | 'current' | 'upcoming'

type DayBooking = {
  id: string
  start_mins: number
  duration_mins: number | null
  session_type: string
  coach_id: string
  athlete_names: string[]
  space: string
  status: string | null
}

type AdminNotif = {
  id: string
  title: string
  body: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Sydney date in YYYY-MM-DD — ensures bookings match local calendar day, not UTC
function sydneyToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

// Minutes since midnight in Sydney time
function sydneyNowMins() {
  const now = new Date()
  const sydStr = now.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour12: false })
  const [h, m] = sydStr.split(':').map(Number)
  return h * 60 + m
}

const COACH_NAMES: Record<string, string> = {
  matt: 'Matt', jade: 'Jade', sam: 'Sam',
  s1: 'Matt', s2: 'Jade', s3: 'Sam',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()

  const [nowMins, setNowMins] = useState(sydneyNowMins)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Australia/Sydney',
  })

  // Tick nowMins every minute so the NOW indicator stays accurate
  useEffect(() => {
    const id = setInterval(() => setNowMins(sydneyNowMins()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Real data ──────────────────────────────────────────────────────────────
  const [athleteCount, setAthleteCount]     = useState(0)
  const [selectedDateStr, setSelectedDateStr] = useState(sydneyToday)
  const [dayBookings, setDayBookings]       = useState<DayBooking[]>([])
  const [statsLoaded, setStatsLoaded]       = useState(false)
  const [unreadNotifs, setUnreadNotifs]     = useState<AdminNotif[]>([])

  const todayStr = sydneyToday()
  const maxDateStr = (() => {
    const d = new Date(todayStr + 'T12:00:00')
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })()

  const fetchBookings = useCallback(async (dateStr: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, start_mins, duration_mins, session_type, coach_id, athlete_names, space, status, booking_athletes(athletes(first_name, last_name))')
      .eq('date', dateStr)
      .neq('status', 'cancelled')
      .order('start_mins')

    type RawBooking = {
      id: string; start_mins: number; duration_mins: number | null
      session_type: string; coach_id: string; space: string; status: string | null
      athlete_names: string[] | null
      booking_athletes: { athletes: { first_name: string; last_name: string } | null }[] | null
    }

    setDayBookings(((data ?? []) as unknown as RawBooking[]).map(r => {
      const stored = (r.athlete_names ?? []).filter(Boolean)
      const joined = (r.booking_athletes ?? [])
        .map(ba => ba.athletes ? `${ba.athletes.first_name} ${ba.athletes.last_name}`.trim() : '')
        .filter(Boolean)
      return {
        id: r.id, start_mins: r.start_mins, duration_mins: r.duration_mins,
        session_type: r.session_type, coach_id: r.coach_id, space: r.space, status: r.status,
        athlete_names: stored.length > 0 ? stored : joined,
      }
    }))
  }, [])

  const fetchStats = useCallback(async () => {
    const { count } = await supabase
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    setAthleteCount(count ?? 0)
    setStatsLoaded(true)
  }, [])

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('id, title, body, created_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
    setUnreadNotifs((data as AdminNotif[]) ?? [])
  }, [])

  useEffect(() => { void fetchStats() }, [fetchStats])
  useEffect(() => { void fetchBookings(selectedDateStr) }, [selectedDateStr, fetchBookings])
  useEffect(() => { void fetchNotifs() }, [fetchNotifs])

  // Realtime: re-fetch bookings + notifications when rows change
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void fetchBookings(selectedDateStr)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, () => {
        void fetchNotifs()
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [selectedDateStr, fetchBookings, fetchNotifs])

  async function dismissNotif(id: string) {
    await supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setUnreadNotifs(prev => prev.filter(n => n.id !== id))
  }

  async function dismissAllNotifs() {
    const ids = unreadNotifs.map(n => n.id)
    await supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
    setUnreadNotifs([])
  }

  function prevDay() {
    const d = new Date(selectedDateStr + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const next = d.toISOString().slice(0, 10)
    if (next >= todayStr) setSelectedDateStr(next)
  }

  function nextDay() {
    const d = new Date(selectedDateStr + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const next = d.toISOString().slice(0, 10)
    if (next <= maxDateStr) setSelectedDateStr(next)
  }

  // ── Push notification subscription ────────────────────────────────────────
  const [pushCoachId,   setPushCoachId]   = useState<string | null>(null)
  const [pushEnabled,   setPushEnabled]   = useState(false)
  const [pushPrompt,    setPushPrompt]    = useState(false)
  const [pushWorking,   setPushWorking]   = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('f14_push_coach_id')
    if (stored) setPushCoachId(stored)
    if ('Notification' in window && Notification.permission === 'granted' && stored) {
      setPushEnabled(true)
    }
  }, [])

  async function enablePush(coachId: string) {
    setPushWorking(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushWorking(false); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, subscription: sub.toJSON() }),
      })

      localStorage.setItem('f14_push_coach_id', coachId)
      setPushCoachId(coachId)
      setPushEnabled(true)
      setPushPrompt(false)
    } finally {
      setPushWorking(false)
    }
  }

  // ── Read pending join request count from localStorage (written by bookings page)
  const [pendingJoinCount, setPendingJoinCount] = useState(0)
  useEffect(() => {
    const stored = localStorage.getItem('f14_pendingJoinCount')
    setPendingJoinCount(stored !== null ? parseInt(stored, 10) || 0 : 0)
  }, [])

  function openJoinRequests() {
    localStorage.setItem('f14_openTab', 'join-requests')
    router.push('/bookings')
  }

  const isToday = selectedDateStr === todayStr

  const enrichedSessions = dayBookings.map(s => {
    const dur     = s.duration_mins ?? 60
    const endMins = s.start_mins + dur
    const timeStatus: TimeStatus = !isToday ? 'upcoming'
      : nowMins >= endMins      ? 'past'
      : nowMins >= s.start_mins ? 'current'
      :                           'upcoming'
    return { ...s, dur, endMins, timeStatus }
  })

  const nowIdx = isToday ? enrichedSessions.findIndex(s => s.timeStatus !== 'past') : -1

  const selectedDateLabel = (() => {
    const d = new Date(selectedDateStr + 'T12:00:00')
    if (isToday) return 'Today'
    const tomorrow = new Date(todayStr + 'T12:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (selectedDateStr === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  })()

  const sessionCardLabel = (() => {
    const d = new Date(selectedDateStr + 'T12:00:00')
    const diffDays = Math.round((d.getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
    if (diffDays === 0) return "Sessions Today"
    if (diffDays === 1) return "Tomorrow's Sessions"
    if (diffDays <= 7) return `${d.toLocaleDateString('en-AU', { weekday: 'long' })}'s Sessions`
    const day = d.getDate()
    const ord = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
    return `${day}${ord} of ${d.toLocaleDateString('en-AU', { month: 'long' })}'s Sessions`
  })()

  const QUICK_ACTIONS: { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; onClick: () => void; badge?: number; disabled?: boolean }[] = [
    { label: 'Add Athlete',     icon: IconUserPlus,       onClick: () => router.push('/athletes') },
    { label: 'Add Transaction', icon: IconCurrencyDollar, onClick: () => router.push('/bookkeeping') },
    { label: 'Join Requests',   icon: IconClipboardList,  onClick: openJoinRequests, badge: pendingJoinCount },
    { label: 'New Booking',     icon: IconCalendarPlus,   onClick: () => router.push('/portal') },
    { label: 'View Bookings',   icon: IconCalendarEvent,  onClick: () => router.push('/bookings') },
    { label: 'Send Prompt',     icon: IconBell,           onClick: () => {} },
  ]

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">{dateStr}</p>
        </div>
        <button
          onClick={() => pushEnabled ? null : setPushPrompt(true)}
          title={pushEnabled ? `Push notifications on (${pushCoachId})` : 'Enable push notifications'}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            pushEnabled
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-[#6BA3D6] hover:text-[#6BA3D6]'
          }`}
        >
          <IconBell size={14} />
          {pushEnabled ? `Notifications on` : 'Enable notifications'}
        </button>
      </div>

      {/* ── Push notification coach picker ── */}
      {pushPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-gray-900">Enable Push Notifications</h3>
            <p className="mb-5 text-sm text-gray-500">Who are you? Bookings will be sent to your device when you&apos;re assigned as coach.</p>
            <div className="space-y-2.5">
              {['matt', 'jade'].map(id => (
                <button
                  key={id}
                  disabled={pushWorking}
                  onClick={() => enablePush(id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:border-[#6BA3D6] hover:bg-[#6BA3D6]/5 disabled:opacity-50"
                >
                  <span className="capitalize">{id}</span>
                  {pushWorking ? <span className="text-xs text-gray-400">Setting up…</span> : <IconChevronRight size={14} className="text-gray-300" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPushPrompt(false)}
              className="mt-4 w-full rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── New booking notifications ── */}
      {unreadNotifs.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between border-b border-blue-100 px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <IconBell size={15} />
              {unreadNotifs.length} new booking{unreadNotifs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={dismissAllNotifs}
              className="text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              Dismiss all
            </button>
          </div>
          <ul className="divide-y divide-blue-100">
            {unreadNotifs.map(n => (
              <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-900">{n.title}</p>
                  {n.body && <p className="text-xs text-blue-700">{n.body}</p>}
                </div>
                <button
                  onClick={() => dismissNotif(n.id)}
                  className="mt-0.5 shrink-0 rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                >
                  <IconX size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            <p className="text-sm font-medium text-gray-500">{sessionCardLabel}</p>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#10b9811a' }}
            >
              <IconCalendar size={18} style={{ color: '#10b981' }} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statsLoaded ? dayBookings.length : '—'}</p>
          <p className="mt-1 text-xs text-gray-400">Booked for {isToday ? 'today' : selectedDateLabel.toLowerCase()}</p>
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

        {/* Upcoming Bookings */}
        <div className="col-span-3 rounded-xl bg-white p-6 shadow-sm">
          {/* Header with day nav */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Bookings</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {!isToday && (
                <button
                  onClick={() => setSelectedDateStr(todayStr)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6BA3D6] hover:text-[#6BA3D6] transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={prevDay}
                disabled={isToday}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-[#6BA3D6] hover:text-[#6BA3D6] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <IconChevronLeft size={14} />
              </button>
              <span className="min-w-[90px] text-center text-sm font-semibold text-gray-700">
                {selectedDateLabel}
              </span>
              <button
                onClick={nextDay}
                disabled={selectedDateStr >= maxDateStr}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-[#6BA3D6] hover:text-[#6BA3D6] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <IconChevronRight size={14} />
              </button>
              {selectedDateStr >= maxDateStr && (
                <a
                  href="/bookings"
                  className="ml-1 text-xs font-semibold text-[#6BA3D6] underline hover:text-[#4a7fb5]"
                >
                  View calendar →
                </a>
              )}
            </div>
          </div>

          <div>
            {enrichedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="mb-3 h-10 w-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-400">No sessions booked for {selectedDateLabel.toLowerCase()}</p>
              </div>
            ) : (
              enrichedSessions.map((s, i) => {
                const isPast    = s.timeStatus === 'past'
                const isCurrent = s.timeStatus === 'current'
                const showNow   = i === nowIdx
                const coachName = COACH_NAMES[s.coach_id] ?? s.coach_id
                const names     = Array.isArray(s.athlete_names) ? s.athlete_names : []

                return (
                  <div key={s.id}>
                    {/* NOW indicator — shown before the first non-past session */}
                    {showNow && (
                      <div className="my-2 flex items-center gap-3">
                        <span className="w-[4.5rem] shrink-0 text-right text-[10px] font-bold tracking-widest text-red-500">
                          NOW
                        </span>
                        <div className="flex flex-1 items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <div className="flex-1 border-t-2 border-dashed border-red-400" />
                          <span className="text-[10px] font-semibold text-red-500">
                            {fmtMins(nowMins)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Session row */}
                    <div className={`flex gap-3 py-2.5 ${isPast ? 'opacity-40' : ''}`}>
                      {/* Time column */}
                      <div className="w-[4.5rem] shrink-0 pt-0.5 text-right">
                        <span className={`text-xs font-medium ${isCurrent ? 'text-[#6BA3D6]' : 'text-gray-400'}`}>
                          {fmtMins(s.start_mins)}
                        </span>
                        <br />
                        <span className="text-[10px] text-gray-300">{fmtMins(s.endMins)}</span>
                      </div>

                      {/* Timeline dot + connector */}
                      <div className="flex flex-col items-center pt-1">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                          style={{
                            borderColor:     isCurrent ? '#6BA3D6' : isPast ? '#d1d5db' : '#9ca3af',
                            backgroundColor: isCurrent ? '#6BA3D6' : 'white',
                          }}
                        />
                        {i < enrichedSessions.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-gray-200" style={{ minHeight: 40 }} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`text-sm font-semibold leading-snug ${
                              isCurrent ? 'text-[#6BA3D6]' : 'text-gray-800'
                            }`}>
                              {s.session_type}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {s.space}{coachName ? ` · ${coachName}` : ''}
                            </p>
                          </div>
                          {/* Time-based status badge */}
                          <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isCurrent
                              ? 'bg-blue-50 text-blue-600'
                              : isPast
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-green-50 text-green-600'
                          }`}>
                            {isCurrent ? 'In Progress' : isPast ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>

                        {/* Athletes */}
                        {names.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {names.slice(0, 4).map((a, j) => (
                              <span key={j} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                                {a}
                              </span>
                            ))}
                            {names.length > 4 && (
                              <span className="text-[10px] text-gray-400">+{names.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* NOW line at bottom when all sessions are past */}
            {enrichedSessions.length > 0 && nowIdx === -1 && (
              <div className="mt-2 flex items-center gap-3">
                <span className="w-[4.5rem] shrink-0 text-right text-[10px] font-bold tracking-widest text-red-500">NOW</span>
                <div className="flex flex-1 items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <div className="flex-1 border-t-2 border-dashed border-red-400" />
                  <span className="text-[10px] font-semibold text-red-500">{fmtMins(nowMins)}</span>
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
