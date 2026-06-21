'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconTrash,
  IconEdit,
  IconPlus,
  IconCheck,
  IconCalendar,
  IconRepeat,
  IconInfoCircle,
  IconAlertCircle,
} from '@tabler/icons-react'

// ── Grid constants ─────────────────────────────────────────────────────────────
const START_H  = 6
const END_H    = 21
const SLOT_PX  = 15                               // px per 15-min slot → 60px/hr
const TOTAL_PX = (END_H - START_H) * 4 * SLOT_PX // 900px total
const TOP_PAD  = 8                                // px above first slot so 6am isn't clipped

// ── Spaces ─────────────────────────────────────────────────────────────────────
const SPACES = [
  { id: 'primary',   label: 'Primary Station',  color: '#6BA3D6', light: '#e8f1fb' },
  { id: 'secondary', label: 'Secondary Station', color: '#6BAD6B', light: '#edf5ed' },
  { id: 'shooting',  label: 'Shooting Bay',      color: '#D4A520', light: '#fdf5e0' },
  { id: 'meeting',   label: 'Meeting Room',      color: '#A06BD6', light: '#f0ebfb' },
] as const

type SpaceId = typeof SPACES[number]['id']

// ── Program groups ─────────────────────────────────────────────────────────────
const PROGRAM_GROUPS: Record<string, string[]> = {
  'Development Programs': [
    'Performance Lab',
    'Domestic Academy',
    'Snipers Club',
    'Shooters Lab',
  ],
  'Social Programs': [
    'Walking Basketball',
    'Mid Day Ladies Comp',
    'Adult Beginner School',
  ],
}
const ALL_PROGRAM_NAMES = Object.values(PROGRAM_GROUPS).flat()

// ── Session types per space ────────────────────────────────────────────────────
const SESSION_TYPES: Record<SpaceId, string[]> = {
  primary:   ['Casual Shooting', 'Individual Work Out', 'Small Group Session', 'Volume Shooting'],
  secondary: ['Casual Shooting', 'Individual Work Out', 'Small Group Session', 'Volume Shooting'],
  shooting:  ['Casual Shooting', 'Individual Work Out', 'Small Group Session', 'Team Training', 'Volume Shooting'],
  meeting:   ['Coach Meeting', 'Film Review', 'Goal Setting', 'Meeting (General)', 'Parent Meeting', 'Player Meeting', 'Team Meeting'],
}

// Shooting Machine Rental: price by duration (minutes)
const MACHINE_RENTAL_PRICES: Record<number, number> = { 30: 30, 45: 40, 60: 50 }

const ATHLETES = [
  'Liam Carter', 'Jordan Williams', 'Aisha Thompson', 'Marcus Davies',
  'Devon Knox', 'Kai Okafor', 'Tyler Ross', 'Priya Mehta', 'Sam Liu', 'Zara Obi',
]

const TEAMS = [
  'Frankston Bobcats U12 Boys',
  'Frankston Bobcats U14 Girls',
  'SPBA Raptors U16 Boys',
  'Mornington Breakers U14 Boys',
  'Peninsula Storm U18 Girls',
  'Chelsea Basketball U12 Mixed',
  'Westernport Wolves Senior Men',
  'Frankston Blues U20 Women',
]

// ── Tier priority (Casual Shooting) ───────────────────────────────────────────
type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum'

const TIER_PRIORITY: Record<MemberTier | 'casual', number> = {
  casual:   0,
  bronze:   1,
  silver:   2,
  gold:     3,
  platinum: 4,
}

const TIER_COLORS: Record<MemberTier, string> = {
  bronze:   '#B87333',
  silver:   '#64748B',
  gold:     '#D4A843',
  platinum: '#7C3AED',
}

const CASUAL_SHOOTING_MAX = 6

// ── Types ──────────────────────────────────────────────────────────────────────
type Booking = {
  id: string
  date: string
  spaceId: SpaceId
  startMins: number
  duration: number
  sessionType: string
  athletes: string[]
  coach: 'matt' | 'jade' | 'other' | ''
  bookingType: 'member' | 'casual' | 'unavailable'
  seriesId?: string
  memberTier?: MemberTier
}

type CasualAthleteEntry = {
  id: string
  type: 'new' | 'existing' | ''
  name: string; gender: string; age: string
  repClub: string; repClubOther: string
  playingHistory: string; sessionGoals: string
  existingId: string
}

function newCasualAthlete(): CasualAthleteEntry {
  return {
    id: Math.random().toString(36).slice(2),
    type: '', name: '', gender: '', age: '',
    repClub: '', repClubOther: '', playingHistory: '', sessionGoals: '', existingId: '',
  }
}

type CasualTeamEntry = {
  type: 'new' | 'existing' | ''
  teamName: string
  association: string
  ageGroup: string
  numPlayers: string
  headCoach: string
  sessionGoals: string
  existingTeam: string
}

function newCasualTeam(): CasualTeamEntry {
  return { type: '', teamName: '', association: '', ageGroup: '', numPlayers: '', headCoach: '', sessionGoals: '', existingTeam: '' }
}

type Modal =
  | null
  | { kind: 'add';  spaceId: SpaceId | null; startMins: number; date: string }
  | { kind: 'view'; booking: Booking }
  | { kind: 'edit'; booking: Booking }
  | { kind: 'editSeries'; booking: Booking }

type HoverInfo = { colKey: string; slotY: number; slotMins: number } | null

// ── Date helpers ───────────────────────────────────────────────────────────────
function ds(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function shift(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function monday(d: Date): Date {
  const day = d.getDay(); return shift(d, -((day + 6) % 7))
}
function parse(s: string): Date {
  return new Date(s + 'T12:00:00')
}

// ── Time helpers ───────────────────────────────────────────────────────────────
function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!m) return h === 1 ? '1 hr' : `${h} hrs`
  if (!h) return `${m} min`
  return `${h} hr ${m} min`
}
// Convert minutes-from-midnight to Y position in the grid (not including TOP_PAD)
function toY(mins: number): number {
  return ((mins - START_H * 60) / 15) * SLOT_PX
}
// Convert a raw Y click position to snapped 15-min minutes
function fromY(y: number): number {
  const clamped = Math.max(0, Math.min(TOTAL_PX, y))
  return Math.round(((clamped / SLOT_PX) * 15 + START_H * 60) / 15) * 15
}
function nowMins(): number {
  const n = new Date(); return n.getHours() * 60 + n.getMinutes()
}
function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}
function occurrenceDates(startDate: string, repeat: string, until: string): string[] {
  const dates: string[] = [startDate]
  if (!until) return dates
  let cur = parse(startDate)
  const end = parse(until)
  for (let i = 0; i < 500; i++) {
    if      (repeat === 'weekly')       cur = shift(cur, 7)
    else if (repeat === 'fortnightly')  cur = shift(cur, 14)
    else if (repeat === 'monthly')      { cur = new Date(cur); cur.setMonth(cur.getMonth() + 1) }
    else if (repeat === 'yearly')       { cur = new Date(cur); cur.setFullYear(cur.getFullYear() + 1) }
    if (cur > end) break
    dates.push(ds(cur))
  }
  return dates
}

// ── Sample bookings ────────────────────────────────────────────────────────────
function makeSamples(today: string): Booking[] {
  const dt = parse(today)
  const yd  = ds(shift(dt, -1))
  const d2  = ds(shift(dt, -2))
  const tm  = ds(shift(dt,  1))
  const d2f = ds(shift(dt,  2))
  return [
    { id:'b1',  date:today, spaceId:'primary',   startMins:7*60,     duration:60,  sessionType:'Individual Work Out', athletes:['Liam Carter'],                                              coach:'matt', bookingType:'member' },
    { id:'b2',  date:today, spaceId:'primary',   startMins:8*60+30,  duration:90,  sessionType:'Small Group Session', athletes:['Jordan Williams','Aisha Thompson','Devon Knox'],             coach:'matt', bookingType:'member' },
    { id:'b3',  date:today, spaceId:'secondary', startMins:9*60,     duration:120, sessionType:'Team Training',       athletes:['Liam Carter','Jordan Williams','Marcus Davies','Priya Mehta','Tyler Ross'], coach:'jade', bookingType:'member' },
    { id:'b4',  date:today, spaceId:'primary',   startMins:11*60,    duration:60,  sessionType:'Programs',            athletes:[],                                                           coach:'matt', bookingType:'unavailable' },
    { id:'b5',  date:today, spaceId:'secondary', startMins:14*60,    duration:90,  sessionType:'Small Group Session', athletes:['Aisha Thompson','Kai Okafor','Sam Liu'],                     coach:'jade', bookingType:'member' },
    { id:'b6',  date:today, spaceId:'shooting',  startMins:16*60+30, duration:60,  sessionType:'Volume Shooting',     athletes:['Devon Knox'],                                               coach:'matt', bookingType:'member' },
    { id:'b7',  date:today, spaceId:'meeting',   startMins:17*60,    duration:60,  sessionType:'Coach Meeting',       athletes:[],                                                           coach:'matt', bookingType:'member' },
    { id:'b8',  date:today, spaceId:'primary',   startMins:18*60,    duration:90,  sessionType:'Team Training',       athletes:['Liam Carter','Jordan Williams','Aisha Thompson','Tyler Ross','Zara Obi'], coach:'matt', bookingType:'member' },
    { id:'b9',  date:yd,   spaceId:'primary',   startMins:9*60,     duration:60,  sessionType:'Individual Work Out', athletes:['Tyler Ross'],                                               coach:'jade', bookingType:'member' },
    { id:'b10', date:yd,   spaceId:'meeting',   startMins:15*60,    duration:60,  sessionType:'Film Review',         athletes:['Jordan Williams','Marcus Davies'],                          coach:'matt', bookingType:'member' },
    { id:'b11', date:d2,   spaceId:'secondary', startMins:10*60,    duration:90,  sessionType:'Programs',            athletes:[],                                                           coach:'matt', bookingType:'unavailable' },
    { id:'b12', date:d2,   spaceId:'shooting',  startMins:14*60,    duration:60,  sessionType:'Volume Shooting',     athletes:['Kai Okafor'],                                              coach:'jade', bookingType:'member' },
    { id:'b13', date:tm,   spaceId:'primary',   startMins:8*60,     duration:90,  sessionType:'Small Group Session', athletes:['Liam Carter','Jordan Williams','Aisha Thompson'],           coach:'matt', bookingType:'member' },
    { id:'b14', date:tm,   spaceId:'meeting',   startMins:13*60,    duration:60,  sessionType:'Goal Setting',        athletes:['Devon Knox'],                                               coach:'jade', bookingType:'member' },
    { id:'b15', date:d2f,  spaceId:'secondary', startMins:11*60,    duration:60,  sessionType:'Team Training',       athletes:['Tyler Ross','Priya Mehta','Zara Obi'],                     coach:'matt', bookingType:'member' },
    // Casual Shooting demo — 5/6 capacity on primary today for bump testing
    { id:'cs1', date:today, spaceId:'primary', startMins:7*60+30, duration:60, sessionType:'Casual Shooting', athletes:['Zara Obi'],     coach:'', bookingType:'member',   memberTier:'platinum' },
    { id:'cs2', date:today, spaceId:'primary', startMins:9*60,    duration:60, sessionType:'Casual Shooting', athletes:['Priya Mehta'],  coach:'', bookingType:'member',   memberTier:'gold' },
    { id:'cs3', date:today, spaceId:'primary', startMins:12*60,   duration:60, sessionType:'Casual Shooting', athletes:['Tyler Ross'],   coach:'', bookingType:'member',   memberTier:'silver' },
    { id:'cs4', date:today, spaceId:'primary', startMins:13*60,   duration:60, sessionType:'Casual Shooting', athletes:['Marcus Davies'],coach:'', bookingType:'casual' },
    { id:'cs5', date:today, spaceId:'primary', startMins:15*60,   duration:60, sessionType:'Casual Shooting', athletes:['Sam Liu'],      coach:'', bookingType:'casual' },
    // Shooting Machine Rental demos
    { id:'sm1', date:today, spaceId:'shooting', startMins:10*60,     duration:60, sessionType:'Shooting Machine Rental', athletes:['Liam Carter'],    coach:'', bookingType:'casual' },
    { id:'sm2', date:tm,    spaceId:'shooting', startMins:13*60+30,  duration:45, sessionType:'Shooting Machine Rental', athletes:['Jordan Williams'], coach:'', bookingType:'casual' },
    // Program demos
    { id:'pg1', date:today, spaceId:'secondary', startMins:12*60, duration:60, sessionType:'Mid Day Ladies Comp', athletes:[], coach:'jade', bookingType:'casual' },
    { id:'pg2', date:tm,    spaceId:'primary',   startMins:10*60, duration:60, sessionType:'Domestic Academy',  athletes:['Aisha Thompson','Devon Knox','Tyler Ross','Priya Mehta','Sam Liu','Zara Obi'], coach:'matt', bookingType:'member' },
  ]
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const today = ds(new Date())

  const [bookings,   setBookings]   = useState<Booking[]>(() => makeSamples(today))
  const [anchor,     setAnchor]     = useState<Date>(() => new Date())
  const [view,       setView]       = useState<'day' | 'week'>('day')
  const [modal,      setModal]      = useState<Modal>(null)
  const [nowY,       setNowY]       = useState(() => toY(nowMins()))
  const [hoverInfo,  setHoverInfo]  = useState<HoverInfo>(null)
  const [toast,      setToast]      = useState<string | null>(null)

  const gridRef = useRef<HTMLDivElement>(null)

  // Tick NOW line every minute
  useEffect(() => {
    const id = setInterval(() => setNowY(toY(nowMins())), 60_000)
    return () => clearInterval(id)
  }, [])

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = Math.max(0, nowY - 200)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Visible dates
  const visibleDates = view === 'day'
    ? [ds(anchor)]
    : Array.from({ length: 7 }, (_, i) => ds(shift(monday(anchor), i)))

  const isTodayVisible = visibleDates.includes(today)

  // Toolbar title
  const title = view === 'day'
    ? parse(ds(anchor)).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : (() => {
        const mon = monday(anchor), sun = shift(mon, 6)
        return `${mon.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
      })()

  function handleColClick(e: React.MouseEvent<HTMLDivElement>, spaceId: SpaceId | null, date: string) {
    const rect = e.currentTarget.getBoundingClientRect()
    const raw  = fromY(e.clientY - rect.top)
    const clamped = Math.max(START_H * 60, Math.min(END_H * 60 - 15, raw))
    setModal({ kind: 'add', spaceId, startMins: clamped, date })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, colKey: string) {
    if ((e.target as HTMLElement).closest('[data-booking]')) {
      setHoverInfo(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const snapped = Math.max(START_H * 60, Math.min(END_H * 60 - 15, fromY(e.clientY - rect.top)))
    setHoverInfo({ colKey, slotY: toY(snapped), slotMins: snapped })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4500)
  }

  function handleSave(items: (Omit<Booking, 'id'> & { id?: string })[]) {
    let bumpMsg: string | null = null
    setBookings(prev => {
      let next = [...prev]
      for (const data of items) {
        // Bump logic for new Casual Shooting bookings
        if (data.sessionType === 'Casual Shooting' && !data.id) {
          const existing = next.filter(b =>
            b.spaceId === data.spaceId &&
            b.date === data.date &&
            b.sessionType === 'Casual Shooting'
          )
          if (existing.length >= CASUAL_SHOOTING_MAX) {
            const newPri = data.memberTier ? TIER_PRIORITY[data.memberTier] : TIER_PRIORITY.casual
            const sorted = [...existing].sort((a, b_) => {
              const pa = a.memberTier ? TIER_PRIORITY[a.memberTier] : TIER_PRIORITY.casual
              const pb = b_.memberTier ? TIER_PRIORITY[b_.memberTier] : TIER_PRIORITY.casual
              return pa - pb
            })
            const lowest = sorted[0]
            const lowestPri = lowest.memberTier ? TIER_PRIORITY[lowest.memberTier] : TIER_PRIORITY.casual
            if (newPri > lowestPri) {
              next = next.filter(b => b.id !== lowest.id)
              const athleteName = lowest.athletes[0] ?? 'A booking'
              const fromLabel = lowest.memberTier
                ? lowest.memberTier.charAt(0).toUpperCase() + lowest.memberTier.slice(1)
                : 'Casual'
              const toLabel = data.memberTier
                ? data.memberTier.charAt(0).toUpperCase() + data.memberTier.slice(1)
                : 'Casual'
              bumpMsg = `${athleteName} was bumped from Casual Shooting — ${toLabel} tier replaced ${fromLabel}.`
              next = [...next, { ...data, id: uid() } as Booking]
            }
            continue
          }
        }
        if (data.id) {
          next = next.map(b => b.id === data.id ? { ...data, id: data.id! } as Booking : b)
        } else {
          next = [...next, { ...data, id: uid() } as Booking]
        }
      }
      return next
    })
    setModal(null)
    if (bumpMsg) showToast(bumpMsg)
  }

  function handleDelete(id: string) {
    setBookings(prev => prev.filter(b => b.id !== id))
    setModal(null)
  }

  function handleDeleteFrom(seriesId: string, fromDate: string) {
    setBookings(prev => prev.filter(b => !(b.seriesId === seriesId && b.date >= fromDate)))
    setModal(null)
  }

  function handleSaveFrom(fromDate: string, seriesId: string, updates: Omit<Booking, 'id' | 'date' | 'seriesId'>) {
    setBookings(prev => prev.map(b =>
      b.seriesId === seriesId && b.date >= fromDate ? { ...b, ...updates } : b
    ))
    setModal(null)
  }

  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <button
          onClick={() => setAnchor(new Date())}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Today
        </button>
        <div className="flex items-center">
          <button
            onClick={() => setAnchor(d => shift(d, view === 'day' ? -1 : -7))}
            className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            onClick={() => setAnchor(d => shift(d, view === 'day' ? 1 : 7))}
            className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-800">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-1">
            {(['day', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${
                  view === v
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModal({ kind: 'add', spaceId: null, startMins: 9 * 60, date: ds(anchor) })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#6BA3D6' }}
          >
            <IconPlus size={16} />
            New Booking
          </button>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">

        {/* Column headers */}
        <div className="flex shrink-0 border-b border-gray-100">
          <div className="w-16 shrink-0 border-r border-gray-100" />

          {view === 'day' ? (
            SPACES.map((sp, i) => (
              <div
                key={sp.id}
                className="flex flex-1 items-center justify-center gap-2 py-3"
                style={{ borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0' }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sp.color }} />
                <span className="text-xs font-semibold text-gray-700">{sp.label}</span>
              </div>
            ))
          ) : (
            visibleDates.map((d, i) => {
              const dt = parse(d)
              const dow = dt.toLocaleDateString('en-AU', { weekday: 'short' })
              const dm  = dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              const isToday = d === today
              return (
                <div
                  key={d}
                  className="flex flex-1 flex-col items-center py-2"
                  style={{ borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0' }}
                >
                  <span className={`text-[11px] font-medium ${isToday ? 'text-[#6BA3D6]' : 'text-gray-400'}`}>{dow}</span>
                  <span className={`text-sm font-bold ${isToday ? 'text-[#6BA3D6]' : 'text-gray-700'}`}>{dm}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Scrollable grid — TOP_PAD pushes the 6am row away from the header */}
        <div ref={gridRef} className="flex flex-1 overflow-y-auto" style={{ paddingTop: TOP_PAD }}>

          {/* Time labels */}
          <div className="w-16 shrink-0 select-none border-r border-gray-100">
            {hours.map(h => (
              <div key={h} className="relative" style={{ height: SLOT_PX * 4 }}>
                <span className="absolute right-2 top-0 -translate-y-1/2 text-[11px] leading-none text-gray-400">
                  {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
                </span>
              </div>
            ))}
          </div>

          {/* Grid + columns */}
          <div className="relative flex flex-1" style={{ minHeight: TOTAL_PX }}>

            {/* Horizontal grid lines — 4 slots/hr with 3-tier shading */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: (END_H - START_H) * 4 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: SLOT_PX,
                    borderTop: `1px solid ${i % 4 === 0 ? '#e5e7eb' : i % 2 === 0 ? '#f0f0f0' : '#f8f8f8'}`,
                  }}
                />
              ))}
            </div>

            {/* NOW line */}
            {isTodayVisible && nowY >= 0 && nowY <= TOTAL_PX && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                style={{ top: nowY }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" style={{ marginLeft: -4 }} />
                <div className="h-px flex-1 bg-red-500 opacity-80" />
              </div>
            )}

            {/* Space / day columns */}
            {view === 'day' ? (
              SPACES.map((sp, i) => {
                const colKey = sp.id
                const colBookings = bookings.filter(b => b.date === visibleDates[0] && b.spaceId === sp.id)
                const csBookings = colBookings.filter(b => b.sessionType === 'Casual Shooting')
                const csCount = csBookings.length
                const csTierCounts = csBookings.reduce<Record<string, number>>((acc, b) => {
                  const k = b.memberTier ? b.memberTier.charAt(0).toUpperCase() + b.memberTier.slice(1) : 'Casual'
                  acc[k] = (acc[k] ?? 0) + 1
                  return acc
                }, {})
                const csTierLabel = Object.entries(csTierCounts).map(([k, v]) => `${v} ${k}`).join(', ')
                const csSlotInfo = csCount > 0 ? `${csCount}/${CASUAL_SHOOTING_MAX} — ${csTierLabel}` : undefined
                const hoverMatch = hoverInfo?.colKey === colKey ? hoverInfo : null
                return (
                  <div
                    key={sp.id}
                    className="relative flex-1"
                    style={{ borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0', height: TOTAL_PX, cursor: 'default' }}
                    onClick={e => {
                      if ((e.target as HTMLElement).closest('[data-booking]')) return
                      handleColClick(e, sp.id, visibleDates[0])
                    }}
                    onMouseMove={e => handleMouseMove(e, colKey)}
                    onMouseLeave={() => setHoverInfo(null)}
                  >
                    {/* Slot hover highlight */}
                    {hoverMatch && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 flex items-center justify-center"
                        style={{ top: hoverMatch.slotY, height: SLOT_PX, backgroundColor: 'rgba(0,0,0,0.07)' }}
                      >
                        <span className="text-center text-xs font-semibold" style={{ color: '#6b7280', lineHeight: 1 }}>
                          {fmtTime(hoverMatch.slotMins)}
                        </span>
                      </div>
                    )}
                    {colBookings.map(b => (
                      <BookingBlock
                        key={b.id}
                        booking={b}
                        color={sp.color}
                        light={sp.light}
                        compact={false}
                        slotInfo={b.sessionType === 'Casual Shooting' ? csSlotInfo : undefined}
                        onClick={() => setModal({ kind: 'view', booking: b })}
                      />
                    ))}
                  </div>
                )
              })
            ) : (
              visibleDates.map((d, i) => {
                const colKey = d
                const isToday = d === today
                const colBookings = bookings.filter(b => b.date === d)
                const hoverMatch = hoverInfo?.colKey === colKey ? hoverInfo : null
                // Per-space Casual Shooting slot info for week view
                const csInfoBySpace = SPACES.reduce<Record<string, string | undefined>>((acc, sp) => {
                  const cs = colBookings.filter(b => b.spaceId === sp.id && b.sessionType === 'Casual Shooting')
                  if (cs.length > 0) {
                    const counts = cs.reduce<Record<string, number>>((a, b) => {
                      const k = b.memberTier ? b.memberTier.charAt(0).toUpperCase() + b.memberTier.slice(1) : 'Casual'
                      a[k] = (a[k] ?? 0) + 1
                      return a
                    }, {})
                    acc[sp.id] = `${cs.length}/${CASUAL_SHOOTING_MAX} — ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`
                  }
                  return acc
                }, {})
                return (
                  <div
                    key={d}
                    className="relative flex-1"
                    style={{
                      borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0',
                      height: TOTAL_PX,
                      cursor: 'default',
                      backgroundColor: isToday ? 'rgba(107,163,214,0.03)' : 'transparent',
                    }}
                    onClick={e => {
                      if ((e.target as HTMLElement).closest('[data-booking]')) return
                      handleColClick(e, null, d)
                    }}
                    onMouseMove={e => handleMouseMove(e, colKey)}
                    onMouseLeave={() => setHoverInfo(null)}
                  >
                    {/* Slot hover highlight */}
                    {hoverMatch && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 flex items-center justify-center"
                        style={{ top: hoverMatch.slotY, height: SLOT_PX, backgroundColor: 'rgba(0,0,0,0.07)' }}
                      >
                        <span className="text-center text-xs font-semibold" style={{ color: '#6b7280', lineHeight: 1 }}>
                          {fmtTime(hoverMatch.slotMins)}
                        </span>
                      </div>
                    )}
                    {colBookings.map(b => {
                      const sp = SPACES.find(s => s.id === b.spaceId)!
                      return (
                        <BookingBlock
                          key={b.id}
                          booking={b}
                          color={sp.color}
                          light={sp.light}
                          compact
                          slotInfo={b.sessionType === 'Casual Shooting' ? csInfoBySpace[b.spaceId] : undefined}
                          onClick={() => setModal({ kind: 'view', booking: b })}
                        />
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <BookingModal
          modal={modal}
          today={today}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onDeleteFrom={handleDeleteFrom}
          onSaveFrom={handleSaveFrom}
          onEdit={b => setModal({ kind: 'edit', booking: b })}
          onEditSeries={b => setModal({ kind: 'editSeries', booking: b })}
        />
      )}

      {/* ── Toast ── */}
      <ToastNotification message={toast} />
    </div>
  )
}

// ── Toast Notification ────────────────────────────────────────────────────────
function ToastNotification({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-2xl">
      <IconAlertCircle size={16} className="shrink-0 text-amber-400" />
      {message}
    </div>
  )
}

// ── Booking Block ──────────────────────────────────────────────────────────────
function BookingBlock({
  booking, color, light, compact, onClick, slotInfo,
}: {
  booking: Booking
  color: string
  light: string
  compact: boolean
  onClick: () => void
  slotInfo?: string
}) {
  const top    = toY(booking.startMins)
  const height = Math.max(SLOT_PX, (booking.duration / 15) * SLOT_PX)
  const coachBadge = booking.coach === 'matt' ? 'M' : booking.coach === 'jade' ? 'J' : booking.coach === 'other' ? 'O' : null
  const chipColor = booking.bookingType === 'unavailable' ? '#ef4444' : color
  const chipLight = booking.bookingType === 'unavailable' ? '#fee2e2' : light

  const athleteStr = booking.athletes.length === 0 ? '' :
    booking.athletes.length <= 2
      ? booking.athletes.map(a => a.split(' ')[0]).join(', ')
      : `${booking.athletes.slice(0, 2).map(a => a.split(' ')[0]).join(', ')} +${booking.athletes.length - 2}`

  const typeAbbr = booking.sessionType
    .split(' ')
    .filter(w => !['Session', 'Work', 'Out', 'Meeting', 'Review', 'Training', 'Setting', 'General', 'Shooting'].includes(w))
    .map(w => w[0])
    .join('')

  return (
    <div
      data-booking="1"
      onClick={e => { e.stopPropagation(); onClick() }}
      title={slotInfo}
      className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border transition-opacity hover:opacity-80"
      style={{ top, height, backgroundColor: chipLight, borderColor: chipColor + '50', borderLeftWidth: 3, borderLeftColor: chipColor }}
    >
      <div className="relative px-1.5 pt-0.5">
        <p className="truncate text-[11px] font-bold leading-tight" style={{ color: chipColor }}>
          {booking.bookingType === 'unavailable' ? (booking.sessionType || 'Unavailable') : compact ? (typeAbbr || booking.sessionType.slice(0, 3)) : booking.sessionType}
        </p>
        {!compact && height >= 40 && athleteStr && booking.bookingType !== 'unavailable' && (
          <p className="mt-0.5 truncate text-[10px]" style={{ color: chipColor + 'cc' }}>
            {athleteStr}
          </p>
        )}
        {!compact && height >= 24 && coachBadge && booking.bookingType !== 'unavailable' && (
          <span
            className="absolute right-1 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ backgroundColor: chipColor }}
          >
            {coachBadge}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Date Picker ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function DatePicker({ value, onChange, accentColor = '#6BA3D6' }: { value: string; onChange: (v: string) => void; accentColor?: string }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'months'>('days')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 })

  const parsed = value ? new Date(value + 'T12:00:00') : null
  const [viewYear, setViewYear] = useState(() => parsed?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth() ?? new Date().getMonth())

  // Sync view when value changes externally (e.g. modal reset)
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keep panel anchored to trigger while modal scrolls
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!triggerRef.current) return
      const r = triggerRef.current.getBoundingClientRect()
      setPanelStyle({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  const displayText = parsed
    ? parsed.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Select date'

  // Build 42-cell Mon-anchored grid
  const dow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells: { date: Date; current: boolean }[] = []
  for (let i = dow - 1; i >= 0; i--)
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i), current: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(viewYear, viewMonth, d), current: true })
  for (let d = 1; cells.length < 42; d++)
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), current: false })

  function isSel(date: Date) {
    return !!parsed &&
      date.getFullYear() === parsed.getFullYear() &&
      date.getMonth() === parsed.getMonth() &&
      date.getDate() === parsed.getDate()
  }

  function pickDate(date: Date) {
    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
    onChange(iso)
    setOpen(false)
    setView('days')
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function handleToggle() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPanelStyle({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
    setView('days')
  }

  return (
    <div>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40"
      >
        <IconCalendar size={14} className="shrink-0 text-gray-400" />
        <span className="truncate">{displayText}</span>
      </button>

      {/* Floating calendar portal — renders in document.body to escape modal overflow clipping */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ position: 'fixed', top: panelStyle.top, left: panelStyle.left, width: panelStyle.width, zIndex: 9999, fontFamily: "'Google Sans Flex', sans-serif" }}
        >
          {view === 'days' ? (
            <>
              {/* Month / year nav */}
              <div className="flex items-center justify-between px-2 pt-2 pb-1">
                <button type="button" onClick={prevMonth} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                  <IconChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('months')}
                  className="text-xs font-semibold text-gray-800 transition hover:text-[#6BA3D6]"
                >
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </button>
                <button type="button" onClick={nextMonth} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                  <IconChevronRight size={14} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-1">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                  <div key={d} className="py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 px-1 pb-2">
                {cells.map((cell, i) => {
                  const sel = isSel(cell.date)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDate(cell.date)}
                      className={[
                        'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition',
                        sel
                          ? 'font-semibold text-white'
                          : cell.current
                          ? 'text-gray-700 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-50',
                      ].join(' ')}
                      style={sel ? { backgroundColor: accentColor } : {}}
                    >
                      {cell.date.getDate()}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Year nav */}
              <div className="flex items-center justify-between px-2 pt-2 pb-1">
                <button type="button" onClick={() => setViewYear(y => y - 1)} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                  <IconChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-gray-800">{viewYear}</span>
                <button type="button" onClick={() => setViewYear(y => y + 1)} className="rounded p-1 text-gray-500 hover:bg-gray-100">
                  <IconChevronRight size={14} />
                </button>
              </div>

              {/* Month grid — 3 × 4 */}
              <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                {MONTH_NAMES.map((name, i) => {
                  const sel = !!parsed && viewYear === parsed.getFullYear() && i === parsed.getMonth()
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setViewMonth(i); setView('days') }}
                      className={[
                        'rounded-lg py-1.5 text-xs transition',
                        sel ? 'font-semibold text-white' : 'text-gray-700 hover:bg-gray-100',
                      ].join(' ')}
                      style={sel ? { backgroundColor: accentColor } : {}}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Time Picker ────────────────────────────────────────────────────────────────
function TimePicker({ value, onChange, options, accentColor = '#6BA3D6' }: {
  value: number
  onChange: (v: number) => void
  options: number[]
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Scroll selected item into view each time the panel opens
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  // Keep panel anchored to trigger while modal scrolls
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!triggerRef.current) return
      const r = triggerRef.current.getBoundingClientRect()
      const GAP = 4, PANEL_MAX_H = 200
      const spaceBelow = window.innerHeight - r.bottom - GAP
      const spaceAbove = r.top - GAP
      const top = spaceBelow >= 120 || spaceBelow >= spaceAbove
        ? r.bottom + GAP
        : r.top - Math.min(PANEL_MAX_H, spaceAbove) - GAP
      setPanelStyle({ top, left: r.left, width: r.width })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  function handleToggle() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const GAP = 4
      const PANEL_MAX_H = 200
      const spaceBelow = window.innerHeight - r.bottom - GAP
      const spaceAbove = r.top - GAP
      const top = spaceBelow >= 120 || spaceBelow >= spaceAbove
        ? r.bottom + GAP
        : r.top - Math.min(PANEL_MAX_H, spaceAbove) - GAP
      setPanelStyle({ top, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40"
      >
        {fmtTime(value)}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{
            position: 'fixed',
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            zIndex: 9999,
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: "'Google Sans Flex', sans-serif",
          }}
        >
          {options.map(mins => {
            const sel = mins === value
            return (
              <button
                key={mins}
                ref={sel ? selectedRef : null}
                type="button"
                onClick={() => { onChange(mins); setOpen(false) }}
                className={`w-full py-1.5 text-center text-sm transition ${
                  sel ? 'font-semibold text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={sel ? { backgroundColor: accentColor } : {}}
              >
                {fmtTime(mins)}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Select Picker (string options) ────────────────────────────────────────────
function SelectPicker({ value, onChange, options, accentColor = '#6BA3D6', getPanelPosition, multiValues, onChangeMulti, maxSelect, panelMaxHeight = 200, centerOnTrigger = false }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; muted?: boolean; header?: boolean }[]
  accentColor?: string
  getPanelPosition?: () => { top: number; left: number; width: number; height: number } | null
  multiValues?: string[]
  onChangeMulti?: (v: string[]) => void
  maxSelect?: number
  panelMaxHeight?: number
  centerOnTrigger?: boolean
}) {
  const multiMode = multiValues !== undefined
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number; height?: number }>({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  function calcStyle(r: DOMRect) {
    const GAP = 4
    if (centerOnTrigger) {
      const idealTop = r.top + r.height / 2 - panelMaxHeight / 2
      const top = Math.max(GAP, Math.min(window.innerHeight - panelMaxHeight - GAP, idealTop))
      return { top, left: r.left, width: r.width }
    }
    const spaceBelow = window.innerHeight - r.bottom - GAP
    const spaceAbove = r.top - GAP
    const top = spaceBelow >= panelMaxHeight || spaceBelow >= spaceAbove
      ? r.bottom + GAP
      : r.top - Math.min(panelMaxHeight, spaceAbove) - GAP
    return { top, left: r.left, width: r.width }
  }

  // Keep panel anchored to trigger while modal scrolls
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (getPanelPosition) {
        const pos = getPanelPosition()
        if (pos) setPanelStyle(pos)
      } else if (triggerRef.current) {
        setPanelStyle(calcStyle(triggerRef.current.getBoundingClientRect()))
      }
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, getPanelPosition, panelMaxHeight, centerOnTrigger])

  function handleToggle() {
    if (!open) {
      if (getPanelPosition) {
        const pos = getPanelPosition()
        if (pos) setPanelStyle(pos)
      } else if (triggerRef.current) {
        setPanelStyle(calcStyle(triggerRef.current.getBoundingClientRect()))
      }
    }
    setOpen(o => !o)
  }

  const selectedOpt = options.find(o => o.value === value)

  const triggerLabel = multiMode
    ? multiValues!.length === 0
      ? (options.find(o => o.muted)?.label ?? 'Select')
      : multiValues!.length === 1
        ? (options.find(o => o.value === multiValues![0])?.label ?? multiValues![0])
        : `${multiValues!.length} Athletes selected`
    : (selectedOpt?.label ?? value)
  const triggerMuted = multiMode ? multiValues!.length === 0 : !!selectedOpt?.muted

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40"
        style={{ color: triggerMuted ? '#bcbfc5' : '#1f2937' }}
      >
        {triggerLabel}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{
            position: 'fixed',
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            zIndex: 9999,
            ...(panelStyle.height ? { height: panelStyle.height } : { maxHeight: `${panelMaxHeight}px` }),
            overflowY: 'auto',
            fontFamily: "'Google Sans Flex', sans-serif",
          }}
        >
          {options.map(opt => {
            if (opt.header) {
              return (
                <div key={opt.value} className="border-t border-gray-100 mt-0.5 px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  {opt.label}
                </div>
              )
            }
            const sel = multiMode
              ? (opt.value === '' ? multiValues!.length === 0 : multiValues!.includes(opt.value))
              : opt.value === value
            const atMax = multiMode && maxSelect !== undefined && multiValues!.length >= maxSelect && !sel
            return (
              <button
                key={opt.value}
                ref={sel ? selectedRef : null}
                type="button"
                onClick={() => {
                  if (opt.muted) return
                  if (multiMode) {
                    if (sel) {
                      onChangeMulti!(multiValues!.filter(v => v !== opt.value))
                    } else if (!atMax) {
                      onChangeMulti!([...multiValues!, opt.value])
                    }
                  } else {
                    onChange(opt.value)
                    setOpen(false)
                  }
                }}
                className={`flex w-full items-center justify-center gap-2 py-1.5 text-center text-sm transition ${
                  sel ? 'font-semibold' : atMax ? 'opacity-30' : 'hover:bg-gray-100'
                }`}
                style={sel
                  ? { backgroundColor: accentColor, color: 'white' }
                  : { color: opt.muted ? '#bcbfc5' : '#374151' }
                }
              >
                {multiMode && sel && <IconCheck size={12} />}
                {opt.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Booking Modal ──────────────────────────────────────────────────────────────
function BookingModal({
  modal, today, onClose, onSave, onDelete, onDeleteFrom, onSaveFrom, onEdit, onEditSeries,
}: {
  modal: NonNullable<Modal>
  today: string
  onClose: () => void
  onSave: (items: (Omit<Booking, 'id'> & { id?: string })[]) => void
  onDelete: (id: string) => void
  onDeleteFrom: (seriesId: string, fromDate: string) => void
  onSaveFrom:   (fromDate: string, seriesId: string, updates: Omit<Booking, 'id' | 'date' | 'seriesId'>) => void
  onEdit: (b: Booking) => void
  onEditSeries: (b: Booking) => void
}) {
  const isView          = modal.kind === 'view'
  const editSeriesFuture = modal.kind === 'editSeries'
  const src = (modal.kind === 'edit' || modal.kind === 'view' || modal.kind === 'editSeries')
    ? modal.booking : null

  const [spaceId,     setSpaceId]     = useState<SpaceId>(modal.kind === 'add' ? (modal.spaceId ?? 'primary') : src!.spaceId)
  const [date,        setDate]        = useState(modal.kind === 'add' ? modal.date : src!.date)
  const [startMins,   setStartMins]   = useState(modal.kind === 'add' ? modal.startMins : src!.startMins)
  const [finishMins,  setFinishMins]  = useState(modal.kind === 'add' ? modal.startMins + 60 : src!.startMins + src!.duration)
  const [sessionType, setSessionType] = useState(modal.kind === 'add' ? '' : src!.sessionType)
  const [athletes,    setAthletes]    = useState<string[]>(modal.kind === 'add' ? [] : src!.athletes)
  const [coach,       setCoach]       = useState<'matt' | 'jade' | 'other' | ''>(modal.kind === 'add' ? '' : src!.coach)
  const [repeat,      setRepeat]      = useState<'none' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly'>('none')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [bookingType, setBookingType] = useState<'member' | 'casual' | 'unavailable'>('member')
  const [seriesPrompt, setSeriesPrompt] = useState<'edit' | 'delete' | null>(null)
  const [seriesScope,  setSeriesScope]  = useState<'single' | 'future'>('single')
  const [casualAthletes, setCasualAthletes] = useState<CasualAthleteEntry[]>([newCasualAthlete()])
  const [casualTeam,     setCasualTeam]     = useState<CasualTeamEntry>(newCasualTeam())
  const [memberCasuals,  setMemberCasuals]  = useState<CasualAthleteEntry[]>([])
  const [singleAthlete,  setSingleAthlete]  = useState('')
  const [customAthlete,  setCustomAthlete]  = useState('')
  const [memberTier,            setMemberTier]            = useState<MemberTier | ''>('')
  const [machineRentalDuration, setMachineRentalDuration] = useState<30 | 45 | 60>(60)
  const accentColor  = bookingType === 'casual' ? '#6BAD6B' : bookingType === 'unavailable' ? '#ef4444' : '#6BA3D6'
  const isIndividual = bookingType === 'member' && sessionType === 'Individual Work Out'
  const isMachineRental = sessionType === 'Shooting Machine Rental'

  const sessionTypeOpts: Array<{ value: string; label: string; muted?: boolean; header?: boolean }> = [
    { value: '', label: 'Select A Session Type', muted: true },
    ...SESSION_TYPES[spaceId]
      .filter(t => !(bookingType === 'member' && t === 'Team Training'))
      .filter(t => !ALL_PROGRAM_NAMES.includes(t))
      .map(t => ({ value: t, label: t })),
    ...Object.values(PROGRAM_GROUPS)
      .flat()
      .filter(p => SESSION_TYPES[spaceId].includes(p))
      .map(p => ({ value: p, label: p })),
  ]

  const modalRef  = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  function handleReset() {
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    const origDate  = modal.kind === 'add' ? modal.date       : src!.date
    const origStart = modal.kind === 'add' ? modal.startMins  : src!.startMins
    setDate(origDate)
    setStartMins(origStart)
    setFinishMins(origStart + 60)
    setSessionType(bookingType === 'unavailable' ? 'Unavailable' : '')
    setAthletes([])
    setCoach('')
    setRepeat('none')
    setRepeatUntil('')
    setCasualAthletes([newCasualAthlete()])
    setCasualTeam(newCasualTeam())
    setMemberCasuals([])
    setSingleAthlete('')
    setCustomAthlete('')
    setMemberTier('')
    setMachineRentalDuration(60)
  }

  function handleSpaceChange(id: SpaceId) {
    setSpaceId(id)
    setSessionType('')
  }

  function toggleAthlete(name: string) {
    setAthletes(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name])
  }

  function handleSave() {
    const duration = Math.max(15, finishMins - startMins)
    const memberCasualNames = memberCasuals
      .map(e => e.type === 'existing' ? e.existingId : e.name.trim())
      .filter(Boolean)
    const effectiveAthletes = isIndividual
      ? (singleAthlete === 'other' ? (customAthlete.trim() ? [customAthlete.trim()] : []) : singleAthlete ? [singleAthlete] : [])
      : [...athletes, ...memberCasualNames]
    const base = { spaceId, startMins, duration, sessionType, athletes: effectiveAthletes, coach, bookingType, memberTier: memberTier || undefined }
    if (editSeriesFuture) {
      onSaveFrom(src!.date, src!.seriesId!, base)
    } else if (repeat === 'none' || !repeatUntil) {
      onSave([{ ...base, date, id: src?.id, seriesId: src?.seriesId }])
    } else {
      const newSeriesId = uid()
      const dates = occurrenceDates(date, repeat, repeatUntil)
      onSave(dates.map(d => ({ ...base, date: d, seriesId: newSeriesId })))
    }
  }

  function handleSeriesConfirm() {
    if (!src || !seriesPrompt) return
    if (seriesPrompt === 'delete') {
      if (seriesScope === 'single') onDelete(src.id)
      else onDeleteFrom(src.seriesId!, src.date)
    } else {
      setSeriesPrompt(null)
      setSeriesScope('single')
      if (seriesScope === 'single') onEdit(src)
      else onEditSeries(src)
    }
  }

  const space = SPACES.find(s => s.id === spaceId)!

  const INPUT = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400 text-center'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="booking-modal relative w-full max-w-[717px] overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 64px)', fontFamily: "'Google Sans Flex', sans-serif" }}>
        {/* Header — blue panel for add/edit, white for view */}
        {isView ? (
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 pb-4 pt-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Session Details</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {parse(src!.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                {src!.date === today ? ' · Today' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => src!.seriesId ? setSeriesPrompt('edit') : onEdit(src!)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                <IconEdit size={14} /> Edit
              </button>
              <button
                onClick={() => src!.seriesId ? setSeriesPrompt('delete') : onDelete(src!.id)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <IconTrash size={14} /> Delete
              </button>
              <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
                <IconX size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4" ref={headerRef}>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {editSeriesFuture ? 'Edit Recurring Booking' : 'New Booking'}
              </h2>
              {editSeriesFuture && (
                <p className="mt-0.5 text-xs text-gray-400">
                  Changes apply from {parse(src!.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} onwards
                </p>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
              <IconX size={18} />
            </button>
          </div>
        )}

        <div className="px-6 py-5">
          {/* ── View mode ── */}
          {isView ? (
            seriesPrompt ? (
              /* ── Series scope prompt ── */
              <div className="space-y-5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-bold text-gray-800">
                    {seriesPrompt === 'edit' ? 'Edit recurring booking' : 'Cancel recurring booking'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {parse(src!.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {(['single', 'future'] as const).map(scope => (
                    <label key={scope}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50">
                      <input type="radio" name="seriesScope" value={scope}
                        checked={seriesScope === scope}
                        onChange={() => setSeriesScope(scope)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#6BA3D6]" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {scope === 'single' ? 'This booking only' : 'This and all future bookings'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {scope === 'single'
                            ? 'Only this occurrence is affected'
                            : 'All occurrences from this date forward are affected'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSeriesPrompt(null); setSeriesScope('single') }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                    Back
                  </button>
                  <button
                    onClick={handleSeriesConfirm}
                    className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: seriesPrompt === 'delete' ? '#ef4444' : '#6BA3D6' }}>
                    {seriesPrompt === 'edit' ? 'Continue' : 'Cancel Booking'}
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl p-3.5" style={{ backgroundColor: space.light }}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: space.color }} />
                <div>
                  <p className="text-sm font-bold leading-snug" style={{ color: space.color }}>{src!.sessionType}</p>
                  <p className="text-xs text-gray-500">{space.label}</p>
                </div>
                {src!.seriesId && (
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold" style={{ color: space.color }}>
                    <IconRepeat size={11} />
                    Repeating
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Time</p>
                  <p className="font-semibold text-gray-800">{fmtTime(src!.startMins)}–{fmtTime(finishMins)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="font-semibold text-gray-800">{fmtDur(src!.duration)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Coach</p>
                  <p className="font-semibold text-gray-800">
                    {src!.coach === 'matt' ? 'Matt' : src!.coach === 'jade' ? 'Jade' : src!.coach === 'other' ? 'Other' : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Athletes</p>
                  <p className="font-semibold text-gray-800">
                    {src!.athletes.length ? src!.athletes.join(', ') : '—'}
                  </p>
                </div>
              </div>
            </div>
            )
          ) : (
            /* ── Add / Edit form ── */
            <div className="space-y-4">
              {editSeriesFuture && (
                <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <IconInfoCircle size={16} className="shrink-0" />
                  Editing all bookings in this series from {parse(src!.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} onwards.
                </div>
              )}
              {/* Booking type toggle */}
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                {(['member', 'casual', 'unavailable'] as const).map((type, i) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setBookingType(type)
                      if (type === 'member' && sessionType === 'Team Training') setSessionType('')
                      if (type === 'unavailable') setSessionType('Unavailable')
                    }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition ${i === 0 ? '' : 'border-l border-gray-200'}`}
                    style={bookingType === type
                      ? { backgroundColor: accentColor, color: 'white' }
                      : { backgroundColor: 'white', color: '#6b7280' }}
                  >
                    {type === 'member' ? 'Member Booking' : type === 'casual' ? 'Casual Booking' : 'Unavailable'}
                  </button>
                ))}
              </div>
              {/* Space */}
              <div>
                <label className={LABEL}>Space</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPACES.map(sp => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleSpaceChange(sp.id)}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                        spaceId === sp.id
                          ? 'border-transparent text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={spaceId === sp.id ? { backgroundColor: sp.color } : {}}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: spaceId === sp.id ? 'rgba(255,255,255,0.7)' : sp.color }}
                      />
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {bookingType === 'unavailable' ? (
                <>
                  {/* Unavailable Reason toggle */}
                  <div>
                    <label className={LABEL}>Reason</label>
                    <div className="flex overflow-hidden rounded-xl border border-gray-200">
                      {(['Unavailable', 'Programs'] as const).map((reason, i) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setSessionType(reason)}
                          className={`flex-1 py-2 text-sm font-semibold transition ${i > 0 ? 'border-l border-gray-200' : ''}`}
                          style={sessionType === reason
                            ? { backgroundColor: accentColor, color: 'white' }
                            : { backgroundColor: 'white', color: '#6b7280' }}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unavailable Row 1: Date | Repeat */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Date</label>
                      <DatePicker value={date} onChange={setDate} accentColor={accentColor} />
                    </div>
                    <div>
                      <label className={LABEL}>Repeat</label>
                      <SelectPicker
                        value={repeat}
                        onChange={v => { setRepeat(v as typeof repeat); setRepeatUntil('') }}
                        accentColor={accentColor}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'weekly', label: 'Weekly' },
                          { value: 'fortnightly', label: 'Fortnightly' },
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'yearly', label: 'Yearly' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Unavailable Row 2: Start Time | Finish Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Start time</label>
                      <TimePicker
                        value={startMins}
                        onChange={s => { setStartMins(s); if (finishMins <= s) setFinishMins(s + 60) }}
                        options={Array.from({ length: 95 }, (_, i) => i * 15)}
                        accentColor={accentColor}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Finish time</label>
                      <TimePicker
                        value={finishMins}
                        onChange={setFinishMins}
                        options={Array.from({ length: 95 }, (_, i) => (i + 1) * 15).filter(m => m > startMins)}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>

                  {/* Repeat details for unavailable */}
                  {repeat !== 'none' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Ends on</label>
                        <DatePicker value={repeatUntil} onChange={setRepeatUntil} accentColor={accentColor} />
                      </div>
                      <div>
                        <label className={LABEL}>Sessions</label>
                        <div className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                          {repeatUntil
                            ? `${occurrenceDates(date, repeat, repeatUntil).length} sessions`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Row 1: Session Type | Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Session type</label>
                      <SelectPicker
                        value={sessionType}
                        onChange={v => {
                          setSessionType(v)
                          if (v === 'Shooting Machine Rental') {
                            setMachineRentalDuration(60)
                            setFinishMins(startMins + 60)
                          }
                        }}
                        accentColor={accentColor}
                        options={sessionTypeOpts}
                        panelMaxHeight={260}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Date</label>
                      <DatePicker value={date} onChange={setDate} accentColor={accentColor} />
                    </div>
                  </div>

                  {/* Row 2: Start Time | Finish Time (or Duration for Shooting Machine Rental) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Start time</label>
                      <TimePicker
                        value={startMins}
                        onChange={s => {
                          setStartMins(s)
                          if (isMachineRental) setFinishMins(s + machineRentalDuration)
                          else if (finishMins <= s) setFinishMins(s + 60)
                        }}
                        options={Array.from({ length: 95 }, (_, i) => i * 15)}
                        accentColor={accentColor}
                      />
                    </div>
                    <div>
                      {isMachineRental ? (
                        <>
                          <label className={LABEL}>Duration</label>
                          <div className="flex gap-2">
                            {([30, 45, 60] as const).map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => { setMachineRentalDuration(d); setFinishMins(startMins + d) }}
                                className={`flex h-10 flex-1 flex-col items-center justify-center rounded-lg border text-[11px] font-bold leading-tight transition ${
                                  machineRentalDuration === d
                                    ? 'border-transparent text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                style={machineRentalDuration === d ? { backgroundColor: accentColor } : {}}
                              >
                                <span>{d} min</span>
                                <span>${MACHINE_RENTAL_PRICES[d]}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <label className={LABEL}>Finish time</label>
                          <TimePicker
                            value={finishMins}
                            onChange={setFinishMins}
                            options={Array.from({ length: 95 }, (_, i) => (i + 1) * 15).filter(m => m > startMins)}
                            accentColor={accentColor}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Session-type info boxes */}
                  {sessionType === 'Casual Shooting' && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                      <IconInfoCircle size={15} className="mt-0.5 shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">$10 per athlete · 60 minutes court access</p>
                        <p className="mt-0.5 text-xs text-yellow-700">Includes basketballs and access to all shooting areas. Shooting machine access is <strong>not</strong> included — book a Shooting Machine Rental separately if required.</p>
                      </div>
                    </div>
                  )}
                  {isMachineRental && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <IconInfoCircle size={15} className="mt-0.5 shrink-0 text-[#6BA3D6]" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Booking holder controls the machine for the full booked period</p>
                          <p className="mt-0.5 text-xs text-blue-700">You may use the machine individually or share it with other athletes at your discretion.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <IconAlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-xs text-amber-700">This booking covers shooting machine access only and does <strong>not</strong> include Casual Shooting court access before, during, or after the booking period. Athletes who also wish to participate in Casual Shooting must purchase a separate booking.</p>
                      </div>
                    </div>
                  )}

                  {/* Row 3: Coach | Repeat */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Coach</label>
                      <SelectPicker
                        value={coach}
                        onChange={v => setCoach(v as 'matt' | 'jade' | 'other' | '')}
                        accentColor={accentColor}
                        options={[
                          { value: '', label: 'No Coach Required', muted: true },
                          { value: 'matt', label: 'Matt' },
                          { value: 'jade', label: 'Jade' },
                          { value: 'other', label: 'Other' },
                        ]}
                      />
                    </div>
                    <div>
                      {bookingType === 'member' && !editSeriesFuture && (
                        <>
                          <label className={LABEL}>Repeat</label>
                          <SelectPicker
                            value={repeat}
                            onChange={v => { setRepeat(v as typeof repeat); setRepeatUntil('') }}
                            accentColor={accentColor}
                            options={[
                              { value: 'none', label: 'None' },
                              { value: 'weekly', label: 'Weekly' },
                              { value: 'fortnightly', label: 'Fortnightly' },
                              { value: 'monthly', label: 'Monthly' },
                              { value: 'yearly', label: 'Yearly' },
                            ]}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Repeat details — only shown when repeat is set, not casual, not editing series */}
                  {bookingType !== 'casual' && repeat !== 'none' && !editSeriesFuture && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Ends on</label>
                        <DatePicker value={repeatUntil} onChange={setRepeatUntil} accentColor={accentColor} />
                      </div>
                      <div>
                        <label className={LABEL}>Sessions</label>
                        <div className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                          {repeatUntil
                            ? `${occurrenceDates(date, repeat, repeatUntil).length} sessions`
                            : '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Athletes / Team */}
                  {bookingType === 'casual' && spaceId !== 'meeting' ? (() => {
                    if (sessionType === 'Team Training') {
                      const upd = (patch: Partial<CasualTeamEntry>) => setCasualTeam(prev => ({ ...prev, ...patch }))
                      return (
                        <div className="space-y-3">
                          {/* New Team / Existing Team toggle */}
                          <div className="flex overflow-hidden rounded-xl border border-gray-200">
                            {(['new', 'existing'] as const).map((type, i) => (
                              <button key={type} type="button"
                                onClick={() => upd({ type })}
                                className={`flex-1 py-2 text-sm font-semibold transition ${i > 0 ? 'border-l border-gray-200' : ''}`}
                                style={casualTeam.type === type
                                  ? { backgroundColor: accentColor, color: 'white' }
                                  : { backgroundColor: 'white', color: '#6b7280' }}>
                                {type === 'new' ? 'New Team' : 'Existing Team'}
                              </button>
                            ))}
                          </div>

                          {casualTeam.type === 'new' && (
                            <div className="space-y-3">
                              <div>
                                <label className={LABEL}>Team Name</label>
                                <input type="text" value={casualTeam.teamName}
                                  onChange={e => upd({ teamName: e.target.value })}
                                  placeholder="e.g. Red Hill Jump Jets"
                                  className={INPUT} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={LABEL}>Association</label>
                                  <SelectPicker value={casualTeam.association}
                                    onChange={v => upd({ association: v })}
                                    accentColor={accentColor}
                                    options={[
                                      { value: '', label: 'Select Association', muted: true },
                                      { value: 'spba',     label: 'Southern Peninsula Basketball Association' },
                                      { value: 'breakers', label: 'Mornington Breakers' },
                                      { value: 'wba',      label: 'Westernport Basketball Association' },
                                      { value: 'blues',    label: 'Frankston Blues' },
                                      { value: 'bobcats',  label: 'Frankston Bobcats' },
                                      { value: 'chelsea',  label: 'Chelsea Basketball' },
                                      { value: 'other',    label: 'Other' },
                                    ]} />
                                </div>
                                <div>
                                  <label className={LABEL}>Age Group</label>
                                  <SelectPicker value={casualTeam.ageGroup}
                                    onChange={v => upd({ ageGroup: v })}
                                    accentColor={accentColor}
                                    options={[
                                      { value: '', label: 'Select Age Group', muted: true },
                                      { value: 'u10',         label: 'Under 10' },
                                      { value: 'u12',         label: 'Under 12' },
                                      { value: 'u14',         label: 'Under 14' },
                                      { value: 'u16',         label: 'Under 16' },
                                      { value: 'u18',         label: 'Under 18' },
                                      { value: 'u20',         label: 'Under 20' },
                                      { value: 'senior_men',  label: 'Senior Men' },
                                      { value: 'senior_women',label: 'Senior Women' },
                                      { value: 'open',        label: 'Open' },
                                    ]} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={LABEL}>Number of Players</label>
                                  <input type="number" min="1" max="20" value={casualTeam.numPlayers}
                                    onChange={e => upd({ numPlayers: e.target.value })}
                                    placeholder="e.g. 10" className={INPUT} style={{ textAlign: 'center' }} />
                                </div>
                                <div>
                                  <label className={LABEL}>Head Coach / Contact</label>
                                  <input type="text" value={casualTeam.headCoach}
                                    onChange={e => upd({ headCoach: e.target.value })}
                                    placeholder="Full name" className={INPUT} />
                                </div>
                              </div>
                              <div>
                                <label className={LABEL}>What is the team trying to get out of this session?</label>
                                <textarea value={casualTeam.sessionGoals}
                                  onChange={e => upd({ sessionGoals: e.target.value })}
                                  rows={3}
                                  placeholder="e.g. Pre-season conditioning, offensive plays, defensive rotations..."
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BAD6B] focus:ring-1 focus:ring-[#6BAD6B]/40" />
                              </div>
                            </div>
                          )}

                          {casualTeam.type === 'existing' && (
                            <div className="space-y-3">
                              <div>
                                <label className={LABEL}>Select Team</label>
                                <SelectPicker value={casualTeam.existingTeam}
                                  onChange={v => upd({ existingTeam: v })}
                                  accentColor={accentColor}
                                  centerOnTrigger
                                  options={[
                                    { value: '', label: 'Select Team', muted: true },
                                    ...TEAMS.map(t => ({ value: t, label: t })),
                                  ]} />
                              </div>
                              <div>
                                <label className={LABEL}>What is the team trying to get out of this session?</label>
                                <textarea value={casualTeam.sessionGoals}
                                  onChange={e => upd({ sessionGoals: e.target.value })}
                                  rows={3}
                                  placeholder="e.g. Pre-season conditioning, offensive plays, defensive rotations..."
                                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BAD6B] focus:ring-1 focus:ring-[#6BAD6B]/40" />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }

                    const isMulti = sessionType !== 'Individual Work Out' && sessionType !== 'Shooting Machine Rental'
                    const visibleAthletes = isMulti ? casualAthletes : casualAthletes.slice(0, 1)
                    const upd = (id: string, patch: Partial<CasualAthleteEntry>) =>
                      setCasualAthletes(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
                    const removeAthlete = (id: string) =>
                      setCasualAthletes(prev => prev.filter(a => a.id !== id))
                    const addAthlete = () =>
                      setCasualAthletes(prev => [...prev, newCasualAthlete()])
                    return (
                      <div className="space-y-3">
                        {/* Athlete cards */}
                        {visibleAthletes.map((entry, idx) => (
                          <div key={entry.id} className="rounded-xl border border-gray-200 p-3 space-y-3">
                            {/* Card header */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Athlete {idx + 1}
                              </span>
                              {isMulti && casualAthletes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAthlete(entry.id)}
                                  className="rounded-lg p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
                                >
                                  <IconX size={14} />
                                </button>
                              )}
                            </div>

                            {/* New / Existing toggle */}
                            <div className="flex overflow-hidden rounded-xl border border-gray-200">
                              {(['new', 'existing'] as const).map((type, i) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => upd(entry.id, { type })}
                                  className={`flex-1 py-2 text-sm font-semibold transition ${i > 0 ? 'border-l border-gray-200' : ''}`}
                                  style={entry.type === type
                                    ? { backgroundColor: accentColor, color: 'white' }
                                    : { backgroundColor: 'white', color: '#6b7280' }}
                                >
                                  {type === 'new' ? 'New Athlete' : 'Existing Athlete'}
                                </button>
                              ))}
                            </div>

                            {/* New Athlete: intake form */}
                            {entry.type === 'new' && (
                              <div className="space-y-3">
                                <div>
                                  <label className={LABEL}>Name</label>
                                  <input type="text" value={entry.name}
                                    onChange={e => upd(entry.id, { name: e.target.value })}
                                    placeholder="Full name" className={INPUT} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LABEL}>Gender</label>
                                    <SelectPicker
                                      value={entry.gender}
                                      onChange={v => upd(entry.id, { gender: v })}
                                      accentColor={accentColor}
                                      options={[
                                        { value: '', label: 'Select Gender', muted: true },
                                        { value: 'male', label: 'Male' },
                                        { value: 'female', label: 'Female' },
                                        { value: 'prefer_not', label: 'Prefer not to say' },
                                      ]}
                                    />
                                  </div>
                                  <div>
                                    <label className={LABEL}>Age</label>
                                    <input type="number" min="1" max="120" value={entry.age}
                                      onChange={e => upd(entry.id, { age: e.target.value })}
                                      placeholder="Age" className={INPUT} style={{ textAlign: 'center' }} />
                                  </div>
                                </div>
                                <div>
                                  <label className={LABEL}>Rep Club</label>
                                  <SelectPicker
                                    value={entry.repClub}
                                    onChange={v => upd(entry.id, { repClub: v, repClubOther: v !== 'other' ? '' : entry.repClubOther })}
                                    accentColor={accentColor}
                                    options={[
                                      { value: '', label: 'Select Rep Club', muted: true },
                                      { value: 'spba',    label: 'Southern Peninsula Basketball Association' },
                                      { value: 'breakers',label: 'Mornington Breakers' },
                                      { value: 'wba',     label: 'Westernport Basketball Association' },
                                      { value: 'blues',   label: 'Frankston Blues' },
                                      { value: 'bobcats', label: 'Frankston Bobcats' },
                                      { value: 'chelsea', label: 'Chelsea Basketball' },
                                      { value: 'none',    label: 'Not currently playing rep' },
                                      { value: 'other',   label: 'Other' },
                                    ]}
                                  />
                                </div>
                                {entry.repClub === 'other' && (
                                  <div>
                                    <label className={LABEL}>Club Name</label>
                                    <input type="text" value={entry.repClubOther}
                                      onChange={e => upd(entry.id, { repClubOther: e.target.value })}
                                      placeholder="Enter club name" className={INPUT} />
                                  </div>
                                )}
                                <div>
                                  <label className={LABEL}>Brief Playing History</label>
                                  <textarea value={entry.playingHistory}
                                    onChange={e => upd(entry.id, { playingHistory: e.target.value })}
                                    rows={3}
                                    placeholder="e.g. 3 years domestic, currently in U16s..."
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BAD6B] focus:ring-1 focus:ring-[#6BAD6B]/40"
                                  />
                                </div>
                                <div>
                                  <label className={LABEL}>What is the player trying to get out of this session?</label>
                                  <textarea value={entry.sessionGoals}
                                    onChange={e => upd(entry.id, { sessionGoals: e.target.value })}
                                    rows={3}
                                    placeholder="e.g. Improve ball handling, prepare for trials..."
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BAD6B] focus:ring-1 focus:ring-[#6BAD6B]/40"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Existing Athlete: dropdown */}
                            {entry.type === 'existing' && (
                              <div>
                                <label className={LABEL}>Select Athlete</label>
                                <SelectPicker
                                  value={entry.existingId}
                                  onChange={v => upd(entry.id, { existingId: v })}
                                  accentColor={accentColor}
                                  centerOnTrigger
                                  options={[
                                    { value: '', label: 'Select Athlete', muted: true },
                                    ...[...ATHLETES].sort().map(a => ({ value: a, label: a })),
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add Athlete button — multi-athlete sessions, max 6 */}
                        {isMulti && casualAthletes.length < 6 && (
                          <button
                            type="button"
                            onClick={addAthlete}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-gray-400 hover:text-gray-500"
                          >
                            <IconPlus size={15} />
                            Add Athlete
                          </button>
                        )}

                      </div>
                    )
                  })() : bookingType === 'member' && (['Volume Shooting', 'Casual Shooting', 'Small Group Session', ...ALL_PROGRAM_NAMES] as string[]).includes(sessionType) ? (() => {
                    const addMemberCasual    = () => setMemberCasuals(prev => [...prev, newCasualAthlete()])
                    const removeMemberCasual = (id: string) => setMemberCasuals(prev => prev.filter(a => a.id !== id))
                    const updMemberCasual    = (id: string, patch: Partial<CasualAthleteEntry>) =>
                      setMemberCasuals(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
                    return (
                      <div className="space-y-3">
                        {/* Tier selector — only for Casual Shooting */}
                        {sessionType === 'Casual Shooting' && (
                          <div>
                            <label className={LABEL}>Member Tier</label>
                            <div className="grid grid-cols-4 gap-2">
                              {(['bronze', 'silver', 'gold', 'platinum'] as MemberTier[]).map(tier => (
                                <button
                                  key={tier}
                                  type="button"
                                  onClick={() => setMemberTier(prev => prev === tier ? '' : tier)}
                                  className={`rounded-lg border px-3 py-2 text-center text-xs font-bold uppercase tracking-wide transition ${
                                    memberTier === tier ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                  style={memberTier === tier ? { backgroundColor: TIER_COLORS[tier] } : {}}
                                >
                                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Athlete multi-select — left column */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={LABEL}>Athlete</label>
                            <SelectPicker
                              value=""
                              onChange={() => {}}
                              multiValues={athletes}
                              onChangeMulti={setAthletes}
                              maxSelect={Math.max(1, 6 - memberCasuals.length)}
                              accentColor={accentColor}
                              centerOnTrigger
                              options={[
                                { value: '', label: 'Select Athlete', muted: true },
                                ...[...ATHLETES].sort().map(a => ({ value: a, label: a })),
                              ]}
                            />
                          </div>
                        </div>

                        {/* Casual member cards */}
                        {memberCasuals.map((entry, idx) => (
                          <div key={entry.id} className="rounded-xl border border-gray-200 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Casual Member {idx + 1}
                              </span>
                              <button type="button" onClick={() => removeMemberCasual(entry.id)}
                                className="rounded-lg p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400">
                                <IconX size={14} />
                              </button>
                            </div>

                            <div className="flex overflow-hidden rounded-xl border border-gray-200">
                              {(['new', 'existing'] as const).map((type, i) => (
                                <button key={type} type="button"
                                  onClick={() => updMemberCasual(entry.id, { type })}
                                  className={`flex-1 py-2 text-sm font-semibold transition ${i > 0 ? 'border-l border-gray-200' : ''}`}
                                  style={entry.type === type
                                    ? { backgroundColor: accentColor, color: 'white' }
                                    : { backgroundColor: 'white', color: '#6b7280' }}>
                                  {type === 'new' ? 'New Athlete' : 'Existing Athlete'}
                                </button>
                              ))}
                            </div>

                            {entry.type === 'new' && (
                              <div className="space-y-3">
                                <div>
                                  <label className={LABEL}>Name</label>
                                  <input type="text" value={entry.name}
                                    onChange={e => updMemberCasual(entry.id, { name: e.target.value })}
                                    placeholder="Full name" className={INPUT} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={LABEL}>Gender</label>
                                    <SelectPicker value={entry.gender}
                                      onChange={v => updMemberCasual(entry.id, { gender: v })}
                                      accentColor={accentColor}
                                      options={[
                                        { value: '', label: 'Select Gender', muted: true },
                                        { value: 'male', label: 'Male' },
                                        { value: 'female', label: 'Female' },
                                        { value: 'prefer_not', label: 'Prefer not to say' },
                                      ]} />
                                  </div>
                                  <div>
                                    <label className={LABEL}>Age</label>
                                    <input type="number" min="1" max="120" value={entry.age}
                                      onChange={e => updMemberCasual(entry.id, { age: e.target.value })}
                                      placeholder="Age" className={INPUT} style={{ textAlign: 'center' }} />
                                  </div>
                                </div>
                                <div>
                                  <label className={LABEL}>Rep Club</label>
                                  <SelectPicker value={entry.repClub}
                                    onChange={v => updMemberCasual(entry.id, { repClub: v, repClubOther: v !== 'other' ? '' : entry.repClubOther })}
                                    accentColor={accentColor}
                                    options={[
                                      { value: '', label: 'Select Rep Club', muted: true },
                                      { value: 'spba',     label: 'Southern Peninsula Basketball Association' },
                                      { value: 'breakers', label: 'Mornington Breakers' },
                                      { value: 'wba',      label: 'Westernport Basketball Association' },
                                      { value: 'blues',    label: 'Frankston Blues' },
                                      { value: 'bobcats',  label: 'Frankston Bobcats' },
                                      { value: 'chelsea',  label: 'Chelsea Basketball' },
                                      { value: 'none',     label: 'Not currently playing rep' },
                                      { value: 'other',    label: 'Other' },
                                    ]} />
                                </div>
                                {entry.repClub === 'other' && (
                                  <div>
                                    <label className={LABEL}>Club Name</label>
                                    <input type="text" value={entry.repClubOther}
                                      onChange={e => updMemberCasual(entry.id, { repClubOther: e.target.value })}
                                      placeholder="Enter club name" className={INPUT} />
                                  </div>
                                )}
                                <div>
                                  <label className={LABEL}>Brief Playing History</label>
                                  <textarea value={entry.playingHistory}
                                    onChange={e => updMemberCasual(entry.id, { playingHistory: e.target.value })}
                                    rows={3} placeholder="e.g. 3 years domestic, currently in U16s..."
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40" />
                                </div>
                                <div>
                                  <label className={LABEL}>What is the player trying to get out of this session?</label>
                                  <textarea value={entry.sessionGoals}
                                    onChange={e => updMemberCasual(entry.id, { sessionGoals: e.target.value })}
                                    rows={3} placeholder="e.g. Improve ball handling, prepare for trials..."
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition resize-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40" />
                                </div>
                              </div>
                            )}

                            {entry.type === 'existing' && (
                              <div>
                                <label className={LABEL}>Select Athlete</label>
                                <SelectPicker value={entry.existingId}
                                  onChange={v => updMemberCasual(entry.id, { existingId: v })}
                                  accentColor={accentColor}
                                  centerOnTrigger
                                  options={[
                                    { value: '', label: 'Select Athlete', muted: true },
                                    ...[...ATHLETES].sort().map(a => ({ value: a, label: a })),
                                  ]} />
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add Casual Member button — only when total < 6 */}
                        {athletes.length + memberCasuals.length < 6 && (
                          <button type="button" onClick={addMemberCasual}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-semibold text-gray-400 transition hover:border-gray-400 hover:text-gray-500">
                            <IconPlus size={15} />
                            Add Casual Member
                          </button>
                        )}
                      </div>
                    )
                  })() : sessionType === 'Individual Work Out' ? (
                    /* ── Member Individual Work Out: single athlete dropdown ── */
                    <div>
                      <label className={LABEL}>Athlete</label>
                      <SelectPicker
                        value={singleAthlete}
                        onChange={v => { setSingleAthlete(v); if (v !== 'other') setCustomAthlete('') }}
                        accentColor={accentColor}
                        centerOnTrigger
                        options={[
                          { value: '', label: 'Select Athlete', muted: true },
                          ...[...ATHLETES].sort().map(a => ({ value: a, label: a })),
                          { value: 'other', label: 'Other' },
                        ]}
                      />
                      {singleAthlete === 'other' && (
                        <input
                          type="text"
                          value={customAthlete}
                          onChange={e => setCustomAthlete(e.target.value)}
                          placeholder="Enter athlete name"
                          className={`mt-2 ${INPUT}`}
                          style={{ textAlign: 'center' }}
                        />
                      )}
                    </div>
                  ) : null}
                </>
              )}

              {/* Actions */}
              {bookingType === 'casual' ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: accentColor }}
                    >
                      {(modal.kind === 'edit' || editSeriesFuture) ? 'Save Changes' : 'Create Booking'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Refresh Booking
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {sessionType === 'Casual Shooting'
                        ? `$${(casualAthletes.length * 10).toFixed(2)}`
                        : sessionType === 'Shooting Machine Rental'
                        ? `$${(MACHINE_RENTAL_PRICES[machineRentalDuration] ?? 50).toFixed(2)}`
                        : '$0.00'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Refresh Booking
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
                  >
                    {(modal.kind === 'edit' || editSeriesFuture) ? 'Save Changes' : bookingType === 'unavailable' ? 'Mark Unavailability' : 'Create Booking'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
