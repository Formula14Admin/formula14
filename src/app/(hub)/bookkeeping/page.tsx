'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconArrowUpRight,
  IconArrowDownLeft,
  IconPlus,
  IconSearch,
  IconX,
  IconTrash,
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconReceipt,
  IconChevronDown,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TxType = 'income' | 'expense'
type IncomeCat = 'membership' | 'casual' | 'program' | 'court-hire' | 'merchandise' | 'other-income'
type ExpenseCat = 'wages' | 'facility' | 'equipment' | 'insurance' | 'marketing' | 'admin' | 'utilities' | 'other-expense'
type TxCategory = IncomeCat | ExpenseCat

interface Transaction {
  id: string
  date: string
  description: string
  type: TxType
  category: TxCategory
  amount: number
  reference: string
  notes: string
}

// ─── Category definitions ─────────────────────────────────────────────────────

const INCOME_CATS: Record<IncomeCat, { label: string; color: string; bg: string }> = {
  membership:     { label: 'Membership',  color: '#1d4ed8', bg: '#dbeafe' },
  casual:         { label: 'Casual',      color: '#0f766e', bg: '#ccfbf1' },
  program:        { label: 'Program',     color: '#15803d', bg: '#dcfce7' },
  'court-hire':   { label: 'Court Hire',  color: '#4338ca', bg: '#e0e7ff' },
  merchandise:    { label: 'Merchandise', color: '#b45309', bg: '#fef3c7' },
  'other-income': { label: 'Other',       color: '#374151', bg: '#f3f4f6' },
}

const EXPENSE_CATS: Record<ExpenseCat, { label: string; color: string; bg: string }> = {
  wages:           { label: 'Wages',     color: '#b91c1c', bg: '#fee2e2' },
  facility:        { label: 'Facility',  color: '#c2410c', bg: '#ffedd5' },
  equipment:       { label: 'Equipment', color: '#92400e', bg: '#fef3c7' },
  insurance:       { label: 'Insurance', color: '#6d28d9', bg: '#ede9fe' },
  marketing:       { label: 'Marketing', color: '#9d174d', bg: '#fce7f3' },
  admin:           { label: 'Admin',     color: '#334155', bg: '#f1f5f9' },
  utilities:       { label: 'Utilities', color: '#3f6212', bg: '#ecfccb' },
  'other-expense': { label: 'Other',     color: '#374151', bg: '#f3f4f6' },
}

const ALL_CATS = { ...INCOME_CATS, ...EXPENSE_CATS }

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

// Hardcoded Jan–Apr chart history (no individual transactions stored)
const CHART_HISTORY = [
  { label: 'Jan', ym: '2026-01', income: 1800, expenses: 5200 },
  { label: 'Feb', ym: '2026-02', income: 2100, expenses: 5300 },
  { label: 'Mar', ym: '2026-03', income: 2450, expenses: 5450 },
  { label: 'Apr', ym: '2026-04', income: 2900, expenses: 5550 },
]

// ─── Sample transactions (May + June 2026) ────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

const INIT_TRANSACTIONS: Transaction[] = [
  // ── June 2026 Income ──────────────────────────────────────────────────────
  { id: 'j01', date: '2026-06-01', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-06-01', notes: 'Jordan $79, Mia $59, Tyler $39, Emma $59, Liam $39' },
  { id: 'j02', date: '2026-06-02', description: 'Casual session — Tyler Ross',               type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'j03', date: '2026-06-04', description: 'Casual session — Devon Knox',               type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'j04', date: '2026-06-05', description: 'Casual session — Kai Okafor',               type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'j05', date: '2026-06-06', description: 'Program package — Aisha Thompson (8-wk)',   type: 'income',  category: 'program',      amount: 320.00, reference: 'PROG-AT-001',  notes: '8-week individual development program' },
  { id: 'j06', date: '2026-06-07', description: 'Court hire — external booking',             type: 'income',  category: 'court-hire',   amount: 150.00, reference: 'CH-0607',       notes: 'Saturday morning, 2 hrs' },
  { id: 'j07', date: '2026-06-08', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-06-08', notes: '' },
  { id: 'j08', date: '2026-06-09', description: 'Casual sessions × 2',                      type: 'income',  category: 'casual',       amount:  90.00, reference: '',              notes: '' },
  { id: 'j09', date: '2026-06-11', description: 'Court hire — external booking',             type: 'income',  category: 'court-hire',   amount: 150.00, reference: 'CH-0611',       notes: 'Thursday evening, 2 hrs' },
  { id: 'j10', date: '2026-06-12', description: 'Casual session — Marcus Davies',            type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'j11', date: '2026-06-14', description: 'Casual sessions × 2',                      type: 'income',  category: 'casual',       amount:  90.00, reference: '',              notes: '' },
  { id: 'j12', date: '2026-06-15', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 236.00, reference: 'WK-2026-06-15', notes: 'Tyler Brooks payment failed — $39 outstanding' },
  { id: 'j13', date: '2026-06-16', description: 'Program package — Marcus Davies (6-wk)',    type: 'income',  category: 'program',      amount: 280.00, reference: 'PROG-MD-001',  notes: '6-week post-training conditioning program' },
  { id: 'j14', date: '2026-06-17', description: 'Casual sessions × 3',                      type: 'income',  category: 'casual',       amount: 135.00, reference: '',              notes: '' },
  { id: 'j15', date: '2026-06-18', description: 'Merchandise — training apparel',            type: 'income',  category: 'merchandise',  amount:  95.00, reference: 'MERCH-001',     notes: 'F14 singlets × 2, shorts × 1' },

  // ── June 2026 Expenses ────────────────────────────────────────────────────
  { id: 'j20', date: '2026-06-01', description: 'Matt Brasser — coaching wages',             type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0601',  notes: 'Fortnightly — 1–14 Jun' },
  { id: 'j21', date: '2026-06-01', description: 'Jade Brasser — coaching wages',              type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0601',  notes: 'Fortnightly — 1–14 Jun' },
  { id: 'j22', date: '2026-06-01', description: 'Facility hire — gymnasium (June)',          type: 'expense', category: 'facility',     amount:  800.00, reference: 'FACIL-2406',    notes: 'Monthly lease, Oakleigh facility' },
  { id: 'j23', date: '2026-06-02', description: 'Public liability insurance — June',         type: 'expense', category: 'insurance',    amount:  185.00, reference: 'INS-2406',      notes: '' },
  { id: 'j24', date: '2026-06-06', description: 'Training equipment — cones & balls',        type: 'expense', category: 'equipment',    amount:  340.00, reference: 'EQ-001',        notes: '12 agility cones, 4 training balls' },
  { id: 'j25', date: '2026-06-08', description: 'Meta Ads — social media marketing',         type: 'expense', category: 'marketing',    amount:  150.00, reference: 'MKT-0608',      notes: 'Jun 8–21 campaign' },
  { id: 'j26', date: '2026-06-12', description: 'Admin software subscription',               type: 'expense', category: 'admin',        amount:  149.00, reference: 'ADMIN-JUN',     notes: 'Monthly SaaS tools' },
  { id: 'j27', date: '2026-06-15', description: 'Matt Brasser — coaching wages',             type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0615',  notes: 'Fortnightly — 15–28 Jun' },
  { id: 'j28', date: '2026-06-15', description: 'Jade Brasser — coaching wages',              type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0615',  notes: 'Fortnightly — 15–28 Jun' },
  { id: 'j29', date: '2026-06-18', description: 'Electricity — facility share',              type: 'expense', category: 'utilities',    amount:  220.00, reference: 'UTIL-JUN',      notes: 'Pro-rata electricity for training space' },

  // ── May 2026 Income ───────────────────────────────────────────────────────
  { id: 'm01', date: '2026-05-04', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-05-04', notes: '' },
  { id: 'm02', date: '2026-05-05', description: 'Casual session — Liam Carter',              type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'm03', date: '2026-05-07', description: 'Program package — Tyler Ross (6-wk)',       type: 'income',  category: 'program',      amount: 240.00, reference: 'PROG-TR-001',  notes: '6-week ball-handling program' },
  { id: 'm04', date: '2026-05-07', description: 'Court hire — external booking',             type: 'income',  category: 'court-hire',   amount: 150.00, reference: 'CH-0507',       notes: '' },
  { id: 'm05', date: '2026-05-11', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-05-11', notes: '' },
  { id: 'm06', date: '2026-05-12', description: 'Casual sessions × 2',                      type: 'income',  category: 'casual',       amount:  90.00, reference: '',              notes: '' },
  { id: 'm07', date: '2026-05-14', description: 'Casual session — Devon Knox',               type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'm08', date: '2026-05-18', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-05-18', notes: '' },
  { id: 'm09', date: '2026-05-19', description: 'Casual sessions × 3',                      type: 'income',  category: 'casual',       amount: 135.00, reference: '',              notes: '' },
  { id: 'm10', date: '2026-05-20', description: 'Court hire — external booking',             type: 'income',  category: 'court-hire',   amount: 150.00, reference: 'CH-0520',       notes: '' },
  { id: 'm11', date: '2026-05-21', description: 'Casual session — Priya Mehta',              type: 'income',  category: 'casual',       amount:  45.00, reference: '',              notes: '' },
  { id: 'm12', date: '2026-05-22', description: 'Merchandise — singlets & shorts',           type: 'income',  category: 'merchandise',  amount: 120.00, reference: 'MERCH-005',     notes: 'F14 singlets × 3, shorts × 2' },
  { id: 'm13', date: '2026-05-25', description: 'Membership fees — weekly billing',          type: 'income',  category: 'membership',   amount: 275.00, reference: 'WK-2026-05-25', notes: '' },
  { id: 'm14', date: '2026-05-26', description: 'Court hire — external booking',             type: 'income',  category: 'court-hire',   amount: 150.00, reference: 'CH-0526',       notes: '' },
  { id: 'm15', date: '2026-05-27', description: 'Casual sessions × 2',                      type: 'income',  category: 'casual',       amount:  90.00, reference: '',              notes: '' },
  { id: 'm16', date: '2026-05-28', description: 'Program package — Zara Obi (4-wk)',        type: 'income',  category: 'program',      amount: 160.00, reference: 'PROG-ZO-001',  notes: '4-week fundamentals introduction' },

  // ── May 2026 Expenses ─────────────────────────────────────────────────────
  { id: 'm20', date: '2026-05-01', description: 'Matt Brasser — coaching wages',             type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0501',  notes: 'Fortnightly — 1–14 May' },
  { id: 'm21', date: '2026-05-01', description: 'Jade Brasser — coaching wages',              type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0501',  notes: 'Fortnightly — 1–14 May' },
  { id: 'm22', date: '2026-05-01', description: 'Facility hire — gymnasium (May)',           type: 'expense', category: 'facility',     amount:  800.00, reference: 'FACIL-2405',    notes: 'Monthly lease, Oakleigh facility' },
  { id: 'm23', date: '2026-05-02', description: 'Public liability insurance — May',          type: 'expense', category: 'insurance',    amount:  185.00, reference: 'INS-2405',      notes: '' },
  { id: 'm24', date: '2026-05-10', description: 'Marketing — print flyers & signage',        type: 'expense', category: 'marketing',    amount:  120.00, reference: 'MKT-0510',      notes: '500 A5 flyers + 2 corflute signs' },
  { id: 'm25', date: '2026-05-12', description: 'Admin software subscription',               type: 'expense', category: 'admin',        amount:  149.00, reference: 'ADMIN-MAY',     notes: '' },
  { id: 'm26', date: '2026-05-15', description: 'Matt Brasser — coaching wages',             type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0515',  notes: 'Fortnightly — 15–28 May' },
  { id: 'm27', date: '2026-05-15', description: 'Jade Brasser — coaching wages',              type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0515',  notes: 'Fortnightly — 15–28 May' },
  { id: 'm28', date: '2026-05-20', description: 'Electricity — facility share',              type: 'expense', category: 'utilities',    amount:  195.00, reference: 'UTIL-MAY',      notes: '' },
  { id: 'm29', date: '2026-05-28', description: 'Equipment — basketball tape & pump',        type: 'expense', category: 'equipment',    amount:   75.00, reference: 'EQ-002',        notes: '' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number, sign = false) {
  const s = `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return sign && n >= 0 ? `+${s}` : s
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short',
  })
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function monthTotal(txns: Transaction[], ym: string, type: TxType) {
  return txns
    .filter((t) => t.date.startsWith(ym) && t.type === type)
    .reduce((s, t) => s + t.amount, 0)
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────

interface MonthBar {
  label: string
  ym: string
  income: number
  expenses: number
  partial?: boolean
}

function PnLChart({ months }: { months: MonthBar[] }) {
  const W = 720
  const H = 210
  const PAD_L = 58
  const PAD_T = 16
  const PAD_B = 32
  const PAD_R = 16
  const CHART_W = W - PAD_L - PAD_R
  const CHART_H = H - PAD_T - PAD_B
  const MAX_VAL = 7000
  const Y_BASE = PAD_T + CHART_H
  const scale = (v: number) => (v / MAX_VAL) * CHART_H

  const GROUP_W = CHART_W / months.length
  const BAR_W = Math.floor((GROUP_W - 16) / 2)

  const gridVals = [0, 2000, 4000, 6000]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
      {/* Grid lines + y-axis labels */}
      {gridVals.map((v) => {
        const y = Y_BASE - scale(v)
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#9ca3af">
              {v === 0 ? '$0' : `$${v / 1000}k`}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {months.map((m, i) => {
        const gx = PAD_L + i * GROUP_W + 8
        const incH = scale(m.income)
        const expH = scale(m.expenses)
        const incX = gx
        const expX = gx + BAR_W + 4

        return (
          <g key={m.ym}>
            {/* Income bar */}
            <rect
              x={incX} y={Y_BASE - incH} width={BAR_W} height={incH} rx={3}
              fill={m.partial ? 'none' : ACCENT}
              stroke={m.partial ? ACCENT : 'none'}
              strokeWidth={m.partial ? 1.5 : 0}
              strokeDasharray={m.partial ? '4 3' : undefined}
              opacity={m.partial ? 0.7 : 1}
            />
            {m.partial && (
              <rect x={incX} y={Y_BASE - incH} width={BAR_W} height={incH} rx={3} fill={ACCENT} opacity={0.15} />
            )}

            {/* Expense bar */}
            <rect
              x={expX} y={Y_BASE - expH} width={BAR_W} height={expH} rx={3}
              fill={m.partial ? 'none' : '#ef4444'}
              stroke={m.partial ? '#ef4444' : 'none'}
              strokeWidth={m.partial ? 1.5 : 0}
              strokeDasharray={m.partial ? '4 3' : undefined}
              opacity={m.partial ? 0.7 : 1}
            />
            {m.partial && (
              <rect x={expX} y={Y_BASE - expH} width={BAR_W} height={expH} rx={3} fill="#ef4444" opacity={0.15} />
            )}

            {/* Month label */}
            <text
              x={gx + BAR_W + 2}
              y={Y_BASE + 14}
              textAnchor="middle"
              fontSize={10}
              fill={m.partial ? ACCENT : '#9ca3af'}
              fontWeight={m.partial ? 600 : 400}
              fontFamily="Arial, sans-serif"
            >
              {m.label}{m.partial ? '*' : ''}
            </text>
          </g>
        )
      })}

      {/* Baseline */}
      <line x1={PAD_L} y1={Y_BASE} x2={W - PAD_R} y2={Y_BASE} stroke="#e5e7eb" strokeWidth={1} />
    </svg>
  )
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: TxCategory }) {
  const info = ALL_CATS[cat] ?? { label: cat, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color, positive,
}: {
  icon: React.ReactNode; label: string; value: string
  sub?: string; color?: string; positive?: boolean
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: color ?? '#111827' }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void
  onAdd: (t: Transaction) => void
}

function AddModal({ onClose, onAdd }: AddModalProps) {
  const [type, setType] = useState<TxType>('income')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TxCategory>('casual')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const catOptions = type === 'income'
    ? Object.entries(INCOME_CATS).map(([k, v]) => ({ value: k, label: v.label }))
    : Object.entries(EXPENSE_CATS).map(([k, v]) => ({ value: k, label: v.label }))

  // Reset category when type changes
  function handleTypeChange(t: TxType) {
    setType(t)
    setCategory(t === 'income' ? 'casual' : 'wages')
  }

  function handleSubmit() {
    const amt = parseFloat(amount)
    if (!date || !description.trim() || isNaN(amt) || amt <= 0) return
    onAdd({
      id: uid(),
      date,
      description: description.trim(),
      type,
      category: category as TxCategory,
      amount: amt,
      reference: reference.trim(),
      notes: notes.trim(),
    })
  }

  const canSubmit = date && description.trim() && parseFloat(amount) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">Add Transaction</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Income / Expense toggle */}
          <div className="flex overflow-hidden rounded-xl border-2" style={{ borderColor: type === 'income' ? ACCENT : '#ef4444' }}>
            {(['income', 'expense'] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-bold capitalize transition"
                style={
                  type === t
                    ? { backgroundColor: t === 'income' ? ACCENT : '#ef4444', color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280' }
                }
              >
                {t === 'income'
                  ? <IconArrowUpRight size={16} />
                  : <IconArrowDownLeft size={16} />}
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={INPUT + ' pl-7'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Membership fees — weekly" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TxCategory)}
                className={INPUT + ' appearance-none pr-8'}
              >
                {catOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Reference <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. WK-2026-06-22" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes…" className={INPUT + ' resize-none'} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: type === 'income' ? ACCENT : '#ef4444' }}
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: '2026-06', label: 'Jun 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: 'all',     label: 'All time' },
]

export default function BookkeepingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_transactions'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [period, setPeriod] = useState('2026-06')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('f14_transactions', JSON.stringify(transactions))
  }, [transactions])

  // ── Derived data ──────────────────────────────────────────────────────────

  const periodTransactions = useMemo(() =>
    period === 'all'
      ? transactions
      : transactions.filter((t) => t.date.startsWith(period)),
    [transactions, period],
  )

  const filtered = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${t.description} ${t.reference} ${t.notes} ${t.category}`.toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [periodTransactions, typeFilter, search])

  // Stats for selected period
  const totalIncome   = periodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = periodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netPnL        = totalIncome - totalExpenses

  // YTD (always computed from all transactions + Jan–Apr hardcoded)
  const ytdHistIncome   = CHART_HISTORY.reduce((s, m) => s + m.income, 0)
  const ytdHistExpenses = CHART_HISTORY.reduce((s, m) => s + m.expenses, 0)
  const ytdIncome   = ytdHistIncome   + monthTotal(transactions, '2026-05', 'income')   + monthTotal(transactions, '2026-06', 'income')
  const ytdExpenses = ytdHistExpenses + monthTotal(transactions, '2026-05', 'expense')  + monthTotal(transactions, '2026-06', 'expense')
  const ytdNet      = ytdIncome - ytdExpenses

  // Chart data
  const chartData: MonthBar[] = [
    ...CHART_HISTORY,
    { label: 'May', ym: '2026-05', income: monthTotal(transactions, '2026-05', 'income'), expenses: monthTotal(transactions, '2026-05', 'expense') },
    { label: 'Jun', ym: '2026-06', income: monthTotal(transactions, '2026-06', 'income'), expenses: monthTotal(transactions, '2026-06', 'expense'), partial: true },
  ]

  function handleAddTransaction(t: Transaction) {
    setTransactions((prev) => [...prev, t])
    setShowAddModal(false)
  }

  function handleDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  // Count by type for filter pills
  const incomeCount  = periodTransactions.filter((t) => t.type === 'income').length
  const expenseCount = periodTransactions.filter((t) => t.type === 'expense').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bookkeeping</h1>
            <p className="text-sm text-gray-500">Track revenue, expenses, and financial performance</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<IconArrowUpRight size={18} />}
            label={period === 'all' ? 'Total Income' : `Income — ${monthLabel(period === 'all' ? '' : period)}`}
            value={fmtMoney(totalIncome)}
            sub={`${periodTransactions.filter(t => t.type === 'income').length} transactions`}
            color={ACCENT}
          />
          <StatCard
            icon={<IconArrowDownLeft size={18} />}
            label={period === 'all' ? 'Total Expenses' : `Expenses — ${monthLabel(period === 'all' ? '' : period)}`}
            value={fmtMoney(totalExpenses)}
            sub={`${periodTransactions.filter(t => t.type === 'expense').length} transactions`}
          />
          <StatCard
            icon={netPnL >= 0 ? <IconTrendingUp size={18} /> : <IconTrendingDown size={18} />}
            label="Net P&L"
            value={fmtMoney(Math.abs(netPnL))}
            sub={netPnL >= 0 ? 'Profit' : 'Loss for period'}
            color={netPnL >= 0 ? '#15803d' : '#ef4444'}
          />
          <StatCard
            icon={<IconCurrencyDollar size={18} />}
            label="YTD Net"
            value={fmtMoney(Math.abs(ytdNet))}
            sub={ytdNet >= 0 ? 'Profit year to date' : 'Loss year to date'}
            color={ytdNet >= 0 ? '#15803d' : '#b91c1c'}
          />
        </div>

        {/* ── P&L Chart ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">6-Month Overview</h2>
              <p className="text-xs text-gray-400">Jan – Jun 2026 · * partial month</p>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: ACCENT }} />
                <span className="text-xs text-gray-500">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-red-400" />
                <span className="text-xs text-gray-500">Expenses</span>
              </div>
            </div>
          </div>
          <PnLChart months={chartData} />

          {/* Monthly summary row below chart */}
          <div className="mt-3 grid grid-cols-6 gap-2">
            {chartData.map((m) => {
              const net = m.income - m.expenses
              return (
                <div key={m.ym} className="text-center">
                  <div className="text-[10px] text-gray-400">{m.label}</div>
                  <div
                    className="mt-0.5 text-xs font-semibold"
                    style={{ color: net >= 0 ? '#15803d' : '#ef4444' }}
                  >
                    {net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative" style={{ minWidth: 200, maxWidth: 280, flex: '0 1 240px' }}>
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
            />
          </div>

          {/* Period */}
          <div className="flex items-center gap-1.5">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={
                  period === value
                    ? { backgroundColor: '#1f2937', color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Type */}
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all' as const,     label: 'All',      count: periodTransactions.length },
              { key: 'income' as const,  label: 'Income',   count: incomeCount },
              { key: 'expense' as const, label: 'Expenses', count: expenseCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={
                  typeFilter === key
                    ? { backgroundColor: key === 'income' ? ACCENT : key === 'expense' ? '#ef4444' : '#374151', color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
                }
              >
                {key === 'income' && <IconArrowUpRight size={12} />}
                {key === 'expense' && <IconArrowDownLeft size={12} />}
                {label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={
                    typeFilter === key
                      ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }
                      : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                  }
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-400">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Transaction table ───────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">
              No transactions match your filters
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 w-24">Date</th>
                  <th className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">Description</th>
                  <th className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 w-32">Category</th>
                  <th className="border-b border-gray-100 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-gray-400 w-28">Amount</th>
                  <th className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 w-32">Reference</th>
                  <th className="border-b border-gray-100 px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    className="group border-b border-gray-50 transition last:border-0 hover:bg-gray-50"
                  >
                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{fmtDateShort(t.date)}</span>
                    </td>

                    {/* Description + notes */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: t.type === 'income' ? '#dcfce7' : '#fee2e2',
                          }}
                        >
                          {t.type === 'income'
                            ? <IconArrowUpRight size={13} style={{ color: '#15803d' }} />
                            : <IconArrowDownLeft size={13} style={{ color: '#ef4444' }} />}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{t.description}</div>
                          {t.notes && (
                            <div className="truncate text-xs text-gray-400" style={{ maxWidth: 280 }}>{t.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <CatBadge cat={t.category} />
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-sm font-bold"
                        style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}
                      >
                        {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                      </span>
                    </td>

                    {/* Reference */}
                    <td className="px-4 py-3">
                      {t.reference
                        ? <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">{t.reference}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                        title="Delete transaction"
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                      {filtered.length} transactions
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                        const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                        const net = inc - exp
                        if (typeFilter === 'income') return <span className="text-sm font-bold" style={{ color: '#15803d' }}>+{fmtMoney(inc)}</span>
                        if (typeFilter === 'expense') return <span className="text-sm font-bold" style={{ color: '#ef4444' }}>−{fmtMoney(exp)}</span>
                        return (
                          <span className="text-sm font-bold" style={{ color: net >= 0 ? '#15803d' : '#ef4444' }}>
                            {net >= 0 ? '+' : '−'}{fmtMoney(Math.abs(net))}
                          </span>
                        )
                      })()}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

      </div>

      {/* ── Add Transaction Modal ─────────────────────────────────────────────── */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTransaction}
        />
      )}

    </div>
  )
}
