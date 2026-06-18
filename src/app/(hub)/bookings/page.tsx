'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconTrash,
  IconEdit,
  IconPlus,
  IconCheck,
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
  { id: 'secondary', label: 'Secondary Station', color: '#3B6D11', light: '#eaf3de' },
  { id: 'shooting',  label: 'Shooting Bay',      color: '#854F0B', light: '#faeeda' },
  { id: 'meeting',   label: 'Meeting Room',      color: '#534AB7', light: '#EEEDFE' },
] as const

type SpaceId = typeof SPACES[number]['id']

// ── Session types per space ────────────────────────────────────────────────────
const SESSION_TYPES: Record<SpaceId, string[]> = {
  primary:   ['Individual Work Out', 'Small Group Session', 'Program', 'Team Training', 'Casual Shooting'],
  secondary: ['Individual Work Out', 'Small Group Session', 'Program', 'Team Training', 'Casual Shooting'],
  shooting:  ['Volume Shooting'],
  meeting:   ['Coach Meeting', 'Film Review', 'Goal Setting', 'Meeting (General)', 'Parent Meeting', 'Player Meeting', 'Team Meeting'],
}

const ATHLETES = [
  'Liam Carter', 'Jordan Williams', 'Aisha Thompson', 'Marcus Davies',
  'Devon Knox', 'Kai Okafor', 'Tyler Ross', 'Priya Mehta', 'Sam Liu', 'Zara Obi',
]

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
}

type Modal =
  | null
  | { kind: 'add';  spaceId: SpaceId | null; startMins: number; date: string }
  | { kind: 'view'; booking: Booking }
  | { kind: 'edit'; booking: Booking }

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
    { id:'b1',  date:today, spaceId:'primary',   startMins:7*60,     duration:60,  sessionType:'Individual Work Out', athletes:['Liam Carter'],                                              coach:'matt' },
    { id:'b2',  date:today, spaceId:'primary',   startMins:8*60+30,  duration:90,  sessionType:'Small Group Session', athletes:['Jordan Williams','Aisha Thompson','Devon Knox'],             coach:'matt' },
    { id:'b3',  date:today, spaceId:'secondary', startMins:9*60,     duration:120, sessionType:'Team Training',       athletes:['Liam Carter','Jordan Williams','Marcus Davies','Priya Mehta','Tyler Ross'], coach:'jade' },
    { id:'b4',  date:today, spaceId:'primary',   startMins:11*60,    duration:60,  sessionType:'Program',             athletes:['Marcus Davies'],                                             coach:'matt' },
    { id:'b5',  date:today, spaceId:'secondary', startMins:14*60,    duration:90,  sessionType:'Small Group Session', athletes:['Aisha Thompson','Kai Okafor','Sam Liu'],                     coach:'jade' },
    { id:'b6',  date:today, spaceId:'shooting',  startMins:16*60+30, duration:60,  sessionType:'Volume Shooting',     athletes:['Devon Knox'],                                               coach:'matt' },
    { id:'b7',  date:today, spaceId:'meeting',   startMins:17*60,    duration:60,  sessionType:'Coach Meeting',       athletes:[],                                                           coach:'matt' },
    { id:'b8',  date:today, spaceId:'primary',   startMins:18*60,    duration:90,  sessionType:'Team Training',       athletes:['Liam Carter','Jordan Williams','Aisha Thompson','Tyler Ross','Zara Obi'], coach:'matt' },
    { id:'b9',  date:yd,   spaceId:'primary',   startMins:9*60,     duration:60,  sessionType:'Individual Work Out', athletes:['Tyler Ross'],                                               coach:'jade' },
    { id:'b10', date:yd,   spaceId:'meeting',   startMins:15*60,    duration:60,  sessionType:'Film Review',         athletes:['Jordan Williams','Marcus Davies'],                          coach:'matt' },
    { id:'b11', date:d2,   spaceId:'secondary', startMins:10*60,    duration:90,  sessionType:'Program',             athletes:['Priya Mehta','Sam Liu'],                                    coach:'matt' },
    { id:'b12', date:d2,   spaceId:'shooting',  startMins:14*60,    duration:60,  sessionType:'Volume Shooting',     athletes:['Kai Okafor'],                                              coach:'jade' },
    { id:'b13', date:tm,   spaceId:'primary',   startMins:8*60,     duration:90,  sessionType:'Small Group Session', athletes:['Liam Carter','Jordan Williams','Aisha Thompson'],           coach:'matt' },
    { id:'b14', date:tm,   spaceId:'meeting',   startMins:13*60,    duration:60,  sessionType:'Goal Setting',        athletes:['Devon Knox'],                                               coach:'jade' },
    { id:'b15', date:d2f,  spaceId:'secondary', startMins:11*60,    duration:60,  sessionType:'Team Training',       athletes:['Tyler Ross','Priya Mehta','Zara Obi'],                     coach:'matt' },
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

  function handleSave(items: (Omit<Booking, 'id'> & { id?: string })[]) {
    setBookings(prev => {
      let next = [...prev]
      for (const data of items) {
        if (data.id) {
          next = next.map(b => b.id === data.id ? { ...data, id: data.id! } as Booking : b)
        } else {
          next = [...next, { ...data, id: uid() } as Booking]
        }
      }
      return next
    })
    setModal(null)
  }

  function handleDelete(id: string) {
    setBookings(prev => prev.filter(b => b.id !== id))
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
                        style={{ top: hoverMatch.slotY, height: SLOT_PX, backgroundColor: 'rgba(0,0,0,0.05)' }}
                      >
                        <span className="text-[10px] font-semibold leading-none" style={{ color: 'rgba(0,0,0,0.72)' }}>
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
                        style={{ top: hoverMatch.slotY, height: SLOT_PX, backgroundColor: 'rgba(0,0,0,0.05)' }}
                      >
                        <span className="text-[10px] font-semibold leading-none" style={{ color: 'rgba(0,0,0,0.72)' }}>
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
          onEdit={b => setModal({ kind: 'edit', booking: b })}
        />
      )}
    </div>
  )
}

// ── Booking Block ──────────────────────────────────────────────────────────────
function BookingBlock({
  booking, color, light, compact, onClick,
}: {
  booking: Booking
  color: string
  light: string
  compact: boolean
  onClick: () => void
}) {
  const top    = toY(booking.startMins)
  const height = Math.max(SLOT_PX, (booking.duration / 15) * SLOT_PX)
  const coachBadge = booking.coach === 'matt' ? 'M' : booking.coach === 'jade' ? 'J' : booking.coach === 'other' ? 'O' : null

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
      className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border transition-opacity hover:opacity-80"
      style={{ top, height, backgroundColor: light, borderColor: color + '50', borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="relative px-1.5 pt-0.5">
        <p className="truncate text-[11px] font-bold leading-tight" style={{ color }}>
          {compact ? (typeAbbr || booking.sessionType.slice(0, 3)) : booking.sessionType}
        </p>
        {!compact && height >= 40 && athleteStr && (
          <p className="mt-0.5 truncate text-[10px]" style={{ color: color + 'cc' }}>
            {athleteStr}
          </p>
        )}
        {!compact && height >= 24 && coachBadge && (
          <span
            className="absolute right-1 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ backgroundColor: color }}
          >
            {coachBadge}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Booking Modal ──────────────────────────────────────────────────────────────
function BookingModal({
  modal, today, onClose, onSave, onDelete, onEdit,
}: {
  modal: NonNullable<Modal>
  today: string
  onClose: () => void
  onSave: (items: (Omit<Booking, 'id'> & { id?: string })[]) => void
  onDelete: (id: string) => void
  onEdit: (b: Booking) => void
}) {
  const isView = modal.kind === 'view'
  const src    = (modal.kind === 'edit' || modal.kind === 'view') ? modal.booking : null

  const [spaceId,     setSpaceId]     = useState<SpaceId>(modal.kind === 'add' ? (modal.spaceId ?? 'primary') : src!.spaceId)
  const [date,        setDate]        = useState(modal.kind === 'add' ? modal.date : src!.date)
  const [startMins,   setStartMins]   = useState(modal.kind === 'add' ? modal.startMins : src!.startMins)
  const [finishMins,  setFinishMins]  = useState(modal.kind === 'add' ? modal.startMins + 60 : src!.startMins + src!.duration)
  const [sessionType, setSessionType] = useState(modal.kind === 'add' ? SESSION_TYPES[modal.spaceId ?? 'primary'][0] : src!.sessionType)
  const [athletes,    setAthletes]    = useState<string[]>(modal.kind === 'add' ? [] : src!.athletes)
  const [coach,       setCoach]       = useState<'matt' | 'jade' | 'other' | ''>(modal.kind === 'add' ? '' : src!.coach)
  const [repeat,      setRepeat]      = useState<'none' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly'>('none')
  const [repeatUntil, setRepeatUntil] = useState('')

  function handleSpaceChange(id: SpaceId) {
    setSpaceId(id)
    setSessionType(SESSION_TYPES[id][0])
  }

  function toggleAthlete(name: string) {
    setAthletes(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name])
  }

  function handleSave() {
    const duration = Math.max(15, finishMins - startMins)
    const base = { spaceId, startMins, duration, sessionType, athletes, coach }
    if (repeat === 'none' || !repeatUntil) {
      onSave([{ ...base, date, id: src?.id }])
    } else {
      const dates = occurrenceDates(date, repeat, repeatUntil)
      onSave(dates.map(d => ({ ...base, date: d })))
    }
  }

  const space = SPACES.find(s => s.id === spaceId)!

  const INPUT = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-center text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/40'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400 text-center'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="booking-modal relative w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 64px)' }}>
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
                onClick={() => onEdit(src!)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                <IconEdit size={14} /> Edit
              </button>
              <button
                onClick={() => onDelete(src!.id)}
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
          <div className="sticky top-0 z-10 relative" style={{ backgroundColor: '#6BA3D6' }}>
            <img src="/New Booking Header.com.svg" alt="" className="block w-full" />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 transition hover:bg-white/20"
            >
              <IconX size={18} />
            </button>
          </div>
        )}

        <div className="px-6 py-5">
          {/* ── View mode ── */}
          {isView ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl p-3.5" style={{ backgroundColor: space.light }}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: space.color }} />
                <div>
                  <p className="text-sm font-bold leading-snug" style={{ color: space.color }}>{src!.sessionType}</p>
                  <p className="text-xs text-gray-500">{space.label}</p>
                </div>
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
          ) : (
            /* ── Add / Edit form ── */
            <div className="space-y-4">
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

              {/* Row 1: Session Type | Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Session type</label>
                  <select value={sessionType} onChange={e => setSessionType(e.target.value)} className={INPUT} style={{ textAlign: 'center', textAlignLast: 'center' }}>
                    {SESSION_TYPES[spaceId].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} style={{ textAlign: 'center' }} />
                </div>
              </div>

              {/* Row 2: Start Time | Finish Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Start time</label>
                  <select
                    value={startMins}
                    onChange={e => {
                      const s = Number(e.target.value)
                      setStartMins(s)
                      if (finishMins <= s) setFinishMins(s + 60)
                    }}
                    className={INPUT}
                    style={{ textAlign: 'center', textAlignLast: 'center' }}
                  >
                    {Array.from({ length: (END_H - START_H) * 4 }, (_, i) => {
                      const m = START_H * 60 + i * 15
                      return <option key={m} value={m}>{fmtTime(m)}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Finish time</label>
                  <select
                    value={finishMins}
                    onChange={e => setFinishMins(Number(e.target.value))}
                    className={INPUT}
                    style={{ textAlign: 'center', textAlignLast: 'center' }}
                  >
                    {Array.from({ length: (END_H - START_H) * 4 }, (_, i) => {
                      const m = START_H * 60 + (i + 1) * 15
                      return m > startMins && m <= END_H * 60
                        ? <option key={m} value={m}>{fmtTime(m)}</option>
                        : null
                    })}
                  </select>
                </div>
              </div>

              {/* Row 3: Coach | Repeat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Coach</label>
                  <select value={coach} onChange={e => setCoach(e.target.value as 'matt' | 'jade' | 'other' | '')} className={INPUT} style={{ textAlign: 'center', textAlignLast: 'center' }}>
                    <option value="">—</option>
                    <option value="matt">Matt</option>
                    <option value="jade">Jade</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Repeat</label>
                  <select value={repeat} onChange={e => { setRepeat(e.target.value as typeof repeat); setRepeatUntil('') }} className={INPUT} style={{ textAlign: 'center', textAlignLast: 'center' }}>
                    <option value="none">None</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Repeat details — only shown when repeat is set */}
              {repeat !== 'none' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Ends on</label>
                    <input
                      type="date"
                      value={repeatUntil}
                      min={date}
                      onChange={e => setRepeatUntil(e.target.value)}
                      className={INPUT}
                      style={{ textAlign: 'center' }}
                    />
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

              {/* Athletes */}
              <div>
                <label className={LABEL}>
                  Athletes
                  {athletes.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-[#6BA3D6] px-1.5 py-0.5 text-[10px] text-white">
                      {athletes.length}
                    </span>
                  )}
                </label>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                  {ATHLETES.map(a => {
                    const sel = athletes.includes(a)
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAthlete(a)}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          sel ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={sel ? { backgroundColor: '#6BA3D6' } : {}}
                      >
                        {sel && <IconCheck size={10} />}
                        {a}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
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
                  onClick={handleSave}
                  className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#6BA3D6' }}
                >
                  {modal.kind === 'edit' ? 'Save Changes' : 'Create Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
