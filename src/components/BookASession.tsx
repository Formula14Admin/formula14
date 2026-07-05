'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconUsers,
  IconAlertCircle,
  IconCalendarEvent,
} from '@tabler/icons-react'
import { CANONICAL_SESSION_TYPES, type SessionTypeId, type SessionTypeDef } from '@/lib/sessionTypes'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const TODAY_ISO = new Date().toISOString().slice(0, 10)
const NOW_MINS  = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })()
const LS_BOOKINGS         = 'f14_athlete_bookings'
const LS_PRICING_CONFIGS  = 'f14_pricing_configs'
const LS_BOOKING_SETTINGS = 'f14_booking_settings'
const LS_PROGRAMME_CAT    = 'f14_program_catalogue'
const LS_SESSION_META     = 'f14_session_type_meta'
const SHARE_BASE = 'formula14.com.au/join'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface PricingTierData { min: number; max: number | null; pricePerAthlete: number }
interface PricingConfigData { sessionType: string; tiers: PricingTierData[] }
interface BookingToggleData { enabled: boolean; reason: string }
interface ProgrammeItemData { pricePerSession: number; numSessions?: number; category: string }

type PricingScenario = 'casual' | 'included' | 'over-limit' | 'not-in-membership'

export interface MembershipData {
  tier: string
  tierLabel: string
  // 0 = not in plan, -1 = unlimited, N = N credits per week
  creditsPerWeek: Partial<Record<string, number>>
  creditsUsed: Partial<Record<string, number>>
}

export interface AdminBookingContext {
  athleteId: string
  athleteName: string
  initials: string
  avatarColor: string
}

export interface Booking {
  id: string
  typeId: string
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
  adminOverride?: boolean
  athleteId?: string
  athleteName?: string
}

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

function halfHourRange(from: number, to: number): number[] {
  const r: number[] = []
  for (let t = from; t <= to; t += 30) r.push(t)
  return r
}

function getSlotsForDate(iso: string, typeId: string): TimeSlot[] {
  if (iso < TODAY_ISO) return []
  const dow = (new Date(iso + 'T12:00:00').getDay() + 6) % 7 // 0=Mon…6=Sun
  if (dow === 6) return [] // closed Sunday
  const seed = parseInt(iso.replace(/-/g, ''), 10)
  const isToday = iso === TODAY_ISO

  if (typeId === 'individual') {
    return halfHourRange(540, 840) // 9:00 AM – 2:00 PM
      .filter((_, i) => (seed + i) % 7 !== 0)
      .filter(t => !isToday || t > NOW_MINS)
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
    const newSlots: TimeSlot[] = halfHourRange(540, 840).map(t => ({ // 9:00 AM – 2:00 PM
      startMins: t, endMins: t + 90, isSgsExisting: false,
    }))
    return [...existing, ...newSlots]
      .filter(s => !isToday || s.startMins > NOW_MINS)
      .sort((a, b) => a.startMins - b.startMins)
  }

  if (typeId === 'team-training') {
    return halfHourRange(480, 840) // 8:00 AM – 2:00 PM
      .filter(t => !isToday || t > NOW_MINS)
      .map(t => ({ startMins: t, endMins: t + 120 }))
  }

  const bases: Partial<Record<string, number[]>> = {
    'casual-shooting':          halfHourRange(480, 840),
    'shooting-machine-session': halfHourRange(480, 900),
    'weight-room-session':      halfHourRange(480, 840),
    'film-room-session':        halfHourRange(540, 840),
    'volume-shooting':          halfHourRange(480, 900),
  }
  return (bases[typeId] ?? [])
    .filter(t => !isToday || t > NOW_MINS)
    .map(t => ({ startMins: t, endMins: t + 60 }))
}

function dateHasSlots(iso: string, typeId: string): boolean {
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
  typeId: string
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
    <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
      <div className="mb-7 flex items-center justify-between">
        <button type="button" onClick={() => nav(-1)}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100">
          <IconChevronLeft size={22} />
        </button>
        <span className="text-xl font-bold text-gray-900">
          {MONTHS_LONG[month.getMonth()]} {month.getFullYear()}
        </span>
        <button type="button" onClick={() => nav(1)}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100">
          <IconChevronRight size={22} />
        </button>
      </div>
      <div className="mb-3 grid grid-cols-7 text-center">
        {DOW_SHORT.map(d => (
          <p key={d} className="text-xs font-bold uppercase tracking-wide text-gray-400">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />
          const day = parseInt(iso.slice(8), 10)
          const isToday = iso === TODAY_ISO
          const isSel = iso === selectedDate
          const available = dateHasSlots(iso, typeId)
          return (
            <button key={iso} type="button" disabled={!available}
              onClick={() => onSelectDate(iso)}
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-base font-medium transition
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

// ── Pricing scenario helper ───────────────────────────────────────────────────

function getScenario(typeId: string, membership: MembershipData | null): PricingScenario {
  if (!membership) return 'casual'
  const perWeek = membership.creditsPerWeek[typeId] ?? 0
  if (perWeek === 0) return 'not-in-membership'
  const used = membership.creditsUsed[typeId] ?? 0
  if (perWeek === -1 || used < perWeek) return 'included'
  return 'over-limit'
}

// ── Session type tile (full-width horizontal) ─────────────────────────────────

function TileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-700">{value}</p>
    </div>
  )
}

function SessionTypeTile({
  type, onSelect, disabledReason, livePrice, sgsRange, scenario = 'casual', membershipTierLabel,
}: {
  type: SessionTypeDef
  onSelect: () => void
  disabledReason?: string
  livePrice?: number | null
  sgsRange?: { min: number; max: number }
  scenario?: PricingScenario
  membershipTierLabel?: string | null
}) {
  const isDisabled     = !!disabledReason
  const isSGS          = type.id === 'small-group'
  const isTeamTraining = type.id === 'team-training'
  const displayPrice   = livePrice

  return (
    <button type="button" onClick={isDisabled ? undefined : onSelect} disabled={isDisabled}
      className={`group relative flex w-full overflow-hidden rounded-xl border text-left shadow-sm transition-all
        ${isDisabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white hover:border-[#6BA3D6] hover:shadow-md active:scale-[0.995]'}`}>
      {/* Left accent bar */}
      <div className="w-1 shrink-0 self-stretch"
        style={{ backgroundColor: isDisabled ? '#d1d5db' : type.accentColor }} />

      {/* Name + description */}
      <div className="flex flex-1 items-center px-6 py-5">
        <div className="min-w-0">
          <p className={`text-lg font-bold transition ${isDisabled ? 'text-gray-400' : 'text-gray-900 group-hover:text-[#6BA3D6]'}`}>
            {type.label}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-gray-500">{type.description}</p>
          {disabledReason && (
            <p className="mt-1.5 text-xs font-medium text-amber-700">{disabledReason}</p>
          )}
          {!isDisabled && scenario === 'over-limit' && (
            <p className="mt-1.5 text-xs font-medium text-amber-600">Credit limit reached this week</p>
          )}
          {!isDisabled && scenario === 'not-in-membership' && membershipTierLabel && (
            <p className="mt-1.5 text-xs text-gray-400">Not included in your {membershipTierLabel} membership</p>
          )}
        </div>
      </div>

      {/* Middle: key details (hidden when disabled) */}
      {!isDisabled && (
        <div className="hidden shrink-0 flex-col justify-center gap-3 border-l border-gray-100 px-6 py-5 md:flex" style={{ minWidth: 220 }}>
          <TileDetail label="Duration" value={`${type.durationMins} min`} />
          <TileDetail label="Who it's for" value={type.whoFor} />
          <TileDetail label="Availability" value={type.availability} />
          {type.membershipTiers && (
            <TileDetail label="Included in" value={type.membershipTiers} />
          )}
        </div>
      )}

      {/* Right: price + CTA */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-l border-gray-100 px-6 py-5" style={{ minWidth: 148 }}>
        {isDisabled ? (
          <p className="text-sm font-semibold text-gray-400">Unavailable</p>
        ) : isSGS && sgsRange ? (
          <div className="text-center leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Price at lockout</p>
            <p className="mt-1 text-xl font-bold" style={{ color: type.accentColor }}>
              {sgsRange.min === sgsRange.max ? `$${sgsRange.min}` : `$${sgsRange.min}–$${sgsRange.max}`}
            </p>
            <p className="text-[10px] text-gray-400">per athlete</p>
          </div>
        ) : scenario === 'included' ? (
          <div className="text-center leading-tight">
            <p className="text-sm font-bold text-green-600">Included in</p>
            <p className="text-sm font-bold text-green-600">membership</p>
          </div>
        ) : displayPrice !== null && displayPrice !== undefined ? (
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: ACCENT }}>${displayPrice}</p>
            {isTeamTraining && <p className="text-xs text-gray-400">/athlete</p>}
            {scenario === 'over-limit' && <p className="text-[11px] font-semibold text-amber-600">Extra session</p>}
            {type.selfServe && !isTeamTraining && scenario !== 'over-limit' && <p className="text-xs text-gray-400">Self-serve</p>}
          </div>
        ) : (
          <div className="text-center leading-tight">
            <p className="text-base font-bold text-green-600">Membership</p>
            <p className="text-base font-bold text-green-600">credit</p>
          </div>
        )}
        {!isDisabled && (
          <div className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold text-white transition group-hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            Book Now <span aria-hidden>→</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── SGS choice tile (horizontal, full-width) ──────────────────────────────────

function ChoiceTile({ emoji, title, description, badge, onClick }: {
  emoji?: string; title: string; description: string; badge?: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="group flex w-full items-center gap-5 overflow-hidden rounded-xl border border-gray-200 bg-white px-6 py-5 text-left shadow-sm transition-all hover:border-[#6BA3D6] hover:shadow-md active:scale-[0.995]">
      {emoji && <span className="shrink-0 text-3xl leading-none">{emoji}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-gray-900 transition group-hover:text-[#6BA3D6]">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-gray-500">{description}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: ACCENT + '15', color: '#4a7fb5' }}>
          {badge}
        </span>
      )}
      <span className="shrink-0 text-gray-300 transition group-hover:text-[#6BA3D6]">→</span>
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
                    {b.adminOverride && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        Admin override
                      </span>
                    )}
                  </div>
                  {b.athleteName && (
                    <p className="mt-0.5 text-xs text-gray-500">For: <span className="font-medium">{b.athleteName}</span></p>
                  )}
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
  booking, onBookAnother, onViewBookings, copied, onCopy, adminContext, onChangeAthlete,
}: {
  booking: Booking
  onBookAnother: () => void
  onViewBookings: () => void
  copied: 'code' | 'link' | null
  onCopy: (text: string, type: 'code' | 'link') => void
  adminContext?: AdminBookingContext | null
  onChangeAthlete?: () => void
}) {
  const isRequest = booking.joinType === 'browse-request'
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
          {adminContext && (
            <p className="mt-1 text-sm font-semibold text-gray-700">
              Booked for{' '}
              <span className="font-bold" style={{ color: adminContext.avatarColor }}>
                {adminContext.athleteName}
              </span>
            </p>
          )}
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
          {adminContext ? (
            <>
              <button type="button" onClick={onBookAnother}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Book Another for {adminContext.athleteName.split(' ')[0]}
              </button>
              {onChangeAthlete && (
                <button type="button" onClick={() => { onBookAnother(); onChangeAthlete() }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                  Book for a Different Athlete
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={onBookAnother}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
              Book Another Session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface BookASessionProps {
  isAdminPreview?: boolean
  membership?: MembershipData | null
  onRequestPrograms?: () => void
  adminContext?: AdminBookingContext | null
  onChangeAthlete?: () => void
}

export function BookASession({
  isAdminPreview = false,
  membership = null,
  onRequestPrograms,
  adminContext = null,
  onChangeAthlete,
}: BookASessionProps) {
  // ── view: booking flow vs my bookings
  const [view, setView] = useState<'book' | 'my-bookings'>('book')

  // ── booking state
  const [step, setStep]             = useState<StepKind>('type')
  const [typeId, setTypeId]         = useState<string | null>(null)
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
  const [adminOverride, setAdminOverride] = useState(false)

  // ── Pricing config loaded from Pricing & Payments ─────────────────────────
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfigData[]>([])
  const [bookingSettings, setBookingSettings] = useState<Record<string, BookingToggleData>>({})
  const [programmes, setProgrammes] = useState<ProgrammeItemData[]>([])
  const [sessionMeta, setSessionMeta] = useState<Record<string, { label?: string; description?: string; durationMins?: number; location?: string; style?: string }>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(LS_PRICING_CONFIGS)
      if (raw) setPricingConfigs(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(LS_BOOKING_SETTINGS)
      if (raw) setBookingSettings(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(LS_PROGRAMME_CAT)
      if (raw) setProgrammes(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(LS_SESSION_META)
      if (raw) setSessionMeta(JSON.parse(raw))
    } catch {}
  }, [])

  const sgsRange = useMemo(() => {
    const config = pricingConfigs.find(c => c.sessionType === 'small-group')
    if (!config || config.tiers.length === 0) return { min: 40, max: 40 }
    const prices = config.tiers.map(t => t.pricePerAthlete)
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }, [pricingConfigs])

  function getLivePrice(id: string): number | null {
    const config = pricingConfigs.find(c => c.sessionType === id)
    if (!config || config.tiers.length === 0) return null
    return config.tiers[0].pricePerAthlete
  }

  // Dynamic session types derived from pricingConfigs — the key three-way sync logic
  const mergedSessionTypes = useMemo(() => {
    const EXCLUDED = new Set(['development-programs', 'social-programs'])
    const ids = pricingConfigs.length > 0
      ? pricingConfigs.map(c => c.sessionType).filter(id => !EXCLUDED.has(id))
      : CANONICAL_SESSION_TYPES.map(t => t.id)
    return ids
      .map(id => {
        const base = CANONICAL_SESSION_TYPES.find(t => t.id === id)
        if (!base) return null
        const config = pricingConfigs.find(c => c.sessionType === id) as (PricingConfigData & { durationMins?: number }) | undefined
        const m = sessionMeta[id] ?? {}
        return {
          ...base,
          ...(config?.durationMins ? { durationMins: config.durationMins } : {}),
          ...(m.label        ? { label: m.label }               : {}),
          ...(m.description  ? { description: m.description }   : {}),
          ...(m.durationMins ? { durationMins: m.durationMins } : {}),
          ...(m.location     ? { location: m.location }         : {}),
          ...(m.style        ? { style: m.style }               : {}),
        }
      })
      .filter((t): t is SessionTypeDef => t !== null)
  }, [pricingConfigs, sessionMeta])

  const selectedType = mergedSessionTypes.find(t => t.id === typeId) ?? null
  const isJoinFlow = sgsFlow === 'join'

  const isPastBooking = !!(
    selectedDate && selectedSlot && (
      selectedDate < TODAY_ISO ||
      (selectedDate === TODAY_ISO && selectedSlot.startMins <= NOW_MINS)
    )
  )

  const slotsForDate = useMemo((): TimeSlot[] => {
    if (!selectedDate || !typeId) return []
    return getSlotsForDate(selectedDate, typeId)
  }, [selectedDate, typeId])

  // ── navigation helpers

  function resetFlow() {
    setStep('type'); setTypeId(null); setSgsFlow(null); setJoinMethod(null)
    setCodeInput(''); setCodeError(''); setMatchedSgs(null); setBrowsePick(null)
    setSelectedDate(null); setSelectedSlot(null); setNotes(''); setLastBooking(null)
    setAdminOverride(false)
  }

  function selectType(id: string) {
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
      price: getScenario(typeId, membership) === 'included' ? 'membership' : (getLivePrice(typeId) ?? 0),
      status, bookingCode, notes,
      createdAt: new Date().toISOString(), joinType,
      ...(adminContext ? {
        athleteId: adminContext.athleteId,
        athleteName: adminContext.athleteName,
        adminOverride,
      } : {}),
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

  // When viewing as a specific athlete, only show that athlete's bookings
  const visibleBookings = adminContext
    ? bookings.filter(b => b.athleteId === adminContext.athleteId)
    : bookings

  const activeBookingCount = visibleBookings.filter(b => b.status !== 'cancelled').length

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

      {/* Admin booking context banner */}
      {adminContext && (
        <div className="flex shrink-0 items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: adminContext.avatarColor }}>
            {adminContext.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-900">{adminContext.athleteName}</p>
            <p className="text-[11px] text-blue-500">Booking on behalf of this athlete</p>
          </div>
          {onChangeAthlete && (
            <button type="button" onClick={() => { resetFlow(); onChangeAthlete() }}
              className="shrink-0 text-xs font-semibold underline"
              style={{ color: '#4a7fb5' }}>
              Change athlete
            </button>
          )}
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
        <MyBookingsView bookings={visibleBookings} onCancel={cancelBooking} />
      )}

      {/* Book flow */}
      {view === 'book' && step !== 'success' && (
        <>
          {step !== 'type' && <StepIndicator step={step} isJoinFlow={isJoinFlow} />}

          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f9fafb' }}>
            <div className="mx-auto w-full max-w-[960px] px-6 py-8">

              {/* ── Type selection ─────────────────────────────────────────── */}
              {step === 'type' && (() => {
                const progPrices = programmes.map(p => p.pricePerSession)
                const progMinPrice = progPrices.length > 0 ? Math.min(...progPrices) : null
                return (
                  <div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">Book a Session</h1>
                    <p className="mb-6 text-sm text-gray-500">Choose the type of session you&apos;d like to book.</p>
                    <div className="flex flex-col gap-3">
                      {mergedSessionTypes.flatMap(type => {
                        const toggle = bookingSettings[type.id]
                        if (toggle && !toggle.enabled && !toggle.reason) return []
                        const disabledReason = (toggle && !toggle.enabled && toggle.reason) ? toggle.reason : undefined
                        const sc = getScenario(type.id, membership)
                        return [(
                          <SessionTypeTile
                            key={type.id}
                            type={type}
                            onSelect={() => selectType(type.id)}
                            disabledReason={disabledReason}
                            livePrice={type.id === 'small-group' ? undefined : getLivePrice(type.id)}
                            sgsRange={type.id === 'small-group' ? sgsRange : undefined}
                            scenario={sc}
                            membershipTierLabel={membership?.tierLabel}
                          />
                        )]
                      })}

                      {/* Programs tile */}
                      {onRequestPrograms && (
                        <ChoiceTile
                          title="Programs"
                          description={
                            progMinPrice !== null
                              ? `Development & social programs from $${progMinPrice}/session — enrol or join the waitlist.`
                              : "Browse seasonal development and social programs and enrol your athlete."
                          }
                          badge={progMinPrice !== null ? `From $${progMinPrice}/session` : "View programs"}
                          onClick={onRequestPrograms}
                        />
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* ── SGS: Book new vs Join ──────────────────────────────────── */}
              {step === 'sgs-choice' && (
                <div>
                  <BackBtn onClick={resetFlow} />
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Small Group Session</h2>
                  <p className="mb-6 text-sm text-gray-500">Would you like to create a new session, or join an existing one?</p>
                  <div className="flex flex-col gap-3">
                    <ChoiceTile emoji="➕" title="Book a New Session"
                      description="Create your own Small Group Session and invite others to join with a unique booking code."
                      badge="Available times shown next"
                      onClick={() => { setSgsFlow('book-new'); setStep('datetime') }} />
                    <ChoiceTile emoji="🔗" title="Join an Existing Session"
                      description="Enter a code from a friend for instant access, or browse open sessions and request to join."
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
                  <div className="flex flex-col gap-3">
                    <ChoiceTile emoji="🔑" title="Enter a Code"
                      description="Got a booking code from a friend? Enter it to join their session directly — no approval needed."
                      badge="Instant access"
                      onClick={() => { setJoinMethod('code'); setStep('sgs-code-entry') }} />
                    <ChoiceTile emoji="🔍" title="Browse Available Sessions"
                      description="See all upcoming sessions with spots open. Send a request and the coach will approve you."
                      badge="Approval required"
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
                  {/* Slim header bar: back + session name */}
                  <div className="mb-6 flex items-center gap-3">
                    <button type="button"
                      onClick={() => { if (typeId === 'small-group') setStep('sgs-choice'); else resetFlow() }}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50">
                      <IconChevronLeft size={15} />
                      Back
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold leading-tight text-gray-900">{selectedType.label}</h2>
                      {typeId === 'small-group' && sgsFlow === 'book-new' && (
                        <p className="text-xs text-[#6BA3D6]">Existing sessions with spots are shown — select one to join, or pick a new slot.</p>
                      )}
                    </div>
                  </div>

                  {/* Calendar (left, ~65%) + Slots panel (right, ~35%) */}
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    {/* Calendar — dominant element */}
                    <div className="min-w-0 flex-1">
                      <CalendarPicker
                        month={calMonth} setMonth={setCalMonth}
                        selectedDate={selectedDate}
                        onSelectDate={iso => { setSelectedDate(iso); setSelectedSlot(null) }}
                        typeId={typeId}
                      />
                    </div>

                    {/* Slots panel — right side, sticky */}
                    <div className="w-full shrink-0 lg:sticky lg:top-4 lg:w-72">
                      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        {!selectedDate ? (
                          <div className="flex h-48 items-center justify-center p-5 text-sm text-gray-400">
                            Select a date to see available times
                          </div>
                        ) : (
                          <>
                            <div className="border-b border-gray-100 px-5 py-4">
                              <p className="text-sm font-bold text-gray-900">
                                {displayDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                            </div>
                            <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
                              {slotsForDate.length === 0 ? (
                                <p className="py-6 text-center text-sm text-gray-400">No slots available on this day.</p>
                              ) : (
                                slotsForDate.map(slot => {
                                  const isSel = selectedSlot?.startMins === slot.startMins
                                  const isExisting = slot.isSgsExisting
                                  return (
                                    <button key={`${slot.startMins}-${isExisting}`} type="button"
                                      onClick={() => { setSelectedSlot(slot); setTimeout(() => setStep('confirm'), 150) }}
                                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${isSel ? 'text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#6BA3D6] hover:bg-[#6BA3D6]/5'}`}
                                      style={isSel ? { backgroundColor: ACCENT, borderColor: ACCENT } : undefined}>
                                      <div className="text-left">
                                        <span className="block font-semibold">{minsToLabel(slot.startMins)}</span>
                                        {isExisting && slot.spotsLeft !== undefined && (
                                          <span className={`mt-0.5 block text-[11px] font-medium ${isSel ? 'text-white/80' : 'text-[#6BA3D6]'}`}>
                                            Existing · {slot.spotsLeft} spot{slot.spotsLeft !== 1 ? 's' : ''} left
                                          </span>
                                        )}
                                        {!isExisting && typeId === 'small-group' && (
                                          <span className={`mt-0.5 block text-[11px] ${isSel ? 'text-white/70' : 'text-gray-400'}`}>New session</span>
                                        )}
                                      </div>
                                      <span className={`h-2 w-2 shrink-0 rounded-full ${isSel ? 'bg-white/60' : 'bg-green-400'}`} />
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
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
                          {typeId === 'small-group'
                            ? <span className="font-bold" style={{ color: ACCENT }}>
                                {sgsRange.min === sgsRange.max ? `$${sgsRange.min}` : `$${sgsRange.min}–$${sgsRange.max}`}/athlete · set at lockout
                              </span>
                            : (() => {
                                const sc = getScenario(typeId!, membership)
                                const cost = getLivePrice(typeId!)
                                if (sc === 'included') {
                                  return <span className="font-bold text-green-600">Membership credit</span>
                                }
                                return cost !== null
                                  ? <span className="font-bold text-gray-900">${cost} — pay at venue</span>
                                  : <span className="font-bold text-green-600">Membership credit</span>
                              })()
                          }
                        </div>
                      </div>

                      {typeId !== 'small-group' && (() => {
                        const sc = getScenario(typeId!, membership)
                        const cost = getLivePrice(typeId!)
                        if (sc === 'included') {
                          const perWeek = membership?.creditsPerWeek[typeId!] ?? 0
                          const used = membership?.creditsUsed[typeId!] ?? 0
                          const remaining = perWeek === -1 ? null : perWeek - used - 1
                          return (
                            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                              1 {selectedType.label} credit will be used
                              {remaining !== null && (
                                <> — <strong>{remaining} remaining</strong> after this booking</>
                              )}.
                            </div>
                          )
                        }
                        if (sc === 'over-limit') {
                          return (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                              Your weekly {selectedType.label.toLowerCase()} credits have been used.
                              {cost !== null && <> This extra session will be charged at <strong>${cost}</strong>.</>}
                              {' '}<span className="opacity-70">Credits reset Monday.</span>
                            </div>
                          )
                        }
                        if (sc === 'not-in-membership' && membership) {
                          return (
                            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                              {selectedType.label} is not included in your {membership.tierLabel} membership — charged at the casual rate.
                            </div>
                          )
                        }
                        return null
                      })()}

                      {selectedSlot.isSgsExisting && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          You&apos;re joining an existing session. You&apos;ll be added immediately.
                        </div>
                      )}

                      {adminContext && typeId && typeId !== 'small-group' && ['over-limit', 'not-in-membership'].includes(getScenario(typeId, membership)) && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input type="checkbox" checked={adminOverride} onChange={e => setAdminOverride(e.target.checked)}
                              className="mt-0.5 h-4 w-4 cursor-pointer" />
                            <div>
                              <p className="text-sm font-bold text-amber-800">Admin Override</p>
                              <p className="mt-0.5 text-xs text-amber-600">
                                Book this session regardless of credit limits or membership eligibility.
                              </p>
                            </div>
                          </label>
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
                        disabled={isPastBooking}
                        title={isPastBooking ? 'Cannot book a session in the past' : undefined}
                        className={`w-full rounded-xl py-3 text-sm font-bold text-white transition ${isPastBooking ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'}`}
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
          adminContext={adminContext}
          onChangeAthlete={onChangeAthlete}
        />
      )}
    </div>
  )
}
