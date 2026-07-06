'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useActiveAthlete } from '@/lib/activeAthlete'
import {
  IconCalendar, IconFlame, IconCurrencyDollar, IconTrophy,
  IconCheck, IconX, IconChevronRight,
  IconBook, IconTarget,
  IconMoodSmile, IconLayoutDashboard, IconCards, IconUser,
} from '@tabler/icons-react'

const ACCENT = '#6BA3D6'
const TODAY  = new Date().toISOString().split('T')[0]

// ─── Data ─────────────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "Hard work beats talent when talent doesn't work hard.", author: 'Tim Notke' },
  { text: "Champions keep playing until they get it right.", author: 'Billie Jean King' },
  { text: "The key is not the will to win — it's the will to prepare to win.", author: 'Bobby Knight' },
  { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { text: "I've missed more than 9,000 shots in my career. That's why I succeed.", author: 'Michael Jordan' },
  { text: "Talent wins games, but teamwork and intelligence win championships.", author: 'Michael Jordan' },
  { text: "The more I practise, the luckier I get.", author: 'Gary Player' },
  { text: "Push yourself, because no one else is going to do it for you.", author: 'Unknown' },
  { text: "Don't tell me how talented you are. Tell me how hard you work.", author: 'Arthur Rubinstein' },
  { text: "It's not about the size of the dog in the fight, but the size of the fight in the dog.", author: 'Archie Griffin' },
  { text: "Success is no accident. It is hard work, perseverance, learning and sacrifice.", author: 'Pelé' },
  { text: "Set your goals high, and don't stop until you get there.", author: 'Bo Jackson' },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: 'Jimmy Johnson' },
  { text: "Winning is not a sometime thing; it's an all-time thing.", author: 'Vince Lombardi' },
]

function getDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const day   = Math.floor((Date.now() - start.getTime()) / 86400000)
  return QUOTES[day % QUOTES.length]
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtLongDate() {
  return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const UPCOMING_SESSIONS = [
  { id: 'us1', date: '2026-06-28', day: 'Tuesday',  time: '4:30 PM', type: 'Small Group',     coach: 'Coach Matt',  space: 'Main Court',  status: 'confirmed' },
  { id: 'us2', date: '2026-07-01', day: 'Friday',   time: '9:00 AM', type: 'Individual 1:1',  coach: 'Coach Matt',  space: 'Half Court',  status: 'confirmed' },
  { id: 'us3', date: '2026-07-05', day: 'Tuesday',  time: '4:30 PM', type: 'Small Group',     coach: 'Coach Jade',  space: 'Main Court',  status: 'pending'   },
  { id: 'us4', date: '2026-07-08', day: 'Friday',   time: '9:00 AM', type: 'Individual 1:1',  coach: 'Coach Matt',  space: 'Half Court',  status: 'confirmed' },
]

const NOTIFICATIONS = [
  { id: 'n1', icon: '✅', text: 'Your booking for Small Group on Tue 28 Jun was confirmed.',  time: '2h ago'   },
  { id: 'n2', icon: '💬', text: 'Coach Matt left a note on your goal "Make the U18 rep squad".', time: 'Yesterday' },
  { id: 'n3', icon: '📅', text: 'Reminder: You have a session this Tuesday at 4:30 PM.',     time: 'Today'    },
  { id: 'n4', icon: '🏀', text: 'New program available — Snipers Club starting Monday 6 Jul.', time: '3d ago'  },
]

const MEMBERSHIP = {
  plan: 'Gold',
  price: '$75',
  billingFreq: 'per week',
  nextBilling: '7 Jul 2026',
  credits: [
    { label: 'Small Group',    used: 1, total: 3 },
    { label: 'Individual 1:1', used: 0, total: 1 },
    { label: 'Elite Program',  used: 0, total: 0 },
  ],
}

const FEELING_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Not great'     },
  { value: 2, emoji: '😕', label: 'Below average' },
  { value: 3, emoji: '😐', label: 'Okay'          },
  { value: 4, emoji: '😊', label: 'Good'          },
  { value: 5, emoji: '😄', label: 'Great'         },
]

interface CheckIn { feeling: number; note: string }
interface HabitRow { id: string; name: string; type: string; completions: Record<string, boolean>; frequency: string; customDays: number[] }
interface GoalRow  { id: string; title: string; targetDate: string; milestones: { completed: boolean; text: string }[] }

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompletionRing({ done, total }: { done: number; total: number }) {
  const pct  = total === 0 ? 0 : Math.round((done / total) * 100)
  const r    = 30
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      <circle cx="40" cy="40" r={r} fill="none"
        stroke={pct === 100 ? '#10b981' : ACCENT} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x="40" y="36" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#111827">{done}</text>
      <text x="40" y="50" textAnchor="middle" fontSize="10" fill="#9ca3af">of {total}</text>
    </svg>
  )
}

function SnapshotCard({ icon, label, value, sub, color = ACCENT, onClick }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color?: string; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-left transition hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: color + '18' }}>
        <span style={{ color }}>{icon}</span>
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </button>
  )
}

// ─── How We Feel Modal ────────────────────────────────────────────────────────

function HowWeFeelModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (c: CheckIn) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [note,     setNote]     = useState('')

  function submit() {
    if (!selected) return
    onSubmit({ feeling: selected, note: note.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-6 py-5 text-center">
          <div className="mb-1 text-2xl">🏀</div>
          <h2 className="text-lg font-bold text-gray-900">How are you feeling today?</h2>
          <p className="mt-1 text-sm text-gray-400">Your check-in helps your coach understand how you're tracking</p>
        </div>

        <div className="flex justify-center gap-3 px-6 pb-4">
          {FEELING_OPTIONS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelected(f.value)}
              className="flex flex-col items-center gap-1 transition-all"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all"
                style={selected === f.value ? { backgroundColor: ACCENT + '20', boxShadow: `0 0 0 2px ${ACCENT}` } : { backgroundColor: '#f3f4f6' }}
              >
                {f.emoji}
              </span>
              <span className={`text-[10px] font-semibold ${selected === f.value ? 'text-gray-800' : 'text-gray-400'}`}>{f.label}</span>
            </button>
          ))}
        </div>

        <div className="px-6 pb-4">
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional — add a note for your coach…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
          />
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={submit} disabled={!selected}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            Check In
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cancel Session Dialog ────────────────────────────────────────────────────

function CancelDialog({ sessionLabel, onCancel, onClose }: {
  sessionLabel: string; onCancel: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 font-bold text-gray-900">Cancel session?</h3>
        <p className="mb-4 text-sm text-gray-500">Cancel <strong>{sessionLabel}</strong>? This action can't be undone.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Keep it</button>
          <button onClick={onCancel} className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">Yes, cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AthleteDashboard() {
  const { data: session } = useSession()
  const { activeId: athleteId } = useActiveAthlete()
  const name   = session?.user?.name ?? 'Athlete'
  const userId = session?.user?.id
  const quote  = getDailyQuote()

  // State
  const [habits,        setHabits]        = useState<HabitRow[]>([])
  const [goals,         setGoals]         = useState<GoalRow[]>([])
  const [checkIn,       setCheckIn]       = useState<CheckIn | null>(null)
  const [sessions,      setSessions]      = useState(UPCOMING_SESSIONS)
  const [showFeelModal, setShowFeelModal] = useState(false)
  const [cancelTarget,  setCancelTarget]  = useState<typeof UPCOMING_SESSIONS[0] | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)
  const [profilePct,    setProfilePct]    = useState<number | null>(null)
  const [daysLeft,      setDaysLeft]      = useState<number | null>(null)

  // Load from localStorage; show welcome toast and profile prompt when appropriate
  useEffect(() => {
    try {
      const raw = localStorage.getItem('f14_habits')
      if (raw) setHabits(JSON.parse(raw))
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem('f14_goals')
      if (raw) setGoals(JSON.parse(raw))
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(`f14_athlete_checkin_${TODAY}`)
      if (raw) setCheckIn(JSON.parse(raw))
    } catch { /* ignore */ }

    // Welcome message set by signup page after first registration
    try {
      const msg = localStorage.getItem('f14_welcome_msg')
      if (msg) {
        showToast(msg)
        localStorage.removeItem('f14_welcome_msg')
      }
    } catch { /* ignore */ }
  }, [])

  // Profile completion banner
  useEffect(() => {
    try {
      const lsKey = athleteId ? `f14_profile_wizard_${athleteId}` : 'f14_profile_wizard'
      const raw = localStorage.getItem(lsKey)
      const p   = raw ? JSON.parse(raw) : {}
      const completedSteps: number[] = Array.isArray(p.completedSteps) ? p.completedSteps : []
      const WEIGHTS: Record<number, number> = { 1:20, 2:5, 3:5, 4:10, 5:15, 6:10, 7:5, 8:10, 9:5, 10:5, 11:10 }
      const pct = completedSteps.reduce((sum, n) => sum + (WEIGHTS[n] ?? 0), 0)
      setProfilePct(pct)
    } catch { setProfilePct(0) }

    // 7-day countdown from first dashboard visit
    try {
      const key = userId ? `f14_created_at_${userId}` : 'f14_created_at'
      let ts = parseInt(localStorage.getItem(key) ?? '0')
      if (!ts) { ts = Date.now(); localStorage.setItem(key, String(ts)) }
      const daysSince = Math.floor((Date.now() - ts) / 86400000)
      setDaysLeft(Math.max(0, 7 - daysSince))
    } catch { setDaysLeft(null) }
  }, [userId, athleteId])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Habits for today
  const todayDate      = new Date()
  const todayDow       = todayDate.getDay()
  const scheduledToday = habits.filter(h => {
    if (h.frequency === 'daily') return true
    if (h.frequency === 'weekdays') return todayDow >= 1 && todayDow <= 5
    return Array.isArray(h.customDays) && h.customDays.includes(todayDow)
  })
  const doneToday  = scheduledToday.filter(h => h.completions?.[TODAY])
  const habitStreak = habits.length > 0
    ? Math.max(...habits.map(h => calcStreak(h)))
    : 0

  function calcStreak(h: HabitRow): number {
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 100; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const dow = d.getDay()
      const sched = h.frequency === 'daily' ? true
        : h.frequency === 'weekdays' ? dow >= 1 && dow <= 5
        : Array.isArray(h.customDays) && h.customDays.includes(dow)
      if (sched) {
        if (h.completions?.[key]) { streak++ }
        else if (i === 0) { d.setDate(d.getDate()-1); continue }
        else break
      }
      d.setDate(d.getDate()-1)
    }
    return streak
  }

  const toggleHabit = useCallback((id: string) => {
    setHabits(prev => {
      const next = prev.map(h => {
        if (h.id !== id) return h
        const done = !!h.completions?.[TODAY]
        const completions = { ...h.completions }
        if (done) delete completions[TODAY]; else completions[TODAY] = true
        return { ...h, completions }
      })
      localStorage.setItem('f14_habits', JSON.stringify(next))
      return next
    })
  }, [])

  // Goals
  function goalPct(g: GoalRow) {
    if (!g.milestones?.length) return 0
    return Math.round(g.milestones.filter(m => m.completed).length / g.milestones.length * 100)
  }
  function daysUntil(iso: string) {
    const d = new Date(iso), n = new Date(TODAY)
    return Math.ceil((d.getTime() - n.getTime()) / 86400000)
  }
  const activeGoals = goals.filter(g => goalPct(g) < 100 && daysUntil(g.targetDate) >= 0)

  // Sessions
  function sessionIsWithin2Hours(s: typeof UPCOMING_SESSIONS[0]) {
    const dt = new Date(`${s.date}T${s.time.replace(' AM','').replace(' PM','')}`)
    if (s.time.includes('PM') && !s.time.startsWith('12')) dt.setHours(dt.getHours() + 12)
    return (dt.getTime() - Date.now()) < 2 * 60 * 60 * 1000
  }
  function cancelSession(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id))
    showToast('Session cancelled.')
  }

  // Check-in
  function submitCheckIn(c: CheckIn) {
    setCheckIn(c)
    localStorage.setItem(`f14_athlete_checkin_${TODAY}`, JSON.stringify(c))
    showToast('Check-in recorded! 🎉')
  }

  const feelingObj = checkIn ? FEELING_OPTIONS.find(f => f.value === checkIn.feeling) : null
  const nextSession = sessions[0]

  // Outstanding balance: $0 for demo
  const balance = 0

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header / Greeting ─────────────────────────────────────────────── */}
      <div className="px-4 py-6" style={{ background: `linear-gradient(135deg, ${ACCENT}12 0%, transparent 60%)` }}>
        <p className="text-2xl font-bold text-gray-900">{getGreeting()}, {name} 👋</p>
        <p className="mt-0.5 text-sm text-gray-400">{fmtLongDate()}</p>
        <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 backdrop-blur-sm shadow-sm">
          <p className="text-sm italic text-gray-700 leading-snug">"{quote.text}"</p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">— {quote.author}</p>
        </div>
      </div>

      <div className="space-y-5 px-4">

        {/* ── Finish Set Up Banner ───────────────────────────────────────── */}
        {profilePct !== null && profilePct < 100 && (
          <Link
            href="/athlete/profile/complete"
            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fcd34d' }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: '#fef3c7' }}>
              <IconUser size={20} style={{ color: '#d97706' }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Finish setting up your profile</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Help your coach personalise your training</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 max-w-[120px] h-1.5 overflow-hidden rounded-full bg-amber-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${profilePct}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-amber-600">{profilePct}%</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {daysLeft !== null && daysLeft > 0 && (
                <p className="text-xs font-bold text-amber-600">{daysLeft}d left</p>
              )}
              {daysLeft === 0 && (
                <p className="text-xs font-bold text-red-500">Overdue</p>
              )}
              <span className="mt-1 inline-block rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-white">
                Complete →
              </span>
            </div>
          </Link>
        )}

        {/* ── Snapshot Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SnapshotCard
            icon={<IconCalendar size={18} />}
            label="Next Session"
            value={nextSession ? nextSession.time : '—'}
            sub={nextSession ? `${nextSession.day} · ${nextSession.type}` : 'No sessions booked'}
          />
          <SnapshotCard
            icon={<IconCards size={18} />}
            label="Weekly Credits"
            value={`${3 - MEMBERSHIP.credits[0].used} of ${MEMBERSHIP.credits[0].total}`}
            sub="Small Group remaining"
            color="#8b5cf6"
          />
          <SnapshotCard
            icon={<IconFlame size={18} />}
            label="Current Streak"
            value={`${habitStreak}d`}
            sub={habitStreak > 0 ? '🔥 Keep it going!' : 'Start your streak today'}
            color="#f59e0b"
          />
          <SnapshotCard
            icon={<IconCurrencyDollar size={18} />}
            label="Outstanding"
            value={balance === 0 ? '$0' : `$${balance}`}
            sub={balance === 0 ? 'All clear 🎉' : 'Payment overdue'}
            color={balance === 0 ? '#10b981' : '#ef4444'}
          />
        </div>

        {/* ── Upcoming Sessions ──────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Upcoming Sessions</h2>
            <Link href="/athlete/book" className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>
              + Book
            </Link>
          </div>
          {sessions.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No sessions booked. <Link href="/athlete/book" className="font-semibold underline" style={{ color: ACCENT }}>Book one now</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sessions.slice(0, 4).map(s => {
                const locked = sessionIsWithin2Hours(s)
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{s.day}, {new Date(s.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                        <span className="text-xs text-gray-400">{s.time}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={s.status === 'confirmed' ? { backgroundColor: '#dcfce7', color: '#15803d' } : { backgroundColor: '#fef9c3', color: '#854d0e' }}
                        >
                          {s.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{s.type} · {s.coach} · {s.space}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => !locked && setCancelTarget(s)}
                      disabled={locked}
                      title={locked ? 'Within 2-hour lockout window' : 'Cancel session'}
                      className="shrink-0 rounded-lg p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <IconX size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Habits + Goals row ─────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Daily Habits */}
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Daily Habits</h2>
              <div className="shrink-0">
                <CompletionRing done={doneToday.length} total={scheduledToday.length} />
              </div>
            </div>
            {scheduledToday.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No habits set up yet.{' '}
                <Link href="/athlete/goals" className="font-semibold underline" style={{ color: ACCENT }}>Set them up</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {scheduledToday.map(h => {
                  const done   = !!h.completions?.[TODAY]
                  const streak = calcStreak(h)
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabit(h.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-50"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                        style={done ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { borderColor: '#d1d5db' }}
                      >
                        {done && <IconCheck size={15} color="white" strokeWidth={3} />}
                      </span>
                      <span className={`flex-1 text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{h.name}</span>
                      {streak > 0 && (
                        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">🔥{streak}d</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="border-t border-gray-50 px-5 py-3">
              <Link href="/athlete/goals" className="flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>
                View all habits <IconChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* My Goals */}
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">My Goals</h2>
              <IconTrophy size={18} style={{ color: ACCENT }} />
            </div>
            {activeGoals.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No active goals.{' '}
                <Link href="/athlete/goals" className="font-semibold underline" style={{ color: ACCENT }}>Set a goal</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeGoals.slice(0, 3).map(g => {
                  const pct  = goalPct(g)
                  const days = daysUntil(g.targetDate)
                  const next = g.milestones?.find(m => !m.completed)
                  return (
                    <div key={g.id} className="px-5 py-3.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 leading-snug truncate flex-1">{g.title}</p>
                        <span className="shrink-0 text-xs font-bold" style={{ color: ACCENT }}>{pct}%</span>
                      </div>
                      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>{days}d remaining</span>
                        {next && <span className="truncate">Next: {next.text}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="border-t border-gray-50 px-5 py-3">
              <Link href="/athlete/goals" className="flex items-center gap-1 text-xs font-semibold" style={{ color: ACCENT }}>
                View all goals <IconChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── How We Feel Check-In ───────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={checkIn ? { backgroundColor: '#f0fdf4', border: '1.5px solid #86efac' } : { backgroundColor: 'white' }}
        >
          {checkIn && feelingObj ? (
            <div className="flex items-center gap-4">
              <span className="text-4xl">{feelingObj.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">Checked in for today</p>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">Done ✓</span>
                </div>
                <p className="text-sm text-gray-500">Feeling: {feelingObj.label}{checkIn.note ? ` · "${checkIn.note}"` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: ACCENT + '15' }}>
                <IconMoodSmile size={24} style={{ color: ACCENT }} />
              </span>
              <div className="flex-1">
                <p className="font-bold text-gray-900">How are you feeling today?</p>
                <p className="text-sm text-gray-400">Your daily check-in helps Coach Matt tailor your sessions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeelModal(true)}
                className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Check In
              </button>
            </div>
          )}
        </div>

        {/* ── Notifications + Membership row ────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Notifications */}
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Recent Activity</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{NOTIFICATIONS.length}</span>
            </div>
            <ul className="divide-y divide-gray-50">
              {NOTIFICATIONS.map(n => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 text-lg">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Membership */}
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">Membership</h2>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                {MEMBERSHIP.plan}
              </span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-gray-900">{MEMBERSHIP.price}<span className="text-sm font-medium text-gray-400">{MEMBERSHIP.billingFreq}</span></p>
                  <p className="text-xs text-gray-400">Next billing: {MEMBERSHIP.nextBilling}</p>
                </div>
              </div>
              <div className="space-y-2">
                {MEMBERSHIP.credits.filter(c => c.total > 0).map(c => (
                  <div key={c.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-600">{c.label}</span>
                      <span className="font-semibold text-gray-700">{c.used}/{c.total} used</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${(c.used / c.total) * 100}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/athlete/book" className="block text-center rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">
                Manage Membership
              </Link>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Book a Session',    href: '/athlete/book',         icon: <IconCalendar size={20} />,       color: ACCENT      },
              { label: 'My Bookings',       href: '/athlete/bookings',     icon: <IconLayoutDashboard size={20} />, color: '#8b5cf6'  },
              { label: 'Check In',          href: '#',               icon: <IconMoodSmile size={20} />,      color: '#10b981', action: () => setShowFeelModal(true) },
              { label: 'Message Coach',     href: '#',               icon: <IconBook size={20} />,           color: '#f59e0b', disabled: true },
              { label: 'Leaderboard',       href: '/shooting-test',  icon: <IconTarget size={20} />,         color: '#ef4444'  },
            ].map(a => (
              <button
                key={a.label}
                type="button"
                onClick={a.action ?? (a.disabled ? undefined : () => { window.location.href = a.href })}
                disabled={a.disabled}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md disabled:opacity-40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: a.color + '18' }}>
                  <span style={{ color: a.color }}>{a.icon}</span>
                </span>
                <span className="text-center text-xs font-semibold text-gray-700">{a.label}</span>
                {a.disabled && <span className="text-[10px] text-gray-400">Coming soon</span>}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showFeelModal && (
        <HowWeFeelModal onClose={() => setShowFeelModal(false)} onSubmit={submitCheckIn} />
      )}
      {cancelTarget && (
        <CancelDialog
          sessionLabel={`${cancelTarget.type} on ${cancelTarget.day} ${cancelTarget.time}`}
          onCancel={() => { cancelSession(cancelTarget.id); setCancelTarget(null) }}
          onClose={() => setCancelTarget(null)}
        />
      )}
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-4 left-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl sm:left-auto sm:right-6 sm:w-auto">
          {toast}
          <button onClick={() => setToast(null)} className="rounded-full p-0.5 hover:bg-white/10"><IconX size={14} /></button>
        </div>
      )}
    </div>
  )
}
