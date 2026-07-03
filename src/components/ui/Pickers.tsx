'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
} from '@tabler/icons-react'

// ── Month names ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── DatePicker ─────────────────────────────────────────────────────────────────

export function DatePicker({
  value,
  onChange,
  accentColor = '#6BA3D6',
  minDate,
}: {
  value: string
  onChange: (v: string) => void
  accentColor?: string
  minDate?: string
}) {
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
    if (minDate && iso < minDate) return
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

      {/* Floating calendar portal */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ position: 'fixed', top: panelStyle.top, left: panelStyle.left, width: panelStyle.width, zIndex: 9999 }}
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
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 px-1 pb-2">
                {cells.map((cell, i) => {
                  const cellIso = [
                    cell.date.getFullYear(),
                    String(cell.date.getMonth() + 1).padStart(2, '0'),
                    String(cell.date.getDate()).padStart(2, '0'),
                  ].join('-')
                  const isPast = !!(minDate && cellIso < minDate)
                  const sel = isSel(cell.date)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickDate(cell.date)}
                      disabled={isPast}
                      className={[
                        'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition',
                        sel
                          ? 'font-semibold text-white'
                          : isPast
                          ? 'cursor-not-allowed text-gray-200'
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

// ── SelectPicker ───────────────────────────────────────────────────────────────

export function SelectPicker({
  value,
  onChange,
  options,
  accentColor = '#6BA3D6',
  getPanelPosition,
  multiValues,
  onChangeMulti,
  maxSelect,
  panelMaxHeight = 200,
  centerOnTrigger = false,
}: {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
