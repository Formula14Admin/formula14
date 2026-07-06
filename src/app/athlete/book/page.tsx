'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES, type SessionTypeId } from '@/lib/sessionTypes'
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconClock,
  IconMapPin, IconUsers, IconArrowLeft, IconCalendar,
  IconAlertCircle, IconLoader2,
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
interface PricingTier   { min: number; max: number | null; pricePerAthlete: number }
interface PricingConfig { sessionType: string; tiers: PricingTier[]; durationMins?: number }

interface FacilityDay {
  dayOfWeek: number
  startMins: number
  endMins: number
  disabledTypes: Set<string>
}

interface CoachDay {
  coachId:      string
  dayOfWeek:    number
  startMins:    number
  endMins:      number
  enabledTypes: Set<string>
}

interface AvailException {
  appliesTo:  string   // 'facility' | 'coach:s1' etc.
  exType:     'block' | 'extra'
  date:       string   // YYYY-MM-DD
  startMins:  number | null
  endMins:    number | null
}

interface DayBooking {
  id:           string
  sessionType:  string
  startMins:    number
  durationMins: number
  maxCapacity:  number
  coachId:      string | null
  athleteCount: number
}

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
function dateKey(d: Date): string { return d.toISOString().slice(0, 10) }

function timeToMins(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa']

const SLOT_INTERVAL = 30  // minutes between slot start times (on-the-hour or half-hour only)

// ── Step badge ────────────────────────────────────────────────────────────────

function StepBadge({ step, current }: { step: number; current: number }) {
  const done   = current > step
  const active = current === step
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all"
      style={{
        backgroundColor: done ? '#10b981' : active ? ACCENT : '#e5e7eb',
        color: done || active ? 'white' : '#9ca3af',
      }}>
      {done ? <IconCheck size={12} strokeWidth={2.5} /> : step}
    </div>
  )
}

const STEP_LABELS = ['Session Type', 'Date', 'Time', 'Confirm']
const STEP_KEYS: Step[] = ['type', 'date', 'time', 'confirm']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookPage() {
  const { data: session } = useSession()
  const email = session?.user?.email ?? null

  const [athleteId,      setAthleteId]      = useState<string | null>(null)
  const [membershipTier, setMembershipTier] = useState<string | null>(null)

  // Booking Information settings (localStorage)
  const [bitSettings, setBitSettings] = useState<Record<string, BITSettings>>({})
  const [bitMeta,     setBitMeta]     = useState<Record<string, BITMeta>>({})
  const [pricing,     setPricing]     = useState<PricingConfig[]>([])

  // Real availability from Supabase
  const [facilitySchedule, setFacilitySchedule] = useState<FacilityDay[]>([])
  const [coachSchedule,    setCoachSchedule]    = useState<CoachDay[]>([])
  const [exceptions,       setExceptions]       = useState<AvailException[]>([])
  const [availLoaded,      setAvailLoaded]      = useState(false)

  // Flow state
  const [step,         setStep]         = useState<Step>('type')
  const [selectedTypeId,  setSelectedTypeId]  = useState<SessionTypeId | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)
  const [notes,        setNotes]        = useState('')

  // Calendar state
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  // Day bookings loaded when date is selected
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([])

  // Submit
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ── Load data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    try { const r = localStorage.getItem(BIT_LS_SETTINGS); if (r) setBitSettings(JSON.parse(r)) } catch {}
    try { const r = localStorage.getItem(BIT_LS_META);      if (r) setBitMeta(JSON.parse(r))     } catch {}
    try { const r = localStorage.getItem(BIT_LS_PRICING);   if (r) setPricing(JSON.parse(r))     } catch {}
  }, [])

  useEffect(() => {
    if (!email) return
    void (async () => {
      const { data } = await supabase.from('athletes').select('id, membership_tier').eq('email', email).maybeSingle()
      if (data) { setAthleteId(data.id as string); setMembershipTier((data.membership_tier as string | null) ?? null) }
    })()
  }, [email])

  // Load real availability once on mount
  useEffect(() => {
    void (async () => {
      const thirtyDaysOut = new Date()
      thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 60)
      const [{ data: facData }, { data: coachData }, { data: exData }] = await Promise.all([
        supabase.from('facility_availability').select('*'),
        supabase.from('coach_availability').select('*'),
        supabase.from('availability_exceptions').select('*')
          .gte('date', dateKey(today))
          .lte('date', dateKey(thirtyDaysOut)),
      ])

      setFacilitySchedule((facData ?? []).map((r: Record<string, unknown>) => ({
        dayOfWeek:    r.day_of_week as number,
        startMins:    timeToMins(r.start_time as string),
        endMins:      timeToMins(r.end_time as string),
        disabledTypes: new Set<string>((r.disabled_session_types as string[]) ?? []),
      })))

      setCoachSchedule((coachData ?? []).map((r: Record<string, unknown>) => ({
        coachId:      r.coach_id as string,
        dayOfWeek:    r.day_of_week as number,
        startMins:    timeToMins(r.start_time as string),
        endMins:      timeToMins(r.end_time as string),
        enabledTypes: new Set<string>((r.session_types_enabled as string[]) ?? []),
      })))

      setExceptions((exData ?? []).map((r: Record<string, unknown>) => ({
        appliesTo:  r.applies_to as string,
        exType:     r.exception_type as 'block' | 'extra',
        date:       r.date as string,
        startMins:  r.start_time ? timeToMins(r.start_time as string) : null,
        endMins:    r.end_time   ? timeToMins(r.end_time as string)   : null,
      })))

      setAvailLoaded(true)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load bookings when date changes
  useEffect(() => {
    if (!selectedDate) return
    void (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, session_type, start_mins, duration_mins, max_capacity, coach_id, booking_athletes(athlete_id)')
        .eq('date', dateKey(selectedDate))
        .in('status', ['confirmed', 'pending'])

      setDayBookings((data ?? []).map((b: Record<string, unknown>) => {
        const ba = b.booking_athletes as { athlete_id: string }[] | null
        return {
          id:           b.id as string,
          sessionType:  b.session_type as string,
          startMins:    (b.start_mins as number) ?? 0,
          durationMins: (b.duration_mins as number) ?? 60,
          maxCapacity:  (b.max_capacity as number) ?? 1,
          coachId:      (b.coach_id as string | null) ?? null,
          athleteCount: ba?.length ?? 0,
        }
      }))
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

  function getLabel(id: string):    string  { return bitMeta[id]?.label       ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.label       ?? id }
  function getDesc(id: string):     string  { return bitMeta[id]?.description ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.description ?? '' }
  function getDuration(id: string): number  { return bitMeta[id]?.durationMins ?? pricing.find(p=>p.sessionType===id)?.durationMins ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.durationMins ?? 60 }
  function getLocation(id: string): string  { return bitMeta[id]?.location     ?? CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.location ?? '' }
  function isSelfServe(id: string): boolean { return CANONICAL_SESSION_TYPES.find(t=>t.id===id)?.selfServe ?? false }

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

  // ── Availability helpers ──────────────────────────────────────────────────────

  function isFacilityBlockedOnDate(dateStr: string): boolean {
    return exceptions.some(e =>
      e.appliesTo === 'facility' && e.date === dateStr && e.exType === 'block' && e.startMins === null
    )
  }

  function isCoachBlockedOnDate(coachId: string, dateStr: string): boolean {
    return exceptions.some(e =>
      e.appliesTo === `coach:${coachId}` && e.date === dateStr && e.exType === 'block' && e.startMins === null
    )
  }

  function getFacilityDay(dow: number): FacilityDay | null {
    return facilitySchedule.find(f => f.dayOfWeek === dow) ?? null
  }

  function getAvailableCoachDays(dow: number, typeId: string): CoachDay[] {
    return coachSchedule.filter(c => c.dayOfWeek === dow && c.enabledTypes.has(typeId))
  }

  // Returns sorted slot start-times (in minutes) for the given date and session type
  function getAvailableSlots(date: Date, typeId: string): number[] {
    const dow     = date.getDay()
    const dateStr = dateKey(date)
    const duration = getDuration(typeId)
    const selfServe = isSelfServe(typeId)

    const facDay = getFacilityDay(dow)
    if (!facDay || facDay.disabledTypes.has(typeId)) return []
    if (isFacilityBlockedOnDate(dateStr)) return []

    // 2-hour lockout if today
    const nowMins = dateKey(date) === dateKey(today)
      ? new Date().getHours() * 60 + new Date().getMinutes() + 120
      : 0

    // Snap up to the next on-the-hour / half-hour boundary
    const rawStart = Math.max(facDay.startMins, nowMins)
    const facStart = Math.ceil(rawStart / SLOT_INTERVAL) * SLOT_INTERVAL
    const facEnd   = facDay.endMins

    if (selfServe) {
      const slots: number[] = []
      for (let t = facStart; t + duration <= facEnd; t += SLOT_INTERVAL) slots.push(t)
      return slots
    }

    // Coached: slots within facility AND at least one coach window
    const coaches = getAvailableCoachDays(dow, typeId).filter(c => !isCoachBlockedOnDate(c.coachId, dateStr))
    if (coaches.length === 0) return []

    const slotsSet = new Set<number>()
    for (let t = facStart; t + duration <= facEnd; t += SLOT_INTERVAL) {
      const coachCovers = coaches.some(c => t >= c.startMins && t + duration <= c.endMins)
      if (coachCovers) slotsSet.add(t)
    }
    return Array.from(slotsSet).sort((a, b) => a - b)
  }

  // Whether a specific date has ANY available slots for the selected session type
  function isDateAvailableForType(date: Date, typeId: string): boolean {
    if (date < today) return false
    if (!availLoaded) return false
    return getAvailableSlots(date, typeId).length > 0
  }

  function isDateAvailable(d: Date): boolean {
    if (d < today) return false
    if (!availLoaded) return false
    if (!selectedTypeId) {
      // Show any date where facility is open
      const facDay = getFacilityDay(d.getDay())
      return !!facDay && !isFacilityBlockedOnDate(dateKey(d))
    }
    return isDateAvailableForType(d, selectedTypeId)
  }

  // Whether session types have ANY availability in next 30 days
  const typesWithAvailability = useMemo<Set<string> | null>(() => {
    if (!availLoaded) return null
    const result = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      for (const t of enabledTypes) {
        if (!result.has(t.id) && isDateAvailableForType(d, t.id)) result.add(t.id)
      }
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availLoaded, facilitySchedule, coachSchedule, exceptions, enabledTypes, today])

  // Slot conflict / occupancy helpers
  function getSlotBookings(startMins: number, typeId: string): DayBooking[] {
    const duration = getDuration(typeId)
    return dayBookings.filter(b =>
      b.sessionType === getLabel(typeId) &&
      startMins < b.startMins + b.durationMins &&
      startMins + duration > b.startMins
    )
  }

  function isSlotFull(startMins: number, typeId: string): boolean {
    if (typeId === 'casual-shooting') {
      const overlap = dayBookings.filter(b =>
        b.sessionType === getLabel(typeId) &&
        startMins < b.startMins + b.durationMins &&
        startMins + getDuration(typeId) > b.startMins
      )
      const total = overlap.reduce((acc, b) => acc + b.athleteCount, 0)
      return total >= 6
    }
    // Individual / coached: slot is taken if there's an existing booking AND no coach remains
    if (!isSelfServe(typeId)) {
      const duration   = getDuration(typeId)
      const dateStr    = dateKey(selectedDate!)
      const dow        = selectedDate!.getDay()
      const coaches    = getAvailableCoachDays(dow, typeId).filter(c => !isCoachBlockedOnDate(c.coachId, dateStr))
      const busyCoachIds = new Set(
        dayBookings
          .filter(b => startMins < b.startMins + b.durationMins && startMins + duration > b.startMins && b.coachId)
          .map(b => b.coachId as string)
      )
      return coaches.every(c => busyCoachIds.has(c.coachId))
    }
    // Other self-serve: basic conflict
    const duration = getDuration(typeId)
    return dayBookings.some(b =>
      b.sessionType === getLabel(typeId) &&
      startMins < b.startMins + b.durationMins &&
      startMins + duration > b.startMins
    )
  }

  // Calendar helpers
  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const last  = new Date(calYear, calMonth + 1, 0)
    const days: (Date | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(calYear, calMonth, d))
    return days
  }, [calYear, calMonth])

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // Computed time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedTypeId || !availLoaded) return []
    return getAvailableSlots(selectedDate, selectedTypeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTypeId, availLoaded, facilitySchedule, coachSchedule, exceptions, bitMeta, pricing])

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

    const selfServe  = isSelfServe(selectedTypeId)
    const bookingId  = uid()
    const status     = selfServe ? 'confirmed' : 'pending'
    const dateStr    = dateKey(selectedDate)
    const duration   = getDuration(selectedTypeId)

    // Coach assignment for coached sessions (load balance: fewest bookings today)
    let assignedCoachId: string | null = null
    if (!selfServe) {
      const dow     = selectedDate.getDay()
      const dateStr = dateKey(selectedDate)
      const availCoaches = getAvailableCoachDays(dow, selectedTypeId)
        .filter(c =>
          !isCoachBlockedOnDate(c.coachId, dateStr) &&
          selectedTime >= c.startMins &&
          selectedTime + duration <= c.endMins
        )
      const busySet = new Set(
        dayBookings
          .filter(b => selectedTime < b.startMins + b.durationMins && selectedTime + duration > b.startMins && b.coachId)
          .map(b => b.coachId as string)
      )
      const freeCoaches = availCoaches.filter(c => !busySet.has(c.coachId))
      if (freeCoaches.length === 0 && availCoaches.length === 0) {
        setSubmitError('No coaches are available for this time slot. Please choose another time.')
        setSubmitting(false)
        return
      }
      // Pick coach with fewest total bookings today
      const allCoachIds = (freeCoaches.length > 0 ? freeCoaches : availCoaches).map(c => c.coachId)
      const countByCoach = allCoachIds.map(id => ({
        id,
        count: dayBookings.filter(b => b.coachId === id).length,
      }))
      countByCoach.sort((a, b) => a.count - b.count)
      assignedCoachId = countByCoach[0]?.id ?? null
    }

    const maxCapacity = selectedTypeId === 'casual-shooting' ? 6
      : selectedTypeId === 'small-group' ? 8
      : 1

    const { error: bErr } = await supabase.from('bookings').insert({
      id:            bookingId,
      session_type:  getLabel(selectedTypeId),
      date:          dateStr,
      start_mins:    selectedTime,
      duration_mins: duration,
      booking_type:  membershipTier ? 'member' : 'casual',
      coach_id:      assignedCoachId,
      status,
      notes:         notes.trim() || null,
      max_capacity:  maxCapacity,
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
                { label: 'Session',  value: getLabel(selectedTypeId!) },
                { label: 'Date',     value: fmtDateLong(selectedDate) },
                { label: 'Time',     value: fmtTime(selectedTime) },
                { label: 'Duration', value: fmtDuration(getDuration(selectedTypeId!)) },
                { label: 'Status',   value: selfServe ? 'Confirmed' : 'Pending coach approval' },
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
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {step !== 'type' && (
            <button type="button" onClick={goBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <IconArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Book a Session</h1>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
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

            {!availLoaded ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
                <IconLoader2 size={18} className="animate-spin" />
                Checking availability…
              </div>
            ) : (() => {
              const visibleTypes = enabledTypes.filter(t =>
                typesWithAvailability === null || typesWithAvailability.has(t.id)
              )
              if (visibleTypes.length === 0) {
                return (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
                    <IconAlertCircle size={32} className="text-amber-400" />
                    <p className="font-semibold text-amber-700">No upcoming availability</p>
                    <p className="text-sm text-amber-600">
                      Check back soon or contact us at{' '}
                      <a href="mailto:admin@formula14.com.au" className="underline">admin@formula14.com.au</a>
                    </p>
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {enabledTypes.map(t => {
                    const hasAvail  = typesWithAvailability?.has(t.id) ?? true
                    const label     = getLabel(t.id)
                    const desc      = getDesc(t.id)
                    const duration  = getDuration(t.id)
                    const location  = getLocation(t.id)
                    const selfServe = isSelfServe(t.id)
                    const price     = getPrice(t.id)
                    const reason    = bitSettings[t.id]?.reason ?? ''

                    if (!hasAvail) {
                      // Show greyed-out tile with no availability message
                      return (
                        <div key={t.id}
                          className="flex w-full items-stretch overflow-hidden rounded-2xl bg-white opacity-50"
                          style={{ border: '1.5px solid #e5e7eb' }}>
                          <div className="w-1.5 shrink-0 rounded-l-2xl" style={{ backgroundColor: t.accentColor }} />
                          <div className="flex flex-1 items-center gap-4 px-5 py-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900">{label}</span>
                              </div>
                              <p className="text-xs text-amber-600 font-medium">
                                No upcoming availability — check back soon or contact admin@formula14.com.au
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button key={t.id} type="button"
                        onClick={() => { setSelectedTypeId(t.id); setStep('date') }}
                        className="group flex w-full items-stretch overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md active:scale-[0.99]"
                        style={{ border: '1.5px solid #e5e7eb' }}>
                        <div className="w-1.5 shrink-0 rounded-l-2xl transition-all group-hover:w-2"
                          style={{ backgroundColor: t.accentColor }} />
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
                            {reason && <p className="mt-1 text-xs text-amber-600">{reason}</p>}
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
                            {price && <span className="text-base font-bold text-gray-900">{price}</span>}
                            <span className="text-xs text-gray-300 group-hover:text-gray-400">›</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })()}
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

            {!availLoaded ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
                <IconLoader2 size={18} className="animate-spin" />
                Loading schedule…
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={prevMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                    <IconChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-bold text-gray-800">{MONTH_NAMES[calMonth]} {calYear}</span>
                  <button type="button" onClick={nextMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                    <IconChevronRight size={16} />
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 text-center">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-[11px] font-bold uppercase tracking-wide text-gray-300">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {calDays.map((d, i) => {
                    if (!d) return <div key={`empty-${i}`} />
                    const available = isDateAvailable(d)
                    const selected  = selectedDate ? dateKey(d) === dateKey(selectedDate) : false
                    const isToday   = dateKey(d) === dateKey(today)
                    return (
                      <button key={d.toISOString()} type="button" disabled={!available}
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
                        onMouseLeave={e => { if (available && !selected) (e.currentTarget as HTMLElement).style.backgroundColor = '' }}>
                        <span style={isToday && !selected ? { textDecoration: 'underline', textDecorationColor: ACCENT } : {}}>
                          {d.getDate()}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-4 text-center text-[11px] text-gray-400">
                  Blue dates have coach &amp; facility availability for {getLabel(selectedTypeId)}
                </p>
              </div>
            )}
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
                : 'Select a time within your coach\'s available window.'}
            </p>

            {!availLoaded ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
                <IconLoader2 size={18} className="animate-spin" />
                Loading slots…
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-center text-sm text-amber-700">
                No available slots on this date. Please go back and choose a different date.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {timeSlots.map(slot => {
                    const full = isSlotFull(slot, selectedTypeId)
                    const selfServe = isSelfServe(selectedTypeId)

                    // Spot count for casual-shooting
                    let spotsLabel: string | null = null
                    if (selectedTypeId === 'casual-shooting' && !full) {
                      const used = dayBookings
                        .filter(b =>
                          b.sessionType === getLabel(selectedTypeId) &&
                          slot < b.startMins + b.durationMins &&
                          slot + getDuration(selectedTypeId) > b.startMins
                        )
                        .reduce((acc, b) => acc + b.athleteCount, 0)
                      const remaining = 6 - used
                      if (remaining < 6) spotsLabel = `${remaining} left`
                    }

                    return (
                      <button key={slot} type="button" disabled={full}
                        onClick={() => { setSelectedTime(slot); setStep('confirm') }}
                        className="rounded-xl border py-2.5 text-sm font-medium transition"
                        style={
                          full
                            ? { borderColor: '#e5e7eb', color: '#d1d5db', backgroundColor: '#f9fafb', cursor: 'not-allowed' }
                            : { borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }
                        }
                        onMouseEnter={e => { if (!full) { (e.currentTarget as HTMLElement).style.borderColor = ACCENT; (e.currentTarget as HTMLElement).style.color = ACCENT } }}
                        onMouseLeave={e => { if (!full) { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.color = '#374151' } }}>
                        {full ? (
                          <span className="text-[11px] text-gray-400">Full</span>
                        ) : (
                          <div>
                            <div>{fmtTime(slot)}</div>
                            {spotsLabel && <div className="text-[10px] text-gray-400">{spotsLabel}</div>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-center text-[11px] text-gray-400">
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

            <div className="mb-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
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

            <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Notes for your coach <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any specific goals, focus areas, or information your coach should know…"
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/20" />
            </div>

            {submitError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </div>
            )}

            <button type="button" disabled={submitting} onClick={() => void handleConfirm()}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}>
              {submitting
                ? 'Confirming…'
                : isSelfServe(selectedTypeId) ? 'Confirm Booking' : 'Submit Request'}
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
