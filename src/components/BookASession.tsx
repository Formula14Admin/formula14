'use client'

import { useState, useMemo } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconUsers,
  IconAlertCircle,
  IconCalendarEvent,
} from '@tabler/icons-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const TODAY_ISO = new Date().toISOString().slice(0, 10)
const LS_BOOKINGS = 'f14_athlete_bookings'
const SHARE_BASE = 'formula14.com.au/join'

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionTypeId =
  | 'individual'
  | 'small-group'
  | 'team-training'
  | 'casual-shooting'
  | 'shooting-machine'
  | 'weight-room'

type BookingStatus = 'confirmed' | 'pending' | 'cancelled'
type StepKind =
  | 'type'
  | 'sgs-choice'
  | 'sgs-join-method'
  | 'sgs-code-entry'
  | 'sgs-code-preview'
  | 'sgs-browse'
  | 'datetime'
  | 'confirm'
  | 'success'

interface SessionTypeDef {
  id: SessionTypeId
  label: string
  description: string
  durationMins: number
  price: number | 'membership'
  emoji: string
  selfServe: boolean
}

interface TimeSlot {
  startMins: number
  endMins: number
  spotsLeft?: number
  isSgsExisting?: boolean
  sgsId?: string
}

interface SGSSession {
  id: string
  bookingCode: string
  date: string
  startMins: number
  endMins: number
  capacity: number
  attendees: string[]
  avgAge: number
  skillRange: string
}

export interface Booking {
  id: string
  typeId: SessionTypeId
  typeLabel: string
  date: string
  startMins: number
  endMins: number
  durationMins: number
  price: number | 'membership'
  status: BookingStatus
  bookingCode?: string
  notes: string
  createdAt: string
  joinType: 'new' | 'code' | 'browse-request'
}

// ── Session definitions ───────────────────────────────────────────────────────

const SESSION_TYPES: SessionTypeDef[] = [
  { id: 'individual',       label: 'Individual Work Out', description: '1-on-1 coached session tailored to your development goals.',  durationMins: 60,  price: 35,           emoji: '🏋️', selfServe: false },
  { id: 'small-group',      label: 'Small Group Session', description: 'Train alongside 2–6 athletes under expert coach guidance.',   durationMins: 90,  price: 'membership', emoji: '👥', selfServe: false },
  { id: 'team-training',    label: 'Team Training',       description: 'Full-team structured training session. Book your whole squad.',durationMins: 120, price: 150,          emoji: '🏀', selfServe: false },
  { id: 'casual-shooting',  label: 'Casual Shooting',     description: 'Open gym practice — grab a ball and work on your shot.',     durationMins: 60,  price: 10,           emoji: '🎯', selfServe: true  },
  { id: 'shooting-machine', label: 'Shooting Machine',    description: 'High-volume reps with the automatic rebounder machine.',     durationMins: 60,  price: 15,           emoji: '⚡', selfServe: true  },
  { id: 'weight-room',      label: 'Weight Room',         description: 'Strength & conditioning in the dedicated weight room.',      durationMins: 60,  price: 15,           emoji: '💪', selfServe: true  },
]

// ── Sample SGS sessions ───────────────────────────────────────────────────────

const SAMPLE_SGS: SGSSession[] = [
  { id: 'sgs1', bookingCode: 'SGS-4829', date: '2026-07-02', startMins: 600,  endMins: 690, capacity: 6, attendees: ['Matt B', 'Jordan W', 'Aisha T'],                    avgAge: 15, skillRange: 'Intermediate–Advanced' },
  { id: 'sgs2', bookingCode: 'SGS-3147', date: '2026-07-05', startMins: 480,  endMins: 570, capacity: 6, attendees: ['Liam K', 'Sofia M'],                                avgAge: 13, skillRange: 'Beginner–Intermediate' },
  { id: 'sgs3', bookingCode: 'SGS-7263', date: '2026-07-08', startMins: 720,  endMins: 810, capacity: 6, attendees: ['Noah P', 'Emma R', 'Caleb S', 'Zoe T', 'Marcus L'],  avgAge: 17, skillRange: 'Advanced'             },
  { id: 'sgs4', bookingCode: 'SGS-9014', date: '2026-07-10', startMins: 540,  endMins: 630, capacity: 6, attendees: ['Riley J', 'Harper M', 'Drew L'],                    avgAge: 14, skillRange: 'Beginner–Intermediate' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`
}

function displayDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', opts ?? {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function uid(): string {
  return `bk${Date.now()}${Math.random().toString(36).slice(2, 6)}`
}

function genSgsCode(): string {
  return `SGS-${Math.floor(1000 + Math.random() * 9000)}`
}

function loadBookings(): Booking[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_BOOKINGS)
    return raw ? (JSON.parse(raw) as Booking[]) : []
  } catch { return [] }
}

function persistBookings(b: Booking[]): void {
  localStorage.setItem(LS_BOOKINGS, JSON.stringify(b))
}

function getSlotsForDate(iso: string, typeId: SessionTypeId): TimeSlot[] {
  if (iso < TODAY_ISO) return []
  const dow = (new Date(iso + 'T12:00:00').getDay() + 6) % 7 // 0=Mon…6=Sun
  if (dow === 6) return [] // closed Sunday
  const seed = parseInt(iso.replace(/-/g, ''), 10)

  if (typeId === 'individual') {
    return [540, 600, 660, 720, 780, 840]
      .filter((_, i) => (seed + i) % 4 !== 0)
      .map(t => ({ startMins: t, endMins: t + 60 }))
  }

  if (typeId === 'small-group') {
    const existing: TimeSlot[] = SAMPLE_SGS
      .filter(s => s.date === iso && s.attendees.length < s.capacity)
      .map(s => ({
        startMins: s.startMins, endMins: s.endMins,
        spotsLeft: s.capacity - s.attendees.length,
        isSgsExisting: true, sgsId: s.id,
      }))
    const newSlots: TimeSlot[] = [600, 720].map(t => ({
      startMins: t, endMins: t + 90, isSgsExisting: false,
    }))
    return [...existing, ...newSlots].sort((a, b) => a.startMins - b.startMins)
  }

  if (typeId === 'team-training') {
    return [540, 720].map(t => ({ startMins: t, endMins: t + 120 }))
  }

  const bases: Partial<Record<SessionTypeId, number[]>> = {
    'casual-shooting':  [480, 540, 600, 660, 720, 780, 840],
    'shooting-machine': [480, 540, 600, 660, 720, 780, 840, 900],
    'weight-room':      [480, 540, 600, 660, 720, 780, 840],
  }
  return (bases[typeId] ?? []).map(t => ({ startMins: t, endMins: t + 60 }))
}

function dateHasSlots(iso: string, typeId: SessionTypeId): boolean {
  return getSlotsForDate(iso, typeId).length > 0
}

// ── Step indicator ────────────────────────────────────────────────────────────

type Phase = 1 | 2 | 3

function phaseFor(step: StepKind): Phase {
  if (step === 'type' || step === 'sgs-choice') return 1
  if (['sgs-join-method', 'sgs-code-entry', 'sgs-code-preview', 'sgs-browse', 'datetime'].includes(step)) return 2
  return 3 // confirm, success
}

function StepIndicator({ step, isJoinFlow }: { step: StepKind; isJoinFlow: boolean }) {
  const phase = phaseFor(step)
  const labels = ['Choose', isJoinFlow ? 'Find' : 'Schedule', 'Confirm']

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-gray-100 bg-white px-6 py-4">
      {labels.map((label, i) => {
        const num = (i + 1) as Phase
        const done = num < phase
        const active = num === phase
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className="mx-3 h-px w-8 rounded transition-all"
                style={{ backgroundColor: done ? ACCENT : '#e5e7eb' }} />
            )}
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={active
                  ? { backgroundColor: ACCENT, color: '#fff' }
                  : done
                    ? { backgroundColor: ACCENT, color: '#fff', opacity: 0.65 }
                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                {done ? <IconCheck size={11} strokeWidth={3} /> : num}
              </div>
              <span className={`text-xs font-semibold ${active ? 'text-gray-900' : done ? 'text-gray-400' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Calendar picker ───────────────────────────────────────────────────────────

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function CalendarPicker({
  month, setMonth, selectedDate, onSelectDate, typeId,
}: {
  month: Date
  setMonth: (m: Date) => void
  selectedDate: string | null
  onSelectDate: (iso: string) => void
  typeId: SessionTypeId
}) {
  const cells = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth()
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
    const daysInMon = new Date(y, m + 1, 0).getDate()
    const total = Math.ceil((firstDow + daysInMon) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const day = i - firstDow + 1
      if (day < 1 || day > daysInMon) return null
      return new Date(y, m, day).toISOString().slice(0, 10)
    })
  }, [month])

  function nav(dir: -1 | 1) {
    const d = new Date(month); d.setMonth(d.getMonth() + dir); setMonth(d)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => nav(-1)}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
          <IconChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-gray-900">
          {MONTHS_LONG[month.getMonth()]} {month.getFullYear()}
        </span>
        <button type="button" onClick={() => nav(1)}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
          <IconChevronRight size={18} />
        </button>
      </div>
      <div className="mb-1.5 grid grid-cols-7 text-center">
        {DOW_SHORT.map(d => (
          <p key={d} className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />
          const day = parseInt(iso.slice(8), 10)
          const isToday = iso === TODAY_ISO
          const isSel = iso === selectedDate
          const available = dateHasSlots(iso, typeId)
          return (
            <button key={iso} type="button" disabled={!available}
              onClick={() => onSelectDate(iso)}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition
                ${isSel ? 'font-bold text-white'
                  : available ? 'text-gray-800 hover:bg-[#6BA3D6]/10'
                  : 'cursor-not-allowed text-gray-300'}`}
              style={isSel ? { backgroundColor: ACCENT } : available ? { backgroundColor: '#eff6ff' } : undefined}>
              <span className={isToday && !isSel ? 'underline decoration-2 underline-offset-2' : undefined}>
                {day}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── SGS session detail card ───────────────────────────────────────────────────

function SGSDetailCard({ sgs }: { sgs: SGSSession }) {
  const spots = sgs.capacity - sgs.attendees.length
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{ backgroundColor: ACCENT + '18', color: '#4a7fb5' }}>
          {sgs.bookingCode}
        </span>
        <span className="text-sm font-bold text-gray-900">
          {displayDate(sgs.date, { weekday: 'short', day: 'numeric', month: 'long' })}
          {' · '}{minsToLabel(sgs.startMins)} – {minsToLabel(sgs.endMins)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <IconUsers size={14} className="text-gray-400" />
          {spots} of {sgs.capacity} spot{spots !== 1 ? 's' : ''} left
        </span>
        <span className="text-gray-300">·</span>
        <span>Avg age: {sgs.avgAge}</span>
        <span className="text-gray-300">·</span>
        <span>Skill: {sgs.skillRange}</span>
      </div>
      <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        <span className="font-semibold text-gray-500">Current athletes: </span>
        {sgs.attendees.join(', ')}
      </div>
    </div>
  )
}

// ── Back button ───────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50">
      <IconChevronLeft size={15} />
      Back
    </button>
  )
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value}</span>
    </div>
  )
}

// ── SGS choice card ───────────────────────────────────────────────────────────

function ChoiceCard({ emoji, title, description, onClick }: {
  emoji: string; title: string; description: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-[#6BA3D6] hover:shadow-md">
      <div className="mb-3 text-3xl">{emoji}</div>
      <p className="text-base font-bold text-gray-900 transition group-hover:text-[#6BA3D6]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
    </button>
  )
}

// ── My Bookings view ──────────────────────────────────────────────────────────

function MyBookingsView({ bookings, onCancel }: { bookings: Booking[]; onCancel: (id: string) => void }) {
  const STATUS_STYLE: Record<BookingStatus, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed',        color: '#15803d', bg: '#dcfce7' },
    pending:   { label: 'Pending Approval', color: '#854d0e', bg: '#fef9c3' },
    cancelled: { label: 'Cancelled',        color: '#6b7280', bg: '#f3f4f6' },
  }

  const now = new Date()

  function canCancel(b: Booking): boolean {
    if (b.status === 'cancelled') return false
    const t = new Date(`${b.date}T${String(Math.floor(b.startMins / 60)).padStart(2,'0')}:${String(b.startMins % 60).padStart(2,'0')}:00`)
    return t.getTime() - now.getTime() > 2 * 60 * 60 * 1000
  }

  const sorted = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const active = sorted.filter(b => b.status !== 'cancelled')
  const cancelled = sorted.filter(b => b.status === 'cancelled')

  if (bookings.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-3 text-4xl">📅</div>
          <p className="text-sm font-semibold text-gray-600">No bookings yet</p>
          <p className="mt-1 text-xs text-gray-400">Your confirmed sessions will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6" style={{ backgroundColor: '#f9fafb' }}>
      <div className="mx-auto max-w-2xl space-y-4">
        {active.map(b => {
          const style = STATUS_STYLE[b.status]
          const past = b.date < TODAY_ISO
          return (
            <div key={b.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${past ? 'opacity-60' : ''}`}
              style={{ borderColor: b.status === 'pending' ? '#fde68a' : '#e5e7eb' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{b.typeLabel}</p>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {displayDate(b.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{minsToLabel(b.startMins)} – {minsToLabel(b.endMins)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {b.durationMins} min
                    {' · '}
                    {b.price === 'membership' ? 'Membership credit' : `$${b.price}`}
                  </p>
                  {b.notes && (
                    <p className="mt-2 text-xs italic text-gray-400">"{b.notes}"</p>
                  )}
                  {b.bookingCode && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                      <span className="font-mono text-sm font-bold text-gray-800">{b.bookingCode}</span>
                      <span className="text-gray-300">·</span>
                      <span className="truncate font-mono text-xs text-gray-500">{SHARE_BASE}/{b.bookingCode}</span>
                    </div>
                  )}
                </div>
                {canCancel(b) && (
                  <button type="button" onClick={() => onCancel(b.id)}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {cancelled.length > 0 && (
          <details className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer select-none text-xs font-semibold text-gray-400">
              Cancelled bookings ({cancelled.length})
            </summary>
            <div className="mt-3 space-y-2">
              {cancelled.map(b => (
                <div key={b.id} className="rounded-xl bg-gray-50 px-4 py-3 opacity-60">
                  <p className="text-sm font-medium text-gray-500 line-through">{b.typeLabel}</p>
                  <p className="text-xs text-gray-400">
                    {displayDate(b.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ── Success view ──────────────────────────────────────────────────────────────

function SuccessView({
  booking, onBookAnother, onViewBookings, copied, onCopy,
}: {
  booking: Booking
  onBookAnother: () => void
  onViewBookings: () => void
  copied: 'code' | 'link' | null
  onCopy: (text: string, type: 'code' | 'link') => void
}) {
  const isRequest = booking.joinType === 'browse-request'
  const isCodeJoin = booking.joinType === 'code'
  const hasCode = !!booking.bookingCode
  const shareLink = hasCode ? `${SHARE_BASE}/${booking.bookingCode}` : null

  const CONFIG = {
    new:             { icon: '✓',  title: "You're booked!",     sub: booking.typeId === 'small-group' ? 'Your session is confirmed — your coach has been notified.' : 'Your booking is confirmed ✓' },
    code:            { icon: '✓',  title: "You've been added!", sub: "You're confirmed in the session." },
    'browse-request':{ icon: '📬', title: 'Request sent!',      sub: "You'll be notified when the coach approves your request." },
  }
  const cfg = CONFIG[booking.joinType]

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12"
      style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-md space-y-5">
        {/* Main success card */}
        <div className={`rounded-2xl border p-8 text-center shadow-sm ${isRequest ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${isRequest ? 'bg-blue-100' : 'bg-green-100'}`}>
            {cfg.icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{cfg.title}</h2>
          <p className="mt-2 text-sm text-gray-600">{cfg.sub}</p>
          <div className="mt-5 rounded-xl bg-white/60 px-4 py-3 text-sm">
            <p className="font-semibold text-gray-800">{booking.typeLabel}</p>
            <p className="mt-1 text-gray-500">
              {displayDate(booking.date, { weekday: 'short', day: 'numeric', month: 'long' })}
              {' · '}{minsToLabel(booking.startMins)} – {minsToLabel(booking.endMins)}
            </p>
          </div>
        </div>

        {/* SGS share card */}
        {hasCode && shareLink && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <p className="text-sm font-bold text-gray-900">Share your session</p>
            <p className="text-xs text-gray-500">
              Share the code or link below to invite others to join your session.
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
              <span className="flex-1 font-mono text-sm font-bold text-gray-800">{booking.bookingCode}</span>
              <button type="button" onClick={() => onCopy(booking.bookingCode!, 'code')}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-gray-200"
                style={{ color: ACCENT }}>
                <IconCopy size={13} />
                {copied === 'code' ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5">
              <span className="flex-1 truncate font-mono text-xs text-gray-500">{shareLink}</span>
              <button type="button" onClick={() => onCopy(shareLink, 'link')}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-gray-200"
                style={{ color: ACCENT }}>
                <IconCopy size={13} />
                {copied === 'link' ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button type="button" onClick={onViewBookings}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            View My Bookings
          </button>
          <button type="button" onClick={onBookAnother}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
            Book Another Session
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface BookASessionProps {
  isAdminPreview?: boolean
  athleteCredits?: number
  onRequestPrograms?: () => void
}

export function BookASession({
  isAdminPreview = false,
  athleteCredits = 3,
  onRequestPrograms,
}: BookASessionProps) {
  // ── view: booking flow vs my bookings
  const [view, setView] = useState<'book' | 'my-bookings'>('book')

  // ── booking state
  const [step, setStep]             = useState<StepKind>('type')
  const [typeId, setTypeId]         = useState<SessionTypeId | null>(null)
  const [sgsFlow, setSgsFlow]       = useState<'book-new' | 'join' | null>(null)
  const [joinMethod, setJoinMethod] = useState<'code' | 'browse' | null>(null)
  const [codeInput, setCodeInput]   = useState('')
  const [codeError, setCodeError]   = useState('')
  const [matchedSgs, setMatchedSgs] = useState<SGSSession | null>(null)
  const [browsePick, setBrowsePick] = useState<SGSSession | null>(null)
  const [calMonth, setCalMonth]     = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes, setNotes]           = useState('')
  const [bookings, setBookings]     = useState<Booking[]>(loadBookings)
  const [lastBooking, setLastBooking] = useState<Booking | null>(null)
  const [copied, setCopied]         = useState<'code' | 'link' | null>(null)

  const selectedType = SESSION_TYPES.find(t => t.id === typeId) ?? null
  const isJoinFlow = sgsFlow === 'join'

  const slotsForDate = useMemo((): TimeSlot[] => {
    if (!selectedDate || !typeId) return []
    return getSlotsForDate(selectedDate, typeId)
  }, [selectedDate, typeId])

  // ── navigation helpers

  function resetFlow() {
    setStep('type'); setTypeId(null); setSgsFlow(null); setJoinMethod(null)
    setCodeInput(''); setCodeError(''); setMatchedSgs(null); setBrowsePick(null)
    setSelectedDate(null); setSelectedSlot(null); setNotes(''); setLastBooking(null)
  }

  function selectType(id: SessionTypeId) {
    setTypeId(id)
    setStep(id === 'small-group' ? 'sgs-choice' : 'datetime')
  }

  function handleCodeCheck() {
    const code = codeInput.trim().toUpperCase()
    const found = SAMPLE_SGS.find(s => s.bookingCode === code)
    if (!found) { setCodeError('No session found with that code — please check and try again.'); return }
    if (found.attendees.length >= found.capacity) { setCodeError('This session is already full.'); return }
    setCodeError('')
    setMatchedSgs(found)
    setStep('sgs-code-preview')
  }

  function handleConfirm() {
    if (!typeId || !selectedType) return

    const isCodeJoin = step === 'sgs-code-preview'
    const isBrowse = !!browsePick

    // Resolve the session's date/time
    let date = selectedDate ?? ''
    let startMins = selectedSlot?.startMins ?? 0
    let endMins = selectedSlot?.endMins ?? 0
    if (isCodeJoin && matchedSgs) {
      date = matchedSgs.date; startMins = matchedSgs.startMins; endMins = matchedSgs.endMins
    } else if (isBrowse && browsePick) {
      date = browsePick.date; startMins = browsePick.startMins; endMins = browsePick.endMins
    }

    // Resolve joining an existing SGS via the datetime step
    const joiningExistingViaCalendar = selectedSlot?.isSgsExisting === true

    let joinType: Booking['joinType'] = 'new'
    let status: BookingStatus = 'confirmed'
    let bookingCode: string | undefined

    if (isCodeJoin) {
      joinType = 'code'
    } else if (isBrowse) {
      joinType = 'browse-request'; status = 'pending'
    } else if (joiningExistingViaCalendar) {
      joinType = 'code' // trusted, same as code join
    } else if (typeId === 'small-group' && sgsFlow === 'book-new') {
      joinType = 'new'; bookingCode = genSgsCode()
    }

    const bk: Booking = {
      id: uid(), typeId, typeLabel: selectedType.label,
      date, startMins, endMins, durationMins: selectedType.durationMins,
      price: selectedType.price, status, bookingCode, notes,
      createdAt: new Date().toISOString(), joinType,
    }

    const updated = [bk, ...bookings]
    persistBookings(updated)
    setBookings(updated)
    setLastBooking(bk)
    setStep('success')
  }

  function copyText(text: string, type: 'code' | 'link') {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  function cancelBooking(id: string) {
    const updated = bookings.map(b => b.id === id ? { ...b, status: 'cancelled' as BookingStatus } : b)
    persistBookings(updated); setBookings(updated)
  }

  const activeBookingCount = bookings.filter(b => b.status !== 'cancelled').length

  // ── render

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {/* Admin preview banner */}
      {isAdminPreview && (
        <div className="flex shrink-0 items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
          <p className="text-xs font-semibold" style={{ color: '#4a7fb5' }}>
            This is the athlete-facing booking experience — you are viewing it as an admin.
          </p>
        </div>
      )}

      {/* View toggle */}
      <div className="flex shrink-0 items-center border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-1">
          {(['book', 'my-bookings'] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${v === view ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              style={v === view ? { backgroundColor: ACCENT } : undefined}>
              {v === 'book' ? 'Book a Session' : 'My Bookings'}
              {v === 'my-bookings' && activeBookingCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={v === view ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: ACCENT + '20', color: ACCENT }}>
                  {activeBookingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* My Bookings */}
      {view === 'my-bookings' && (
        <MyBookingsView bookings={bookings} onCancel={cancelBooking} />
      )}

      {/* Book flow */}
      {view === 'book' && step !== 'success' && (
        <>
          {step !== 'type' && <StepIndicator step={step} isJoinFlow={isJoinFlow} />}

          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f9fafb' }}>
            <div className="mx-auto w-full max-w-[960px] px-6 py-8">

              {/* ── Type selection ─────────────────────────────────────────── */}
              {step === 'type' && (
                <div>
                  <h1 className="mb-2 text-2xl font-bold text-gray-900">Book a Session</h1>
                  <p className="mb-8 text-sm text-gray-500">Choose the type of session you&apos;d like to book.</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {SESSION_TYPES.map(type => (
                      <button key={type.id} type="button" onClick={() => selectType(type.id)}
                        className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[#6BA3D6] hover:shadow-md">
                        <div className="mb-3 text-3xl">{type.emoji}</div>
                        <p className="text-base font-bold text-gray-900 transition group-hover:text-[#6BA3D6]">{type.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">{type.description}</p>
                        <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {type.durationMins} min
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type.price === 'membership' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                            {type.price === 'membership' ? 'Membership credit' : `$${type.price}`}
                          </span>
                          {type.selfServe && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Self-serve</span>
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Programs card */}
                    {onRequestPrograms && (
                      <button type="button" onClick={onRequestPrograms}
                        className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[#6BA3D6] hover:shadow-md">
                        <div className="mb-3 text-3xl">📚</div>
                        <p className="text-base font-bold text-gray-900 transition group-hover:text-[#6BA3D6]">Programs</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">Browse seasonal programs and enrol your athlete.</p>
                        <div className="mt-auto pt-4">
                          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">View programs →</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── SGS: Book new vs Join ──────────────────────────────────── */}
              {step === 'sgs-choice' && (
                <div>
                  <BackBtn onClick={resetFlow} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Small Group Session</h2>
                  <p className="mb-6 text-sm text-gray-500">Would you like to create a new session, or join an existing one?</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChoiceCard emoji="📅" title="Book a Session"
                      description="Create a new small group session and share your booking code to invite others."
                      onClick={() => { setSgsFlow('book-new'); setStep('datetime') }} />
                    <ChoiceCard emoji="🔗" title="Join a Session"
                      description="Enter a code from a friend, or browse all upcoming sessions with spots available."
                      onClick={() => { setSgsFlow('join'); setStep('sgs-join-method') }} />
                  </div>
                </div>
              )}

              {/* ── SGS: Join method ──────────────────────────────────────── */}
              {step === 'sgs-join-method' && (
                <div>
                  <BackBtn onClick={() => setStep('sgs-choice')} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Join a Session</h2>
                  <p className="mb-6 text-sm text-gray-500">How would you like to find the session?</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChoiceCard emoji="🔑" title="Enter a Code"
                      description="Got a booking code from a friend? Enter it to join their session directly — no approval needed."
                      onClick={() => { setJoinMethod('code'); setStep('sgs-code-entry') }} />
                    <ChoiceCard emoji="🔍" title="Browse Available Sessions"
                      description="See all upcoming sessions with spots open. Send a request and the coach will approve you."
                      onClick={() => { setJoinMethod('browse'); setStep('sgs-browse') }} />
                  </div>
                </div>
              )}

              {/* ── SGS: Code entry ───────────────────────────────────────── */}
              {step === 'sgs-code-entry' && (
                <div>
                  <BackBtn onClick={() => setStep('sgs-join-method')} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Enter Booking Code</h2>
                  <p className="mb-6 text-sm text-gray-500">Enter the session code shared with you (e.g. SGS-4829).</p>
                  <div className="mx-auto max-w-sm space-y-4">
                    <div className="flex gap-3">
                      <input
                        value={codeInput}
                        onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError('') }}
                        placeholder="SGS-XXXX"
                        onKeyDown={e => e.key === 'Enter' && handleCodeCheck()}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                      />
                      <button type="button" onClick={handleCodeCheck}
                        className="rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}>
                        Find
                      </button>
                    </div>
                    {codeError && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <IconAlertCircle size={15} className="shrink-0" />
                        {codeError}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Codes look like <span className="font-mono font-semibold">SGS-4829</span> and are shared by the session creator.
                    </p>
                    {/* Demo hint */}
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-400">
                      Demo codes: SGS-4829, SGS-3147, SGS-7263, SGS-9014
                    </div>
                  </div>
                </div>
              )}

              {/* ── SGS: Code preview ─────────────────────────────────────── */}
              {step === 'sgs-code-preview' && matchedSgs && (
                <div>
                  <BackBtn onClick={() => { setStep('sgs-code-entry'); setMatchedSgs(null) }} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Session Found</h2>
                  <p className="mb-6 text-sm text-gray-500">
                    Here are the details for{' '}
                    <span className="font-mono font-bold text-gray-800">{matchedSgs.bookingCode}</span>.
                  </p>
                  <div className="mx-auto max-w-md space-y-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <SGSDetailCard sgs={matchedSgs} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Anything for the coach? (optional)
                      </label>
                      <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="e.g. working on my ball handling this week…"
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6BA3D6]" />
                    </div>
                    <button type="button" onClick={handleConfirm}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
                      style={{ backgroundColor: ACCENT }}>
                      Join This Session
                    </button>
                  </div>
                </div>
              )}

              {/* ── SGS: Browse ───────────────────────────────────────────── */}
              {step === 'sgs-browse' && (
                <div>
                  <BackBtn onClick={() => setStep('sgs-join-method')} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Available Sessions</h2>
                  <p className="mb-6 text-sm text-gray-500">
                    Upcoming small group sessions with spots open. Requests go to the coach for approval.
                  </p>
                  <div className="space-y-4">
                    {SAMPLE_SGS.filter(s => s.attendees.length < s.capacity).map(sgs => (
                      <div key={sgs.id}
                        className={`rounded-2xl border bg-white p-5 shadow-sm transition ${browsePick?.id === sgs.id ? 'border-[#6BA3D6]' : 'border-gray-200'}`}>
                        <SGSDetailCard sgs={sgs} />
                        <div className="mt-4">
                          {browsePick?.id === sgs.id ? (
                            <div className="space-y-3">
                              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder="Anything for the coach? (optional)"
                                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#6BA3D6]" />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setBrowsePick(null)}
                                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                                  Cancel
                                </button>
                                <button type="button" onClick={handleConfirm}
                                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                                  style={{ backgroundColor: ACCENT }}>
                                  Send Request to Join
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setBrowsePick(sgs)}
                              className="w-full rounded-xl border py-2.5 text-sm font-semibold transition hover:shadow-sm"
                              style={{ borderColor: ACCENT, color: ACCENT }}>
                              Request to Join
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Date & Time ───────────────────────────────────────────── */}
              {step === 'datetime' && selectedType && typeId && (
                <div>
                  <BackBtn onClick={() => {
                    if (typeId === 'small-group') setStep('sgs-choice')
                    else resetFlow()
                  }} />
                  <h2 className="mb-1 text-xl font-bold text-gray-900">{selectedType.label}</h2>
                  <p className="mb-6 text-sm text-gray-500">
                    Select a date, then choose a time slot.
                    {typeId === 'small-group' && sgsFlow === 'book-new' && (
                      <span className="ml-1 text-[#6BA3D6]">
                        Existing sessions with spots are shown — select one to join, or pick a new slot.
                      </span>
                    )}
                  </p>

                  <div className="flex flex-col gap-5 lg:flex-row">
                    {/* Calendar */}
                    <div className="w-full shrink-0 lg:w-[300px]">
                      <CalendarPicker
                        month={calMonth} setMonth={setCalMonth}
                        selectedDate={selectedDate}
                        onSelectDate={iso => { setSelectedDate(iso); setSelectedSlot(null) }}
                        typeId={typeId}
                      />
                    </div>

                    {/* Slots */}
                    <div className="flex-1">
                      {!selectedDate ? (
                        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
                          Select a date to see available times
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          <p className="mb-4 text-sm font-bold text-gray-900">
                            {displayDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          {slotsForDate.length === 0 ? (
                            <p className="text-sm text-gray-400">No slots available on this day.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slotsForDate.map(slot => {
                                const isSel = selectedSlot?.startMins === slot.startMins
                                const isExisting = slot.isSgsExisting
                                return (
                                  <button key={`${slot.startMins}-${isExisting}`} type="button"
                                    onClick={() => { setSelectedSlot(slot); setTimeout(() => setStep('confirm'), 150) }}
                                    className={`flex flex-col rounded-xl border px-4 py-2.5 text-sm transition ${isSel ? 'text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#6BA3D6] hover:bg-[#6BA3D6]/5'}`}
                                    style={isSel ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}>
                                    <span className="font-semibold">{minsToLabel(slot.startMins)}</span>
                                    {isExisting && slot.spotsLeft !== undefined && (
                                      <span className={`mt-0.5 text-[11px] font-medium ${isSel ? 'text-white/80' : 'text-[#6BA3D6]'}`}>
                                        Existing session — {slot.spotsLeft} spot{slot.spotsLeft !== 1 ? 's' : ''} left
                                      </span>
                                    )}
                                    {!isExisting && typeId === 'small-group' && (
                                      <span className={`mt-0.5 text-[11px] ${isSel ? 'text-white/70' : 'text-gray-400'}`}>New session</span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Confirm ───────────────────────────────────────────────── */}
              {step === 'confirm' && selectedType && selectedSlot && selectedDate && (
                <div>
                  <BackBtn onClick={() => setStep('datetime')} />
                  <h2 className="mb-6 text-xl font-bold text-gray-900">Confirm Booking</h2>
                  <div className="mx-auto max-w-md">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
                      <h3 className="text-sm font-bold text-gray-700">Booking Summary</h3>
                      <div className="space-y-3 text-sm">
                        <SummaryRow label="Session" value={selectedType.label} />
                        <SummaryRow label="Date" value={displayDate(selectedDate, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} />
                        <SummaryRow label="Time" value={`${minsToLabel(selectedSlot.startMins)} – ${minsToLabel(selectedSlot.endMins)}`} />
                        <SummaryRow label="Duration" value={`${selectedType.durationMins} min`} />
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="font-semibold text-gray-700">Cost</span>
                          {selectedType.price === 'membership'
                            ? <span className="font-bold text-green-600">Membership credit</span>
                            : <span className="font-bold text-gray-900">${selectedType.price} — pay at venue</span>}
                        </div>
                      </div>

                      {selectedType.price === 'membership' && athleteCredits > 0 && (
                        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                          1 credit will be used — <strong>{athleteCredits - 1} remaining</strong> after this booking.
                        </div>
                      )}

                      {selectedSlot.isSgsExisting && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          You&apos;re joining an existing session. You&apos;ll be added immediately.
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Anything for your coach? (optional)
                        </label>
                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder="e.g. working on three-point shooting this week…"
                          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6BA3D6]" />
                      </div>

                      <button type="button" onClick={handleConfirm}
                        className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}>
                        Confirm Booking
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* Success */}
      {view === 'book' && step === 'success' && lastBooking && (
        <SuccessView
          booking={lastBooking}
          onBookAnother={resetFlow}
          onViewBookings={() => { setView('my-bookings'); resetFlow() }}
          copied={copied}
          onCopy={copyText}
        />
      )}
    </div>
  )
}
