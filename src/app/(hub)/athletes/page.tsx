'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
  IconAlertTriangle,
  IconBan,
  IconRefresh,
  IconCreditCard,
  IconCheck,
  IconClock,
  IconArrowLeft,
} from '@tabler/icons-react'
import { StripeCardStep } from '@/components/StripeCardModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'all' | 'members' | 'casual'
type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | ''
type Gender = 'Male' | 'Female' | 'Other'
type MembershipPlan = 'bronze' | 'silver' | 'gold' | 'platinum'
type MembershipStatus = 'active' | 'cancelling' | 'overdue' | 'inactive'
type BillingStatus = 'paid' | 'failed' | 'upcoming'

interface BillingRecord {
  id: string
  date: string
  amount: number
  status: BillingStatus
}

type CreditType = 'skills-clinic' | 'casual-shooting' | 'small-group' | 'shooting-machine' | 'weight-room' | 'film-room'

interface CreditAllowance {
  type: CreditType
  label: string
  limit: number
}

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
  membershipStarted: string | null
  nextBillingDate: string | null
  outstandingBalance: number
  billingRecords: BillingRecord[]
  sessionsTotal: number
  sessionsThisMonth: number
  lastSession: string | null
  goals: string
  coachNotes: string
  emergency: { name: string; phone: string; relationship: string }
  recentSessions: RecentSession[]
  inviteStatus?: 'invited' | 'accepted' | null
  lastLoginAt:   string | null
  isActive: boolean
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

const PLAN_INFO: Record<MembershipPlan, {
  label: string; price: number; monthlyQuota: number | null; color: string; allowances: CreditAllowance[]
}> = {
  bronze: {
    label: 'Bronze', price: 35, monthlyQuota: 8, color: '#B87333',
    allowances: [
      { type: 'skills-clinic',   label: 'Skills Clinic',   limit: 1 },
      { type: 'casual-shooting', label: 'Casual Shooting', limit: 1 },
    ],
  },
  silver: {
    label: 'Silver', price: 50, monthlyQuota: 12, color: '#64748B',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session', limit: 1 },
      { type: 'casual-shooting',  label: 'Casual Shooting',     limit: 2 },
      { type: 'shooting-machine', label: 'Shooting Machine',    limit: 2 },
    ],
  },
  gold: {
    label: 'Gold', price: 75, monthlyQuota: 20, color: '#D4A843',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session', limit: 2 },
      { type: 'casual-shooting',  label: 'Casual Shooting',     limit: 3 },
      { type: 'shooting-machine', label: 'Shooting Machine',    limit: 3 },
      { type: 'weight-room',      label: 'Weight Room',         limit: 2 },
    ],
  },
  platinum: {
    label: 'Platinum', price: 100, monthlyQuota: null, color: '#7C3AED',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session', limit: 3 },
      { type: 'casual-shooting',  label: 'Casual Shooting',     limit: 4 },
      { type: 'shooting-machine', label: 'Shooting Machine',    limit: 4 },
      { type: 'weight-room',      label: 'Weight Room',         limit: 3 },
      { type: 'film-room',        label: 'Film Room',           limit: 1 },
    ],
  },
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

function nextMondayFrom(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 1 ? 0 : day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MembershipStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  )
}

function PlanBadge({ plan }: { plan: MembershipPlan }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: PLAN_INFO[plan].color }}
    >
      {PLAN_INFO[plan].label}
    </span>
  )
}

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
  if (!quota) return <span className="text-xs text-gray-400">{n} sessions</span>
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
      <div className="mb-3 flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: accent ?? '#111827' }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function CreditBar({ plan, creditUsage, athleteId }: {
  plan: MembershipPlan; creditUsage: Record<string, number>; athleteId: string
}) {
  const { allowances } = PLAN_INFO[plan]
  if (allowances.length === 0) return <span className="text-sm text-gray-400">—</span>
  const totalUsed = allowances.reduce((s, a) => s + (creditUsage[`${athleteId}:${a.type}`] ?? 0), 0)
  const totalLimit = allowances.reduce((s, a) => s + a.limit, 0)
  const pct = totalLimit > 0 ? Math.min(totalUsed / totalLimit, 1) : 0
  const color = pct >= 1 ? '#ef4444' : pct >= 0.7 ? '#f97316' : ACCENT
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500">{totalUsed}/{totalLimit}</span>
    </div>
  )
}

function BillingBadge({ status }: { status: BillingStatus }) {
  const map: Record<BillingStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    paid:     { bg: '#dcfce7', color: '#15803d', icon: <IconCheck size={11} />,  label: 'Paid' },
    failed:   { bg: '#fee2e2', color: '#b91c1c', icon: <IconX size={11} />,      label: 'Failed' },
    upcoming: { bg: '#eff6ff', color: '#1d4ed8', icon: <IconClock size={11} />,  label: 'Upcoming' },
  }
  const s = map[status]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.icon}{s.label}
    </span>
  )
}

function PlanCard({ plan, selected, onClick, compact }: {
  plan: MembershipPlan; selected: boolean; onClick: () => void; compact?: boolean
}) {
  const info = PLAN_INFO[plan]
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col rounded-xl border-2 p-3 text-left transition"
      style={{
        borderColor: selected ? info.color : '#e5e7eb',
        backgroundColor: selected ? `${info.color}18` : 'white',
      }}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: info.color }}>
          <IconCheck size={10} strokeWidth={3} />
        </span>
      )}
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: info.color }}>
        {info.label}
      </span>
      <span className="mt-1 text-lg font-bold text-gray-900">
        ${info.price}<span className="text-xs font-normal text-gray-400">/wk</span>
      </span>
      {!compact && (
        <span className="mt-0.5 text-xs text-gray-500">
          {PLAN_INFO[plan].allowances.map(a => `${a.limit}x ${a.label}`).join(' · ')}
        </span>
      )}
    </button>
  )
}

// ─── Athlete Card ─────────────────────────────────────────────────────────────

function AthleteCard({ athlete, selected, onClick, onDeactivate, onReactivate, onDelete, onConvert }: {
  athlete: Athlete
  selected: boolean
  onClick: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onDelete: () => void
  onConvert?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const age = calcAge(athlete.dob)
  const group = ageGroup(athlete.dob)
  const isMember = !!athlete.membership.plan
  const card = isMember ? MEMBER_CARD : CASUAL_CARD
  const inactive = !athlete.isActive
  return (
    <div
      className="relative w-full rounded-2xl border-2 p-4 text-left transition hover:shadow-md"
      style={{
        backgroundColor: inactive ? '#f9fafb' : card.bg,
        borderColor: selected ? card.selectedBorder : inactive ? '#e5e7eb' : card.border,
        opacity: inactive ? 0.65 : 1,
      }}
    >
      {/* Three-dot menu */}
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-30 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                View Profile
              </button>
              {!isMember && onConvert && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onConvert() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50">
                  Convert to Member
                </button>
              )}
              {inactive ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onReactivate() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50">
                  Reactivate
                </button>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDeactivate() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Mark as Inactive
                </button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Clickable area */}
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="flex items-start gap-3 pr-6">
          <AvatarCircle athlete={athlete} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-bold text-gray-900">{athlete.firstName} {athlete.lastName}</span>
              {inactive && (
                <span className="shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                  Inactive
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <PositionBadge position={athlete.position} />
              <span className="text-xs text-gray-400">{age} yrs · {group}</span>
            </div>
            <div className="mt-1 truncate text-xs text-gray-500">{athlete.repClub}</div>
            <div className="truncate text-xs text-gray-400">{athlete.school}</div>
          </div>
        </div>
        <div className="my-3 border-t border-gray-100" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MembershipBadge membership={athlete.membership} />
            {(athlete.inviteStatus ?? null) === 'invited' && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                Invited
              </span>
            )}
          </div>
          <SessionsMini athlete={athlete} />
        </div>
      </button>
    </div>
  )
}

// ─── Add Athlete Form ─────────────────────────────────────────────────────────

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

// ─── Supabase mapping ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToAthlete(row: any): Athlete {
  return {
    id:             row.id,
    firstName:      row.first_name  ?? '',
    lastName:       row.last_name   ?? '',
    email:          row.email       ?? '',
    phone:          row.phone       ?? '',
    dob:            row.date_of_birth ?? '',
    gender:         (row.gender as Gender) ?? 'Male',
    position:       (row.position as Position) ?? '',
    repClub:        row.rep_club    ?? '',
    school:         row.school      ?? '',
    joined:         (row.created_at ?? '').slice(0, 10),
    membership: {
      plan:   (row.membership_tier   as MembershipPlan)   ?? null,
      status: (row.membership_status as MembershipStatus) ?? null,
    },
    membershipStarted:  row.membership_started_date ?? null,
    nextBillingDate:    row.next_billing_date       ?? null,
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    billingRecords:     Array.isArray(row.billing_records) ? (row.billing_records as BillingRecord[]) : [],
    sessionsTotal:      row.sessions_total       ?? 0,
    sessionsThisMonth:  row.sessions_this_month  ?? 0,
    lastSession:        row.last_session_date    ?? null,
    goals:              row.goals       ?? '',
    coachNotes:         row.coach_notes ?? '',
    emergency: {
      name:         row.emergency_contact_name         ?? '',
      phone:        row.emergency_contact_phone        ?? '',
      relationship: row.emergency_contact_relationship ?? '',
    },
    recentSessions: [],
    inviteStatus: (row.invite_status as 'invited' | 'accepted' | null) ?? null,
    lastLoginAt:  (row.last_login_at as string | null) ?? null,
    isActive: row.is_active ?? true,
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AthletesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [creditUsage, setCreditUsage] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<Position | 'all'>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Add Athlete modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<NewAthleteForm>(blankForm())

  // Add Member modal — 3-step: (1) account details, (2) plan, (3) card
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newDob, setNewDob] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPlan, setNewPlan] = useState<MembershipPlan>('bronze')
  const [newStarted, setNewStarted] = useState('')
  const [newMemberNotes, setNewMemberNotes] = useState('')
  const [addMemberStep, setAddMemberStep] = useState<1 | 2 | 3>(1)
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMemberSetupSecret, setAddMemberSetupSecret] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addMemberInsertedData, setAddMemberInsertedData] = useState<any>(null)
  const [addMemberExistingAthlete, setAddMemberExistingAthlete] = useState<Athlete | null>(null)

  // Detail panel: account status actions
  const [resendingInvite, setResendingInvite] = useState(false)
  const [inviteResent, setInviteResent] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [passwordResetSent, setPasswordResetSent] = useState(false)

  // Convert to Member modal — step 2 card (when athlete has no PM)
  const [convertSetupSecret, setConvertSetupSecret] = useState<string | null>(null)
  const [convertAthleteForCard, setConvertAthleteForCard] = useState<Athlete | null>(null)

  // Detail panel: payment method state (fetched per-athlete when panel opens)
  const [panelPmLoading, setPanelPmLoading] = useState(false)
  const [panelPm, setPanelPm] = useState<{
    id: string; brand: string; last4: string; expMonth: number; expYear: number
  } | null>(null)
  const [panelPmAthleteId, setPanelPmAthleteId] = useState<string | null>(null)

  // Convert to Member modal
  const [convertAthleteId, setConvertAthleteId] = useState<string | null>(null)
  const [convertPlan, setConvertPlan] = useState<MembershipPlan>('bronze')
  const [convertStarted, setConvertStarted] = useState('')

  // Detail panel membership actions
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [paymentSent, setPaymentSent] = useState(false)

  // Payment link modal (shown after subscription created for new member)
  const [paymentLink, setPaymentLink] = useState<{ name: string; url: string } | null>(null)

  // Toasts / confirmations
  const [inviteToast, setInviteToast] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const ATHLETES_CACHE_KEY = 'f14_athletes_cache'

  // Init active tab from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    if (t === 'members' || t === 'casual') setActiveTab(t)
  }, [])

  // Persist athletes to localStorage
  useEffect(() => {
    if (athletes.length > 0) {
      try { localStorage.setItem(ATHLETES_CACHE_KEY, JSON.stringify(athletes)) } catch {}
    }
  }, [athletes])

  // Load athletes: cache first, then Supabase
  useEffect(() => {
    void (async () => {
      try {
        const raw = localStorage.getItem(ATHLETES_CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw) as Athlete[]
          if (cached.length > 0) setAthletes(cached)
        }
      } catch {}

      try {
        const { data, error } = await supabase.from('athletes').select('*').order('last_name')
        if (error) console.error('[athletes] Supabase error:', error)
        if (!error && data && data.length > 0) setAthletes(data.map(dbToAthlete))
      } catch (err) {
        console.error('[athletes] fetch failed:', err)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load credit usage from membership_credits
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase
          .from('membership_credits')
          .select('athlete_id, session_type, used_this_week')
        if (data) {
          const usage: Record<string, number> = {}
          for (const c of data) {
            usage[`${c.athlete_id}:${c.session_type}`] = (c.used_this_week as number) ?? 0
          }
          setCreditUsage(usage)
        }
      } catch {}
    })()
  }, [])

  // Fetch payment method when detail panel opens for a new athlete
  useEffect(() => {
    const athleteId = selectedId
    if (!athleteId) { setPanelPm(null); setPanelPmAthleteId(null); return }
    if (athleteId === panelPmAthleteId) return // already loaded for this athlete
    setPanelPmLoading(true)
    setPanelPm(null)
    setPanelPmAthleteId(athleteId)
    void fetch(`/api/stripe/payment-method?athleteId=${athleteId}`)
      .then(r => r.json())
      .then(d => { if (d.paymentMethod) setPanelPm(d.paymentMethod) })
      .catch(() => {})
      .finally(() => setPanelPmLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  function switchTab(tab: ActiveTab) {
    setActiveTab(tab)
    setSelectedId(null)
    setSearch('')
    setMemberStatusFilter('all')
    setShowChangePlan(false)
    const url = tab === 'all' ? '/athletes' : `/athletes?tab=${tab}`
    window.history.replaceState({}, '', url)
  }

  const selected = athletes.find(a => a.id === selectedId) ?? null

  // ── Computed lists ──────────────────────────────────────────────────────────

  const activeAthletes = athletes.filter(a => a.isActive)
  const membersData = activeAthletes.filter(a => !!a.membership.plan)
  const casualData  = activeAthletes.filter(a => !a.membership.plan)

  const filteredAll = useMemo(() => {
    return athletes
      .filter(a => {
        if (!showInactive && !a.isActive) return false
        if (posFilter !== 'all' && a.position !== posFilter) return false
        if (search) {
          const q = search.toLowerCase()
          if (!`${a.firstName} ${a.lastName} ${a.email} ${a.repClub} ${a.school}`.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        const last = a.lastName.localeCompare(b.lastName)
        return last !== 0 ? last : a.firstName.localeCompare(b.firstName)
      })
  }, [athletes, search, posFilter, showInactive])

  const filteredMembers = useMemo(() => {
    return membersData.filter(m => {
      if (memberStatusFilter !== 'all' && m.membership.status !== memberStatusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [membersData, memberStatusFilter, search])

  const filteredCasual = useMemo(() => {
    if (!search) return casualData
    const q = search.toLowerCase()
    return casualData.filter(a => `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(q))
  }, [casualData, search])

  // Members tab stats
  const activeMemberCount  = membersData.filter(m => m.membership.status === 'active').length
  const weeklyRevenue      = membersData.filter(m => m.membership.status === 'active').reduce((s, m) => s + PLAN_INFO[m.membership.plan!].price, 0)
  const overdueMembers     = membersData.filter(m => m.membership.status === 'overdue')
  const cancellingCount    = membersData.filter(m => m.membership.status === 'cancelling').length

  // All tab stats
  const totalAthletes    = activeAthletes.length
  const activeMembers    = activeAthletes.filter(a => a.membership.status === 'active').length
  const currentWeekStart = (() => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return monday.toISOString().slice(0, 10)
  })()
  const trainingThisWeek = activeAthletes.filter(a => a.lastSession && a.lastSession >= currentWeekStart).length
  const avgSessions = activeAthletes.length > 0
    ? (activeAthletes.reduce((s, a) => s + a.sessionsThisMonth, 0) / activeAthletes.length).toFixed(1)
    : '0.0'

  // ── Mutations ───────────────────────────────────────────────────────────────

  function updateAthlete(id: string, patch: Partial<Athlete>) {
    setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    const dbPatch: Record<string, unknown> = {}
    if (patch.firstName  !== undefined) dbPatch.first_name    = patch.firstName
    if (patch.lastName   !== undefined) dbPatch.last_name     = patch.lastName
    if (patch.email      !== undefined) dbPatch.email         = patch.email
    if (patch.phone      !== undefined) dbPatch.phone         = patch.phone
    if (patch.dob        !== undefined) dbPatch.date_of_birth = patch.dob || null
    if (patch.gender     !== undefined) dbPatch.gender        = patch.gender
    if (patch.position   !== undefined) dbPatch.position      = patch.position
    if (patch.repClub    !== undefined) dbPatch.rep_club      = patch.repClub
    if (patch.school     !== undefined) dbPatch.school        = patch.school
    if (patch.goals      !== undefined) dbPatch.goals         = patch.goals
    if (patch.coachNotes !== undefined) dbPatch.coach_notes   = patch.coachNotes
    if (patch.membership !== undefined) {
      dbPatch.membership_tier   = patch.membership.plan
      dbPatch.membership_status = patch.membership.status
    }
    if (patch.membershipStarted  !== undefined) dbPatch.membership_started_date = patch.membershipStarted
    if (patch.nextBillingDate    !== undefined) dbPatch.next_billing_date       = patch.nextBillingDate
    if (patch.outstandingBalance !== undefined) dbPatch.outstanding_balance     = patch.outstandingBalance
    if (patch.billingRecords     !== undefined) dbPatch.billing_records         = patch.billingRecords
    if (patch.emergency !== undefined) {
      dbPatch.emergency_contact_name         = patch.emergency.name
      dbPatch.emergency_contact_phone        = patch.emergency.phone
      dbPatch.emergency_contact_relationship = patch.emergency.relationship
    }
    if (Object.keys(dbPatch).length > 0) {
      supabase.from('athletes').update(dbPatch).eq('id', id)
        .then(({ error }) => { if (error) console.error('[athletes] update failed:', error) })
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function handleDeleteAthlete(id: string) {
    setDeleting(true)
    try {
      const { error } = await supabase.from('athletes').delete().eq('id', id)
      if (error) { showToast(`Failed to delete: ${error.message}`); return }
      setAthletes(prev => prev.filter(a => a.id !== id))
      if (selectedId === id) setSelectedId(null)
      setConfirmDeleteId(null)
      showToast('Athlete deleted permanently.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeactivateAthlete(id: string) {
    const { error } = await supabase.from('athletes').update({ is_active: false }).eq('id', id)
    if (error) { showToast('Failed to deactivate athlete'); return }
    setAthletes(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a))
    showToast('Athlete marked as inactive.')
  }

  async function handleReactivateAthlete(id: string) {
    const { error } = await supabase.from('athletes').update({ is_active: true }).eq('id', id)
    if (error) { showToast('Failed to reactivate athlete'); return }
    setAthletes(prev => prev.map(a => a.id === id ? { ...a, isActive: true } : a))
    showToast('Athlete reactivated.')
  }

  function patchForm(patch: Partial<NewAthleteForm>) {
    setForm(f => ({ ...f, ...patch }))
  }

  async function handleAddAthlete() {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    const hasEmail = form.email.trim() !== ''

    const res = await fetch('/api/athletes/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName:     form.firstName.trim(),
        lastName:      form.lastName.trim(),
        email:         form.email.trim() || null,
        phone:         form.phone.trim() || null,
        dob:           form.dob || null,
        position:      form.position || null,
        school:        form.school.trim() || null,
        goals:         form.goals.trim() || null,
        coachNotes:    form.notes.trim() || null,
        emergencyName:  form.emergencyName.trim() || null,
        emergencyPhone: form.emergencyPhone.trim() || null,
        emergencyRel:   form.emergencyRel.trim() || null,
      }),
    })
    const d = await res.json() as { athleteId?: string; created?: boolean; emailSent?: boolean; error?: string }

    if (d.error) { showToast('Failed to create athlete — ' + d.error); return }

    const newAthlete: Athlete = {
      id:          d.athleteId ?? uid(),
      firstName:   form.firstName.trim(),
      lastName:    form.lastName.trim(),
      email:       form.email.trim(),
      phone:       form.phone.trim(),
      dob:         form.dob,
      gender:      form.gender,
      position:    form.position,
      repClub:     form.repClub.trim(),
      school:      form.school.trim(),
      joined:      new Date().toISOString().slice(0, 10),
      membership:  { plan: null, status: null },
      membershipStarted: null, nextBillingDate: null,
      outstandingBalance: 0, billingRecords: [],
      sessionsTotal: 0, sessionsThisMonth: 0, lastSession: null,
      goals:       form.goals.trim(),
      coachNotes:  form.notes.trim(),
      emergency:   { name: form.emergencyName.trim(), phone: form.emergencyPhone.trim(), relationship: form.emergencyRel.trim() },
      recentSessions: [],
      inviteStatus:  hasEmail ? 'invited' : null,
      lastLoginAt:   null,
      isActive:      true,
    }

    setAthletes(prev => [...prev, newAthlete])
    setShowAddModal(false)
    setForm(blankForm())

    if (hasEmail) {
      const msg = d.emailSent
        ? `Athlete account created — invitation email sent to ${form.email.trim()}`
        : `Athlete added — account created for ${form.email.trim()}`
      setInviteToast(msg)
      setTimeout(() => setInviteToast(null), 5000)
    } else {
      showToast(`${form.firstName.trim()} ${form.lastName.trim()} added.`)
    }
  }

  function resetAddMemberModal() {
    setNewFirst(''); setNewLast(''); setNewEmail(''); setNewDob(''); setNewPhone('')
    setNewPlan('bronze'); setNewStarted(''); setNewMemberNotes('')
    setAddMemberStep(1); setAddMemberSetupSecret(null); setAddMemberInsertedData(null)
    setAddMemberExistingAthlete(null); setAddMemberLoading(false)
  }

  // Step 1 → Step 2: validate account details + check for existing athlete by email
  async function handleAddMemberDetailsNext() {
    if (!newFirst.trim() || !newLast.trim() || !newEmail.trim()) return
    setAddMemberLoading(true)
    // Check if athlete already exists with this email
    const { data: existing } = await supabase
      .from('athletes')
      .select('*')
      .eq('email', newEmail.trim())
      .maybeSingle()
    if (existing) {
      setAddMemberExistingAthlete(dbToAthlete(existing))
    } else {
      setAddMemberExistingAthlete(null)
    }
    setAddMemberStep(2)
    setAddMemberLoading(false)
  }

  // Step 2 → Step 3: create/update athlete record + create Stripe SetupIntent
  async function handleAddMemberPlanNext() {
    if (!newStarted) return
    setAddMemberLoading(true)
    const firstCharge    = nextMondayFrom(newStarted)
    const billingRecord: BillingRecord = { id: uid(), date: firstCharge, amount: PLAN_INFO[newPlan].price, status: 'upcoming' }
    const membershipPatch = {
      membership_tier:         newPlan,
      membership_status:       'active',
      membership_started_date: newStarted,
      next_billing_date:       firstCharge,
      outstanding_balance:     0,
      billing_records:         [billingRecord],
      coach_notes:             newMemberNotes.trim() || null,
    }

    let inserted: Record<string, unknown>

    if (addMemberExistingAthlete) {
      // Upgrade existing athlete to member
      const { data, error } = await supabase
        .from('athletes')
        .update(membershipPatch)
        .eq('id', addMemberExistingAthlete.id)
        .select()
        .single()
      if (error) { showToast('Failed to upgrade athlete — ' + error.message); setAddMemberLoading(false); return }
      inserted = data as Record<string, unknown>
    } else {
      // Create new athlete record (user account created after card saved)
      const payload = {
        first_name:  newFirst.trim(), last_name: newLast.trim(),
        email: newEmail.trim(), phone: newPhone.trim() || null,
        date_of_birth: newDob || null,
        ...membershipPatch,
      }
      const { data, error } = await supabase.from('athletes').insert(payload).select().single()
      if (error) { showToast('Failed to add member — ' + error.message); setAddMemberLoading(false); return }
      inserted = data as Record<string, unknown>
    }

    setAddMemberInsertedData(inserted)

    // Create Stripe SetupIntent
    try {
      const res = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: inserted.id }),
      })
      const d = await res.json() as { clientSecret?: string; error?: string }
      if (d.error) throw new Error(d.error)
      setAddMemberSetupSecret(d.clientSecret ?? null)
      setAddMemberStep(3)
    } catch (err) {
      console.error('[stripe] create-setup-intent:', err)
      showToast('Stripe error — please try again.')
    }
    setAddMemberLoading(false)
  }

  // Step 3: card saved → save PM, create subscription, create user account, close modal
  const handleAddMemberCardSaved = useCallback(async (paymentMethodId: string) => {
    const inserted = addMemberInsertedData
    if (!inserted) return

    await fetch('/api/stripe/save-payment-method', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: inserted.id, paymentMethodId }),
    })
    fetch('/api/stripe/create-subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: inserted.id, plan: newPlan }),
    }).then(r => r.json()).then(d => {
      if ((d as { error?: string }).error) console.error('[stripe] create-subscription:', (d as { error: string }).error)
    }).catch(console.error)

    // Create user account + send invitation email (if new athlete; existing has account already)
    if (!addMemberExistingAthlete) {
      const planLabel = `${PLAN_INFO[newPlan].label} — $${PLAN_INFO[newPlan].price}/week`
      fetch('/api/athletes/create-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: inserted.first_name, lastName: inserted.last_name,
          email: inserted.email, membershipPlan: planLabel,
        }),
      }).then(r => r.json()).then(d => {
        if ((d as { error?: string }).error) console.error('[create-account]', (d as { error: string }).error)
      }).catch(console.error)
    }

    const label = addMemberExistingAthlete
      ? `${addMemberExistingAthlete.firstName} upgraded to ${PLAN_INFO[newPlan].label} member!`
      : `${inserted.first_name as string} ${inserted.last_name as string} added as a member — invitation email sent.`

    if (addMemberExistingAthlete) {
      setAthletes(prev => prev.map(a =>
        a.id === addMemberExistingAthlete.id
          ? { ...a, membership: { plan: newPlan, status: 'active' } }
          : a
      ))
    } else {
      setAthletes(prev => [...prev, dbToAthlete(inserted)])
    }

    setShowAddMemberModal(false)
    resetAddMemberModal()
    showToast(label)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMemberInsertedData, newPlan, addMemberExistingAthlete])

  async function handleConvertToMember() {
    const athlete = athletes.find(a => a.id === convertAthleteId)
    if (!athlete || !convertStarted) return
    const firstCharge = nextMondayFrom(convertStarted)
    const billingRecord: BillingRecord = { id: uid(), date: firstCharge, amount: PLAN_INFO[convertPlan].price, status: 'upcoming' }
    const patch: Partial<Athlete> = {
      membership: { plan: convertPlan, status: 'active' },
      membershipStarted: convertStarted,
      nextBillingDate: firstCharge,
      billingRecords: [billingRecord],
    }
    updateAthlete(athlete.id, patch)
    setConvertAthleteId(null)
    setConvertStarted('')
    setConvertPlan('bronze')
    showToast(`${athlete.firstName} converted to ${PLAN_INFO[convertPlan].label} member.`)
    // Create subscription; if athlete has no PM, collect card via SetupIntent
    try {
      const siRes = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: athlete.id }),
      })
      const siData = await siRes.json()
      if (siData.error) throw new Error(siData.error)
      // Check if they already have a saved PM
      const pmRes = await fetch(`/api/stripe/payment-method?athleteId=${athlete.id}`)
      const pmData = await pmRes.json()
      if (pmData.paymentMethod) {
        // Already has a card — create subscription directly
        fetch('/api/stripe/create-subscription', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athleteId: athlete.id, plan: convertPlan }),
        }).then(r => r.json()).then(d => {
          if (d.error) console.error('[stripe] create-subscription:', d.error)
        }).catch(console.error)
      } else {
        // No card — show Stripe Elements to collect one
        setConvertSetupSecret(siData.clientSecret)
        setConvertAthleteForCard(athlete)
      }
    } catch (err) { console.error('[stripe] convert setup-intent:', err) }
  }

  const handleConvertCardSaved = useCallback(async (paymentMethodId: string) => {
    const athlete = convertAthleteForCard
    if (!athlete) return
    await fetch('/api/stripe/save-payment-method', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: athlete.id, paymentMethodId }),
    })
    fetch('/api/stripe/create-subscription', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: athlete.id, plan: convertPlan }),
    }).then(r => r.json()).then(d => {
      if (d.error) console.error('[stripe] create-subscription:', d.error)
    }).catch(console.error)
    setConvertSetupSecret(null)
    setConvertAthleteForCard(null)
    showToast('Card saved — membership is now active!')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertAthleteForCard, convertPlan])

  async function handleResendInvitation(athleteId: string) {
    setResendingInvite(true)
    setInviteResent(false)
    const res = await fetch('/api/athletes/resend-invitation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId }),
    })
    const d = await res.json() as { success?: boolean; error?: string }
    setResendingInvite(false)
    if (d.error) { showToast('Failed to resend: ' + d.error); return }
    setInviteResent(true)
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, inviteStatus: 'invited' } : a))
    setTimeout(() => setInviteResent(false), 4000)
  }

  async function handleResetPassword(athleteId: string) {
    setResettingPassword(true)
    setPasswordResetSent(false)
    const res = await fetch('/api/athletes/resend-invitation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId }),
    })
    const d = await res.json() as { success?: boolean; error?: string }
    setResettingPassword(false)
    if (d.error) { showToast('Failed to send reset: ' + d.error); return }
    setPasswordResetSent(true)
    setTimeout(() => setPasswordResetSent(false), 4000)
  }

  function handleChangePlan(plan: MembershipPlan) {
    if (!selected) return
    updateAthlete(selected.id, { membership: { ...selected.membership, plan } })
    setShowChangePlan(false)
    showToast(`Plan changed to ${PLAN_INFO[plan].label}.`)
    // Update Stripe subscription to the new price (non-blocking)
    fetch('/api/stripe/update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: selected.id, action: 'change-plan', newPlan: plan }),
    }).then(r => r.json()).then(d => {
      if (d.error) console.error('[stripe] update-subscription change-plan:', d.error)
    }).catch(console.error)
  }

  function handleToggleCancel() {
    if (!selected || !selected.membership.status) return
    const next: MembershipStatus = selected.membership.status === 'cancelling' ? 'active' : 'cancelling'
    updateAthlete(selected.id, { membership: { ...selected.membership, status: next } })
    // Cancel or reactivate the Stripe subscription (non-blocking)
    fetch('/api/stripe/update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId: selected.id,
        action: next === 'cancelling' ? 'cancel' : 'reactivate',
      }),
    }).then(r => r.json()).then(d => {
      if (d.error) console.error('[stripe] update-subscription cancel/reactivate:', d.error)
    }).catch(console.error)
  }

  function handleResendPayment() {
    setPaymentSent(true)
    setTimeout(() => setPaymentSent(false), 2500)
  }

  function openAthlete(id: string) {
    setSelectedId(prev => prev === id ? null : id)
    setShowChangePlan(false)
    setPaymentSent(false)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="text-sm text-gray-400">Loading athletes…</div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Athletes</h1>
            {/* Tab bar */}
            <div className="mt-2 flex gap-1">
              {([
                { key: 'all' as const,     label: 'All Athletes' },
                { key: 'members' as const, label: 'Members' },
                { key: 'casual' as const,  label: 'Casual' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                  style={
                    activeTab === key
                      ? { backgroundColor: ACCENT, color: 'white' }
                      : { color: '#6b7280' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {activeTab === 'members' && (
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-2 rounded-xl border border-[#6BA3D6] px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ color: ACCENT }}
              >
                <IconCreditCard size={15} />
                Add Member
              </button>
            )}
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
      </div>

      <div className="p-6">

        {/* ════════════════════════════════ ALL TAB ════════════════════════════ */}
        {activeTab === 'all' && (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<IconUser size={18} />}           label="Total Athletes"     value={totalAthletes} />
              <StatCard icon={<IconBallBasketball size={18} />} label="Active Members"     value={activeMembers}     sub="with membership plan" accent={ACCENT} />
              <StatCard icon={<IconCalendar size={18} />}       label="Training This Week" value={trainingThisWeek}  sub="sessions since Monday" />
              <StatCard icon={<IconBallBasketball size={18} />} label="Avg Sessions/Month" value={avgSessions}       sub="across all athletes" />
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" style={{ minWidth: 200, maxWidth: 300, flex: '0 1 260px' }}>
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search athletes, clubs…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
              </div>

              {/* Position pills */}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPosFilter('all')}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
                  style={posFilter === 'all' ? { backgroundColor: '#1f2937', color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  All Pos
                </button>
                {POSITIONS.map(pos => (
                  <button key={pos} type="button" onClick={() => setPosFilter(posFilter === pos ? 'all' : pos)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
                    style={posFilter === pos ? { backgroundColor: POSITION_COLOR[pos], color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                    {pos}
                  </button>
                ))}
              </div>

              {athletes.some(a => !a.isActive) && (
                <button type="button" onClick={() => setShowInactive(v => !v)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={showInactive ? { backgroundColor: '#6b7280', color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                </button>
              )}
            </div>

            {/* Card grid */}
            {filteredAll.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
                No athletes match your search
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAll.map(a => (
                  <AthleteCard key={a.id} athlete={a} selected={selectedId === a.id}
                    onClick={() => openAthlete(a.id)}
                    onDeactivate={() => handleDeactivateAthlete(a.id)}
                    onReactivate={() => handleReactivateAthlete(a.id)}
                    onDelete={() => setConfirmDeleteId(a.id)}
                    onConvert={() => { setConvertAthleteId(a.id); setConvertPlan('bronze'); setConvertStarted('') }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ MEMBERS TAB ════════════════════════════ */}
        {activeTab === 'members' && (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<IconUserPlus size={18} />}       label="Active Members"    value={activeMemberCount} sub={`${membersData.length} total`} />
              <StatCard icon={<IconCreditCard size={18} />}     label="Weekly Revenue"    value={`$${weeklyRevenue}`} sub="Active plans only" accent={ACCENT} />
              <StatCard icon={<IconAlertTriangle size={18} />}  label="Overdue Payments"  value={overdueMembers.length} sub={overdueMembers.length > 0 ? 'Action required' : 'All clear'} accent={overdueMembers.length > 0 ? '#ef4444' : undefined} />
              <StatCard icon={<IconBan size={18} />}            label="Cancelling"        value={cancellingCount} sub="This billing cycle" accent={cancellingCount > 0 ? '#d97706' : undefined} />
            </div>

            {/* Overdue alert */}
            {overdueMembers.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border px-4 py-3.5"
                style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}>
                <IconAlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {overdueMembers.length === 1 ? 'Payment overdue' : `${overdueMembers.length} payments overdue`}
                  </p>
                  <p className="mt-0.5 text-sm text-red-600">
                    {overdueMembers.map(m => `${m.firstName} ${m.lastName}`).join(', ')}
                    {' — '}open their profile to resend a payment link.
                  </p>
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" style={{ minWidth: 200, maxWidth: 300, flex: '0 1 260px' }}>
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search members…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: 'All', count: membersData.length },
                  { key: 'active', label: 'Active', count: membersData.filter(m => m.membership.status === 'active').length },
                  { key: 'cancelling', label: 'Cancelling', count: cancellingCount },
                  { key: 'overdue', label: 'Overdue', count: overdueMembers.length },
                  { key: 'inactive', label: 'Inactive', count: membersData.filter(m => m.membership.status === 'inactive').length },
                ].map(({ key, label, count }) => {
                  const active = memberStatusFilter === key
                  return (
                    <button key={key} type="button" onClick={() => setMemberStatusFilter(key)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                      style={active ? { backgroundColor: ACCENT, color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                      {label}
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={active ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Member table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      {['Athlete', 'Plan', 'Status', 'Next Charge', 'Outstanding', 'Weekly Credits', 'Started', ''].map((h, i) => (
                        <th key={i} className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No members match your search</td>
                      </tr>
                    ) : filteredMembers.map(m => {
                      const sel = selectedId === m.id
                      return (
                        <tr key={m.id} onClick={() => openAthlete(m.id)}
                          className="group cursor-pointer border-b border-gray-50 transition last:border-0 hover:bg-gray-50"
                          style={{ backgroundColor: sel ? '#eff8ff' : undefined }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <AvatarCircle athlete={m} size={36} />
                              <div>
                                <div className="font-semibold text-gray-900">{m.firstName} {m.lastName}</div>
                                <div className="text-xs text-gray-400">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><PlanBadge plan={m.membership.plan!} /></td>
                          <td className="px-4 py-3">{m.membership.status && <StatusBadge status={m.membership.status} />}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{m.nextBillingDate ? fmtDate(m.nextBillingDate) : '—'}</td>
                          <td className="px-4 py-3">
                            {m.outstandingBalance > 0
                              ? <span className="font-semibold text-red-500">${m.outstandingBalance.toFixed(2)}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <CreditBar plan={m.membership.plan!} creditUsage={creditUsage} athleteId={m.id} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{m.membershipStarted ? fmtDate(m.membershipStarted) : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <IconChevronRight size={16} className="text-gray-300 transition group-hover:text-gray-500"
                              style={{ transform: sel ? 'rotate(90deg)' : undefined }} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════ CASUAL TAB ════════════════════════════ */}
        {activeTab === 'casual' && (
          <div className="space-y-5">
            {/* Filter */}
            <div className="flex items-center gap-3">
              <div className="relative" style={{ minWidth: 200, maxWidth: 300, flex: '0 1 260px' }}>
                <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search casual athletes…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
              </div>
              <span className="text-sm text-gray-400">{filteredCasual.length} casual athlete{filteredCasual.length !== 1 ? 's' : ''}</span>
            </div>

            {filteredCasual.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
                No casual athletes match your search
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCasual.map(a => (
                  <AthleteCard key={a.id} athlete={a} selected={selectedId === a.id}
                    onClick={() => openAthlete(a.id)}
                    onDeactivate={() => handleDeactivateAthlete(a.id)}
                    onReactivate={() => handleReactivateAthlete(a.id)}
                    onDelete={() => setConfirmDeleteId(a.id)}
                    onConvert={() => { setConvertAthleteId(a.id); setConvertPlan('bronze'); setConvertStarted('') }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Detail panel ───────────────────────────────────────────────────────── */}
      {selected && (() => {
        const a = selected
        const age = calcAge(a.dob)
        const quota = a.membership.plan ? PLAN_INFO[a.membership.plan].monthlyQuota : null
        const sessPct = quota ? Math.min(a.sessionsThisMonth / quota, 1) : null
        const sessColor = sessPct ? (sessPct >= 1 ? '#ef4444' : sessPct >= 0.8 ? '#f97316' : ACCENT) : ACCENT
        const sortedBilling = [...a.billingRecords].sort((x, y) => y.date.localeCompare(x.date))

        return (
          <>
            <div className="fixed inset-0 z-30" onClick={() => { setSelectedId(null); setShowChangePlan(false) }} />
            <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col border-l border-gray-200 bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Panel header */}
              <div className="shrink-0 px-5 py-5"
                style={{ backgroundColor: avatarBg(a.id) + '15', borderBottom: '1px solid #e5e7eb' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <AvatarCircle athlete={a} size={64} />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{a.firstName} {a.lastName}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <PositionBadge position={a.position} />
                        <span className="text-sm text-gray-500">{age} yrs · {ageGroup(a.dob)}</span>
                      </div>
                      <div className="mt-1"><MembershipBadge membership={a.membership} /></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.isActive ? (
                      <button type="button" onClick={() => handleDeactivateAthlete(a.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 transition hover:bg-white/80 hover:text-gray-700"
                        style={{ border: '1px solid #e5e7eb' }}>
                        Mark Inactive
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleReactivateAthlete(a.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-50"
                        style={{ border: '1px solid #bbf7d0' }}>
                        Reactivate
                      </button>
                    )}
                    <button type="button" onClick={() => setConfirmDeleteId(a.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                      style={{ border: '1px solid #fecaca' }}>
                      Delete
                    </button>
                    <button type="button" onClick={() => { setSelectedId(null); setShowChangePlan(false) }}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/80 hover:text-gray-600">
                      <IconX size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-5 p-5">

                  {/* Personal */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal</h3>
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {[
                        { icon: <IconCalendar size={14} />, label: 'Date of Birth', value: a.dob ? `${fmtDob(a.dob)} (${age} yrs)` : '—' },
                        { icon: <IconUser size={14} />,     label: 'Gender',        value: a.gender },
                        { icon: <IconMail size={14} />,     label: 'Email',         value: a.email },
                        { icon: <IconPhone size={14} />,    label: 'Phone',         value: a.phone },
                        { icon: <IconBallBasketball size={14} />, label: 'Club',    value: a.repClub },
                        { icon: <IconSchool size={14} />,   label: 'School',        value: a.school },
                        { icon: <IconCalendar size={14} />, label: 'Joined',        value: a.joined ? fmtDate(a.joined) : '—' },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
                          <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
                          <span className="text-sm text-gray-800">{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Account Status */}
                  {a.email && (() => {
                    const hasAccount   = !!a.inviteStatus || !!a.lastLoginAt
                    const hasLoggedIn  = a.inviteStatus === 'accepted' || !!a.lastLoginAt
                    const accountLabel = !hasAccount ? 'No Account' : hasLoggedIn ? 'Active' : 'Invited'
                    const labelStyle   = !hasAccount
                      ? { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' }
                      : hasLoggedIn
                        ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
                        : { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' }
                    return (
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">App Account</h3>
                        <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Status</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{ backgroundColor: labelStyle.bg, color: labelStyle.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: labelStyle.dot }} />
                              {accountLabel}
                            </span>
                          </div>
                          {a.lastLoginAt && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Last login</span>
                              <span className="text-sm font-medium text-gray-800">
                                {new Date(a.lastLoginAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            {(accountLabel === 'Invited' || accountLabel === 'Active') && (
                              <button type="button"
                                onClick={() => void handleResendInvitation(a.id)}
                                disabled={resendingInvite}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-white disabled:opacity-50">
                                {inviteResent
                                  ? <><IconCheck size={12} style={{ color: '#22c55e' }} /> Sent!</>
                                  : resendingInvite ? 'Sending…' : <><IconMail size={12} /> {accountLabel === 'Invited' ? 'Resend Invite' : 'Resend Login'}</>}
                              </button>
                            )}
                            {!hasAccount && (
                              <button type="button"
                                onClick={() => {
                                  void fetch('/api/athletes/create-account', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ firstName: a.firstName, lastName: a.lastName, email: a.email }),
                                  }).then(r => r.json()).then(d => {
                                    if ((d as { error?: string }).error) { showToast('Failed: ' + (d as { error: string }).error); return }
                                    setAthletes(prev => prev.map(x => x.id === a.id ? { ...x, inviteStatus: 'invited' } : x))
                                    showToast(`Account created — invitation sent to ${a.email}`)
                                  })
                                }}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition hover:opacity-90"
                                style={{ backgroundColor: ACCENT }}>
                                <IconMail size={12} /> Create Account
                              </button>
                            )}
                            {hasAccount && (
                              <button type="button"
                                onClick={() => void handleResetPassword(a.id)}
                                disabled={resettingPassword}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 transition hover:bg-white disabled:opacity-50">
                                {passwordResetSent
                                  ? <><IconCheck size={12} style={{ color: '#22c55e' }} /> Reset Sent!</>
                                  : resettingPassword ? 'Sending…' : 'Reset Password'}
                              </button>
                            )}
                          </div>
                        </div>
                      </section>
                    )
                  })()}

                  {/* Membership (members only) */}
                  {a.membership.plan && a.membership.status && (
                    <>
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Membership</h3>
                        <div className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          {[
                            { label: 'Plan',          value: <PlanBadge plan={a.membership.plan} /> },
                            { label: 'Status',        value: <StatusBadge status={a.membership.status} /> },
                            { label: 'Started',       value: a.membershipStarted ? fmtDate(a.membershipStarted) : '—' },
                            { label: 'Next charge',   value: a.nextBillingDate ? fmtDate(a.nextBillingDate) : '—' },
                            { label: 'Billing cycle', value: 'Weekly — every Monday' },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">{label}</span>
                              {typeof value === 'string'
                                ? <span className="text-sm font-medium text-gray-800">{value}</span>
                                : value}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Weekly Credits */}
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Weekly Credits</h3>
                        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          {PLAN_INFO[a.membership.plan].allowances.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No credit allowances for this plan.</p>
                          ) : PLAN_INFO[a.membership.plan].allowances.map(allowance => {
                            const used = creditUsage[`${a.id}:${allowance.type}`] ?? 0
                            const remaining = allowance.limit - used
                            const pct = Math.min(used / allowance.limit, 1)
                            const barColor = pct >= 1 ? '#ef4444' : pct >= 0.7 ? '#f97316' : ACCENT
                            const atLimit = remaining <= 0
                            return (
                              <div key={allowance.type} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-gray-700">{allowance.label}</span>
                                  <span className={atLimit ? 'font-semibold text-red-500' : 'text-gray-500'}>
                                    {used}/{allowance.limit} used
                                    {atLimit ? ' · at limit' : remaining === 1 ? ' · 1 remaining' : ` · ${remaining} remaining`}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-gray-200">
                                  <div className="h-1.5 rounded-full transition-all"
                                    style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            )
                          })}
                          <p className="pt-1 text-[10px] text-gray-400">Resets every Monday at 12:00am</p>
                        </div>
                      </section>

                      {/* Outstanding Balance */}
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Outstanding Balance</h3>
                        <div className="flex items-center justify-between rounded-xl border p-4"
                          style={a.outstandingBalance > 0
                            ? { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }
                            : { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                          <span className="text-2xl font-bold"
                            style={{ color: a.outstandingBalance > 0 ? '#ef4444' : '#16a34a' }}>
                            {a.outstandingBalance > 0 ? `$${a.outstandingBalance.toFixed(2)}` : '$0.00'}
                          </span>
                          {a.outstandingBalance > 0 && (
                            <button type="button" onClick={handleResendPayment}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                              style={{ backgroundColor: paymentSent ? '#dcfce7' : '#ef4444', color: paymentSent ? '#15803d' : 'white' }}>
                              {paymentSent ? <><IconCheck size={13} /> Sent!</> : <><IconMail size={13} /> Resend payment link</>}
                            </button>
                          )}
                        </div>
                      </section>

                      {/* Payment Method */}
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Payment Method</h3>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          {panelPmLoading && panelPmAthleteId === a.id ? (
                            <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                          ) : panelPm && panelPmAthleteId === a.id ? (
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold uppercase tracking-wide text-gray-700">
                                {panelPm.brand}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">•••• •••• •••• {panelPm.last4}</p>
                                <p className="text-xs text-gray-400">Expires {String(panelPm.expMonth).padStart(2, '0')}/{panelPm.expYear}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sm text-amber-600">
                                <IconAlertTriangle size={15} /> No payment method on file
                              </span>
                              <button type="button"
                                onClick={() => {
                                  void fetch('/api/send-email', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      template: 'payment-method-reminder',
                                      to: a.email,
                                      data: { firstName: a.firstName, addCardUrl: `${window.location.origin}/athlete/membership` },
                                    }),
                                  }).then(() => showToast('Reminder email sent!'))
                                }}
                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                                style={{ backgroundColor: ACCENT + '20', color: ACCENT }}>
                                <IconMail size={12} /> Send reminder
                              </button>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Billing History */}
                      {sortedBilling.length > 0 && (
                        <section>
                          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Billing History</h3>
                          <div className="overflow-hidden rounded-xl border border-gray-100">
                            {sortedBilling.map((b, i) => (
                              <div key={b.id} className="flex items-center justify-between px-4 py-2.5"
                                style={{
                                  borderBottom: i < sortedBilling.length - 1 ? '1px solid #f3f4f6' : undefined,
                                  backgroundColor: b.status === 'failed' ? '#fff8f8' : undefined,
                                }}>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">{fmtDate(b.date)}</div>
                                  <div className="text-xs text-gray-400">Weekly charge</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-700">${b.amount.toFixed(2)}</span>
                                  <BillingBadge status={b.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Membership Actions */}
                      <section>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Membership Actions</h3>

                        {/* Change Plan */}
                        <div className="mb-3">
                          <button type="button" onClick={() => setShowChangePlan(v => !v)}
                            className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                            <span>Change Plan</span>
                            <IconChevronRight size={15} className="text-gray-400 transition"
                              style={{ transform: showChangePlan ? 'rotate(90deg)' : undefined }} />
                          </button>
                          {showChangePlan && (
                            <div className="grid grid-cols-2 gap-2">
                              {(['bronze', 'silver', 'gold', 'platinum'] as MembershipPlan[]).map(p => (
                                <PlanCard key={p} plan={p} selected={a.membership.plan === p} onClick={() => handleChangePlan(p)} compact />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Cancel / Reactivate */}
                        {a.membership.status !== 'inactive' && (
                          <button type="button" onClick={handleToggleCancel}
                            className="flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                            style={a.membership.status === 'cancelling'
                              ? { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d' }
                              : { borderColor: '#fecdd3', backgroundColor: '#fff1f2', color: '#ef4444' }}>
                            {a.membership.status === 'cancelling'
                              ? <><IconRefresh size={15} /> Reactivate Membership</>
                              : <><IconBan size={15} /> Cancel at Period End</>}
                          </button>
                        )}
                      </section>
                    </>
                  )}

                  {/* Convert to Member (casual only) */}
                  {!a.membership.plan && (
                    <section>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Membership</h3>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="mb-3 text-sm text-gray-500">This athlete is currently casual — no active membership plan.</p>
                        <button type="button"
                          onClick={() => { setConvertAthleteId(a.id); setConvertPlan('bronze'); setConvertStarted('') }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                          style={{ backgroundColor: ACCENT }}>
                          <IconCreditCard size={15} /> Convert to Member
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Sessions */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Sessions</h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 grid grid-cols-3 gap-3">
                        {[
                          { label: 'This Month',   value: a.sessionsThisMonth },
                          { label: 'All Time',     value: a.sessionsTotal },
                          { label: 'Last Session', value: a.lastSession ? fmtDate(a.lastSession) : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center">
                            <div className="text-lg font-bold text-gray-900">{value}</div>
                            <div className="text-[10px] text-gray-400">{label}</div>
                          </div>
                        ))}
                      </div>
                      {quota && sessPct !== null && (
                        <>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full" style={{ width: `${sessPct * 100}%`, backgroundColor: sessColor }} />
                          </div>
                          <p className="mt-1.5 text-xs text-gray-400">
                            {a.sessionsThisMonth}/{quota} sessions this month
                            {quota - a.sessionsThisMonth > 0 ? ` · ${quota - a.sessionsThisMonth} remaining` : ' · cap reached'}
                          </p>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Recent Sessions */}
                  {a.recentSessions.length > 0 && (
                    <section>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Recent Sessions</h3>
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        {a.recentSessions.map((s, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5"
                            style={{ borderBottom: i < a.recentSessions.length - 1 ? '1px solid #f3f4f6' : undefined }}>
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
                    <textarea rows={4} value={a.goals}
                      onChange={e => updateAthlete(a.id, { goals: e.target.value })}
                      placeholder="Add athlete goals…"
                      className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
                  </section>

                  {/* Coach Notes */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <IconNotes size={13} /> Coach Notes
                    </h3>
                    <textarea rows={4} value={a.coachNotes}
                      onChange={e => updateAthlete(a.id, { coachNotes: e.target.value })}
                      placeholder="Add coach notes…"
                      className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
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

      {/* ── Add Athlete Modal ───────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add Athlete</h2>
              <button type="button" onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
                <IconX size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL}>First Name</label>
                    <input type="text" value={form.firstName} onChange={e => patchForm({ firstName: e.target.value })} placeholder="Jordan" className={INPUT} /></div>
                  <div><label className={LABEL}>Last Name</label>
                    <input type="text" value={form.lastName} onChange={e => patchForm({ lastName: e.target.value })} placeholder="Williams" className={INPUT} /></div>
                  <div><label className={LABEL}>Email</label>
                    <input type="email" value={form.email} onChange={e => patchForm({ email: e.target.value })} placeholder="athlete@example.com" className={INPUT} /></div>
                  <div><label className={LABEL}>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => patchForm({ phone: e.target.value })} placeholder="0412 345 678" className={INPUT} /></div>
                  <div>
                    <label className={LABEL}>Date of Birth</label>
                    <input type="date" value={form.dob} onChange={e => patchForm({ dob: e.target.value })} className={INPUT} />
                    {form.dob && <p className="mt-1 text-xs text-gray-400">Age {calcAge(form.dob)} · {ageGroup(form.dob)}</p>}
                  </div>
                  <div>
                    <label className={LABEL}>Gender</label>
                    <div className="flex overflow-hidden rounded-lg border border-gray-200">
                      {(['Male', 'Female', 'Other'] as Gender[]).map((g, i) => (
                        <button key={g} type="button" onClick={() => patchForm({ gender: g })}
                          className="flex-1 py-2 text-sm font-semibold transition"
                          style={{ borderLeft: i > 0 ? '1px solid #e5e7eb' : undefined, backgroundColor: form.gender === g ? ACCENT : 'white', color: form.gender === g ? 'white' : '#6b7280' }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Basketball Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Position</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {POSITIONS.map(pos => (
                        <button key={pos} type="button" onClick={() => patchForm({ position: form.position === pos ? '' : pos })}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold transition"
                          style={form.position === pos ? { backgroundColor: POSITION_COLOR[pos], color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div><label className={LABEL}>Rep Club</label>
                    <input type="text" value={form.repClub} onChange={e => patchForm({ repClub: e.target.value })} placeholder="Melbourne Tigers" className={INPUT} /></div>
                  <div className="col-span-2"><label className={LABEL}>School</label>
                    <input type="text" value={form.school} onChange={e => patchForm({ school: e.target.value })} placeholder="De La Salle College" className={INPUT} /></div>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={LABEL}>Name</label>
                    <input type="text" value={form.emergencyName} onChange={e => patchForm({ emergencyName: e.target.value })} placeholder="Jane Williams" className={INPUT} /></div>
                  <div><label className={LABEL}>Phone</label>
                    <input type="tel" value={form.emergencyPhone} onChange={e => patchForm({ emergencyPhone: e.target.value })} placeholder="0412 345 678" className={INPUT} /></div>
                  <div className="col-span-2"><label className={LABEL}>Relationship</label>
                    <input type="text" value={form.emergencyRel} onChange={e => patchForm({ emergencyRel: e.target.value })} placeholder="Mother" className={INPUT} /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Initial Goals <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={3} value={form.goals} onChange={e => patchForm({ goals: e.target.value })} placeholder="What does this athlete want to achieve?" className={INPUT + ' resize-none'} /></div>
                <div><label className={LABEL}>Coach Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={3} value={form.notes} onChange={e => patchForm({ notes: e.target.value })} placeholder="Initial assessment or notes…" className={INPUT + ' resize-none'} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleAddAthlete} disabled={!form.firstName.trim() || !form.lastName.trim()}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}>Add Athlete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ────────────────────────────────────────────────────── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Add Member</h2>
                <div className="mt-1 flex items-center gap-2">
                  {([
                    { n: 1, label: 'Account' },
                    { n: 2, label: 'Plan' },
                    { n: 3, label: 'Payment' },
                  ]).map(({ n, label }) => (
                    <div key={n} className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: addMemberStep > n ? '#22c55e' : addMemberStep === n ? ACCENT : '#e5e7eb',
                          color: addMemberStep >= n ? 'white' : '#9ca3af',
                        }}>
                        {addMemberStep > n ? '✓' : n}
                      </div>
                      <span className="text-xs" style={{ color: addMemberStep === n ? '#1f2937' : '#9ca3af' }}>
                        {label}
                      </span>
                      {n < 3 && <span className="text-gray-200">→</span>}
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => { setShowAddMemberModal(false); resetAddMemberModal() }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"><IconX size={18} /></button>
            </div>

            {/* Step 1 — Account Details */}
            {addMemberStep === 1 && (
              <>
                <div className="space-y-4 px-6 py-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>First Name *</label>
                      <input type="text" value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Jordan" className={INPUT} /></div>
                    <div><label className={LABEL}>Last Name *</label>
                      <input type="text" value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Mitchell" className={INPUT} /></div>
                  </div>
                  <div><label className={LABEL}>Email Address * <span className="normal-case font-normal text-gray-400">(becomes their login)</span></label>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="athlete@example.com" className={INPUT} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL}>Date of Birth</label>
                      <input type="date" value={newDob} onChange={e => setNewDob(e.target.value)} className={INPUT} /></div>
                    <div><label className={LABEL}>Phone <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                      <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="0412 345 678" className={INPUT} /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                  <button type="button" onClick={() => { setShowAddMemberModal(false); resetAddMemberModal() }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={() => void handleAddMemberDetailsNext()}
                    disabled={!newFirst.trim() || !newLast.trim() || !newEmail.trim() || addMemberLoading}
                    className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: ACCENT }}>
                    {addMemberLoading ? 'Checking…' : 'Next → Plan'}
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — Plan Selection */}
            {addMemberStep === 2 && (
              <>
                <div className="space-y-4 px-6 py-5">
                  {addMemberExistingAthlete ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      <strong>{addMemberExistingAthlete.firstName} {addMemberExistingAthlete.lastName}</strong> already exists as an athlete.
                      Select a plan to upgrade them to a member.
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Creating a new account for <strong>{newFirst} {newLast}</strong>. They&apos;ll receive an invitation email with their login details after payment is confirmed.
                    </p>
                  )}
                  <div>
                    <label className={LABEL}>Membership Plan</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['bronze', 'silver', 'gold', 'platinum'] as MembershipPlan[]).map(p => (
                        <PlanCard key={p} plan={p} selected={newPlan === p} onClick={() => setNewPlan(p)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Start Date</label>
                    <input type="date" value={newStarted} onChange={e => setNewStarted(e.target.value)} className={INPUT} />
                    {newStarted && (
                      <p className="mt-1 text-xs text-gray-400">
                        First billing Monday: <span className="font-medium">{fmtDate(nextMondayFrom(newStarted))}</span>
                      </p>
                    )}
                  </div>
                  <div><label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                    <textarea rows={2} value={newMemberNotes} onChange={e => setNewMemberNotes(e.target.value)}
                      placeholder="Any notes about this member…" className={INPUT + ' resize-none'} /></div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                  <button type="button" onClick={() => setAddMemberStep(1)}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                    <IconArrowLeft size={14} /> Back
                  </button>
                  <button type="button" onClick={() => void handleAddMemberPlanNext()}
                    disabled={!newStarted || addMemberLoading}
                    className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: ACCENT }}>
                    {addMemberLoading ? 'Setting up…' : 'Next → Payment'}
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Card Collection */}
            {addMemberStep === 3 && addMemberSetupSecret && (
              <div className="px-6 py-5">
                <p className="mb-4 text-sm text-gray-500">
                  Enter a payment card for <strong>{addMemberExistingAthlete ? `${addMemberExistingAthlete.firstName} ${addMemberExistingAthlete.lastName}` : `${newFirst} ${newLast}`}</strong>.
                  This will be charged <strong>${PLAN_INFO[newPlan].price}/week</strong> for their {PLAN_INFO[newPlan].label} membership.
                </p>
                <button type="button" onClick={() => { setAddMemberStep(2); setAddMemberSetupSecret(null) }}
                  className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition hover:text-gray-600">
                  <IconArrowLeft size={13} /> Back to plan
                </button>
                <StripeCardStep
                  clientSecret={addMemberSetupSecret}
                  onSuccess={handleAddMemberCardSaved}
                  onBack={() => { setAddMemberStep(2); setAddMemberSetupSecret(null) }}
                  submitLabel="Activate Membership"
                />
              </div>
            )}
            {addMemberStep === 3 && !addMemberSetupSecret && (
              <div className="px-6 py-8 text-center text-sm text-gray-400">Setting up payment…</div>
            )}
          </div>
        </div>
      )}

      {/* ── Convert to Member Modal ─────────────────────────────────────────────── */}
      {convertAthleteId && (() => {
        const a = athletes.find(x => x.id === convertAthleteId)
        if (!a) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-bold text-gray-900">Convert to Member</h2>
                <button type="button" onClick={() => setConvertAthleteId(null)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"><IconX size={18} /></button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-gray-600">
                  Setting up a membership for <strong>{a.firstName} {a.lastName}</strong>.
                </p>
                <div>
                  <label className={LABEL}>Plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bronze', 'silver', 'gold', 'platinum'] as MembershipPlan[]).map(p => (
                      <PlanCard key={p} plan={p} selected={convertPlan === p} onClick={() => setConvertPlan(p)} compact />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Start Date</label>
                  <input type="date" value={convertStarted} onChange={e => setConvertStarted(e.target.value)} className={INPUT} />
                  {convertStarted && (
                    <p className="mt-1 text-xs text-gray-400">
                      First billing Monday: <span className="font-medium">{fmtDate(nextMondayFrom(convertStarted))}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                <button type="button" onClick={() => setConvertAthleteId(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleConvertToMember} disabled={!convertStarted}
                  className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: ACCENT }}>Convert to Member</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Convert to Member — card collection overlay ───────────────────────── */}
      {convertSetupSecret && convertAthleteForCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Add Payment Card</h2>
                <p className="text-xs text-gray-400 mt-0.5">For {convertAthleteForCard.firstName} {convertAthleteForCard.lastName}</p>
              </div>
              <button type="button" onClick={() => { setConvertSetupSecret(null); setConvertAthleteForCard(null) }}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="px-6 py-5">
              <p className="mb-4 text-sm text-gray-500">
                Enter a card to charge weekly for their {PLAN_INFO[convertPlan].label} membership.
              </p>
              <StripeCardStep
                clientSecret={convertSetupSecret}
                onSuccess={handleConvertCardSaved}
                onBack={() => { setConvertSetupSecret(null); setConvertAthleteForCard(null) }}
                submitLabel="Save Card & Activate"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────────────── */}
      {confirmDeleteId && (() => {
        const a = athletes.find(x => x.id === confirmDeleteId)
        if (!a) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <IconX size={24} className="text-red-600" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">Delete {a.firstName} {a.lastName}?</h2>
              <p className="mb-6 text-sm text-gray-500">
                This will permanently remove their profile and all associated data.
                <strong className="font-semibold text-gray-700"> This cannot be undone.</strong>
              </p>
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                To preserve history, consider <strong>Mark as Inactive</strong> instead.
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => handleDeleteAthlete(confirmDeleteId)} disabled={deleting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}>
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Payment Link Modal ─────────────────────────────────────────────────── */}
      {paymentLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Payment Required</h2>
                <p className="text-xs text-gray-400 mt-0.5">Share this link with {paymentLink.name}</p>
              </div>
              <button type="button" onClick={() => setPaymentLink(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <IconCreditCard size={16} className="mb-1.5 text-blue-600" />
                <p className="font-semibold mb-1">Membership set up — payment pending</p>
                <p className="text-xs text-blue-600">Send this secure Stripe link to {paymentLink.name.split(' ')[0]} so they can enter their card details and activate their membership.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Payment Link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={paymentLink.url}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600 focus:outline-none"
                  />
                  <button type="button"
                    onClick={() => { void navigator.clipboard.writeText(paymentLink.url); showToast('Link copied!') }}
                    className="shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}>Copy</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setPaymentLink(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ─────────────────────────────────────────────────────────────── */}
      {inviteToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl">
          ✉️ {inviteToast}
          <button onClick={() => setInviteToast(null)} className="rounded-full p-0.5 hover:bg-white/10">✕</button>
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
