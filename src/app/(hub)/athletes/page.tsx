'use client'

import { useState, useMemo } from 'react'
import {
  IconX,
  IconSearch,
  IconUserPlus,
  IconMail,
  IconPhone,
  IconCalendar,
  IconSchool,
  IconTarget,
  IconNotes,
  IconBallBasketball,
  IconHeartHandshake,
  IconChevronRight,
  IconUser,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | ''
type Gender = 'Male' | 'Female' | 'Other'
type MembershipPlan = 'bronze' | 'silver' | 'gold' | 'platinum'
type MembershipStatus = 'active' | 'cancelling' | 'overdue' | 'inactive'

interface RecentSession {
  date: string
  type: string
  coach: string
  space: string
}

interface Athlete {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  gender: Gender
  position: Position
  repClub: string
  school: string
  joined: string
  membership: { plan: MembershipPlan | null; status: MembershipStatus | null }
  sessionsTotal: number
  sessionsThisMonth: number
  lastSession: string | null
  goals: string
  coachNotes: string
  emergency: { name: string; phone: string; relationship: string }
  recentSessions: RecentSession[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const POSITION_COLOR: Record<string, string> = {
  PG: '#6BA3D6',
  SG: '#14b8a6',
  SF: '#6BAD6B',
  PF: '#f97316',
  C:  '#7C3AED',
}

const PLAN_INFO: Record<MembershipPlan, { label: string; price: number; monthlyQuota: number | null; color: string }> = {
  bronze:   { label: 'Bronze',   price: 35,  monthlyQuota: 8,    color: '#B87333' },
  silver:   { label: 'Silver',   price: 50,  monthlyQuota: 12,   color: '#64748B' },
  gold:     { label: 'Gold',     price: 75,  monthlyQuota: 20,   color: '#D4A843' },
  platinum: { label: 'Platinum', price: 100, monthlyQuota: null, color: '#7C3AED' },
}

const MEMBER_CARD = { bg: '#EFF6FF', border: '#BFDBFE', selectedBorder: ACCENT }
const CASUAL_CARD = { bg: '#F0FDF4', border: '#BBF7D0', selectedBorder: '#16a34a' }

const STATUS_STYLE: Record<MembershipStatus, { bg: string; color: string; dot: string; label: string }> = {
  active:     { bg: '#dcfce7', color: '#15803d', dot: '#22c55e', label: 'Active' },
  cancelling: { bg: '#fef9c3', color: '#92400e', dot: '#f59e0b', label: 'Cancelling' },
  overdue:    { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444', label: 'Overdue' },
  inactive:   { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af', label: 'Inactive' },
}

const AVATAR_COLORS = [
  '#6BA3D6', '#6BAD6B', '#D4A843', '#B06BAD',
  '#14b8a6', '#f97316', '#7C3AED', '#AD6B7A',
  '#6BA8C4', '#e11d48',
]

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

// ─── Sample athletes ──────────────────────────────────────────────────────────

const INIT_ATHLETES: Athlete[] = [
  {
    id: 'a1',
    firstName: 'Liam', lastName: 'Carter',
    email: 'liam.carter@gmail.com', phone: '0412 345 678',
    dob: '2009-08-15', gender: 'Male', position: 'PG',
    repClub: 'Ringwood Hawks', school: 'Whitefriars College',
    joined: '2024-02-12',
    membership: { plan: 'bronze', status: 'active' },
    sessionsTotal: 68, sessionsThisMonth: 6, lastSession: '2026-06-17',
    goals: 'Improve point guard decision-making under pressure. Work on left-hand drive and pick-and-roll reads.',
    coachNotes: 'Strong work ethic, always early to sessions. Tendency to over-dribble when pressured — keep reinforcing quick-release decisions. Huge upside.',
    emergency: { name: 'Karen Carter', phone: '0403 111 222', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-17', type: 'Individual Work Out', coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-13', type: 'Small Group Session', coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-10', type: 'Volume Shooting',    coach: 'Matt', space: 'Shooting Bay' },
    ],
  },
  {
    id: 'a2',
    firstName: 'Jordan', lastName: 'Williams',
    email: 'jordan.williams@outlook.com', phone: '0421 567 890',
    dob: '2008-11-03', gender: 'Male', position: 'SG',
    repClub: 'Melbourne Tigers', school: 'De La Salle College',
    joined: '2023-08-07',
    membership: { plan: 'silver', status: 'active' },
    sessionsTotal: 142, sessionsThisMonth: 10, lastSession: '2026-06-18',
    goals: 'Sharpen off-ball movement and catch-and-shoot mechanics. Improve defensive positioning on ball screens.',
    coachNotes: 'Athletically gifted. Needs to trust his shot more in game situations — practice numbers don\'t match his in-game hesitation. Great teammate and leader.',
    emergency: { name: 'Denise Williams', phone: '0418 223 334', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-18', type: 'Small Group Session',    coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-12', type: 'Film Review',            coach: 'Matt', space: 'Meeting Room' },
    ],
  },
  {
    id: 'a3',
    firstName: 'Aisha', lastName: 'Thompson',
    email: 'aisha.thompson@icloud.com', phone: '0437 891 234',
    dob: '2011-02-22', gender: 'Female', position: 'PF',
    repClub: 'Dandenong Rangers', school: 'Killester College',
    joined: '2024-05-20',
    membership: { plan: 'gold', status: 'active' },
    sessionsTotal: 89, sessionsThisMonth: 8, lastSession: '2026-06-17',
    goals: 'Develop face-up game from the elbow. Improve free throw consistency (targeting 75%+ this season).',
    coachNotes: 'One of the most coachable athletes we have. Hard worker who raises the intensity around her. Targeting U18 representative squad next season — she\'ll be ready.',
    emergency: { name: 'Diane Thompson', phone: '0409 445 556', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-17', type: 'Individual Work Out',    coach: 'Jade', space: 'Secondary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-11', type: 'Small Group Session',    coach: 'Jade', space: 'Secondary Station' },
    ],
  },
  {
    id: 'a4',
    firstName: 'Marcus', lastName: 'Davies',
    email: 'marcus.davies@gmail.com', phone: '0445 012 345',
    dob: '2007-05-10', gender: 'Male', position: 'C',
    repClub: 'Knox Raiders', school: 'Mount Waverley Secondary College',
    joined: '2023-11-14',
    membership: { plan: 'gold', status: 'active' },
    sessionsTotal: 116, sessionsThisMonth: 7, lastSession: '2026-06-16',
    goals: 'Develop post footwork and drop-step finishes. Build conditioning for full-game fitness at senior level.',
    coachNotes: 'Big body with excellent touch around the rim. Conditioning is the current ceiling — committed to off-session gym work which is showing results. Will be a dominant force if he stays consistent.',
    emergency: { name: 'Rob Davies', phone: '0411 667 778', relationship: 'Father' },
    recentSessions: [
      { date: '2026-06-16', type: 'Program',               coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-09', type: 'Individual Work Out',    coach: 'Matt', space: 'Secondary Station' },
    ],
  },
  {
    id: 'a5',
    firstName: 'Devon', lastName: 'Knox',
    email: 'devon.knox@hotmail.com', phone: '0456 234 567',
    dob: '2011-09-30', gender: 'Male', position: 'SF',
    repClub: 'Casey Cavaliers', school: 'Casey Grammar',
    joined: '2025-01-08',
    membership: { plan: null, status: null },
    sessionsTotal: 24, sessionsThisMonth: 3, lastSession: '2026-06-14',
    goals: 'Build on wing scoring ability. Develop a consistent mid-range pull-up jumper.',
    coachNotes: 'Lots of raw talent. Needs to be more consistent with attendance — has missed several sessions this month. Follow up with parents re: commitment level. When he\'s here, he\'s great.',
    emergency: { name: 'Sharon Knox', phone: '0422 889 990', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-14', type: 'Goal Setting',           coach: 'Jade', space: 'Meeting Room' },
      { date: '2026-06-06', type: 'Casual Shooting',        coach: 'Matt', space: 'Shooting Bay' },
      { date: '2026-05-30', type: 'Individual Work Out',    coach: 'Matt', space: 'Primary Station' },
    ],
  },
  {
    id: 'a6',
    firstName: 'Kai', lastName: 'Okafor',
    email: 'kai.okafor@gmail.com', phone: '0467 345 678',
    dob: '2009-04-17', gender: 'Male', position: 'SG',
    repClub: 'Waverley Falcons', school: 'St Kevin\'s College',
    joined: '2024-09-02',
    membership: { plan: 'bronze', status: 'overdue' },
    sessionsTotal: 41, sessionsThisMonth: 4, lastSession: '2026-06-11',
    goals: 'Develop primary ball-handling skills and improve 3-point range. Build consistency across all sessions.',
    coachNotes: 'Has missed the last two sessions and has an overdue payment. Outstanding athlete when engaged — quick learner with great athleticism. Need to connect with the family about commitment.',
    emergency: { name: 'Chioma Okafor', phone: '0433 556 667', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-11', type: 'Volume Shooting',        coach: 'Jade', space: 'Shooting Bay' },
      { date: '2026-06-08', type: 'Small Group Session',    coach: 'Jade', space: 'Secondary Station' },
      { date: '2026-06-01', type: 'Individual Work Out',    coach: 'Jade', space: 'Secondary Station' },
    ],
  },
  {
    id: 'a7',
    firstName: 'Tyler', lastName: 'Ross',
    email: 'tyler.ross@outlook.com', phone: '0478 456 789',
    dob: '2008-07-28', gender: 'Male', position: 'PG',
    repClub: 'Berwick Miners', school: 'Padua College',
    joined: '2023-06-19',
    membership: { plan: 'silver', status: 'active' },
    sessionsTotal: 158, sessionsThisMonth: 9, lastSession: '2026-06-18',
    goals: 'Develop court vision and assist mentality. Reduce turnovers in transition. Push to U20 representative level.',
    coachNotes: 'Very high basketball IQ — reads the game a step ahead. Working on reducing tunnel vision and seeing the pass before the drive. Best long-term prospect in our current group.',
    emergency: { name: 'Craig Ross', phone: '0444 778 889', relationship: 'Father' },
    recentSessions: [
      { date: '2026-06-18', type: 'Small Group Session',    coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-13', type: 'Individual Work Out',    coach: 'Matt', space: 'Primary Station' },
    ],
  },
  {
    id: 'a8',
    firstName: 'Priya', lastName: 'Mehta',
    email: 'priya.mehta@gmail.com', phone: '0489 567 890',
    dob: '2011-01-14', gender: 'Female', position: 'SF',
    repClub: 'Nunawading Spectres', school: 'Sacré Cœur',
    joined: '2024-07-15',
    membership: { plan: 'silver', status: 'active' },
    sessionsTotal: 73, sessionsThisMonth: 8, lastSession: '2026-06-17',
    goals: 'Become more assertive attacking the basket. Develop floater and pull-up jumper off live dribble penetration.',
    coachNotes: 'Technical skills are excellent. Needs to build the confidence to take the game over — her instinct is to defer too early. Showed great improvement last month. Keep pushing her to be decisive.',
    emergency: { name: 'Anita Mehta', phone: '0455 890 001', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-17', type: 'Program',                coach: 'Matt', space: 'Secondary Station' },
      { date: '2026-06-15', type: 'Small Group Session',    coach: 'Jade', space: 'Secondary Station' },
      { date: '2026-06-11', type: 'Individual Work Out',    coach: 'Jade', space: 'Secondary Station' },
    ],
  },
  {
    id: 'a9',
    firstName: 'Sam', lastName: 'Liu',
    email: 'sam.liu@gmail.com', phone: '0491 678 901',
    dob: '2010-06-05', gender: 'Male', position: 'PF',
    repClub: 'Box Hill Braves', school: 'Box Hill High School',
    joined: '2024-01-22',
    membership: { plan: 'platinum', status: 'active' },
    sessionsTotal: 104, sessionsThisMonth: 12, lastSession: '2026-06-19',
    goals: 'Expand offensive range to include mid-post game. Improve rebounding positioning and outlet passing.',
    coachNotes: 'Our most sessions-per-month athlete — hungrier than anyone to improve. Strong hands and excellent body positioning. Starting to monitor for burnout; reminding him recovery is part of training.',
    emergency: { name: 'Wei Liu', phone: '0466 901 112', relationship: 'Father' },
    recentSessions: [
      { date: '2026-06-19', type: 'Individual Work Out',    coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-17', type: 'Program',                coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
    ],
  },
  {
    id: 'a10',
    firstName: 'Zara', lastName: 'Obi',
    email: 'zara.obi@icloud.com', phone: '0402 789 012',
    dob: '2012-03-08', gender: 'Female', position: 'C',
    repClub: 'Dandenong Panthers', school: 'Killester College',
    joined: '2025-04-07',
    membership: { plan: 'bronze', status: 'active' },
    sessionsTotal: 29, sessionsThisMonth: 5, lastSession: '2026-06-16',
    goals: 'Learn proper post footwork and establish herself in the paint. Build confidence against physical defenders.',
    coachNotes: 'Youngest athlete in our program at 14. Shows maturity beyond her years. Long-term development project — potential is very high. Keep sessions positive and focused on fundamentals.',
    emergency: { name: 'Ngozi Obi', phone: '0477 012 123', relationship: 'Mother' },
    recentSessions: [
      { date: '2026-06-16', type: 'Individual Work Out',    coach: 'Jade', space: 'Secondary Station' },
      { date: '2026-06-15', type: 'Team Training',          coach: 'Matt', space: 'Primary Station' },
      { date: '2026-06-10', type: 'Casual Shooting',        coach: 'Jade', space: 'Shooting Bay' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob + 'T00:00:00')
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return age
}

function ageGroup(dob: string): string {
  const age = calcAge(dob)
  if (age < 14) return 'U14'
  if (age < 16) return 'U16'
  if (age < 18) return 'U18'
  return 'Open'
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDob(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function avatarBg(id: string) {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function initials(a: Athlete) {
  return `${a.firstName[0]}${a.lastName[0]}`.toUpperCase()
}

function uid() {
  return Math.random().toString(36).slice(2)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarCircle({ athlete, size = 40 }: { athlete: Athlete; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: avatarBg(athlete.id), fontSize: size * 0.36 }}
    >
      {initials(athlete)}
    </div>
  )
}

function PositionBadge({ position }: { position: Position }) {
  if (!position) return null
  const color = POSITION_COLOR[position] ?? '#6b7280'
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {position}
    </span>
  )
}

function MembershipBadge({ membership }: { membership: Athlete['membership'] }) {
  if (!membership.plan || !membership.status) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: '#F0FDF4', color: '#16a34a', border: '1px solid #BBF7D0' }}>
        Casual
      </span>
    )
  }
  const plan = PLAN_INFO[membership.plan]
  const status = STATUS_STYLE[membership.status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
      {plan.label}
    </span>
  )
}

function SessionsMini({ athlete }: { athlete: Athlete }) {
  const quota = athlete.membership.plan ? PLAN_INFO[athlete.membership.plan].monthlyQuota : null
  const n = athlete.sessionsThisMonth
  if (!quota) {
    return <span className="text-xs text-gray-400">{n} sessions</span>
  }
  const pct = Math.min(n / quota, 1)
  const color = pct >= 1 ? '#ef4444' : pct >= 0.8 ? '#f97316' : ACCENT
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500">{n}/{quota}</span>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-gray-400">{icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: accent ?? '#111827' }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

// ─── Athlete Card ─────────────────────────────────────────────────────────────

function AthleteCard({ athlete, selected, onClick }: {
  athlete: Athlete; selected: boolean; onClick: () => void
}) {
  const age = calcAge(athlete.dob)
  const group = ageGroup(athlete.dob)
  const isMember = !!athlete.membership.plan
  const card = isMember ? MEMBER_CARD : CASUAL_CARD
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-2 p-4 text-left transition hover:shadow-md"
      style={{
        backgroundColor: card.bg,
        borderColor: selected ? card.selectedBorder : card.border,
      }}
    >
      {/* Top row: avatar + name + position */}
      <div className="flex items-start gap-3">
        <AvatarCircle athlete={athlete} size={52} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-gray-900">
            {athlete.firstName} {athlete.lastName}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <PositionBadge position={athlete.position} />
            <span className="text-xs text-gray-400">{age} yrs · {group}</span>
          </div>
          <div className="mt-1 truncate text-xs text-gray-500">{athlete.repClub}</div>
          <div className="truncate text-xs text-gray-400">{athlete.school}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-gray-100" />

      {/* Bottom row: membership + sessions */}
      <div className="flex items-center justify-between">
        <MembershipBadge membership={athlete.membership} />
        <SessionsMini athlete={athlete} />
      </div>
    </button>
  )
}

// ─── Add Athlete Modal ────────────────────────────────────────────────────────

interface NewAthleteForm {
  firstName: string; lastName: string; email: string; phone: string
  dob: string; gender: Gender; position: Position; repClub: string
  school: string; emergencyName: string; emergencyPhone: string
  emergencyRel: string; goals: string; notes: string
}

function blankForm(): NewAthleteForm {
  return {
    firstName: '', lastName: '', email: '', phone: '',
    dob: '', gender: 'Male', position: '', repClub: '',
    school: '', emergencyName: '', emergencyPhone: '',
    emergencyRel: '', goals: '', notes: '',
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>(INIT_ATHLETES)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'member' | 'casual'>('all')
  const [posFilter, setPosFilter] = useState<Position | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<NewAthleteForm>(blankForm())

  const selected = athletes.find((a) => a.id === selectedId) ?? null

  const filtered = useMemo(() => {
    return athletes
      .filter((a) => {
        if (statusFilter === 'member' && !a.membership.plan) return false
        if (statusFilter === 'casual' && a.membership.plan) return false
        if (posFilter !== 'all' && a.position !== posFilter) return false
        if (search) {
          const q = search.toLowerCase()
          const hay = `${a.firstName} ${a.lastName} ${a.email} ${a.repClub} ${a.school}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const last = a.lastName.localeCompare(b.lastName)
        return last !== 0 ? last : a.firstName.localeCompare(b.firstName)
      })
  }, [athletes, search, statusFilter, posFilter])

  // Stats
  const totalAthletes    = athletes.length
  const activeMembers    = athletes.filter((a) => a.membership.status === 'active').length
  const trainingThisWeek = athletes.filter((a) => a.lastSession && a.lastSession >= '2026-06-15').length
  const avgSessions      = (athletes.reduce((s, a) => s + a.sessionsThisMonth, 0) / athletes.length).toFixed(1)

  function updateAthlete(id: string, patch: Partial<Athlete>) {
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function patchForm(patch: Partial<NewAthleteForm>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function handleAddAthlete() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dob) return
    const a: Athlete = {
      id: uid(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
      gender: form.gender,
      position: form.position,
      repClub: form.repClub.trim(),
      school: form.school.trim(),
      joined: new Date().toISOString().slice(0, 10),
      membership: { plan: null, status: null },
      sessionsTotal: 0,
      sessionsThisMonth: 0,
      lastSession: null,
      goals: form.goals.trim(),
      coachNotes: form.notes.trim(),
      emergency: {
        name: form.emergencyName.trim(),
        phone: form.emergencyPhone.trim(),
        relationship: form.emergencyRel.trim(),
      },
      recentSessions: [],
    }
    setAthletes((prev) => [...prev, a])
    setShowAddModal(false)
    setForm(blankForm())
  }

  function openAthlete(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Athletes</h1>
            <p className="text-sm text-gray-500">
              {totalAthletes} athletes · {activeMembers} active members
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddModal(true); setForm(blankForm()) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconUserPlus size={16} />
            Add Athlete
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">

        {/* ── Stats ──────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<IconUser size={18} />}             label="Total Athletes"    value={totalAthletes} />
          <StatCard icon={<IconBallBasketball size={18} />}   label="Active Members"    value={activeMembers}    sub="with membership plan" accent={ACCENT} />
          <StatCard icon={<IconCalendar size={18} />}         label="Training This Week" value={trainingThisWeek} sub="sessions since Monday" />
          <StatCard icon={<IconBallBasketball size={18} />}   label="Avg Sessions/Month" value={avgSessions}      sub="across all athletes" />
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative" style={{ minWidth: 200, maxWidth: 300, flex: '0 1 260px' }}>
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search athletes, clubs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
            />
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all' as const,    label: 'All',     count: athletes.length },
              { key: 'member' as const, label: 'Members', count: athletes.filter((a) => !!a.membership.plan).length },
              { key: 'casual' as const, label: 'Casual',  count: athletes.filter((a) => !a.membership.plan).length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={
                  statusFilter === key
                    ? { backgroundColor: ACCENT, color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                }
              >
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={
                    statusFilter === key
                      ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }
                      : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                  }
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Position pills */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPosFilter('all')}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
              style={
                posFilter === 'all'
                  ? { backgroundColor: '#1f2937', color: 'white' }
                  : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
              }
            >
              All Pos
            </button>
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosFilter(posFilter === pos ? 'all' : pos)}
                className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
                style={
                  posFilter === pos
                    ? { backgroundColor: POSITION_COLOR[pos], color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                }
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card grid ──────────────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
            No athletes match your search
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((a) => (
              <AthleteCard
                key={a.id}
                athlete={a}
                selected={selectedId === a.id}
                onClick={() => openAthlete(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────────── */}
      {selected && (() => {
        const a = selected
        const age = calcAge(a.dob)
        const quota = a.membership.plan ? PLAN_INFO[a.membership.plan].monthlyQuota : null
        const sessPct = quota ? Math.min(a.sessionsThisMonth / quota, 1) : null
        const sessColor = sessPct
          ? sessPct >= 1 ? '#ef4444' : sessPct >= 0.8 ? '#f97316' : ACCENT
          : ACCENT

        return (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setSelectedId(null)}
            />
            <div
              className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col border-l border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Panel header */}
              <div
                className="shrink-0 px-5 py-5"
                style={{ backgroundColor: avatarBg(a.id) + '15', borderBottom: '1px solid #e5e7eb' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <AvatarCircle athlete={a} size={64} />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{a.firstName} {a.lastName}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <PositionBadge position={a.position} />
                        <span className="text-sm text-gray-500">{age} yrs · {ageGroup(a.dob)}</span>
                      </div>
                      <div className="mt-1">
                        <MembershipBadge membership={a.membership} />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/80 hover:text-gray-600"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-5 p-5">

                  {/* Personal details */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal</h3>
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {[
                        { icon: <IconCalendar size={14} />, label: 'Date of Birth', value: `${fmtDob(a.dob)} (${age} yrs)` },
                        { icon: <IconUser size={14} />,     label: 'Gender',        value: a.gender },
                        { icon: <IconMail size={14} />,     label: 'Email',         value: a.email },
                        { icon: <IconPhone size={14} />,    label: 'Phone',         value: a.phone },
                        { icon: <IconBallBasketball size={14} />, label: 'Club',    value: a.repClub },
                        { icon: <IconSchool size={14} />,   label: 'School',        value: a.school },
                        { icon: <IconCalendar size={14} />, label: 'Joined',        value: fmtDate(a.joined) },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
                          <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
                          <span className="text-sm text-gray-800">{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Sessions progress */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Sessions</h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 grid grid-cols-3 gap-3">
                        {[
                          { label: 'This Month', value: a.sessionsThisMonth },
                          { label: 'All Time',   value: a.sessionsTotal },
                          { label: 'Last Session', value: a.lastSession ? fmtDate(a.lastSession).replace(/ /g, ' ') : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <div className="text-lg font-bold text-gray-900">{value}</div>
                            <div className="text-[10px] text-gray-400">{label}</div>
                          </div>
                        ))}
                      </div>
                      {quota && (
                        <>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${(sessPct ?? 0) * 100}%`, backgroundColor: sessColor }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-400">
                            {a.sessionsThisMonth}/{quota} sessions used this month
                            {quota - a.sessionsThisMonth > 0
                              ? ` · ${quota - a.sessionsThisMonth} remaining`
                              : ' · cap reached'}
                          </p>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Recent sessions */}
                  {a.recentSessions.length > 0 && (
                    <section>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Recent Sessions</h3>
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        {a.recentSessions.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderBottom: i < a.recentSessions.length - 1 ? '1px solid #f3f4f6' : undefined }}
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-800">{s.type}</div>
                              <div className="text-xs text-gray-400">{fmtDate(s.date)} · {s.space}</div>
                            </div>
                            <span className="text-xs font-semibold text-gray-500">{s.coach}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Goals */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <IconTarget size={13} /> Goals
                    </h3>
                    <textarea
                      rows={4}
                      value={a.goals}
                      onChange={(e) => updateAthlete(a.id, { goals: e.target.value })}
                      placeholder="Add athlete goals…"
                      className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                    />
                  </section>

                  {/* Coach Notes */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <IconNotes size={13} /> Coach Notes
                    </h3>
                    <textarea
                      rows={4}
                      value={a.coachNotes}
                      onChange={(e) => updateAthlete(a.id, { coachNotes: e.target.value })}
                      placeholder="Add coach notes…"
                      className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                    />
                  </section>

                  {/* Emergency Contact */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <IconHeartHandshake size={13} /> Emergency Contact
                    </h3>
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {a.emergency.name ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-xs text-gray-500">Name</span>
                            <span className="text-sm text-gray-800">{a.emergency.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-xs text-gray-500">Phone</span>
                            <span className="text-sm text-gray-800">{a.emergency.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 shrink-0 text-xs text-gray-500">Relationship</span>
                            <span className="text-sm text-gray-800">{a.emergency.relationship}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">No emergency contact on file</p>
                      )}
                    </div>
                  </section>

                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Add Athlete Modal ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add Athlete</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal details */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>First Name</label>
                    <input type="text" value={form.firstName} onChange={(e) => patchForm({ firstName: e.target.value })} placeholder="Jordan" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Last Name</label>
                    <input type="text" value={form.lastName} onChange={(e) => patchForm({ lastName: e.target.value })} placeholder="Williams" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <input type="email" value={form.email} onChange={(e) => patchForm({ email: e.target.value })} placeholder="athlete@example.com" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => patchForm({ phone: e.target.value })} placeholder="0412 345 678" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Date of Birth</label>
                    <input type="date" value={form.dob} onChange={(e) => patchForm({ dob: e.target.value })} className={INPUT} />
                    {form.dob && (
                      <p className="mt-1 text-xs text-gray-400">
                        Age {calcAge(form.dob)} · {ageGroup(form.dob)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={LABEL}>Gender</label>
                    <div className="flex overflow-hidden rounded-lg border border-gray-200">
                      {(['Male', 'Female', 'Other'] as Gender[]).map((g, i) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => patchForm({ gender: g })}
                          className="flex-1 py-2 text-sm font-semibold transition"
                          style={{
                            borderLeft: i > 0 ? '1px solid #e5e7eb' : undefined,
                            backgroundColor: form.gender === g ? ACCENT : 'white',
                            color: form.gender === g ? 'white' : '#6b7280',
                          }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basketball details */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Basketball Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Position</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => patchForm({ position: form.position === pos ? '' : pos })}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
                          style={
                            form.position === pos
                              ? { backgroundColor: POSITION_COLOR[pos], color: 'white' }
                              : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                          }
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Rep Club</label>
                    <input type="text" value={form.repClub} onChange={(e) => patchForm({ repClub: e.target.value })} placeholder="Melbourne Tigers" className={INPUT} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL}>School</label>
                    <input type="text" value={form.school} onChange={(e) => patchForm({ school: e.target.value })} placeholder="De La Salle College" className={INPUT} />
                  </div>
                </div>
              </div>

              {/* Emergency contact */}
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Name</label>
                    <input type="text" value={form.emergencyName} onChange={(e) => patchForm({ emergencyName: e.target.value })} placeholder="Jane Williams" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Phone</label>
                    <input type="tel" value={form.emergencyPhone} onChange={(e) => patchForm({ emergencyPhone: e.target.value })} placeholder="0412 345 678" className={INPUT} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL}>Relationship</label>
                    <input type="text" value={form.emergencyRel} onChange={(e) => patchForm({ emergencyRel: e.target.value })} placeholder="Mother" className={INPUT} />
                  </div>
                </div>
              </div>

              {/* Goals + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Initial Goals <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={3} value={form.goals} onChange={(e) => patchForm({ goals: e.target.value })} placeholder="What does this athlete want to achieve?" className={INPUT + ' resize-none'} />
                </div>
                <div>
                  <label className={LABEL}>Coach Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={3} value={form.notes} onChange={(e) => patchForm({ notes: e.target.value })} placeholder="Initial assessment or notes…" className={INPUT + ' resize-none'} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAthlete}
                disabled={!form.firstName.trim() || !form.lastName.trim() || !form.dob}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
              >
                Add Athlete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
