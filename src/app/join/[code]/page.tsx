'use client'

import { useState, useEffect } from 'react'
import { IconCalendar, IconClock, IconUser, IconUsers, IconCheck, IconAlertCircle, IconMapPin, IconLink } from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JoinLinkData {
  code: string
  bookingId: string
  sessionType: string
  date: string
  startMins: number
  duration: number
  coachLabel: string
  spaceLabel: string
  athletes: string[]
  capacity: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function minsToLabel(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${suffix}`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function uid() { return Math.random().toString(36).slice(2, 10) }

const ACCENT = '#6BA3D6'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function JoinPage({ params }: { params: { code: string } }) {
  const code = params.code

  const [session, setSession] = useState<JoinLinkData | 'loading' | 'not-found'>('loading')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const registry: Record<string, JoinLinkData> = JSON.parse(localStorage.getItem('f14_joinLinks') || '{}')
      const entry: JoinLinkData | undefined = registry[code]
      setSession(entry ?? 'not-found')
    } catch {
      setSession('not-found')
    }
  }, [code])

  function handleSubmit(asWaitlist: boolean) {
    if (!name.trim()) { setError('Please enter your name.'); return }
    setError('')

    const data = session as JoinLinkData
    const request = {
      id: uid(),
      code,
      bookingId: data.bookingId,
      name: name.trim(),
      email: email.trim(),
      requestedAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
      waitlist: asWaitlist,
    }

    try {
      const existing = JSON.parse(localStorage.getItem('f14_joinRequests') || '[]')
      localStorage.setItem('f14_joinRequests', JSON.stringify([...existing, request]))
    } catch {}

    setSubmitted(true)
    setWaitlisted(asWaitlist)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (session === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f4f6f9' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (session === 'not-found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: '#f4f6f9' }}>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <IconAlertCircle size={28} className="text-red-400" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Link not found</h1>
          <p className="text-sm text-gray-500">This session link is invalid or has expired. Contact your coach for an updated link.</p>
        </div>
      </div>
    )
  }

  const data = session
  const spotsRemaining = Math.max(0, data.capacity - data.athletes.length)
  const isFull = spotsRemaining === 0
  const endMins = data.startMins + data.duration

  // ── Success / submitted ────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: '#f4f6f9' }}>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <IconCheck size={28} className="text-green-600" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {waitlisted ? 'Added to waitlist!' : 'Request sent!'}
          </h1>
          <p className="text-sm text-gray-500">
            {waitlisted
              ? `You're on the waitlist for this session. Your coach will be in touch if a spot becomes available.`
              : `Your coach will review your request and be in touch to confirm. We'll see you on ${fmtDate(data.date)}!`}
          </p>
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">{data.sessionType}</p>
            <p className="text-xs text-gray-500">{fmtDate(data.date)} · {minsToLabel(data.startMins)} – {minsToLabel(endMins)}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: ACCENT }}>
            <IconLink size={16} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">Formula14</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">

        {/* Session card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5" style={{ backgroundColor: ACCENT + '10', borderBottom: `1px solid ${ACCENT}30` }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
              Session invite
            </p>
            <h1 className="mt-1 text-xl font-bold text-gray-900">{data.sessionType}</h1>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <IconCalendar size={16} className="shrink-0 text-gray-400" />
              <span>{fmtDate(data.date)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <IconClock size={16} className="shrink-0 text-gray-400" />
              <span>{minsToLabel(data.startMins)} – {minsToLabel(endMins)} ({data.duration} min)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <IconUser size={16} className="shrink-0 text-gray-400" />
              <span>Coach {data.coachLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <IconMapPin size={16} className="shrink-0 text-gray-400" />
              <span>{data.spaceLabel}</span>
            </div>
          </div>

          {/* Capacity bar */}
          {data.capacity > 0 && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                <div className="flex items-center gap-1.5">
                  <IconUsers size={13} />
                  <span>Spots</span>
                </div>
                <span className={isFull ? 'text-red-500' : 'text-green-600'}>
                  {isFull ? 'Session full' : `${spotsRemaining} of ${data.capacity} available`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (data.athletes.length / data.capacity) * 100)}%`,
                    backgroundColor: isFull ? '#ef4444' : ACCENT,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Request form */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isFull ? 'Join the waitlist' : 'Request to join'}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {isFull
                ? "This session is full, but you can join the waitlist and we'll let you know if a spot opens up."
                : 'Fill in your details and your coach will confirm your spot.'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Your Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Jordan Mitchell"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]/20"
              style={{ outlineColor: ACCENT }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. jordan@example.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-[#6BA3D6]/20"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="button"
            onClick={() => handleSubmit(isFull)}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: isFull ? '#6b7280' : ACCENT }}
          >
            {isFull ? 'Join Waitlist' : 'Request to Join'}
          </button>

          <p className="text-center text-[11px] text-gray-400">
            Your request will be reviewed by the coach before confirmation.
          </p>
        </div>
      </main>
    </div>
  )
}
