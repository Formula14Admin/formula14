'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES, type SessionTypeId } from '@/lib/sessionTypes'
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconClock,
  IconMapPin, IconUsers, IconArrowLeft, IconCalendar,
  IconAlertCircle,
} from '@tabler/icons-react'

const ACCENT = '#6BA3D6'
const BIT_LS_SETTINGS = 'f14_booking_settings'
const BIT_LS_META     = 'f14_session_type_meta'
const BIT_LS_PRICING  = 'f14_pricing_configs'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'type' | 'date' | 'time' | 'confirm' | 'done'

interface BITSettings { enabled: boolean; reason: string }
interface BITMeta {
  label?: string; description?: string; durationMins?: number
  location?: string; style?: string
}
interface PricingTier    { min: number; max: number | null; pricePerAthlete: number }
interface PricingConfig  { sessionType: string; tiers: PricingTier[]; durationMins?: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 10) }

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h} hr ${m} min`
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${m} min`
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Open hours per day of week (0=Sun). Returns [openMins, closeMins] or null if closed.
function openHours(dayOfWeek: number): [number, number] | null {
  if (dayOfWeek === 0) return null            // Sunday closed
  if (dayOfWeek === 6) return [7 * 60, 19 * 60] // Saturday 7am-7pm
  return [6 * 60, 21 * 60]                    // Mon-Fri 6am-9pm
}

function generateSlots(dayOfWeek: number, durationMins: number): number[] {
  const hours = openHours(dayOfWeek)
  if (!hours) return []
  const [open, close] = hours
  const slots: number[] = []
  for (let t = open; t + durationMins <= close; t += 30) slots.push(t)
  return slots
}

function dateKey(d: Date): string { return d.toISOString().slice(0, 10) }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa']

// ── Step components ───────────────────────────────────────────────────────────

function StepBadge({ step, current }: { step: number; current: number }) {
  const done   = current > step
  const active = current === step
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all"
        style={{
          backgroundColor: done ? '#10b981' : active ? ACCENT : '#e5e7eb',
          color: done || active ? 'white' : '#9ca3af',
        }}
      >
        {done ? <IconCheck size={12} strokeWidth={2.5} /> : step}
      </div>
    </div>
  )
}

const STEP_LABELS = ['Session Type', 'Date', 'Time', 'Confirm']
const STEP_KEYS: Step[] = ['type', 'date', 'time', 'confirm']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookPage() {
  const { data: session } = useSession()
  const email = session?.user?.email ?? null

  // Athlete data (for booking_athletes insert)
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [membershipTier, setMembershipTier] = useState<string | null>(null)

  // Booking Information settings (from localStorage, set by admin in hub)
  const [bitSettings, setBitSettings] = useState<Record<string, BITSettings>>({})
  const [bitMeta,     setBitMeta]     = useState<Record<string, BITMeta>>({})
  const [pricing,     setPricing]     = useState<PricingConfig[]>([])

  // Flow state
  const [step, setStep] = useState<Step>('type')
  const [selectedTypeId, setSelectedTypeId] = useState<SessionTypeId | null>(null)
  const [selectedDate,   setSelectedDate]   = useState<Date | null>(null)
  const [selectedTime,   setSelectedTime]   = useState<number | null>(null)
  const [notes,          setNotes]          = useState('')

  // Calendar state
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // Existing bookings for selected date (to show occupancy)
  const [dayBookings, setDayBookings] = useState<{ startMins: number; durationMins: number }[]>([])

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Load data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load booking settings from localStorage (set by admin in hub Booking Information tab)
    try { const r = localStorage.getItem(BIT_LS_SETTINGS); if (r) setBitSettings(JSON.parse(r)) } catch {}
    try { const r = localStorage.getItem(BIT_LS_META);      if (r) setBitMeta(JSON.parse(r))     } catch {}
    try { const r = localStorage.getItem(BIT_LS_PRICING);   if (r) setPricing(JSON.parse(r))     } catch {}
  }, [])

  useEffect(() => {
    if (!email) return
    void (async () => {
      const { data } = await supabase
        .from('athletes')
        .select('id, membership_tier')
        .eq('email', email)
        .maybeSingle()
      if (data) {
        setAthleteId(data.id as string)
        setMembershipTier((data.membership_tier as string | null) ?? null)
      }
    })()
  }, [email])

  // Load existing bookings when date is selected
  useEffect(() => {
    if (!selectedDate) return
    void (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('start_mins, duration_mins')
        .eq('date', dateKey(selectedDate))
        .in('status', ['confirmed', 'pending'])
      setDayBookings((data ?? []).map(b => ({
        startMins:    (b.start_mins as number) ?? 0,
        durationMins: (b.duration_mins as number) ?? 60,
      })))
    })()
  }, [selectedDate])

  // ── Computed ──────────────────────────────────────────────────────────────────

  const ON_BY_DEFAULT = new Set(['individual','small-group','team-training','casual-shooting','shooting-machine-session','weight-room-session'])

  const enabledTypes = useMemo(() =>
    CANONICAL_SESSION_TYPES.filter(t => {
      const s = bitSettings[t.id]
      return s ? s.enabled : ON_BY_DEFAULT.has(t.id)
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [bitSettings])

  const selectedTypeDef = useMemo(() =>
    selectedTypeId ? CANONICAL_SESSION_TYPES.find(t => t.id === selectedTypeId) ?? null : null,
  [selectedTypeId])

  function getLabel(id: string):       string { return bitMeta[id]?.label       ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.label       ?? id }
  function getDesc(id: string):        string { return bitMeta[id]?.description ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.description ?? '' }
  function getDuration(id: string):    number { return bitMeta[id]?.durationMins ?? pricing.find(p=>p.sessionType===id)?.durationMins ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.durationMins ?? 60 }
  function getLocation(id: string):    string { return bitMeta[id]?.location     ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.location ?? '' }
  function isSelfServe(id: string): boolean   { return CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.selfServe ?? false }

  function getPrice(id: string): string | null {
    const cfg = pricing.find(p => p.sessionType === id)
    if (!cfg || cfg.tiers.length === 0) return null
    if (id === 'small-group') {
      const prices = cfg.tiers.map(t => t.pricePerAthlete)
      const mn = Math.min(...prices), mx = Math.max(...prices)
      return mn === mx ? `$${mn}` : `$${mn}–$${mx}`
    }
    return `$${cfg.tiers[0].pricePerAthlete}`
  }

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedTypeId) return []
    return generateSlots(selectedDate.getDay(), getDuration(selectedTypeId))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTypeId, bitMeta, pricing])

  function isSlotConflict(startMins: number, durationMins: number): boolean {
    return dayBookings.some(b => startMins < b.startMins + b.durationMins && startMins + durationMins > b.startMins)
  }

  // Calendar helpers
  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const last  = new Date(calYear, calMonth + 1, 0)
    const days: (Date | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(calYear, calMonth, d))
    return days
  }, [calYear, calMonth])

  function isDateAvailable(d: Date): boolean {
    if (d < today) return false
    const hours = openHours(d.getDay())
    if (!hours) return false
    if (!selectedTypeId) return true
    return generateSlots(d.getDay(), getDuration(selectedTypeId)).length > 0
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function goBack() {
    if (step === 'date')    { setStep('type');    setSelectedDate(null) }
    if (step === 'time')    { setStep('date');    setSelectedTime(null) }
    if (step === 'confirm') { setStep('time') }
  }

  const stepIndex = STEP_KEYS.indexOf(step as Step)

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!selectedTypeId || !selectedDate || selectedTime === null) return
    setSubmitting(true)
    setSubmitError(null)
    const selfServe = isSelfServe(selectedTypeId)
    const bookingId = uid()
    const status    = selfServe ? 'confirmed' : 'pending'
    const dateStr   = dateKey(selectedDate)
    const { error: bErr } = await supabase.from('bookings').insert({
      id:            bookingId,
      session_type:  getLabel(selectedTypeId),
      date:          dateStr,
      start_mins:    selectedTime,
      duration_mins: getDuration(selectedTypeId),
      booking_type:  membershipTier ? 'member' : 'casual',
      status,
      notes:         notes.trim() || null,
      max_capacity:  1,
      athlete_names: athleteId ? [] : [session?.user?.name ?? ''],
    })
    if (bErr) { setSubmitError('Failed to create booking. Please try again.'); setSubmitting(false); return }

    if (athleteId) {
      await supabase.from('booking_athletes').insert({
        booking_id:     bookingId,
        athlete_id:     athleteId,
        status:         'confirmed',
        payment_status: 'unpaid',
      })
    }
    setSubmitting(false)
    setStep('done')
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (step === 'done' && selectedTypeDef && selectedDate && selectedTime !== null) {
    const selfServe = isSelfServe(selectedTypeId!)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: selfServe ? '#dcfce7' : '#dbeafe' }}>
            <IconCheck size={32} strokeWidth={2.5} style={{ color: selfServe ? '#16a34a' : '#2563eb' }} />
          </div>
          <h1 className="mb-1 text-xl font-bold text-gray-900">
            {selfServe ? 'Booking Confirmed!' : 'Request Submitted!'}
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            {selfServe
              ? `Your ${getLabel(selectedTypeId!)} is booked for ${fmtDateShort(selectedDate)} at ${fmtTime(selectedTime)}.`
              : `Your coach will confirm your ${getLabel(selectedTypeId!)} on ${fmtDateShort(selectedDate)} at ${fmtTime(selectedTime)}.`
            }
          </p>
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm">
            <div className="space-y-2.5">
              {[
                { label: 'Session', value: getLabel(selectedTypeId!) },
                { label: 'Date',    value: fmtDateLong(selectedDate) },
                { label: 'Time',    value: fmtTime(selectedTime) },
                { label: 'Duration',value: fmtDuration(getDuration(selectedTypeId!)) },
                { label: 'Status',  value: selfServe ? 'Confirmed' : 'Pending coach approval' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => { setStep('type'); setSelectedTypeId(null); setSelectedDate(null); setSelectedTime(null); setNotes('') }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
              Book Another
            </button>
            <a href="/athlete/bookings"
              className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}>
              My Bookings
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-10">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          {step !== 'type' && (
            <button type="button" onClick={goBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <IconArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Book a Session</h1>
          </div>
          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <StepBadge step={i + 1} current={stepIndex + 1} />
                <span className="text-xs text-gray-500">{label}</span>
                {i < STEP_LABELS.length - 1 && <span className="mx-1 text-gray-200">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">

        {/* ── STEP 1: Session Type ─────────────────────────────────────────────── */}
        {step === 'type' && (
          <div>
            <p className="mb-5 text-sm text-gray-500">Choose the type of session you&apos;d like to book.</p>
            {enabledTypes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
                <IconAlertCircle size={32} className="text-amber-400" />
                <p className="font-semibold text-amber-700">No session types available</p>
                <p className="text-sm text-amber-600">Your coach hasn&apos;t enabled any session types yet. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enabledTypes.map(t => {
                  const label    = getLabel(t.id)
                  const desc     = getDesc(t.id)
                  const duration = getDuration(t.id)
                  const location = getLocation(t.id)
                  const selfServe = isSelfServe(t.id)
                  const price    = getPrice(t.id)
                  const reason   = bitSettings[t.id]?.reason ?? ''
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setSelectedTypeId(t.id); setStep('date') }}
                      className="group flex w-full items-stretch overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
                      style={{ border: `1.5px solid #e5e7eb` }}
                    >
                      {/* Accent stripe */}
                      <div className="w-1.5 shrink-0 rounded-l-2xl transition-all group-hover:w-2"
                        style={{ backgroundColor: t.accentColor }} />

                      {/* Content */}
                      <div className="flex flex-1 items-center gap-4 px-5 py-4 text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{label}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                              style={selfServe
                                ? { backgroundColor: '#fef3c7', color: '#92400e' }
                                : { backgroundColor: `${ACCENT}20`, color: ACCENT }}>
                              {selfServe ? 'Self-serve' : 'Coached'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{desc}</p>
                          {reason && (
                            <p className="mt-1 text-xs text-amber-600">{reason}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <IconClock size={12} /> {fmtDuration(duration)}
                            </span>
                            {location && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <IconMapPin size={12} /> {location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {price && (
                            <span className="text-base font-bold text-gray-900">{price}</span>
                          )}
                          <span className="text-xs text-gray-300 group-hover:text-gray-400">›</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Date ─────────────────────────────────────────────────────── */}
        {step === 'date' && selectedTypeId && (
          <div>
            <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-600">
              Booking: <span className="font-semibold text-gray-800">{getLabel(selectedTypeId)}</span>
              &nbsp;·&nbsp;<span className="text-gray-400">{fmtDuration(getDuration(selectedTypeId))}</span>
            </div>
            <p className="mb-4 text-sm text-gray-500">Select your preferred date.</p>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              {/* Month nav */}
              <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                  <IconChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-gray-800">
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button type="button" onClick={nextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                  <IconChevronRight size={16} />
                </button>
              </div>

              {/* Day headers */}
              <div className="mb-2 grid grid-cols-7 text-center">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-[11px] font-bold uppercase tracking-wide text-gray-300">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} />
                  const available = isDateAvailable(d)
                  const selected  = selectedDate ? dateKey(d) === dateKey(selectedDate) : false
                  const isToday   = dateKey(d) === dateKey(today)
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!available}
                      onClick={() => { setSelectedDate(d); setSelectedTime(null); setStep('time') }}
                      className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition"
                      style={
                        selected
                          ? { backgroundColor: ACCENT, color: 'white' }
                          : available
                            ? { color: '#374151' }
                            : { color: '#d1d5db', cursor: 'not-allowed' }
                      }
                      onMouseEnter={e => { if (available && !selected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6' }}
                      onMouseLeave={e => { if (available && !selected) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}
                    >
                      <span style={isToday && !selected ? { textDecoration: 'underline', textDecorationColor: ACCENT } : {}}>
                        {d.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-[11px] text-gray-400 text-center">
                Mon–Fri: 6am–9pm &nbsp;·&nbsp; Sat: 7am–7pm &nbsp;·&nbsp; Sun: Closed
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Time ──────────────────────────────────────────────────────── */}
        {step === 'time' && selectedTypeId && selectedDate && (
          <div>
            <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3 text-sm">
              <span className="font-semibold text-gray-800">{getLabel(selectedTypeId)}</span>
              &nbsp;·&nbsp;<span className="text-gray-400">{fmtDateShort(selectedDate)}</span>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              {isSelfServe(selectedTypeId)
                ? 'Choose your preferred start time.'
                : 'Select your preferred time. Your coach will confirm availability.'}
            </p>

            {timeSlots.length === 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-center text-sm text-amber-700">
                No available slots on this day. Please choose a different date.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {timeSlots.map(slot => {
                    const conflict  = isSlotConflict(slot, getDuration(selectedTypeId))
                    const selfServe = isSelfServe(selectedTypeId)
                    const unavailable = selfServe && conflict
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={unavailable}
                        onClick={() => { setSelectedTime(slot); setStep('confirm') }}
                        className="rounded-xl border py-2.5 text-sm font-medium transition"
                        style={
                          unavailable
                            ? { borderColor: '#e5e7eb', color: '#d1d5db', backgroundColor: '#f9fafb', cursor: 'not-allowed' }
                            : { borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }
                        }
                        onMouseEnter={e => { if (!unavailable) { (e.currentTarget as HTMLElement).style.borderColor = ACCENT; (e.currentTarget as HTMLElement).style.color = ACCENT } }}
                        onMouseLeave={e => { if (!unavailable) { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = '#374151' } }}
                      >
                        {fmtTime(slot)}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-[11px] text-gray-400 text-center">
                  Each slot is {fmtDuration(getDuration(selectedTypeId))} long
                </p>
              </>
            )}
          </div>
        )}

        {/* ── STEP 4: Confirm ───────────────────────────────────────────────────── */}
        {step === 'confirm' && selectedTypeId && selectedDate && selectedTime !== null && (
          <div>
            <p className="mb-5 text-sm text-gray-500">Review your booking and add any notes for your coach.</p>

            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4 mb-4">
              <h2 className="text-sm font-bold text-gray-800">Booking Summary</h2>
              <div className="space-y-3">
                {[
                  { icon: <IconCalendar size={15} />, label: 'Session',  value: getLabel(selectedTypeId) },
                  { icon: <IconCalendar size={15} />, label: 'Date',     value: fmtDateLong(selectedDate) },
                  { icon: <IconClock    size={15} />, label: 'Time',     value: `${fmtTime(selectedTime)} – ${fmtTime(selectedTime + getDuration(selectedTypeId))}` },
                  { icon: <IconClock    size={15} />, label: 'Duration', value: fmtDuration(getDuration(selectedTypeId)) },
                  { icon: <IconMapPin   size={15} />, label: 'Location', value: getLocation(selectedTypeId) || '—' },
                  { icon: <IconUsers    size={15} />, label: 'Type',     value: isSelfServe(selectedTypeId) ? 'Self-serve' : 'Coached session' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
                    <span className="w-20 shrink-0 text-sm text-gray-400">{label}</span>
                    <span className="text-sm font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
              {getPrice(selectedTypeId) && (
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="text-base font-bold text-gray-800">{getPrice(selectedTypeId)}</span>
                </div>
              )}
            </div>

            {!isSelfServe(selectedTypeId) && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <IconAlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>This is a coached session. Your coach will review and confirm within 24 hours.</span>
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-sm mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Notes for your coach <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any specific goals, focus areas, or information your coach should know…"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/20"
              />
            </div>

            {submitError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting
                ? 'Confirming…'
                : isSelfServe(selectedTypeId)
                  ? 'Confirm Booking'
                  : 'Submit Request'}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
