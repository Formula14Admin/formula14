'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useActiveAthlete } from '@/lib/activeAthlete'
import { supabase } from '@/lib/supabase'
import { IconCalendarPlus, IconX, IconChevronRight } from '@tabler/icons-react'

const ACCENT = '#6BA3D6'

const COACH_NAMES: Record<string, string> = {
  matt: 'Matt', jade: 'Jade', sam: 'Sam',
  s1: 'Matt', s2: 'Jade', s3: 'Sam',
}

type Booking = {
  id: string
  date: string
  day: string
  time: string
  endTime: string
  type: string
  coach: string | null
  space: string | null
  status: string
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function MyBookingsPage() {
  const { activeId: athleteId } = useActiveAthlete()
  const [upcoming, setUpcoming] = useState<Booking[]>([])
  const [past,     setPast]     = useState<Booking[]>([])
  const [loading,  setLoading]  = useState(true)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelling,   setCancelling]   = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const loadBookings = useCallback(async () => {
    if (!athleteId) return
    setLoading(true)
    const { data } = await supabase
      .from('booking_athletes')
      .select('bookings(id, date, start_mins, duration_mins, session_type, coach_id, space, status)')
      .eq('athlete_id', athleteId)

    type Raw = { id: string; date: string; start_mins: number; duration_mins: number | null; session_type: string; coach_id: string | null; space: string | null; status: string | null }

    const all = ((data ?? []) as unknown as { bookings: Raw | null }[])
      .map(r => r.bookings)
      .filter((b): b is Raw => !!b && b.status !== 'cancelled')
      .map(b => ({
        id:      b.id,
        date:    b.date,
        day:     new Date(b.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long' }),
        time:    fmtMins(b.start_mins),
        endTime: fmtMins(b.start_mins + (b.duration_mins ?? 60)),
        type:    b.session_type ?? '',
        coach:   b.coach_id ? (COACH_NAMES[b.coach_id] ?? b.coach_id) : null,
        space:   b.space ?? null,
        status:  b.status ?? 'confirmed',
      }))

    setUpcoming(all.filter(b => b.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
    setPast(all.filter(b => b.date < today).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)))
    setLoading(false)
  }, [athleteId, today])

  useEffect(() => { void loadBookings() }, [loadBookings])

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', cancelTarget.id)
    setUpcoming(prev => prev.filter(b => b.id !== cancelTarget.id))
    setCancelTarget(null)
    setCancelling(false)
    showToast('Session cancelled.')
  }

  const statusStyle = (s: string) =>
    s === 'confirmed' ? { bg: '#dcfce7', color: '#15803d' }
    : s === 'pending' ? { bg: '#fef9c3', color: '#854d0e' }
    : { bg: '#f3f4f6', color: '#6b7280' }

  function BookingCard({ b, showCancel }: { b: Booking; showCancel?: boolean }) {
    const st = statusStyle(b.status)
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Date badge */}
          <div className="flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 text-center"
            style={{ backgroundColor: `${ACCENT}15` }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
              {new Date(b.date + 'T12:00:00').toLocaleDateString('en-AU', { month: 'short' })}
            </span>
            <span className="text-lg font-bold leading-none" style={{ color: ACCENT }}>
              {new Date(b.date + 'T12:00:00').getDate()}
            </span>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{b.type}</p>
            <p className="text-xs text-gray-500">
              {b.day.slice(0, 3)}, {fmtDateShort(b.date)} · {b.time}–{b.endTime}
            </p>
            {b.coach && <p className="text-xs text-gray-400">Coach: {b.coach}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize"
            style={{ backgroundColor: st.bg, color: st.color }}>
            {b.status}
          </span>
          {showCancel && (
            <button
              onClick={() => setCancelTarget(b)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition hover:bg-red-50 hover:text-red-400"
              title="Cancel session"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16 px-4 pt-6" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
        <Link
          href="/athlete/book"
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <IconCalendarPlus size={14} /> Book Session
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          {/* ── Upcoming ── */}
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-400">No upcoming sessions.</p>
                <Link
                  href="/athlete/book"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: ACCENT }}
                >
                  Book one now <IconChevronRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map(b => <BookingCard key={b.id} b={b} showCancel />)}
              </div>
            )}
          </section>

          {/* ── Past ── */}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                Past ({past.length})
              </h2>
              <div className="space-y-2.5 opacity-60">
                {past.slice(0, 10).map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900">Cancel session?</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              {cancelTarget.type} on {fmtDate(cancelTarget.date)} at {cancelTarget.time}
            </p>
            <p className="mt-3 text-xs text-gray-400">This cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Keep it
              </button>
              <button
                disabled={cancelling}
                onClick={confirmCancel}
                className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
