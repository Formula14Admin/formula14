'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconCalendarEvent,
  IconUser,
} from '@tabler/icons-react'
import { BookASession } from '@/components/BookASession'

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachId = 'matt' | 'jade'
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface DaySchedule {
  available: boolean
  startMins: number
  endMins: number
}

interface CoachSchedule {
  coachId: CoachId
  days: Record<DayOfWeek, DaySchedule>
}

interface DateOverride {
  id: string
  coachId: CoachId
  date: string
  type: 'block' | 'extra'
  startMins?: number
  endMins?: number
  note: string
}

interface FacilityDateOverride {
  id: string
  date: string
  type: 'block' | 'extra'
  note: string
}

interface SessionSlot {
  id: string
  date: string
  startMins: number
  endMins: number
  sessionType: string
  space: string
  coach: CoachId | 'self-serve'
  price: number | 'membership'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COACH_MATT_COLOR = '#6BA3D6'
const COACH_JADE_COLOR = '#6BAD6B'
const SELF_SERVE_COLOR = '#D4A520'

const COACH_NAMES: Record<CoachId, string> = { matt: 'Matt', jade: 'Jade' }

const SELF_SERVE_TYPES = ['Casual Shooting', 'Shooting Machine Session']

// ─── Schedule Data (self-contained copy) ─────────────────────────────────────

const SCHEDULES: Record<CoachId, CoachSchedule> = {
  matt: {
    coachId: 'matt',
    days: {
      0: { available: true,  startMins: 540, endMins: 780  },
      1: { available: true,  startMins: 900, endMins: 1200 },
      2: { available: true,  startMins: 540, endMins: 780  },
      3: { available: true,  startMins: 900, endMins: 1200 },
      4: { available: true,  startMins: 540, endMins: 780  },
      5: { available: true,  startMins: 480, endMins: 720  },
      6: { available: false, startMins: 540, endMins: 780  },
    },
  },
  jade: {
    coachId: 'jade',
    days: {
      0: { available: false, startMins: 600, endMins: 840  },
      1: { available: true,  startMins: 600, endMins: 840  },
      2: { available: true,  startMins: 960, endMins: 1200 },
      3: { available: true,  startMins: 600, endMins: 840  },
      4: { available: true,  startMins: 960, endMins: 1200 },
      5: { available: true,  startMins: 540, endMins: 780  },
      6: { available: false, startMins: 600, endMins: 840  },
    },
  },
}

const OVERRIDES: DateOverride[] = [
  { id: 'ov1', coachId: 'matt', date: '2026-06-23', type: 'block', note: 'Public holiday — unavailable' },
  { id: 'ov2', coachId: 'jade', date: '2026-06-25', type: 'extra', startMins: 780, endMins: 1020, note: 'Extra availability — filling in for Matt' },
]

// Facility schedule — which days the facility is open for self-serve bookings
const FACILITY_SCHEDULE: Record<DayOfWeek, { available: boolean }> = {
  0: { available: true  }, // Mon
  1: { available: true  }, // Tue
  2: { available: true  }, // Wed
  3: { available: true  }, // Thu
  4: { available: true  }, // Fri
  5: { available: true  }, // Sat
  6: { available: false }, // Sun — closed
}

// Date-specific facility overrides (e.g. public holidays)
const FACILITY_OVERRIDES: FacilityDateOverride[] = []

// Session configs for coached slots
const COACHED_SESSIONS = [
  { type: 'Individual Work Out', space: 'Primary Station', durationMins: 60, price: 35 as number | 'membership' },
  { type: 'Small Group Session', space: 'Primary Station', durationMins: 90, price: 'membership' as number | 'membership' },
  { type: 'Skills Clinic',       space: 'Secondary Station', durationMins: 60, price: 'membership' as number | 'membership' },
]

const SELF_SERVE_SESSIONS = [
  { type: 'Casual Shooting',          space: 'Shooting Bay', durationMins: 60, price: 10 as number | 'membership' },
  { type: 'Shooting Machine Session', space: 'Shooting Bay', durationMins: 60, price: 15 as number | 'membership' },
]

// ─── Program Data (admin-configured programs visible to athletes) ──────────────

const PROGRAM_COLOR = '#D4A520'
const PROGRAM_BG    = '#fdf5e0'

type ProgramCategory = 'Development Program' | 'Social Program'

interface PortalProgram {
  id: string
  name: string
  category: ProgramCategory
  coach: CoachId
  dayOfWeek: string
  startMins: number
  endMins: number
  space: string
  costPerSession: number
  capacity: number
  enrolled: number
  seriesStart: string
  seriesEnd: string
  repeat: string
  enrolmentType: 'instant' | 'approval'
  termLength: number
  termFee: number
  description?: string
  colourTag?: string
}

// Raw shapes from localStorage
interface CatalogueEntry {
  id: string; name: string; category: 'development' | 'social'
  pricePerSession: number; maxCapacity: number; enrolmentType: 'instant' | 'approval'
  description: string; colourTag: string
}
interface ScheduleEntry {
  id: string; name: string; date: string; startMins: number; duration: number
  capacity: number; enrolled: number; enrolmentType: 'instant' | 'approval'
  pricePerSession: number; termLength: number
}

const PORTAL_PROGRAMS: PortalProgram[] = [
  {
    id: 'pg-perf-lab',
    name: 'Performance Lab',
    category: 'Development Program',
    coach: 'matt',
    dayOfWeek: 'Monday',
    startMins: 9 * 60,
    endMins: 10 * 60 + 30,
    space: 'Primary Station',
    costPerSession: 45,
    capacity: 15,
    enrolled: 8,
    seriesStart: '2026-07-06',
    seriesEnd: '2026-09-28',
    repeat: 'Weekly',
    enrolmentType: 'instant',
    termLength: 13,
    termFee: 45 * 13,
  },
  {
    id: 'pg-dom-academy',
    name: 'Domestic Academy',
    category: 'Development Program',
    coach: 'matt',
    dayOfWeek: 'Wednesday',
    startMins: 11 * 60,
    endMins: 12 * 60,
    space: 'Primary Station',
    costPerSession: 45,
    capacity: 15,
    enrolled: 15,
    seriesStart: '2026-07-01',
    seriesEnd: '2026-09-30',
    repeat: 'Weekly',
    enrolmentType: 'approval',
    termLength: 13,
    termFee: 45 * 13,
  },
  {
    id: 'pg-snipers',
    name: 'Snipers Club',
    category: 'Development Program',
    coach: 'jade',
    dayOfWeek: 'Thursday',
    startMins: 10 * 60,
    endMins: 11 * 60 + 30,
    space: 'Secondary Station',
    costPerSession: 40,
    capacity: 15,
    enrolled: 11,
    seriesStart: '2026-07-02',
    seriesEnd: '2026-09-24',
    repeat: 'Weekly',
    enrolmentType: 'approval',
    termLength: 13,
    termFee: 40 * 13,
  },
  {
    id: 'pg-shooters-lab',
    name: 'Shooters Lab',
    category: 'Development Program',
    coach: 'matt',
    dayOfWeek: 'Friday',
    startMins: 16 * 60,
    endMins: 17 * 60 + 30,
    space: 'Primary Station',
    costPerSession: 40,
    capacity: 15,
    enrolled: 6,
    seriesStart: '2026-07-03',
    seriesEnd: '2026-09-25',
    repeat: 'Weekly',
    enrolmentType: 'instant',
    termLength: 13,
    termFee: 40 * 13,
  },
  {
    id: 'pg-walking-bball',
    name: 'Walking Basketball',
    category: 'Social Program',
    coach: 'jade',
    dayOfWeek: 'Tuesday',
    startMins: 10 * 60,
    endMins: 11 * 60,
    space: 'Primary Station',
    costPerSession: 15,
    capacity: 20,
    enrolled: 12,
    seriesStart: '2026-07-07',
    seriesEnd: '2026-09-29',
    repeat: 'Weekly',
    enrolmentType: 'instant',
    termLength: 13,
    termFee: 15 * 13,
  },
  {
    id: 'pg-midday-ladies',
    name: 'Mid Day Ladies Comp',
    category: 'Social Program',
    coach: 'jade',
    dayOfWeek: 'Wednesday',
    startMins: 12 * 60,
    endMins: 13 * 60,
    space: 'Secondary Station',
    costPerSession: 20,
    capacity: 20,
    enrolled: 18,
    seriesStart: '2026-07-01',
    seriesEnd: '2026-09-30',
    repeat: 'Weekly',
    enrolmentType: 'instant',
    termLength: 13,
    termFee: 20 * 13,
  },
  {
    id: 'pg-adult-beginner',
    name: 'Adult Beginner School',
    category: 'Social Program',
    coach: 'matt',
    dayOfWeek: 'Saturday',
    startMins: 9 * 60,
    endMins: 10 * 60,
    space: 'Primary Station',
    costPerSession: 25,
    capacity: 20,
    enrolled: 7,
    seriesStart: '2026-07-04',
    seriesEnd: '2026-09-26',
    repeat: 'Weekly',
    enrolmentType: 'instant',
    termLength: 13,
    termFee: 25 * 13,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function jsDayToOurs(jsDay: number): DayOfWeek {
  return ((jsDay + 6) % 7) as DayOfWeek
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDay(dateStr: string): { dayShort: string; dayNum: number; monthShort: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const dayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][jsDayToOurs(d.getDay())]
  const monthShort = d.toLocaleDateString('en-AU', { month: 'short' })
  return { dayShort, dayNum: d.getDate(), monthShort }
}

function formatWeekRange(startDate: string): string {
  const end = addDays(startDate, 6)
  const s = new Date(startDate + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sStr = s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const eStr = e.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${sStr} – ${eStr}`
}

// Get the Monday of the week containing the given date
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const jsDay = d.getDay()
  const diff = (jsDay + 6) % 7 // days since Monday
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

// ─── Slot Builder ─────────────────────────────────────────────────────────────

function isFacilityOpen(dateStr: string): boolean {
  if (FACILITY_OVERRIDES.some(o => o.date === dateStr && o.type === 'block')) return false
  const dow = jsDayToOurs(new Date(dateStr + 'T00:00:00').getDay())
  return FACILITY_SCHEDULE[dow].available
}

function anyCoachAvailableOn(dateStr: string): boolean {
  const dow = jsDayToOurs(new Date(dateStr + 'T00:00:00').getDay())
  for (const [cid, sched] of Object.entries(SCHEDULES) as [CoachId, CoachSchedule][]) {
    const dayOvs = OVERRIDES.filter(o => o.coachId === cid && o.date === dateStr)
    const isBlocked = dayOvs.some(o => o.type === 'block')
    const hasExtra = dayOvs.some(o => o.type === 'extra')
    if ((!isBlocked && sched.days[dow].available) || hasExtra) return true
  }
  return false
}

function buildSlotsForWeek(mondayStr: string): SessionSlot[] {
  const slots: SessionSlot[] = []

  for (let i = 0; i < 7; i++) {
    const dateStr = addDays(mondayStr, i)
    const dow = jsDayToOurs(new Date(dateStr + 'T00:00:00').getDay())

    // ── Self-serve slots ───────────────────────────────────────────────────
    // Only available when the facility is open.
    // When any coach is on that day, Casual Shooting is blocked — the space
    // is reserved for coached sessions. Shooting Machine Session remains open.
    if (isFacilityOpen(dateStr)) {
      const coachPresent = anyCoachAvailableOn(dateStr)
      for (const ss of SELF_SERVE_SESSIONS) {
        if (ss.type === 'Casual Shooting' && coachPresent) continue
        const times = [540, 660, 780]
        for (const t of times) {
          slots.push({
            id: uid(),
            date: dateStr,
            startMins: t,
            endMins: t + ss.durationMins,
            sessionType: ss.type,
            space: ss.space,
            coach: 'self-serve',
            price: ss.price,
          })
        }
      }
    }

    // ── Coached slots ─────────────────────────────────────────────────────
    for (const [cid, sched] of Object.entries(SCHEDULES) as [CoachId, CoachSchedule][]) {
      const dayOvs = OVERRIDES.filter((o) => o.coachId === cid && o.date === dateStr)
      const isBlocked = dayOvs.some((o) => o.type === 'block')
      const extraOvs = dayOvs.filter((o) => o.type === 'extra')

      const windows: { start: number; end: number }[] = []
      if (!isBlocked && sched.days[dow].available) {
        windows.push({ start: sched.days[dow].startMins, end: sched.days[dow].endMins })
      }
      for (const ex of extraOvs) {
        if (ex.startMins !== undefined && ex.endMins !== undefined) {
          windows.push({ start: ex.startMins, end: ex.endMins })
        }
      }

      for (const win of windows) {
        // Primary: Individual Work Out (60min) — fill first half
        const midpoint = Math.floor((win.start + win.end) / 2)
        let cur = win.start
        while (cur + 60 <= midpoint) {
          slots.push({
            id: uid(),
            date: dateStr,
            startMins: cur,
            endMins: cur + 60,
            sessionType: 'Individual Work Out',
            space: 'Primary Station',
            coach: cid,
            price: 35,
          })
          cur += 60
        }
        // Skills Clinic (60min) — second half
        cur = midpoint
        while (cur + 60 <= win.end) {
          slots.push({
            id: uid(),
            date: dateStr,
            startMins: cur,
            endMins: cur + 60,
            sessionType: 'Skills Clinic',
            space: 'Secondary Station',
            coach: cid,
            price: 'membership',
          })
          cur += 60
        }
      }
    }
  }

  return slots
}

// ─── Coach Availability Dots ──────────────────────────────────────────────────

function getCoachesForDate(dateStr: string): CoachId[] {
  const dow = jsDayToOurs(new Date(dateStr + 'T00:00:00').getDay())
  const available: CoachId[] = []
  for (const [cid, sched] of Object.entries(SCHEDULES) as [CoachId, CoachSchedule][]) {
    const dayOvs = OVERRIDES.filter((o) => o.coachId === cid && o.date === dateStr)
    const isBlocked = dayOvs.some((o) => o.type === 'block')
    const hasExtra = dayOvs.some((o) => o.type === 'extra')
    if ((!isBlocked && sched.days[dow].available) || hasExtra) {
      available.push(cid as CoachId)
    }
  }
  return available
}

// ─── Session Type Config ─────────────────────────────────────────────────────

interface SessionTypeConfig {
  id: string
  label: string
  description: string
  durationMins: number
  price: number | 'membership'
  emoji: string
  needsCoach: boolean
  maxSpots?: number
}

const SESSION_TYPE_CARDS: SessionTypeConfig[] = [
  { id: 'individual',      label: 'Individual Work Out',  description: '1-on-1 coached session tailored to your development goals.', durationMins: 60, price: 35,           emoji: '🏋️', needsCoach: true },
  { id: 'small-group',     label: 'Small Group Session',  description: 'Train alongside 2–6 athletes under expert coach guidance.',  durationMins: 90, price: 'membership',  emoji: '👥', needsCoach: true, maxSpots: 6 },
  { id: 'casual-shooting', label: 'Casual Shooting',      description: 'Open gym practice at your own pace. No coach required.',     durationMins: 60, price: 10,           emoji: '🏀', needsCoach: false },
  { id: 'shooting-machine',label: 'Shooting Machine',     description: 'High-volume reps with the rebounder machine. Self-serve.',   durationMins: 60, price: 15,           emoji: '⚡', needsCoach: false },
  { id: 'weight-room',     label: 'Weight Room',          description: 'Strength & conditioning in the dedicated weight room.',      durationMins: 60, price: 15,           emoji: '💪', needsCoach: false },
]

// ─── Per-date slot generator ──────────────────────────────────────────────────

function getSlotsForDate(dateStr: string, typeId: string): Array<{ startMins: number; endMins: number; spotsLeft?: number }> {
  const dow = jsDayToOurs(new Date(dateStr + 'T00:00:00').getDay()) as DayOfWeek

  if (typeId === 'individual' || typeId === 'small-group') {
    const dur = typeId === 'individual' ? 60 : 90
    const seen = new Set<number>()
    const slots: Array<{ startMins: number; endMins: number; spotsLeft?: number }> = []
    for (const [cid, sched] of Object.entries(SCHEDULES) as [CoachId, CoachSchedule][]) {
      const dayOvs  = OVERRIDES.filter(o => o.coachId === cid && o.date === dateStr)
      const blocked = dayOvs.some(o => o.type === 'block')
      const extras  = dayOvs.filter(o => o.type === 'extra' && o.startMins != null)
      const wins: { start: number; end: number }[] = []
      if (!blocked && sched.days[dow].available) wins.push({ start: sched.days[dow].startMins, end: sched.days[dow].endMins })
      extras.forEach(ex => wins.push({ start: ex.startMins!, end: ex.endMins! }))
      for (const win of wins) {
        let cur = win.start
        while (cur + dur <= win.end) {
          if (!seen.has(cur)) {
            seen.add(cur)
            const seed = parseInt(dateStr.replace(/-/g, '')) + cur
            const rand = Math.abs(Math.sin(seed))
            const spotsLeft = typeId === 'small-group' ? Math.max(1, 6 - Math.floor(rand * 5)) : undefined
            slots.push({ startMins: cur, endMins: cur + dur, spotsLeft })
          }
          cur += 60
        }
      }
    }
    return slots.sort((a, b) => a.startMins - b.startMins)
  }

  if (!FACILITY_SCHEDULE[dow].available) return []
  if (FACILITY_OVERRIDES.some(o => o.date === dateStr && o.type === 'block')) return []

  if (typeId === 'casual-shooting') {
    if (anyCoachAvailableOn(dateStr)) return []
    return [540, 660, 780].map(t => ({ startMins: t, endMins: t + 60 }))
  }
  if (typeId === 'shooting-machine') {
    return [540, 660, 780, 900].map(t => ({ startMins: t, endMins: t + 60 }))
  }
  if (typeId === 'weight-room') {
    return [480, 570, 660, 750, 840].map(t => ({ startMins: t, endMins: t + 60 }))
  }
  return []
}

function hasAvailabilityForDate(dateStr: string, typeId: string): boolean {
  const todayIso = new Date().toISOString().slice(0, 10)
  if (dateStr < todayIso) return false
  return getSlotsForDate(dateStr, typeId).length > 0
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function buildPortalPrograms(catalogue: CatalogueEntry[], schedules: ScheduleEntry[]): PortalProgram[] {
  if (!schedules.length) return PORTAL_PROGRAMS
  const result: PortalProgram[] = []
  // Group schedules by program name, pick first occurrence for date info
  const byName = new Map<string, ScheduleEntry>()
  schedules.forEach(s => { if (!byName.has(s.name)) byName.set(s.name, s) })
  byName.forEach((sch, name) => {
    const cat = catalogue.find(c => c.name === name)
    const dateObj = new Date(sch.date + 'T00:00:00')
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const category: ProgramCategory = (cat?.category === 'social') ? 'Social Program' : 'Development Program'
    result.push({
      id: sch.id,
      name,
      category,
      coach: 'matt',
      dayOfWeek: dayNames[dateObj.getDay()],
      startMins: sch.startMins,
      endMins: sch.startMins + sch.duration,
      space: 'Primary Station',
      costPerSession: sch.pricePerSession,
      capacity: sch.capacity,
      enrolled: sch.enrolled,
      seriesStart: sch.date,
      seriesEnd: sch.date,
      repeat: 'Weekly',
      enrolmentType: sch.enrolmentType,
      termLength: sch.termLength,
      termFee: sch.pricePerSession * sch.termLength,
      description: cat?.description,
      colourTag: cat?.colourTag,
    })
  })
  return result
}

export default function PortalPage() {
  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState<0 | 1 | 2>(0)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [calMonth, setCalMonth]           = useState(() => new Date(2026, 5, 1))
  const [selectedDate, setSelectedDate]   = useState<string | null>(null)
  const [selectedSlotMins, setSelectedSlotMins] = useState<number | null>(null)
  const [bookerName, setBookerName]       = useState('')
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  // ── Programs + shared state ─────────────────────────────────────────────────
  const [portalTab, setPortalTab]         = useState<'sessions' | 'programs'>('sessions')
  const [toastMsg, setToastMsg]           = useState('')
  const [enrolledPrograms, setEnrolledPrograms] = useState<Set<string>>(new Set())
  const [waitlistPrograms, setWaitlistPrograms] = useState<Set<string>>(new Set())
  const [pendingPrograms,  setPendingPrograms]  = useState<Set<string>>(new Set())
  const [enrolStep, setEnrolStep]         = useState<'confirm' | 'payment' | null>(null)
  const [enrolModal, setEnrolModal]       = useState<PortalProgram | null>(null)
  const [enrolName, setEnrolName]         = useState('')
  const [shareModal, setShareModal]       = useState<{ url: string; sessionType: string } | null>(null)
  const [portalPrograms, setPortalPrograms] = useState<PortalProgram[]>(PORTAL_PROGRAMS)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const cat: CatalogueEntry[] = JSON.parse(localStorage.getItem('f14_program_catalogue') ?? '[]')
      const sch: ScheduleEntry[]  = JSON.parse(localStorage.getItem('f14_program_schedules') ?? '[]')
      const built = buildPortalPrograms(cat, sch)
      if (built.length) setPortalPrograms(built)
    } catch {}
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedType = SESSION_TYPE_CARDS.find(t => t.id === selectedTypeId) ?? null

  const slotsForDate = useMemo(() => {
    if (!selectedDate || !selectedTypeId) return []
    return getSlotsForDate(selectedDate, selectedTypeId)
  }, [selectedDate, selectedTypeId])

  const selectedSlot = useMemo(
    () => slotsForDate.find(s => s.startMins === selectedSlotMins) ?? null,
    [slotsForDate, selectedSlotMins],
  )

  const monthDates = useMemo(() => {
    const year  = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDow    = jsDayToOurs(new Date(year, month, 1).getDay())
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Math.ceil((firstDow + daysInMonth) / 7) * 7
    return Array.from({ length: cells }, (_, i) => {
      const day = i - firstDow + 1
      if (day < 1 || day > daysInMonth) return null
      return new Date(year, month, day).toISOString().slice(0, 10)
    })
  }, [calMonth])

  // ── Wizard handlers ─────────────────────────────────────────────────────────
  function selectType(typeId: string) {
    setSelectedTypeId(typeId)
    setSelectedDate(null)
    setSelectedSlotMins(null)
    setStep(1)
  }

  function goBack() {
    if (step === 1) { setStep(0); setSelectedTypeId(null) }
    else if (step === 2) { setStep(1); setSelectedSlotMins(null) }
  }

  function selectSlot(startMins: number) {
    setSelectedSlotMins(startMins)
    setTimeout(() => setStep(2), 120)
  }

  function handleConfirm() {
    if (!bookerName.trim()) return
    setBookingConfirmed(true)
    setTimeout(() => {
      setBookingConfirmed(false)
      setStep(0)
      setSelectedTypeId(null)
      setSelectedDate(null)
      setSelectedSlotMins(null)
      setBookerName('')
    }, 3500)
  }

  function navigateMonth(dir: -1 | 1) {
    setCalMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d })
  }

  // ── Program handlers ────────────────────────────────────────────────────────
  function openEnrolModal(prog: PortalProgram) {
    setEnrolModal(prog)
    setEnrolName('')
    setEnrolStep('confirm')
  }

  function proceedToPayment() {
    if (!enrolModal || !enrolName.trim()) return
    if (enrolModal.enrolmentType === 'approval') {
      // Store request in localStorage for admin to action
      const request = {
        id: uid(),
        bookingId: enrolModal.id,
        athleteName: enrolName.trim(),
        requestedAt: new Date().toISOString().slice(0, 10),
        status: 'pending-approval',
      }
      try {
        const existing = JSON.parse(localStorage.getItem('f14_enrolmentRequests') ?? '[]')
        localStorage.setItem('f14_enrolmentRequests', JSON.stringify([...existing, request]))
      } catch {}
      setPendingPrograms(prev => new Set([...prev, enrolModal.id]))
      setEnrolModal(null)
      setEnrolStep(null)
      setEnrolName('')
      setToastMsg(`Enrolment request sent for ${enrolModal.name}. We'll be in touch!`)
      setTimeout(() => setToastMsg(''), 4000)
    } else {
      // Instant: go to payment step
      setEnrolStep('payment')
    }
  }

  function confirmPayment() {
    if (!enrolModal) return
    const prog = enrolModal
    if (prog.enrolled >= prog.capacity) {
      setWaitlistPrograms(prev => new Set([...prev, prog.id]))
      setToastMsg(`Added to waitlist for ${prog.name}`)
    } else {
      setEnrolledPrograms(prev => new Set([...prev, prog.id]))
      setToastMsg(`Payment confirmed! You're enrolled in ${prog.name} 🎉`)
    }
    setEnrolModal(null)
    setEnrolStep(null)
    setEnrolName('')
    setTimeout(() => setToastMsg(''), 4000)
  }

  const todayIso = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="px-6 pt-4 pb-0 flex items-center gap-3">
          <IconCalendarEvent size={22} style={{ color: '#6BA3D6' }} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Book a Session</h1>
            <p className="text-sm text-gray-500">
              Choose your session type, pick a time, and you're done.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-0 px-6">
          {([
            { id: 'sessions' as const, label: 'Sessions' },
            { id: 'programs' as const, label: 'Programs' },
          ]).map(t => (
            <button key={t.id} type="button" onClick={() => setPortalTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
                portalTab === t.id ? 'border-[#6BA3D6] text-[#6BA3D6]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sessions tab ──────────────────────────────────────────────────────── */}
      {portalTab === 'sessions' && (
        <BookASession onRequestPrograms={() => setPortalTab('programs')} />
      )}

            {portalTab === 'programs' && (
        <div className="mx-auto max-w-[1200px] p-6">
          <div className="space-y-6">
            {(['Development Program', 'Social Program'] as ProgramCategory[]).map(cat => {
              const catPrograms = portalPrograms.filter(p => p.category === cat)
              return (
                <div key={cat}>
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{cat}s</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {catPrograms.map(prog => {
                      const isEnrolled   = enrolledPrograms.has(prog.id)
                      const isWaitlisted = waitlistPrograms.has(prog.id)
                      const isPending    = pendingPrograms.has(prog.id)
                      const isFull       = prog.enrolled >= prog.capacity
                      const spotsLeft    = Math.max(0, prog.capacity - prog.enrolled)
                      const coachColor   = prog.coach === 'matt' ? COACH_MATT_COLOR : COACH_JADE_COLOR
                      const isApproval   = prog.enrolmentType === 'approval'
                      return (
                        <div key={prog.id}
                          className="rounded-2xl border bg-white p-5 shadow-sm"
                          style={{
                            borderColor: isEnrolled ? '#86efac' : isWaitlisted ? '#fde68a' : isPending ? '#fde68a' : '#e5e7eb',
                            backgroundColor: isEnrolled ? '#f0fdf4' : isWaitlisted ? '#fffbeb' : isPending ? '#fffbeb' : 'white',
                          }}>
                          {/* Program name + category badge */}
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-bold text-gray-900">{prog.name}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                  style={{ backgroundColor: PROGRAM_BG, color: PROGRAM_COLOR }}>
                                  {prog.category}
                                </span>
                                {isApproval && (
                                  <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                    Approval Required
                                  </span>
                                )}
                              </div>
                            </div>
                            {(isEnrolled || isWaitlisted || isPending) && (
                              <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                  backgroundColor: isEnrolled ? '#dcfce7' : '#fef3c7',
                                  color: isEnrolled ? '#16a34a' : '#d97706',
                                }}>
                                {isEnrolled ? 'Enrolled' : isWaitlisted ? 'Waitlisted' : 'Pending Approval'}
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {prog.description && (
                            <p className="mb-3 text-xs leading-relaxed text-gray-500">{prog.description}</p>
                          )}

                          {/* Details */}
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Coach</span>
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                                style={{ backgroundColor: coachColor }}>
                                {COACH_NAMES[prog.coach]}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Schedule</span>
                              <span className="font-medium text-gray-800">{prog.repeat} · {prog.dayOfWeek}s</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Time</span>
                              <span className="font-medium text-gray-800">{minsToLabel(prog.startMins)} – {minsToLabel(prog.endMins)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Space</span>
                              <span className="font-medium text-gray-800">{prog.space}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Term Dates</span>
                              <span className="text-xs font-medium text-gray-700">
                                {new Date(prog.seriesStart + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} –{' '}
                                {new Date(prog.seriesEnd + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Sessions in term</span>
                              <span className="font-medium text-gray-800">{prog.termLength} sessions</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                              <span className="text-gray-700 font-semibold">Term Fee</span>
                              <span className="font-bold text-gray-900">${prog.termFee.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">(${prog.costPerSession} × {prog.termLength} sessions)</span>
                            </div>
                          </div>

                          {/* Capacity bar */}
                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-gray-500">Spots</span>
                              <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-gray-700'}`}>
                                {isFull ? 'Full' : `${spotsLeft} of ${prog.capacity} remaining`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (prog.enrolled / prog.capacity) * 100)}%`,
                                  backgroundColor: isFull ? '#ef4444' : PROGRAM_COLOR,
                                }}
                              />
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="mt-4">
                            {isEnrolled ? (
                              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 py-2 text-sm font-semibold text-green-700">
                                <IconCheck size={15} strokeWidth={2.5} /> Enrolled in all sessions
                              </div>
                            ) : isWaitlisted ? (
                              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-sm font-semibold text-amber-700">
                                On Waitlist
                              </div>
                            ) : isPending ? (
                              <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-sm font-semibold text-amber-700">
                                Enrolment Pending Approval
                              </div>
                            ) : isFull ? (
                              <button type="button"
                                onClick={() => openEnrolModal(prog)}
                                className="w-full rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100">
                                Full — Join Waitlist
                              </button>
                            ) : isApproval ? (
                              <button type="button"
                                onClick={() => openEnrolModal(prog)}
                                className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ backgroundColor: '#92400e' }}>
                                Request to Enrol
                              </button>
                            ) : (
                              <button type="button"
                                onClick={() => openEnrolModal(prog)}
                                className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ backgroundColor: PROGRAM_COLOR }}>
                                Enrol Now
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* My enrolled programs */}
            {enrolledPrograms.size > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">My Programs</h2>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="space-y-2">
                    {portalPrograms.filter(p => enrolledPrograms.has(p.id)).map(prog => (
                      <div key={prog.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <IconCheck size={14} strokeWidth={2.5} className="text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">{prog.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{prog.dayOfWeek}s · {minsToLabel(prog.startMins)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast notification ───────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl"
          style={{ backgroundColor: '#22c55e' }}
        >
          <IconCheck size={16} strokeWidth={2.5} />
          {toastMsg}
        </div>
      )}

      {/* ── Enrol Modal (step 1: confirm details) ────────────────────────────── */}
      {enrolModal && enrolStep === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {enrolModal.enrolled >= enrolModal.capacity
                    ? 'Join Waitlist'
                    : enrolModal.enrolmentType === 'approval'
                    ? 'Request to Enrol'
                    : 'Enrol in Program'}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">{enrolModal.name}</p>
              </div>
              <button type="button" onClick={() => { setEnrolModal(null); setEnrolStep(null) }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
                <IconX size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Program</span><span className="font-semibold text-gray-800">{enrolModal.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Schedule</span><span className="font-semibold text-gray-800">{enrolModal.repeat} · {enrolModal.dayOfWeek}s · {minsToLabel(enrolModal.startMins)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Term Dates</span><span className="font-semibold text-gray-800">
                  {new Date(enrolModal.seriesStart + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {new Date(enrolModal.seriesEnd + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sessions</span><span className="font-semibold text-gray-800">{enrolModal.termLength} sessions</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="font-semibold text-gray-700">Term Fee</span><span className="font-bold text-gray-900">${enrolModal.termFee.toFixed(2)}</span></div>
              </div>
              {enrolModal.enrolled >= enrolModal.capacity && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This program is currently full. Join the waitlist and we'll contact you if a spot opens up.
                </div>
              )}
              {enrolModal.enrolmentType === 'approval' && enrolModal.enrolled < enrolModal.capacity && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This program requires approval. Once approved, you'll be contacted to complete payment.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Your Name</label>
                <input type="text" value={enrolName} onChange={e => setEnrolName(e.target.value)}
                  placeholder="e.g. Jordan Mitchell" autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#D4A520] focus:ring-2 focus:ring-[#D4A520]/20" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => { setEnrolModal(null); setEnrolStep(null) }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={proceedToPayment} disabled={!enrolName.trim()}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: enrolModal.enrolled >= enrolModal.capacity ? '#D97706' : '#D4A520' }}>
                {enrolModal.enrolled >= enrolModal.capacity
                  ? 'Join Waitlist'
                  : enrolModal.enrolmentType === 'approval'
                  ? 'Send Request'
                  : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Enrol Modal (step 2: payment summary — instant only) ──────────────── */}
      {enrolModal && enrolStep === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Payment Summary</h2>
                <p className="mt-0.5 text-sm text-gray-500">{enrolModal.name}</p>
              </div>
              <button type="button" onClick={() => { setEnrolModal(null); setEnrolStep(null) }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
                <IconX size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Enrolling as</span><span className="font-semibold text-gray-800">{enrolName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Program</span><span className="font-semibold text-gray-800">{enrolModal.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sessions</span><span className="font-semibold text-gray-800">{enrolModal.termLength} × {enrolModal.dayOfWeek}s</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Per session</span><span className="font-semibold text-gray-800">${enrolModal.costPerSession.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-base font-bold text-gray-900">Total due today</span>
                  <span className="text-base font-bold text-gray-900">${enrolModal.termFee.toFixed(2)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold text-gray-500">🔒 Demo mode — no real payment will be processed</p>
                <p className="mt-0.5 text-xs text-gray-400">In production this connects to Stripe</p>
              </div>
              <p className="text-center text-xs text-gray-400 leading-relaxed">
                Need help with the term fee?{' '}
                <a href="mailto:admin@formula14.com.au" className="underline hover:text-gray-600">Contact us at admin@formula14.com.au</a>{' '}
                to discuss payment options.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setEnrolStep('confirm')}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Back
              </button>
              <button type="button" onClick={confirmPayment}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#10b981' }}>
                Confirm & Pay ${enrolModal.termFee.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Share link modal (after booking a Small Group / Team Training) ───── */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Booking Confirmed!</h2>
                <p className="mt-0.5 text-sm text-gray-500">{shareModal.sessionType}</p>
              </div>
              <button
                type="button"
                onClick={() => setShareModal(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <IconCheck size={16} className="text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-800">Your spot has been requested.</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-800">Know someone who'd like to join?</p>
                <p className="text-xs text-gray-500">Share this link so they can request a spot in the same session.</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-700">
                    {shareModal.url}
                  </span>
                  <PortalCopyButton url={shareModal.url} />
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShareModal(null)}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#6BA3D6' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function PortalCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
      style={{ backgroundColor: copied ? '#059669' : '#6BA3D6' }}
    >
      {copied ? <><IconCheck size={12} /> Copied!</> : 'Copy'}
    </button>
  )
}
