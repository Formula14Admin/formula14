'use client'

import { useState, useMemo } from 'react'
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
  IconCalendarTime,
  IconChevronDown,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type CoachId = 'matt' | 'jade'
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface TimeWindow {
  id: string
  startMins: number
  endMins: number
}

interface DaySchedule {
  available: boolean
  windows: TimeWindow[]
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

interface GeneratedSlot {
  id: string
  coachId: CoachId
  date: string
  startMins: number
  endMins: number
  sessionType: string
  spaceId: string
  confirmed: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT_MATT = '#6BA3D6'
const ACCENT_JADE = '#6BAD6B'
const ACCENT = ACCENT_MATT

const DAYS_LABEL: Record<DayOfWeek, string> = {
  0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun',
}

const DAYS_FULL: Record<DayOfWeek, string> = {
  0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday',
  4: 'Friday', 5: 'Saturday', 6: 'Sunday',
}

// Time options every 30 min from 6am (360) to 10pm (1320)
const TIME_OPTIONS: { label: string; mins: number }[] = []
for (let m = 360; m <= 1320; m += 30) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  TIME_OPTIONS.push({ label: `${h12}:${min.toString().padStart(2, '0')}${ampm}`, mins: m })
}

// Calendar hours 6am–10pm
const CAL_START = 360
const CAL_END = 1320
const CAL_TOTAL = CAL_END - CAL_START
const CAL_HEIGHT = 480 // px

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INIT_SCHEDULES: Record<CoachId, CoachSchedule> = {
  matt: {
    coachId: 'matt',
    days: {
      // Mon: 6am–9am then 4pm–10pm (two windows)
      0: { available: true,  windows: [{ id: 'm0a', startMins: 360, endMins: 540 }, { id: 'm0b', startMins: 960, endMins: 1320 }] },
      1: { available: true,  windows: [{ id: 'm1a', startMins: 900, endMins: 1200 }] },
      2: { available: true,  windows: [{ id: 'm2a', startMins: 540, endMins: 780  }] },
      3: { available: true,  windows: [{ id: 'm3a', startMins: 900, endMins: 1200 }] },
      4: { available: true,  windows: [{ id: 'm4a', startMins: 540, endMins: 780  }] },
      5: { available: true,  windows: [{ id: 'm5a', startMins: 480, endMins: 720  }] },
      6: { available: false, windows: [{ id: 'm6a', startMins: 540, endMins: 780  }] },
    },
  },
  jade: {
    coachId: 'jade',
    days: {
      0: { available: false, windows: [{ id: 'j0a', startMins: 600, endMins: 840  }] },
      1: { available: true,  windows: [{ id: 'j1a', startMins: 600, endMins: 840  }] },
      2: { available: true,  windows: [{ id: 'j2a', startMins: 960, endMins: 1200 }] },
      3: { available: true,  windows: [{ id: 'j3a', startMins: 600, endMins: 840  }] },
      4: { available: true,  windows: [{ id: 'j4a', startMins: 960, endMins: 1200 }] },
      5: { available: true,  windows: [{ id: 'j5a', startMins: 540, endMins: 780  }] },
      6: { available: false, windows: [{ id: 'j6a', startMins: 600, endMins: 840  }] },
    },
  },
}

const INIT_OVERRIDES: DateOverride[] = [
  { id: 'ov1', coachId: 'matt', date: '2026-06-23', type: 'block', note: 'Public holiday — unavailable' },
  { id: 'ov2', coachId: 'jade', date: '2026-06-25', type: 'extra', startMins: 780, endMins: 1020, note: 'Extra availability — filling in for Matt' },
]

// Demo week: Mon 2026-06-22 to Sun 2026-06-28 (the week containing 2026-06-21)
// Actually let's use 2026-06-23 (Mon of following week) per the spec
const WEEK_DATES: string[] = []
for (let i = 0; i < 7; i++) {
  const d = new Date('2026-06-23T00:00:00')
  d.setDate(d.getDate() + i)
  WEEK_DATES.push(d.toISOString().slice(0, 10))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minsToLabel(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// Map JS getDay() (0=Sun) to our DayOfWeek (0=Mon)
function jsDayToOurs(jsDay: number): DayOfWeek {
  return ((jsDay + 6) % 7) as DayOfWeek
}

function getDateDow(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T00:00:00')
  return jsDayToOurs(d.getDay())
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? ACCENT : '#d1d5db' }}
    >
      <span
        className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: on ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
      />
    </button>
  )
}

function TimeSelect({
  value, onChange, minMins,
}: {
  value: number
  onChange: (v: number) => void
  minMins?: number
}) {
  const opts = minMins ? TIME_OPTIONS.filter((o) => o.mins > minMins) : TIME_OPTIONS
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
    >
      {opts.map((o) => (
        <option key={o.mins} value={o.mins}>{o.label}</option>
      ))}
    </select>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AvailabilityPage() {
  const [activeCoach, setActiveCoach] = useState<CoachId>('matt')
  const [schedules, setSchedules] = useState<Record<CoachId, CoachSchedule>>(INIT_SCHEDULES)
  const [overrides, setOverrides] = useState<DateOverride[]>(INIT_OVERRIDES)
  const [slots, setSlots] = useState<GeneratedSlot[]>([])

  // Override form state
  const [ovDate, setOvDate] = useState('')
  const [ovType, setOvType] = useState<'block' | 'extra'>('block')
  const [ovStart, setOvStart] = useState(540)
  const [ovEnd, setOvEnd] = useState(780)
  const [ovNote, setOvNote] = useState('')
  const [ovError, setOvError] = useState('')
  const [editingOvId, setEditingOvId] = useState<string | null>(null)

  const coach = schedules[activeCoach]
  const coachColor = activeCoach === 'matt' ? ACCENT_MATT : ACCENT_JADE
  const coachName = activeCoach === 'matt' ? 'Matt' : 'Jade'

  // ── Schedule updates ──────────────────────────────────────────────────────

  function setDayAvailable(dow: DayOfWeek, available: boolean) {
    setSchedules((prev) => ({
      ...prev,
      [activeCoach]: {
        ...prev[activeCoach],
        days: { ...prev[activeCoach].days, [dow]: { ...prev[activeCoach].days[dow], available } },
      },
    }))
  }

  function addWindow(dow: DayOfWeek) {
    setSchedules((prev) => {
      const day = prev[activeCoach].days[dow]
      const last = day.windows[day.windows.length - 1]
      const start = last ? Math.min(last.endMins, 1290) : 540
      const end   = Math.min(start + 60, 1320)
      const win: TimeWindow = { id: uid(), startMins: start, endMins: end }
      return {
        ...prev,
        [activeCoach]: {
          ...prev[activeCoach],
          days: { ...prev[activeCoach].days, [dow]: { ...day, windows: [...day.windows, win] } },
        },
      }
    })
  }

  function removeWindow(dow: DayOfWeek, winId: string) {
    setSchedules((prev) => {
      const day = prev[activeCoach].days[dow]
      return {
        ...prev,
        [activeCoach]: {
          ...prev[activeCoach],
          days: { ...prev[activeCoach].days, [dow]: { ...day, windows: day.windows.filter((w) => w.id !== winId) } },
        },
      }
    })
  }

  function updateWindow(dow: DayOfWeek, winId: string, patch: Partial<{ startMins: number; endMins: number }>) {
    setSchedules((prev) => {
      const day = prev[activeCoach].days[dow]
      return {
        ...prev,
        [activeCoach]: {
          ...prev[activeCoach],
          days: {
            ...prev[activeCoach].days,
            [dow]: { ...day, windows: day.windows.map((w) => w.id === winId ? { ...w, ...patch } : w) },
          },
        },
      }
    })
  }

  // ── Override CRUD ─────────────────────────────────────────────────────────

  function resetOvForm() {
    setOvDate(''); setOvType('block'); setOvStart(540); setOvEnd(780); setOvNote(''); setOvError(''); setEditingOvId(null)
  }

  function startEditOverride(ov: DateOverride) {
    setEditingOvId(ov.id)
    setOvDate(ov.date)
    setOvType(ov.type)
    setOvStart(ov.startMins ?? 540)
    setOvEnd(ov.endMins ?? 780)
    setOvNote(ov.note)
    setOvError('')
  }

  function addOverride() {
    if (!ovDate) { setOvError('Please select a date.'); return }
    if (ovType === 'extra' && ovEnd <= ovStart) { setOvError('End time must be after start time.'); return }
    if (editingOvId) {
      setOverrides((prev) => prev.map((o) =>
        o.id === editingOvId
          ? { ...o, date: ovDate, type: ovType, note: ovNote.trim(), ...(ovType === 'extra' ? { startMins: ovStart, endMins: ovEnd } : { startMins: undefined, endMins: undefined }) }
          : o
      ))
      resetOvForm()
      return
    }
    const newOv: DateOverride = {
      id: uid(),
      coachId: activeCoach,
      date: ovDate,
      type: ovType,
      ...(ovType === 'extra' ? { startMins: ovStart, endMins: ovEnd } : {}),
      note: ovNote.trim(),
    }
    setOverrides((prev) => [...prev, newOv])
    resetOvForm()
  }

  function deleteOverride(id: string) {
    if (editingOvId === id) resetOvForm()
    setOverrides((prev) => prev.filter((o) => o.id !== id))
  }

  // ── Slot generation ───────────────────────────────────────────────────────

  function generateSlots() {
    const generated: GeneratedSlot[] = []
    const startDate = new Date('2026-06-21T00:00:00')

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const dow = jsDayToOurs(d.getDay())
      const daySchedule = coach.days[dow]

      // Check overrides for this date
      const dateOverrides = overrides.filter((o) => o.coachId === activeCoach && o.date === dateStr)
      const isBlocked = dateOverrides.some((o) => o.type === 'block')
      const extraOvs = dateOverrides.filter((o) => o.type === 'extra')

      // Collect time windows
      const windows: { start: number; end: number }[] = []
      if (!isBlocked && daySchedule.available) {
        for (const win of daySchedule.windows) {
          windows.push({ start: win.startMins, end: win.endMins })
        }
      }
      for (const ex of extraOvs) {
        if (ex.startMins !== undefined && ex.endMins !== undefined) {
          windows.push({ start: ex.startMins, end: ex.endMins })
        }
      }

      for (const win of windows) {
        let cur = win.start
        let count = 0
        while (cur + 60 <= win.end && count < 4) {
          generated.push({
            id: uid(),
            coachId: activeCoach,
            date: dateStr,
            startMins: cur,
            endMins: cur + 60,
            sessionType: 'Individual Work Out',
            spaceId: 'Primary Station',
            confirmed: false,
          })
          cur += 60
          count++
        }
      }
    }

    // Keep to max 15 slots
    setSlots((prev) => {
      const filtered = prev.filter((s) => s.coachId !== activeCoach)
      return [...filtered, ...generated].slice(0, filtered.length + Math.min(generated.length, 15))
    })
  }

  function toggleSlotConfirm(id: string) {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, confirmed: !s.confirmed } : s))
  }

  function deleteSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id))
  }

  function confirmAll() {
    setSlots((prev) => prev.map((s) => s.coachId === activeCoach ? { ...s, confirmed: true } : s))
  }

  // ── Computed for visual calendar ──────────────────────────────────────────

  const calendarRows = useMemo(() => {
    return WEEK_DATES.map((dateStr) => {
      const dow = getDateDow(dateStr)
      const blocks: { coach: CoachId; topPct: number; heightPct: number; color: string; label: string }[] = []

      for (const [cid, sched] of Object.entries(schedules) as [CoachId, CoachSchedule][]) {
        const color = cid === 'matt' ? ACCENT_MATT : ACCENT_JADE
        const dateOvs = overrides.filter((o) => o.coachId === cid && o.date === dateStr)
        const isBlocked = dateOvs.some((o) => o.type === 'block')
        const extraOvs = dateOvs.filter((o) => o.type === 'extra')

        if (isBlocked) {
          blocks.push({ coach: cid, topPct: 0, heightPct: 100, color: '#ef4444', label: 'Blocked' })
        } else if (sched.days[dow].available) {
          for (const win of sched.days[dow].windows) {
            const topPct    = ((win.startMins - CAL_START) / CAL_TOTAL) * 100
            const heightPct = ((win.endMins - win.startMins) / CAL_TOTAL) * 100
            blocks.push({ coach: cid, topPct, heightPct, color, label: `${minsToLabel(win.startMins)}–${minsToLabel(win.endMins)}` })
          }
        }

        for (const ex of extraOvs) {
          if (ex.startMins !== undefined && ex.endMins !== undefined) {
            const topPct = ((ex.startMins - CAL_START) / CAL_TOTAL) * 100
            const heightPct = ((ex.endMins - ex.startMins) / CAL_TOTAL) * 100
            blocks.push({ coach: cid, topPct, heightPct, color, label: `Extra ${minsToLabel(ex.startMins)}–${minsToLabel(ex.endMins)}` })
          }
        }
      }

      return { dateStr, dow, blocks }
    })
  }, [schedules, overrides])

  const coachOverrides = overrides.filter((o) => o.coachId === activeCoach)
  const coachSlots = slots.filter((s) => s.coachId === activeCoach)

  const LABEL_CLS = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
  const INPUT_CLS = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <IconCalendarTime size={22} style={{ color: ACCENT }} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Coach Availability</h1>
            <p className="text-sm text-gray-500">Manage recurring schedules, date overrides, and generate bookable slots</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] space-y-6 p-6">

        {/* ── Coach tab bar ─────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
          {(['matt', 'jade'] as CoachId[]).map((c) => {
            const color = c === 'matt' ? ACCENT_MATT : ACCENT_JADE
            const name = c === 'matt' ? 'Matt' : 'Jade'
            const active = activeCoach === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setActiveCoach(c); resetOvForm() }}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold transition"
                style={
                  active
                    ? { backgroundColor: color, color: 'white' }
                    : { color: '#6b7280' }
                }
              >
                {name}
              </button>
            )
          })}
        </div>

        {/* ── Section 1: Weekly Recurring Schedule ──────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Weekly Recurring Schedule — {coachName}</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(Object.keys(DAYS_LABEL) as unknown as DayOfWeek[]).map((dow) => {
              const day = coach.days[dow]
              return (
                <div
                  key={dow}
                  className="flex w-44 shrink-0 flex-col items-center gap-2 rounded-xl border p-3"
                  style={{
                    borderColor: day.available ? coachColor + '40' : '#e5e7eb',
                    backgroundColor: day.available ? coachColor + '08' : '#fafafa',
                  }}
                >
                  <span className="text-xs font-bold text-gray-600">{DAYS_FULL[dow].slice(0, 3)}</span>
                  <Toggle on={day.available} onChange={(v) => setDayAvailable(dow, v)} />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: day.available ? coachColor : '#9ca3af' }}
                  >
                    {day.available ? 'Available' : 'Off'}
                  </span>
                  {day.available && (
                    <div className="flex flex-col gap-2 w-full">
                      {day.windows.map((win, wi) => (
                        <div key={win.id} className="w-full">
                          {wi > 0 && (
                            <div className="mb-1 text-center text-[9px] font-bold uppercase tracking-wide text-gray-400">+ also</div>
                          )}
                          <div className="flex items-start gap-0.5">
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <select
                                value={win.startMins}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  updateWindow(dow, win.id, { startMins: v, ...(win.endMins <= v ? { endMins: Math.min(v + 30, 1320) } : {}) })
                                }}
                                className="w-full rounded-md border border-gray-200 px-1 py-1 text-[11px] text-gray-700 outline-none focus:border-[#6BA3D6]"
                              >
                                {TIME_OPTIONS.filter((o) => o.mins < 1320).map((o) => (
                                  <option key={o.mins} value={o.mins}>{o.label}</option>
                                ))}
                              </select>
                              <select
                                value={win.endMins}
                                onChange={(e) => updateWindow(dow, win.id, { endMins: Number(e.target.value) })}
                                className="w-full rounded-md border border-gray-200 px-1 py-1 text-[11px] text-gray-700 outline-none focus:border-[#6BA3D6]"
                              >
                                {TIME_OPTIONS.filter((o) => o.mins > win.startMins).map((o) => (
                                  <option key={o.mins} value={o.mins}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            {day.windows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeWindow(dow, win.id)}
                                className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
                              >
                                <IconX size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addWindow(dow)}
                        className="flex items-center justify-center gap-1 w-full rounded-md border border-dashed border-gray-300 py-1 text-[10px] font-semibold text-gray-400 transition hover:border-gray-400 hover:text-gray-500"
                      >
                        <IconPlus size={10} /> Add
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Section 2: Date Overrides ─────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Date Overrides — {coachName}</h2>

          {/* Existing overrides */}
          {coachOverrides.length === 0 ? (
            <p className="mb-4 text-sm text-gray-400 italic">No overrides for {coachName}.</p>
          ) : (
            <div className="mb-4 space-y-2">
              {coachOverrides.map((ov) => (
                <div
                  key={ov.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={
                    editingOvId === ov.id
                      ? { backgroundColor: '#eff6ff', borderColor: '#3b82f6', boxShadow: '0 0 0 2px #3b82f620' }
                      : ov.type === 'block'
                      ? { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }
                      : { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }
                  }
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={
                          ov.type === 'block'
                            ? { backgroundColor: '#fee2e2', color: '#b91c1c' }
                            : { backgroundColor: '#dbeafe', color: '#1d4ed8' }
                        }
                      >
                        {ov.type === 'block' ? 'Block' : 'Extra'}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{dateLabel(ov.date)}</span>
                      {ov.type === 'extra' && ov.startMins !== undefined && ov.endMins !== undefined && (
                        <span className="text-sm text-gray-500">
                          {minsToLabel(ov.startMins)} – {minsToLabel(ov.endMins)}
                        </span>
                      )}
                    </div>
                    {ov.note && <p className="mt-0.5 text-xs text-gray-500">{ov.note}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => editingOvId === ov.id ? resetOvForm() : startEditOverride(ov)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-500"
                    >
                      {editingOvId === ov.id ? <IconX size={15} /> : <IconPencil size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOverride(ov.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add override form */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{editingOvId ? 'Edit Override' : 'Add Override'}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className={LABEL_CLS}>Date</label>
                <input
                  type="date"
                  value={ovDate}
                  onChange={(e) => setOvDate(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Type</label>
                <select
                  value={ovType}
                  onChange={(e) => setOvType(e.target.value as 'block' | 'extra')}
                  className={INPUT_CLS}
                >
                  <option value="block">Block (unavailable)</option>
                  <option value="extra">Add extra hours</option>
                </select>
              </div>
              {ovType === 'extra' && (
                <>
                  <div>
                    <label className={LABEL_CLS}>Start</label>
                    <TimeSelect value={ovStart} onChange={setOvStart} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>End</label>
                    <TimeSelect value={ovEnd} onChange={setOvEnd} minMins={ovStart} />
                  </div>
                </>
              )}
            </div>
            <div className="mt-3">
              <label className={LABEL_CLS}>Note (optional)</label>
              <input
                type="text"
                value={ovNote}
                onChange={(e) => setOvNote(e.target.value)}
                placeholder="Reason for override…"
                className={INPUT_CLS}
              />
            </div>
            {ovError && <p className="mt-2 text-xs text-red-500">{ovError}</p>}
            <div className="mt-3 flex justify-end gap-2">
              {editingOvId && (
                <button
                  type="button"
                  onClick={resetOvForm}
                  className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <IconX size={15} />
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={addOverride}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: coachColor }}
              >
                {editingOvId ? <IconCheck size={15} /> : <IconPlus size={15} />}
                {editingOvId ? 'Save Changes' : 'Add Override'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 3: Visual Weekly Calendar ────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Visual Weekly Calendar</h2>
          <p className="text-xs text-gray-400 mb-4">Week of Mon 23 Jun – Sun 29 Jun 2026 · Blue = Matt · Green = Jade · Red = Blocked</p>

          <div className="flex gap-0 overflow-x-auto">
            {/* Time axis */}
            <div className="shrink-0 w-12 relative" style={{ height: CAL_HEIGHT + 24 }}>
              <div className="absolute bottom-0 left-0 right-0" style={{ height: CAL_HEIGHT }}>
                {[6, 8, 10, 12, 14, 16, 18, 20].map((h) => {
                  const mins = h * 60
                  const pct = ((mins - CAL_START) / CAL_TOTAL) * 100
                  return (
                    <div
                      key={h}
                      className="absolute right-1 text-[9px] text-gray-400 leading-none"
                      style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
                    >
                      {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Day columns */}
            {calendarRows.map(({ dateStr, dow, blocks }) => {
              const d = new Date(dateStr + 'T00:00:00')
              const dayName = DAYS_LABEL[dow]
              const dayNum = d.getDate()
              return (
                <div key={dateStr} className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="mb-1 text-center">
                    <div className="text-[10px] font-bold text-gray-500">{dayName}</div>
                    <div className="text-xs font-bold text-gray-800">{dayNum}</div>
                  </div>
                  {/* Grid */}
                  <div
                    className="relative mx-0.5 rounded-lg overflow-hidden"
                    style={{ height: CAL_HEIGHT, backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}
                  >
                    {/* Hour lines */}
                    {[6, 8, 10, 12, 14, 16, 18, 20].map((h) => {
                      const mins = h * 60
                      const pct = ((mins - CAL_START) / CAL_TOTAL) * 100
                      return (
                        <div
                          key={h}
                          className="absolute left-0 right-0"
                          style={{ top: `${pct}%`, borderTop: '1px solid #e5e7eb' }}
                        />
                      )
                    })}

                    {/* Availability blocks */}
                    {blocks.map((b, bi) => {
                      const isBlocked = b.label === 'Blocked'
                      const coachOffset = b.coach === 'matt' ? 0 : 50
                      return (
                        <div
                          key={bi}
                          className="absolute rounded-sm overflow-hidden"
                          style={{
                            top: isBlocked ? 0 : `${b.topPct}%`,
                            height: isBlocked ? '100%' : `${b.heightPct}%`,
                            left: `${coachOffset}%`,
                            width: '48%',
                            backgroundColor: isBlocked ? '#fee2e2' : b.color + '40',
                            borderLeft: `2px solid ${isBlocked ? '#ef4444' : b.color}`,
                          }}
                        >
                          <span className="block p-0.5 text-[8px] font-semibold leading-tight" style={{ color: isBlocked ? '#b91c1c' : b.color }}>
                            {isBlocked ? 'Off' : b.label.split('–')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ACCENT_MATT + '60', borderLeft: `2px solid ${ACCENT_MATT}` }} />
              <span className="text-xs text-gray-500">Matt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ACCENT_JADE + '60', borderLeft: `2px solid ${ACCENT_JADE}` }} />
              <span className="text-xs text-gray-500">Jade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#fee2e2', borderLeft: '2px solid #ef4444' }} />
              <span className="text-xs text-gray-500">Blocked</span>
            </div>
          </div>
        </div>

        {/* ── Section 4: Generate Slots ─────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Generate Slots — {coachName}</h2>
            <div className="flex items-center gap-2">
              {coachSlots.some((s) => !s.confirmed) && (
                <button
                  type="button"
                  onClick={confirmAll}
                  className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                >
                  <IconCheck size={13} /> Confirm All
                </button>
              )}
              <button
                type="button"
                onClick={generateSlots}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: coachColor }}
              >
                <IconCalendarTime size={15} />
                Generate Slots — Next 7 Days
              </button>
            </div>
          </div>

          {coachSlots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
              <IconCalendarTime size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Click "Generate Slots" to create bookable time slots from {coachName}'s schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {coachSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-xl p-3 transition"
                  style={{
                    border: slot.confirmed
                      ? '1.5px solid #86efac'
                      : '1.5px dashed #d1d5db',
                    backgroundColor: slot.confirmed ? '#f0fdf4' : '#fafafa',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-800">{dateLabel(slot.date)}</span>
                      {slot.confirmed && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                          <IconCheck size={8} strokeWidth={3} /> Confirmed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {minsToLabel(slot.startMins)} – {minsToLabel(slot.endMins)}
                    </div>
                    <div className="text-[11px] text-gray-400">{slot.sessionType} · {slot.spaceId}</div>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSlotConfirm(slot.id)}
                      className="rounded-lg p-1.5 transition"
                      style={{
                        backgroundColor: slot.confirmed ? '#dcfce7' : '#f3f4f6',
                        color: slot.confirmed ? '#15803d' : '#6b7280',
                      }}
                      title={slot.confirmed ? 'Mark as draft' : 'Confirm slot'}
                    >
                      <IconCheck size={13} strokeWidth={slot.confirmed ? 2.5 : 1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSlot(slot.id)}
                      className="rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
                    >
                      <IconX size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
