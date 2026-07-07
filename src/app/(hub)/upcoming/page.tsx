'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES } from '@/lib/sessionTypes'
import { IconCalendar, IconClock, IconUser, IconMapPin, IconUsers, IconLoader2 } from '@tabler/icons-react'

const ACCENT = '#6BA3D6'

const COACH_NAMES: Record<string, string> = {
  matt: 'Matt', jade: 'Jade', sam: 'Sam',
  s1: 'Matt', s2: 'Jade', s3: 'Sam',
}

const SPACE_LABELS: Record<string, string> = {
  primary:   'Primary Station',
  secondary: 'Secondary Station',
  shooting:  'Shooting Bay',
  meeting:   'Meeting Room',
  'weight-room': 'Weight Room',
}

function sydneyToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h} hr ${m} min`
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${m} min`
}

function fmtDateHeading(dateStr: string, todayStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date(todayStr + 'T12:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const weekday = d.toLocaleDateString('en-AU', { weekday: 'long' })
  const full = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  if (diff === 0) return `Today — ${weekday}, ${full}`
  if (diff === 1) return `Tomorrow — ${weekday}, ${full}`
  return `${weekday}, ${full}`
}

interface UpcomingBooking {
  id: string
  date: string
  startMins: number
  duration: number
  sessionType: string
  athletes: string[]
  coach: string
  spaceId: string
  notes: string
}

export default function UpcomingPage() {
  const [bookings, setBookings] = useState<UpcomingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const todayStr = sydneyToday()

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, date, start_mins, duration_mins, session_type, coach_id, space, athlete_names, notes, booking_athletes(athletes(first_name, last_name))')
        .gte('date', todayStr)
        .not('status', 'eq', 'cancelled')
        .order('date')
        .order('start_mins')

      if (!error && data) {
        setBookings(data.map(row => {
          const stored = ((row.athlete_names as string[]) ?? []).filter(Boolean)
          const joined = ((row.booking_athletes as unknown as { athletes: { first_name: string; last_name: string } | null }[] | null) ?? [])
            .map(ba => ba.athletes ? `${ba.athletes.first_name} ${ba.athletes.last_name}`.trim() : '')
            .filter(Boolean)
          return {
            id:          row.id,
            date:        row.date,
            startMins:   row.start_mins ?? 0,
            duration:    row.duration_mins ?? 60,
            sessionType: row.session_type ?? '',
            athletes:    stored.length > 0 ? stored : joined,
            coach:       row.coach_id ?? '',
            spaceId:     row.space ?? 'primary',
            notes:       row.notes ?? '',
          }
        }))
      }
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Group by date
  const grouped = bookings.reduce<Record<string, UpcomingBooking[]>>((acc, b) => {
    ;(acc[b.date] ??= []).push(b)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  return (
    <div className="min-h-full p-6 md:p-8" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Bookings</h1>
          <p className="mt-1 text-sm text-gray-400">All confirmed sessions from today onwards.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 size={28} className="animate-spin text-gray-300" />
          </div>
        )}

        {!loading && dates.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
            <IconCalendar size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No upcoming bookings</p>
            <p className="mt-1 text-xs text-gray-400">Bookings will appear here once they are created.</p>
          </div>
        )}

        {/* Date groups */}
        <div className="space-y-8">
          {dates.map(date => (
            <div key={date}>
              {/* Date heading */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700">
                  {fmtDateHeading(date, todayStr)}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                  {grouped[date].length} session{grouped[date].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Booking bars */}
              <div className="space-y-2.5">
                {grouped[date].map(b => {
                  const typeDef = CANONICAL_SESSION_TYPES.find(t => t.id === b.sessionType)
                  const color = typeDef?.accentColor ?? ACCENT
                  const label = typeDef?.label ?? b.sessionType ?? 'Session'
                  const endMins = b.startMins + b.duration
                  const coachName = b.coach ? (COACH_NAMES[b.coach] ?? b.coach) : null
                  const space = SPACE_LABELS[b.spaceId] ?? b.spaceId

                  return (
                    <div
                      key={b.id}
                      className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      {/* Color stripe */}
                      <div className="w-1 shrink-0" style={{ backgroundColor: color }} />

                      {/* Content */}
                      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5">

                        {/* Session type */}
                        <div className="min-w-[160px]">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: `${color}1a`, color }}
                          >
                            {label}
                          </span>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <IconClock size={13} className="shrink-0 text-gray-400" />
                          <span className="font-medium">{fmtTime(b.startMins)}</span>
                          <span className="text-gray-400">–</span>
                          <span className="font-medium">{fmtTime(endMins)}</span>
                          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                            {fmtDuration(b.duration)}
                          </span>
                        </div>

                        {/* Athletes */}
                        {b.athletes.length > 0 && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <IconUsers size={13} className="shrink-0 text-gray-400" />
                            <span>{b.athletes.join(', ')}</span>
                          </div>
                        )}

                        {/* Coach */}
                        {coachName && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <IconUser size={13} className="shrink-0 text-gray-400" />
                            <span>{coachName}</span>
                          </div>
                        )}

                        {/* Space */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-400">
                          <IconMapPin size={13} className="shrink-0" />
                          <span>{space}</span>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
