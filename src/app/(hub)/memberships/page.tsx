'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  IconX,
  IconSearch,
  IconUserPlus,
  IconAlertTriangle,
  IconChevronRight,
  IconMail,
  IconBan,
  IconRefresh,
  IconCreditCard,
  IconCheck,
  IconClock,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'bronze' | 'silver' | 'gold' | 'platinum' | 'family'
type MemberStatus = 'active' | 'cancelling' | 'overdue' | 'inactive'
type BillingStatus = 'paid' | 'failed' | 'upcoming'

interface BillingRecord {
  id: string
  date: string
  amount: number
  status: BillingStatus
}

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  plan: Plan
  status: MemberStatus
  started: string
  nextCharge: string | null
  outstanding: number
  sessionsThisMonth: number
  notes: string
  billing: BillingRecord[]
}

// ─── Plan info ────────────────────────────────────────────────────────────────

type CreditType = 'skills-clinic' | 'casual-shooting' | 'small-group' | 'shooting-machine' | 'weight-room' | 'film-room'

interface CreditAllowance {
  type: CreditType
  label: string
  limit: number
}

const PLAN_INFO: Record<Plan, {
  label: string
  price: number
  tagline: string
  color: string
  allowances: CreditAllowance[]
  comingSoon?: boolean
}> = {
  bronze: {
    label: 'Bronze', price: 35, color: '#B87333',
    tagline: '1x Skills Clinic · 1x Casual Shooting per week',
    allowances: [
      { type: 'skills-clinic',   label: 'Skills Clinic',   limit: 1 },
      { type: 'casual-shooting', label: 'Casual Shooting', limit: 1 },
    ],
  },
  silver: {
    label: 'Silver', price: 50, color: '#64748B',
    tagline: '1x Small Group · 2x Casual Shooting · 2x Shooting Machine per week',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session',  limit: 1 },
      { type: 'casual-shooting',  label: 'Casual Shooting',      limit: 2 },
      { type: 'shooting-machine', label: 'Shooting Machine',     limit: 2 },
    ],
  },
  gold: {
    label: 'Gold', price: 75, color: '#D4A843',
    tagline: '2x Small Group · 3x Casual · 3x Machine · 2x Weight Room per week',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session',  limit: 2 },
      { type: 'casual-shooting',  label: 'Casual Shooting',      limit: 3 },
      { type: 'shooting-machine', label: 'Shooting Machine',     limit: 3 },
      { type: 'weight-room',      label: 'Weight Room',          limit: 2 },
    ],
  },
  platinum: {
    label: 'Platinum', price: 100, color: '#7C3AED',
    tagline: '3x Small Group · 4x Casual · 4x Machine · 3x Weight Room · 1x Film Room per week',
    allowances: [
      { type: 'small-group',      label: 'Small Group Session',  limit: 3 },
      { type: 'casual-shooting',  label: 'Casual Shooting',      limit: 4 },
      { type: 'shooting-machine', label: 'Shooting Machine',     limit: 4 },
      { type: 'weight-room',      label: 'Weight Room',          limit: 3 },
      { type: 'film-room',        label: 'Film Room',            limit: 1 },
    ],
  },
  family: {
    label: 'Family', price: 100, color: '#0891B2',
    tagline: 'Platinum allowances shared across 2 linked accounts',
    comingSoon: true,
    allowances: [
      { type: 'small-group',      label: 'Small Group Session',  limit: 3 },
      { type: 'casual-shooting',  label: 'Casual Shooting',      limit: 4 },
      { type: 'shooting-machine', label: 'Shooting Machine',     limit: 4 },
      { type: 'weight-room',      label: 'Weight Room',          limit: 3 },
      { type: 'film-room',        label: 'Film Room',            limit: 1 },
    ],
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const STATUS_STYLE: Record<MemberStatus, { bg: string; color: string; dot: string; label: string }> = {
  active:     { bg: '#dcfce7', color: '#15803d', dot: '#22c55e', label: 'Active' },
  cancelling: { bg: '#fef9c3', color: '#92400e', dot: '#f59e0b', label: 'Cancelling' },
  overdue:    { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444', label: 'Overdue' },
  inactive:   { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af', label: 'Inactive' },
}

const AVATAR_COLORS = ['#6BA3D6', '#6BAD6B', '#D4A843', '#B06BAD', '#6BA8C4', '#AD6B7A']

const FILTER_PILLS = [
  { key: 'all',        label: 'All' },
  { key: 'active',     label: 'Active' },
  { key: 'cancelling', label: 'Cancelling' },
  { key: 'overdue',    label: 'Overdue' },
  { key: 'inactive',   label: 'Inactive' },
]

const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

// ─── Sample data ──────────────────────────────────────────────────────────────

const INIT_MEMBERS: Member[] = [
  {
    id: 'm1',
    firstName: 'Jordan', lastName: 'Mitchell',
    email: 'jordan.mitchell@gmail.com',
    plan: 'platinum', status: 'active',
    started: '2026-01-05', nextCharge: '2026-06-22',
    outstanding: 0, sessionsThisMonth: 10,
    notes: 'Focused on 3-point shooting improvement. Prefers afternoon sessions.',
    billing: [
      { id: 'b1-u', date: '2026-06-22', amount: 100, status: 'upcoming' },
      { id: 'b1-1', date: '2026-06-15', amount: 100, status: 'paid' },
      { id: 'b1-2', date: '2026-06-08', amount: 100, status: 'paid' },
      { id: 'b1-3', date: '2026-06-01', amount: 100, status: 'paid' },
      { id: 'b1-4', date: '2026-05-25', amount: 100, status: 'paid' },
      { id: 'b1-5', date: '2026-05-18', amount: 100, status: 'paid' },
    ],
  },
  {
    id: 'm2',
    firstName: 'Mia', lastName: 'Chen',
    email: 'mia.chen@outlook.com',
    plan: 'gold', status: 'active',
    started: '2025-12-01', nextCharge: '2026-06-22',
    outstanding: 0, sessionsThisMonth: 11,
    notes: 'Working on ball handling and finishing around the rim.',
    billing: [
      { id: 'b2-u', date: '2026-06-22', amount: 75, status: 'upcoming' },
      { id: 'b2-1', date: '2026-06-15', amount: 75, status: 'paid' },
      { id: 'b2-2', date: '2026-06-08', amount: 75, status: 'paid' },
      { id: 'b2-3', date: '2026-06-01', amount: 75, status: 'paid' },
      { id: 'b2-4', date: '2026-05-25', amount: 75, status: 'paid' },
      { id: 'b2-5', date: '2026-05-18', amount: 75, status: 'paid' },
    ],
  },
  {
    id: 'm3',
    firstName: 'Tyler', lastName: 'Brooks',
    email: 'tyler.brooks@gmail.com',
    plan: 'bronze', status: 'overdue',
    started: '2026-03-02', nextCharge: '2026-06-22',
    outstanding: 35, sessionsThisMonth: 5,
    notes: '',
    billing: [
      { id: 'b3-u', date: '2026-06-22', amount: 35, status: 'upcoming' },
      { id: 'b3-f', date: '2026-06-15', amount: 35, status: 'failed' },
      { id: 'b3-2', date: '2026-06-08', amount: 35, status: 'paid' },
      { id: 'b3-3', date: '2026-06-01', amount: 35, status: 'paid' },
      { id: 'b3-4', date: '2026-05-25', amount: 35, status: 'paid' },
      { id: 'b3-5', date: '2026-05-18', amount: 35, status: 'paid' },
    ],
  },
  {
    id: 'm4',
    firstName: 'Emma', lastName: 'Walsh',
    email: 'emma.walsh@icloud.com',
    plan: 'silver', status: 'cancelling',
    started: '2025-09-01', nextCharge: '2026-06-22',
    outstanding: 0, sessionsThisMonth: 8,
    notes: 'Moving interstate. Cancellation requested 17 Jun 2026 — effective end of current cycle.',
    billing: [
      { id: 'b4-u', date: '2026-06-22', amount: 50, status: 'upcoming' },
      { id: 'b4-1', date: '2026-06-15', amount: 50, status: 'paid' },
      { id: 'b4-2', date: '2026-06-08', amount: 50, status: 'paid' },
      { id: 'b4-3', date: '2026-06-01', amount: 50, status: 'paid' },
      { id: 'b4-4', date: '2026-05-25', amount: 50, status: 'paid' },
      { id: 'b4-5', date: '2026-05-18', amount: 50, status: 'paid' },
    ],
  },
  {
    id: 'm5',
    firstName: 'Liam', lastName: 'Nguyen',
    email: 'liam.nguyen@gmail.com',
    plan: 'bronze', status: 'active',
    started: '2026-06-01', nextCharge: '2026-06-22',
    outstanding: 0, sessionsThisMonth: 3,
    notes: 'New member. Beginner level — focus on fundamentals.',
    billing: [
      { id: 'b5-u', date: '2026-06-22', amount: 35, status: 'upcoming' },
      { id: 'b5-1', date: '2026-06-15', amount: 35, status: 'paid' },
      { id: 'b5-2', date: '2026-06-08', amount: 35, status: 'paid' },
      { id: 'b5-3', date: '2026-06-01', amount: 35, status: 'paid' },
    ],
  },
  {
    id: 'm6',
    firstName: 'Sophie', lastName: 'Davis',
    email: 'sophie.davis@hotmail.com',
    plan: 'platinum', status: 'inactive',
    started: '2025-06-02', nextCharge: null,
    outstanding: 0, sessionsThisMonth: 0,
    notes: 'On extended break. May return later in the year.',
    billing: [
      { id: 'b6-1', date: '2026-04-27', amount: 100, status: 'paid' },
      { id: 'b6-2', date: '2026-04-20', amount: 100, status: 'paid' },
      { id: 'b6-3', date: '2026-04-13', amount: 100, status: 'paid' },
      { id: 'b6-4', date: '2026-04-06', amount: 100, status: 'paid' },
    ],
  },
]

const WEEK_KEY = '2026-06-15'  // Current Monday (demo week)

// memberId:creditType → sessions used this week
const INIT_CREDIT_USAGE: Record<string, number> = {
  'm1:small-group':      2,
  'm1:casual-shooting':  3,
  'm1:shooting-machine': 1,
  'm1:weight-room':      2,
  'm2:small-group':      1,
  'm2:casual-shooting':  2,
  'm2:shooting-machine': 3,
  'm2:weight-room':      1,
  'm3:casual-shooting':  1,
  'm4:small-group':      1,
  'm4:casual-shooting':  1,
  'm4:shooting-machine': 0,
  'm5:casual-shooting':  0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(m: Member) {
  return `${m.firstName[0]}${m.lastName[0]}`.toUpperCase()
}

function avatarBg(id: string) {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
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

function StatusBadge({ status }: { status: MemberStatus }) {
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

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: PLAN_INFO[plan].color }}
    >
      {PLAN_INFO[plan].label}
    </span>
  )
}

function Avatar({ member, size = 36 }: { member: Member; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size, height: size,
        backgroundColor: avatarBg(member.id),
        fontSize: size * 0.36,
      }}
    >
      {initials(member)}
    </div>
  )
}

function CreditBar({ plan, creditUsage, memberId }: { plan: Plan; creditUsage: Record<string, number>; memberId: string }) {
  const { allowances } = PLAN_INFO[plan]
  if (allowances.length === 0) return <span className="text-sm text-gray-400">—</span>
  const totalUsed = allowances.reduce((s, a) => s + (creditUsage[`${memberId}:${a.type}`] ?? 0), 0)
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

function StatCard({
  icon, label, value, sub, accent,
}: {
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

function BillingBadge({ status }: { status: BillingStatus }) {
  const map: Record<BillingStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    paid:     { bg: '#dcfce7', color: '#15803d', icon: <IconCheck size={11} />,  label: 'Paid' },
    failed:   { bg: '#fee2e2', color: '#b91c1c', icon: <IconX size={11} />,      label: 'Failed' },
    upcoming: { bg: '#eff6ff', color: '#1d4ed8', icon: <IconClock size={11} />,  label: 'Upcoming' },
  }
  const s = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.icon}{s.label}
    </span>
  )
}

function PlanCard({
  plan, selected, onClick, compact,
}: {
  plan: Plan; selected: boolean; onClick: () => void; compact?: boolean
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
        <span
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: info.color }}
        >
          <IconCheck size={10} strokeWidth={3} />
        </span>
      )}
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: info.color }}>
        {info.label}
      </span>
      <span className="mt-1 text-lg font-bold text-gray-900">
        ${info.price}<span className="text-xs font-normal text-gray-400">/wk</span>
      </span>
      {!compact && <span className="mt-0.5 text-xs text-gray-500">{info.tagline}</span>}
    </button>
  )
}

function FamilyAccountCard() {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50 px-4 py-3">
      <div>
        <span className="text-sm font-bold text-cyan-800">Family Account</span>
        <p className="text-xs text-cyan-600">$100/wk · Platinum allowances shared across 2 accounts</p>
      </div>
      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-600">Coming Soon</span>
    </div>
  )
}

// ─── Supabase mapping ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToMember(row: any): Member {
  return {
    id:                 row.id,
    firstName:          row.first_name          ?? '',
    lastName:           row.last_name           ?? '',
    email:              row.email               ?? '',
    plan:               (row.plan as Plan)       ?? 'bronze',
    status:             (row.status as MemberStatus) ?? 'active',
    started:            row.started_date        ?? '',
    nextCharge:         row.next_charge_date    ?? null,
    outstanding:        Number(row.outstanding_balance ?? 0),
    sessionsThisMonth:  row.sessions_this_month ?? 0,
    notes:              row.notes               ?? '',
    billing:            (row.billing_records as BillingRecord[]) ?? [],
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MembershipsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [creditUsage, setCreditUsage] = useState<Record<string, number>>(INIT_CREDIT_USAGE)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [paymentSent, setPaymentSent] = useState(false)

  // Add-member form state
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlan, setNewPlan] = useState<Plan>('bronze')
  const [newStarted, setNewStarted] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const MEMBERS_CACHE_KEY = 'f14_members_cache'

  // Keep localStorage cache in sync so data survives refreshes even if Supabase is slow
  useEffect(() => {
    if (members.length > 0) {
      try { localStorage.setItem(MEMBERS_CACHE_KEY, JSON.stringify(members)) } catch {}
    }
  }, [members])

  // Load members: show cache immediately, then refresh from Supabase
  useEffect(() => {
    void (async () => {
      let hasCache = false
      try {
        const raw = localStorage.getItem(MEMBERS_CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw) as Member[]
          if (cached.length > 0) { setMembers(cached); hasCache = true }
        }
      } catch {}

      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('last_name')
        if (error) console.error('[members] Supabase error:', error)
        if (!error && data && data.length > 0) {
          setMembers(data.map(dbToMember))
        } else if (!hasCache) {
          setMembers(INIT_MEMBERS)
        }
      } catch (err) {
        console.error('[members] fetch failed:', err)
        if (!hasCache) setMembers(INIT_MEMBERS)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selectedMember = members.find((m) => m.id === selectedId) ?? null

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (filter !== 'all' && m.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [members, filter, search])

  const activeCount      = members.filter((m) => m.status === 'active').length
  const weeklyRevenue    = members.filter((m) => m.status === 'active').reduce((s, m) => s + PLAN_INFO[m.plan].price, 0)
  const overdueCount     = members.filter((m) => m.status === 'overdue').length
  const cancellingCount  = members.filter((m) => m.status === 'cancelling').length
  const overdueMembers   = members.filter((m) => m.status === 'overdue')

  function updateMember(id: string, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    // Persist to Supabase (optimistic, fire-and-forget)
    const dbPatch: Record<string, unknown> = {}
    if (patch.plan        !== undefined) dbPatch.plan                = patch.plan
    if (patch.status      !== undefined) dbPatch.status              = patch.status
    if (patch.nextCharge  !== undefined) dbPatch.next_charge_date    = patch.nextCharge
    if (patch.outstanding !== undefined) dbPatch.outstanding_balance = patch.outstanding
    if (patch.notes       !== undefined) dbPatch.notes               = patch.notes
    if (patch.billing     !== undefined) dbPatch.billing_records     = patch.billing
    if (Object.keys(dbPatch).length > 0) {
      supabase.from('members').update(dbPatch).eq('id', id)
    }
  }

  function handleChangePlan(plan: Plan) {
    if (!selectedMember) return
    updateMember(selectedMember.id, { plan })
    setShowChangePlan(false)
  }

  function handleToggleCancel() {
    if (!selectedMember) return
    const next: MemberStatus = selectedMember.status === 'cancelling' ? 'active' : 'cancelling'
    updateMember(selectedMember.id, { status: next })
  }

  function handleResendPayment() {
    setPaymentSent(true)
    setTimeout(() => setPaymentSent(false), 2500)
  }

  async function handleAddMember() {
    if (!newFirst.trim() || !newLast.trim() || !newEmail.trim() || !newStarted) return
    const plan = newPlan
    const firstCharge = nextMondayFrom(newStarted)
    const billingRecord: BillingRecord = { id: uid(), date: firstCharge, amount: PLAN_INFO[plan].price, status: 'upcoming' }
    const payload = {
      first_name:          newFirst.trim(),
      last_name:           newLast.trim(),
      email:               newEmail.trim(),
      plan,
      status:              'active',
      started_date:        newStarted,
      next_charge_date:    firstCharge,
      outstanding_balance: 0,
      sessions_this_month: 0,
      notes:               newNotes.trim(),
      billing_records:     [billingRecord],
    }
    const { data, error } = await supabase.from('members').insert(payload).select().single()
    if (!error && data) {
      setMembers((prev) => [...prev, dbToMember(data)])
    } else {
      const m: Member = {
        id: uid(), firstName: newFirst.trim(), lastName: newLast.trim(),
        email: newEmail.trim(), plan, status: 'active',
        started: newStarted, nextCharge: firstCharge,
        outstanding: 0, sessionsThisMonth: 0, notes: newNotes.trim(),
        billing: [billingRecord],
      }
      setMembers((prev) => [...prev, m])
    }
    setShowAddModal(false)
    setNewFirst(''); setNewLast(''); setNewEmail('')
    setNewPlan('bronze'); setNewStarted(''); setNewNotes('')
  }

  function openRow(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
    setShowChangePlan(false)
    setPaymentSent(false)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="text-sm text-gray-400">Loading memberships…</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Memberships</h1>
            <p className="text-sm text-gray-500">Manage athlete memberships and billing</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconUserPlus size={16} />
            Add Member
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<IconUserPlus size={18} />}
            label="Active Members"
            value={activeCount}
            sub={`${members.length} total`}
          />
          <StatCard
            icon={<IconCreditCard size={18} />}
            label="Weekly Revenue"
            value={`$${weeklyRevenue}`}
            sub="Active plans only"
            accent={ACCENT}
          />
          <StatCard
            icon={<IconAlertTriangle size={18} />}
            label="Overdue Payments"
            value={overdueCount}
            sub={overdueCount > 0 ? 'Action required' : 'All clear'}
            accent={overdueCount > 0 ? '#ef4444' : undefined}
          />
          <StatCard
            icon={<IconBan size={18} />}
            label="Cancelling"
            value={cancellingCount}
            sub="This billing cycle"
            accent={cancellingCount > 0 ? '#d97706' : undefined}
          />
        </div>

        {/* ── Overdue alert banner ───────────────────────────────────────── */}
        {overdueMembers.length > 0 && (
          <div
            className="flex items-start gap-3 rounded-xl border px-4 py-3.5"
            style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}
          >
            <IconAlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {overdueMembers.length === 1 ? 'Payment overdue' : `${overdueMembers.length} payments overdue`}
              </p>
              <p className="mt-0.5 text-sm text-red-600">
                {overdueMembers.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}
                {' — '}resend payment links from the member detail panel.
              </p>
            </div>
          </div>
        )}

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" style={{ minWidth: 200, maxWidth: 300, flex: '0 1 260px' }}>
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_PILLS.map(({ key, label }) => {
              const count = key === 'all'
                ? members.length
                : members.filter((m) => m.status === key).length
              const active = filter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    active
                      ? { backgroundColor: ACCENT, color: 'white' }
                      : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                  }
                >
                  {label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={
                      active
                        ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }
                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                    }
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Member table ───────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['Athlete', 'Plan', 'Status', 'Next Charge', 'Outstanding', 'Weekly Credits', 'Started', ''].map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                      No members match your search
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const sel = selectedId === m.id
                    return (
                      <tr
                        key={m.id}
                        onClick={() => openRow(m.id)}
                        className="group cursor-pointer border-b border-gray-50 transition last:border-0 hover:bg-gray-50"
                        style={{ backgroundColor: sel ? '#eff8ff' : undefined }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar member={m} size={36} />
                            <div>
                              <div className="font-semibold text-gray-900">{m.firstName} {m.lastName}</div>
                              <div className="text-xs text-gray-400">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><PlanBadge plan={m.plan} /></td>
                        <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {m.nextCharge ? fmtDate(m.nextCharge) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {m.outstanding > 0
                            ? <span className="font-semibold text-red-500">${m.outstanding.toFixed(2)}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <CreditBar plan={m.plan} creditUsage={creditUsage} memberId={m.id} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(m.started)}</td>
                        <td className="px-4 py-3 text-right">
                          <IconChevronRight
                            size={16}
                            className="text-gray-300 transition group-hover:text-gray-500"
                            style={{ transform: sel ? 'rotate(90deg)' : undefined }}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────────── */}
      {selectedMember && (() => {
        const m = selectedMember
        const sortedBilling = [...m.billing].sort((a, b) => b.date.localeCompare(a.date))

        return (
          <>
            {/* Transparent click-outside backdrop */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => { setSelectedId(null); setShowChangePlan(false) }}
            />

            {/* Panel */}
            <div
              className="fixed right-0 top-0 z-40 flex h-screen w-[430px] flex-col border-l border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar member={m} size={46} />
                  <div>
                    <div className="text-base font-bold text-gray-900">{m.firstName} {m.lastName}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <IconMail size={12} />{m.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setShowChangePlan(false) }}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-5 p-5">

                  {/* Membership info */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Membership</h3>
                    <div className="space-y-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {[
                        { label: 'Plan',          value: <PlanBadge plan={m.plan} /> },
                        { label: 'Status',        value: <StatusBadge status={m.status} /> },
                        { label: 'Started',       value: fmtDate(m.started) },
                        { label: 'Next charge',   value: m.nextCharge ? fmtDate(m.nextCharge) : '—' },
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
                      {PLAN_INFO[m.plan].comingSoon ? (
                        <p className="text-xs text-gray-400 italic">Family plan — shared credit tracking coming soon.</p>
                      ) : PLAN_INFO[m.plan].allowances.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No credit allowances for this plan.</p>
                      ) : (
                        PLAN_INFO[m.plan].allowances.map(allowance => {
                          const used = creditUsage[`${m.id}:${allowance.type}`] ?? 0
                          const remaining = allowance.limit - used
                          const pct = Math.min(used / allowance.limit, 1)
                          const barColor = pct >= 1 ? '#ef4444' : pct >= 0.7 ? '#f97316' : ACCENT
                          const atLimit = remaining <= 0
                          return (
                            <div key={allowance.type} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-gray-700">{allowance.label}</span>
                                <span className={atLimit ? 'font-semibold text-red-500' : 'text-gray-500'}>
                                  {used}/{allowance.limit} used{atLimit ? ' · at limit' : remaining === 1 ? ' · 1 remaining' : ` · ${remaining} remaining`}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-200">
                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
                              </div>
                            </div>
                          )
                        })
                      )}
                      <p className="pt-1 text-[10px] text-gray-400">Resets every Monday at 12:00am</p>
                    </div>
                  </section>

                  {/* Outstanding */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Outstanding Balance</h3>
                    <div
                      className="flex items-center justify-between rounded-xl border p-4"
                      style={
                        m.outstanding > 0
                          ? { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }
                          : { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
                      }
                    >
                      <span
                        className="text-2xl font-bold"
                        style={{ color: m.outstanding > 0 ? '#ef4444' : '#16a34a' }}
                      >
                        {m.outstanding > 0 ? `$${m.outstanding.toFixed(2)}` : '$0.00'}
                      </span>
                      {m.outstanding > 0 && (
                        <button
                          type="button"
                          onClick={handleResendPayment}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                          style={{
                            backgroundColor: paymentSent ? '#dcfce7' : '#ef4444',
                            color: paymentSent ? '#15803d' : 'white',
                          }}
                        >
                          {paymentSent
                            ? <><IconCheck size={13} /> Sent!</>
                            : <><IconMail size={13} /> Resend payment link</>}
                        </button>
                      )}
                    </div>
                  </section>

                  {/* Billing history */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Billing History</h3>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      {sortedBilling.map((b, i) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between px-4 py-2.5"
                          style={{
                            borderBottom: i < sortedBilling.length - 1 ? '1px solid #f3f4f6' : undefined,
                            backgroundColor: b.status === 'failed' ? '#fff8f8' : undefined,
                          }}
                        >
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

                  {/* Notes */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Notes</h3>
                    <textarea
                      rows={4}
                      value={m.notes}
                      onChange={(e) => updateMember(m.id, { notes: e.target.value })}
                      placeholder="Add a note about this member…"
                      className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                    />
                  </section>

                  {/* Actions */}
                  <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Actions</h3>

                    {/* Change Plan */}
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => setShowChangePlan((v) => !v)}
                        className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <span>Change Plan</span>
                        <IconChevronRight
                          size={15}
                          className="text-gray-400 transition"
                          style={{ transform: showChangePlan ? 'rotate(90deg)' : undefined }}
                        />
                      </button>
                      {showChangePlan && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {(['bronze', 'silver', 'gold', 'platinum'] as Plan[]).map((p) => (
                              <PlanCard key={p} plan={p} selected={m.plan === p} onClick={() => handleChangePlan(p)} compact />
                            ))}
                          </div>
                          <FamilyAccountCard />
                        </div>
                      )}
                    </div>

                    {/* Cancel / Reactivate */}
                    {m.status !== 'inactive' && (
                      <button
                        type="button"
                        onClick={handleToggleCancel}
                        className="flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
                        style={
                          m.status === 'cancelling'
                            ? { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4', color: '#15803d' }
                            : { borderColor: '#fecdd3', backgroundColor: '#fff1f2', color: '#ef4444' }
                        }
                      >
                        {m.status === 'cancelling'
                          ? <><IconRefresh size={15} /> Reactivate Membership</>
                          : <><IconBan size={15} /> Cancel at Period End</>}
                      </button>
                    )}
                  </section>

                </div>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Add Member modal ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add Member</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>First Name</label>
                  <input type="text" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="Jordan" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Last Name</label>
                  <input type="text" value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Mitchell" className={INPUT} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="athlete@example.com" className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>Plan</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(['bronze', 'silver', 'gold', 'platinum'] as Plan[]).map((p) => (
                      <PlanCard key={p} plan={p} selected={newPlan === p} onClick={() => setNewPlan(p)} />
                    ))}
                  </div>
                  <FamilyAccountCard />
                </div>
              </div>

              <div>
                <label className={LABEL}>Start Date</label>
                <input type="date" value={newStarted} onChange={(e) => setNewStarted(e.target.value)} className={INPUT} />
                {newStarted && (
                  <p className="mt-1 text-xs text-gray-400">
                    First billing Monday: <span className="font-medium">{fmtDate(nextMondayFrom(newStarted))}</span>
                  </p>
                )}
              </div>

              <div>
                <label className={LABEL}>
                  Notes{' '}
                  <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Any notes about this member…"
                  className={INPUT + ' resize-none'}
                />
              </div>
            </div>

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
                onClick={handleAddMember}
                disabled={!newFirst.trim() || !newLast.trim() || !newEmail.trim() || !newStarted}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
