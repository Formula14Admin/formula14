'use client'

import { useState, useEffect, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconX, IconPlus } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES } from '@/lib/sessionTypes'
import { SelectPicker, DatePicker } from '@/components/ui/Pickers'
import { StaffMember, EMPLOYMENT_LABELS, ACCENT } from '../team/_shared'
import { TODAY_ISO } from './_shared'
import { Avatar } from './_ui'

type AvailSub = 'overview' | 'coach' | 'facility' | 'exceptions'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_JS     = [1, 2, 3, 4, 5, 6, 0]
const AVAIL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const COACHED_TYPE_IDS = CANONICAL_SESSION_TYPES.filter(t => !t.selfServe).map(t => t.id)

function timeStr(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.slice(0, 5)
}

interface ExceptionRow {
  id: string; appliesTo: string; exceptionType: 'block' | 'extra'
  date: string; startTime: string | null; endTime: string | null; reason: string | null
}

interface TimeWindow { start: string; end: string }

interface DaySlot {
  dow: number; label: string; available: boolean; windows: TimeWindow[]; types: string[]
}

const BLANK_WINDOW: TimeWindow = { start: '06:00', end: '21:00' }

// ── Per-coach schedule editor ─────────────────────────────────────────────────

export function CoachScheduleEditor({ coachId, coachName }: { coachId: string; coachName: string }) {
  const blank = (): DaySlot[] =>
    DAYS_SHORT.map((label, i) => ({ dow: DOW_JS[i], label, available: false, windows: [{ ...BLANK_WINDOW }], types: [...COACHED_TYPE_IDS] }))

  const [days,    setDays]    = useState<DaySlot[]>(blank)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: err } = await supabase
          .from('coach_availability')
          .select('*')
          .eq('coach_id', coachId)
          .order('day_of_week')
          .order('slot_index')
        if (err) throw err
        const rows = (data ?? []) as Record<string, unknown>[]
        setDays(blank().map(slot => {
          const matching = rows.filter(r => r.day_of_week === slot.dow)
          if (matching.length === 0) return slot
          const windows: TimeWindow[] = matching.map(r => ({
            start: timeStr(r.start_time as string) || '06:00',
            end:   timeStr(r.end_time   as string) || '21:00',
          }))
          const types = (matching[0].session_types_enabled as string[]) ?? [...COACHED_TYPE_IDS]
          return { ...slot, available: true, windows, types }
        }))
      } catch (e) { setError('Failed to load schedule.'); console.error(e) }
      finally { setLoading(false) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId])

  function toggle(idx: number) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, available: !d.available } : d))
  }

  function setWindow(dayIdx: number, winIdx: number, key: keyof TimeWindow, val: string) {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d
      const windows = d.windows.map((w, j) => j === winIdx ? { ...w, [key]: val } : w)
      return { ...d, windows }
    }))
  }

  function addWindow(dayIdx: number) {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d
      return { ...d, windows: [...d.windows, { ...BLANK_WINDOW }] }
    }))
  }

  function removeWindow(dayIdx: number, winIdx: number) {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d
      const windows = d.windows.filter((_, j) => j !== winIdx)
      return { ...d, windows: windows.length > 0 ? windows : [{ ...BLANK_WINDOW }] }
    }))
  }

  function toggleType(idx: number, typeId: string) {
    setDays(prev => prev.map((d, i) => {
      if (i !== idx) return d
      const types = d.types.includes(typeId) ? d.types.filter(t => t !== typeId) : [...d.types, typeId]
      return { ...d, types }
    }))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      // Delete all existing rows for this coach then re-insert
      const { error: de } = await supabase.from('coach_availability').delete().eq('coach_id', coachId)
      if (de) throw de

      const rows = days
        .filter(d => d.available)
        .flatMap(d =>
          d.windows.map((w, slotIndex) => ({
            coach_id:              coachId,
            day_of_week:           d.dow,
            slot_index:            slotIndex,
            start_time:            w.start,
            end_time:              w.end,
            session_types_enabled: d.types,
          }))
        )

      if (rows.length > 0) {
        const { error: ie } = await supabase.from('coach_availability').insert(rows)
        if (ie) throw ie
      }

      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError('Save failed — check console.'); console.error(e) }
    finally { setSaving(false) }
  }

  const INPUT = 'rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#6BA3D6] focus:outline-none focus:ring-1 focus:ring-[#6BA3D6]/20'
  if (loading) return <p className="py-4 text-sm text-gray-400">Loading {coachName}&apos;s schedule…</p>

  return (
    <div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4 w-12">Day</th>
              <th className="pb-2 pr-4 w-28">Available</th>
              <th className="pb-2 pr-6 w-56">Time slots</th>
              <th className="pb-2">Session types they coach</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, idx) => (
              <tr key={d.label} className="border-b border-gray-50 align-top">
                <td className="pt-3 pr-4 font-semibold text-gray-700">{d.label}</td>
                <td className="pt-3 pr-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={d.available} onChange={() => toggle(idx)} className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#6BA3D6]" />
                    <span className={`text-xs font-medium ${d.available ? 'text-green-600' : 'text-gray-400'}`}>{d.available ? 'Available' : 'Off'}</span>
                  </label>
                </td>
                <td className="py-2.5 pr-6">
                  {d.available ? (
                    <div className="space-y-1.5">
                      {d.windows.map((w, wIdx) => (
                        <div key={wIdx} className="flex items-center gap-1.5">
                          <input type="time" value={w.start} onChange={e => setWindow(idx, wIdx, 'start', e.target.value)} className={INPUT} />
                          <span className="text-gray-400">–</span>
                          <input type="time" value={w.end}   onChange={e => setWindow(idx, wIdx, 'end',   e.target.value)} className={INPUT} />
                          {d.windows.length > 1 && (
                            <button type="button" onClick={() => removeWindow(idx, wIdx)}
                              className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition">
                              <IconX size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addWindow(idx)}
                        className="flex items-center gap-1 text-[11px] font-semibold transition"
                        style={{ color: ACCENT }}>
                        <IconPlus size={11} /> Add slot
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="py-2.5">
                  {d.available
                    ? <div className="flex flex-wrap gap-1.5">
                        {CANONICAL_SESSION_TYPES.filter(t => !t.selfServe).map(t => {
                          const on = d.types.includes(t.id)
                          return (
                            <label key={t.id} className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition"
                              style={on ? { backgroundColor: '#EBF3FB', color: '#6BA3D6' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                              <input type="checkbox" checked={on} onChange={() => toggleType(idx, t.id)} className="h-3 w-3 cursor-pointer accent-[#6BA3D6]" />
                              {t.label}
                            </label>
                          )
                        })}
                      </div>
                    : <span className="text-xs text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-600 font-medium">Schedule saved ✓</span>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#6BA3D6' }}>
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}

// ── Facility hours editor ─────────────────────────────────────────────────────

interface FacilitySlot { dow: number; label: string; open: boolean; start: string; end: string }

export function FacilityScheduleEditor() {
  const blank = (): FacilitySlot[] =>
    DAYS_SHORT.map((label, i) => ({ dow: DOW_JS[i], label, open: false, start: '06:00', end: '21:00' }))

  const [days,    setDays]    = useState<FacilitySlot[]>(blank)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: err } = await supabase.from('facility_availability').select('*')
        if (err) throw err
        setDays(blank().map(slot => {
          const row = (data ?? []).find((r: Record<string, unknown>) => r.day_of_week === slot.dow)
          if (!row) return slot
          return { ...slot, open: true, start: timeStr(row.start_time as string) || '06:00', end: timeStr(row.end_time as string) || '21:00' }
        }))
      } catch (e) { setError('Failed to load facility hours.'); console.error(e) }
      finally { setLoading(false) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(idx: number) { setDays(prev => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d)) }
  function setStart(idx: number, v: string) { setDays(prev => prev.map((d, i) => i === idx ? { ...d, start: v } : d)) }
  function setEnd(idx: number, v: string) { setDays(prev => prev.map((d, i) => i === idx ? { ...d, end: v } : d)) }

  async function save() {
    setSaving(true); setError(null)
    try {
      const closedDows = days.filter(d => !d.open).map(d => d.dow)
      if (closedDows.length > 0) {
        const { error: de } = await supabase.from('facility_availability').delete().in('day_of_week', closedDows)
        if (de) throw de
      }
      for (const d of days.filter(d => d.open)) {
        const { error: ue } = await supabase.from('facility_availability').upsert({ day_of_week: d.dow, start_time: d.start, end_time: d.end, disabled_session_types: [] }, { onConflict: 'day_of_week' })
        if (ue) throw ue
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { setError('Save failed — check console.'); console.error(e) }
    finally { setSaving(false) }
  }

  const INPUT = 'rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#6BA3D6] focus:outline-none focus:ring-1 focus:ring-[#6BA3D6]/20'
  if (loading) return <p className="py-4 text-sm text-gray-400">Loading facility hours…</p>

  return (
    <div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4 w-12">Day</th><th className="pb-2 pr-4 w-28">Open</th><th className="pb-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, idx) => (
              <tr key={d.label} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 font-semibold text-gray-700">{d.label}</td>
                <td className="py-2.5 pr-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={d.open} onChange={() => toggle(idx)} className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#6BA3D6]" />
                    <span className={`text-xs font-medium ${d.open ? 'text-green-600' : 'text-gray-400'}`}>{d.open ? 'Open' : 'Closed'}</span>
                  </label>
                </td>
                <td className="py-2.5">
                  {d.open
                    ? <div className="flex items-center gap-1.5">
                        <input type="time" value={d.start} onChange={e => setStart(idx, e.target.value)} className={INPUT} />
                        <span className="text-gray-400">–</span>
                        <input type="time" value={d.end} onChange={e => setEnd(idx, e.target.value)} className={INPUT} />
                      </div>
                    : <span className="text-xs text-gray-300">Closed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-600 font-medium">Hours saved ✓</span>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#6BA3D6' }}>
          {saving ? 'Saving…' : 'Save Hours'}
        </button>
      </div>
    </div>
  )
}

// ── Availability Tab ──────────────────────────────────────────────────────────

export function AvailabilityTab({ staff }: { staff: StaffMember[] }) {
  const [sub, setSub] = useState<AvailSub>('overview')
  const [calMonth,  setCalMonth]  = useState(() => new Date())
  const [coachRows, setCoachRows] = useState<{ coachId: string; dayOfWeek: number }[]>([])
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([])
  const [exForm,   setExForm]   = useState({ appliesTo: 'facility', exType: 'block', date: '', startTime: '', endTime: '', reason: '' })
  const [savingEx, setSavingEx] = useState(false)
  const INPUT_SM = 'rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/20'

  useEffect(() => {
    void (async () => {
      try {
        const [{ data: cd }, { data: ex }] = await Promise.all([
          supabase.from('coach_availability').select('coach_id, day_of_week'),
          supabase.from('availability_exceptions').select('*').order('date'),
        ])
        setCoachRows((cd ?? []).map((r: Record<string, unknown>) => ({ coachId: r.coach_id as string, dayOfWeek: r.day_of_week as number })))
        setExceptions((ex ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string, appliesTo: r.applies_to as string, exceptionType: r.exception_type as 'block' | 'extra',
          date: r.date as string, startTime: timeStr(r.start_time as string | null) || null,
          endTime: timeStr(r.end_time as string | null) || null, reason: (r.reason as string | null) ?? null,
        })))
      } catch (e) { console.error('[AvailabilityTab]', e) }
    })()
  }, [])

  const monthDates = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const firstDow = ((new Date(y, m, 1).getDay() + 6) % 7)
    const daysInMon = new Date(y, m + 1, 0).getDate()
    const cells = Math.ceil((firstDow + daysInMon) / 7) * 7
    return Array.from({ length: cells }, (_, i) => {
      const day = i - firstDow + 1
      if (day < 1 || day > daysInMon) return null
      return new Date(y, m, day).toISOString().slice(0, 10)
    })
  }, [calMonth])

  const coachColors: Record<string, string> = { s1: '#6BA3D6', s2: '#6BAD6B', s3: '#D4A520' }

  async function saveException(e: React.FormEvent) {
    e.preventDefault()
    if (!exForm.date) return
    setSavingEx(true)
    try {
      await supabase.from('availability_exceptions').insert({
        applies_to: exForm.appliesTo, exception_type: exForm.exType, date: exForm.date,
        start_time: exForm.startTime || null, end_time: exForm.endTime || null, reason: exForm.reason || null,
      })
      const { data } = await supabase.from('availability_exceptions').select('*').order('date')
      setExceptions((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, appliesTo: r.applies_to as string, exceptionType: r.exception_type as 'block' | 'extra',
        date: r.date as string, startTime: timeStr(r.start_time as string | null) || null,
        endTime: timeStr(r.end_time as string | null) || null, reason: (r.reason as string | null) ?? null,
      })))
      setExForm({ appliesTo: 'facility', exType: 'block', date: '', startTime: '', endTime: '', reason: '' })
    } catch (err) { console.error(err) }
    finally { setSavingEx(false) }
  }

  async function deleteException(id: string) {
    await supabase.from('availability_exceptions').delete().eq('id', id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-5 flex gap-1 self-start rounded-xl border border-gray-200 bg-white p-1">
        {([
          ['overview',   'Overview'],
          ['coach',      'Coach Schedules'],
          ['facility',   'Facility Hours'],
          ['exceptions', 'Exceptions'],
        ] as [AvailSub, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${sub === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={sub === key ? { backgroundColor: ACCENT } : undefined}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'overview' && (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconChevronLeft size={18} /></button>
            <h2 className="text-base font-bold text-gray-900">{AVAIL_MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h2>
            <button onClick={() => setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconChevronRight size={18} /></button>
          </div>
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS_SHORT.map(d => <div key={d} className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((iso, i) => {
              if (!iso) return <div key={i} className="h-20 rounded-lg" />
              const jsDow   = new Date(iso + 'T12:00:00').getDay()
              const isToday = iso === TODAY_ISO
              const day     = parseInt(iso.slice(8), 10)
              const present = staff.filter(s => coachRows.some(r => r.coachId === s.id && r.dayOfWeek === jsDow))
              const blocked = exceptions.some(e => e.exceptionType === 'block' && e.date === iso)
              return (
                <div key={iso} className={`h-20 rounded-lg border p-1.5 ${blocked ? 'border-red-100 bg-red-50' : isToday ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-100 bg-white'}`}>
                  <p className={`mb-1 text-xs font-bold ${isToday ? 'text-[#6BA3D6]' : blocked ? 'text-red-400' : 'text-gray-600'}`}>{day}</p>
                  {blocked ? <span className="text-[9px] text-red-400">Closed</span>
                    : <div className="flex flex-wrap gap-0.5">{present.map(s => <div key={s.id} title={`${s.firstName} ${s.lastName}`} className="h-2 w-2 rounded-full" style={{ backgroundColor: coachColors[s.id] ?? '#9ca3af' }} />)}</div>}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coachColors[s.id] ?? '#9ca3af' }} />
                <span className="text-xs text-gray-500">{s.firstName} {s.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'coach' && (
        <div className="flex-1 overflow-y-auto space-y-5">
          {staff.map(s => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Avatar firstName={s.firstName} lastName={s.lastName} size={36} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-500">{s.role} · {EMPLOYMENT_LABELS[s.employmentType]}</p>
                </div>
              </div>
              <CoachScheduleEditor coachId={s.id} coachName={`${s.firstName} ${s.lastName}`} />
            </div>
          ))}
        </div>
      )}

      {sub === 'facility' && (
        <div className="flex-1 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-5 text-sm font-bold text-gray-900">Facility Hours</h3>
            <FacilityScheduleEditor />
          </div>
        </div>
      )}

      {sub === 'exceptions' && (
        <div className="flex-1 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Exceptions &amp; Closures</h3>
            {exceptions.length === 0 && (
              <p className="mb-4 text-sm text-gray-400">No exceptions logged yet.</p>
            )}
            {exceptions.length > 0 && (
              <div className="mb-5 space-y-2">
                {exceptions.map(ex => (
                  <div key={ex.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${ex.exceptionType === 'block' ? 'bg-red-400' : 'bg-green-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {ex.date} — <span className="font-normal">{ex.appliesTo === 'facility' ? 'Facility' : `Coach: ${ex.appliesTo.replace('coach:', '')}`}</span>
                        <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ex.exceptionType === 'block' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                          {ex.exceptionType === 'block' ? 'Closure' : 'Extra hours'}
                        </span>
                      </p>
                      {ex.reason    && <p className="text-xs text-gray-400">{ex.reason}</p>}
                      {ex.startTime && <p className="text-xs text-gray-400">{ex.startTime} – {ex.endTime}</p>}
                    </div>
                    <button type="button" onClick={() => void deleteException(ex.id)} className="shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-400"><IconX size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderTop: exceptions.length > 0 ? '1px solid #f3f4f6' : undefined, paddingTop: exceptions.length > 0 ? '1.25rem' : undefined }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Add Exception</p>
              <form onSubmit={e => void saveException(e)}>
                <div className="flex flex-wrap gap-2">
                  <SelectPicker value={exForm.appliesTo} onChange={v => setExForm(p => ({ ...p, appliesTo: v }))}
                    options={[{ value: 'facility', label: 'Facility' }, ...staff.map(s => ({ value: `coach:${s.id}`, label: `${s.firstName} ${s.lastName}` }))]} />
                  <SelectPicker value={exForm.exType} onChange={v => setExForm(p => ({ ...p, exType: v }))}
                    options={[{ value: 'block', label: 'Block (closure)' }, { value: 'extra', label: 'Extra hours' }]} />
                  <DatePicker value={exForm.date} onChange={v => setExForm(p => ({ ...p, date: v }))} />
                  <input type="time" value={exForm.startTime} onChange={e => setExForm(p => ({ ...p, startTime: e.target.value }))} className={INPUT_SM} />
                  <input type="time" value={exForm.endTime}   onChange={e => setExForm(p => ({ ...p, endTime: e.target.value }))}   className={INPUT_SM} />
                  <input type="text" placeholder="Reason (optional)" value={exForm.reason} onChange={e => setExForm(p => ({ ...p, reason: e.target.value }))} className={`${INPUT_SM} min-w-[140px] flex-1`} />
                  <button type="submit" disabled={savingEx || !exForm.date}
                    className="rounded-lg px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: ACCENT }}>
                    {savingEx ? 'Saving…' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
