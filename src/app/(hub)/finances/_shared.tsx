'use client'

// ─── Shared types, data, helpers and small components ─────────────────────────

import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TxType = 'income' | 'expense'
export type IncomeCat = 'membership' | 'casual' | 'program' | 'court-hire' | 'merchandise' | 'other-income'
export type ExpenseCat = 'wages' | 'facility' | 'equipment' | 'insurance' | 'marketing' | 'admin' | 'utilities' | 'other-expense'
export type TxCategory = IncomeCat | ExpenseCat

export interface Transaction {
  id: string
  date: string
  description: string
  type: TxType
  category: TxCategory
  amount: number
  reference: string
  notes: string
  // Expense-only extras
  receiptUrl?:     string
  gstAmount?:      number
  paymentMethod?:  string
  isReimbursable?: boolean
}

export type PersonalTxType = 'income' | 'expense'

export interface PersonalTx {
  id: string
  date: string
  description: string
  type: PersonalTxType
  category: string
  amount: number
}

export interface SavingsGoal {
  id: string
  name: string
  target: number
  saved: number
  color: string
}

// ─── Category definitions ─────────────────────────────────────────────────────

export const INCOME_CATS: Record<IncomeCat, { label: string; color: string; bg: string; chartColor: string }> = {
  membership:     { label: 'Membership',  color: '#1d4ed8', bg: '#dbeafe', chartColor: '#6BA3D6' },
  casual:         { label: 'Casual',      color: '#0f766e', bg: '#ccfbf1', chartColor: '#10b981' },
  program:        { label: 'Program',     color: '#15803d', bg: '#dcfce7', chartColor: '#34d399' },
  'court-hire':   { label: 'Court Hire',  color: '#4338ca', bg: '#e0e7ff', chartColor: '#8b5cf6' },
  merchandise:    { label: 'Merchandise', color: '#b45309', bg: '#fef3c7', chartColor: '#f59e0b' },
  'other-income': { label: 'Other',       color: '#374151', bg: '#f3f4f6', chartColor: '#9ca3af' },
}

export const EXPENSE_CATS: Record<ExpenseCat, { label: string; color: string; bg: string; chartColor: string }> = {
  wages:           { label: 'Wages',     color: '#b91c1c', bg: '#fee2e2', chartColor: '#ef4444' },
  facility:        { label: 'Facility',  color: '#c2410c', bg: '#ffedd5', chartColor: '#f97316' },
  equipment:       { label: 'Equipment', color: '#92400e', bg: '#fef3c7', chartColor: '#f59e0b' },
  insurance:       { label: 'Insurance', color: '#6d28d9', bg: '#ede9fe', chartColor: '#8b5cf6' },
  marketing:       { label: 'Marketing', color: '#9d174d', bg: '#fce7f3', chartColor: '#ec4899' },
  admin:           { label: 'Admin',     color: '#334155', bg: '#f1f5f9', chartColor: '#64748b' },
  utilities:       { label: 'Utilities', color: '#3f6212', bg: '#ecfccb', chartColor: '#84cc16' },
  'other-expense': { label: 'Other',     color: '#374151', bg: '#f3f4f6', chartColor: '#9ca3af' },
}

export const ALL_CATS = { ...INCOME_CATS, ...EXPENSE_CATS }

// ─── Constants ─────────────────────────────────────────────────────────────────

export const ACCENT = '#6BA3D6'
export const INPUT  = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
export const LABEL  = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function uid() { return Math.random().toString(36).slice(2) }

export function fmtMoney(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtK(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

export function monthTotal(txns: Transaction[], ym: string, type: TxType) {
  return txns.filter(t => t.date.startsWith(ym) && t.type === type).reduce((s, t) => s + t.amount, 0)
}

// ─── localStorage ──────────────────────────────────────────────────────────────

const TX_KEY      = 'f14_bk_transactions'
const PTX_KEY     = 'f14_personal_txns'
const GOAL_KEY    = 'f14_savings_goals'
const FIN_FLUSH   = 'f14_fin_flushed_v2'

export function loadTransactions(defaults: Transaction[]): Transaction[] {
  if (typeof window === 'undefined') return defaults
  if (!localStorage.getItem(FIN_FLUSH)) {
    localStorage.removeItem(TX_KEY)
    localStorage.removeItem(PTX_KEY)
    localStorage.removeItem(GOAL_KEY)
    localStorage.setItem(FIN_FLUSH, '1')
  }
  try { const s = localStorage.getItem(TX_KEY); return s ? JSON.parse(s) : defaults } catch { return defaults }
}
export function saveTransactions(txns: Transaction[]) { localStorage.setItem(TX_KEY, JSON.stringify(txns)) }

export function loadPersonalTxns(defaults: PersonalTx[]): PersonalTx[] {
  if (typeof window === 'undefined') return defaults
  try { const s = localStorage.getItem(PTX_KEY); return s ? JSON.parse(s) : defaults } catch { return defaults }
}
export function savePersonalTxns(txns: PersonalTx[]) { localStorage.setItem(PTX_KEY, JSON.stringify(txns)) }

export function loadGoals(defaults: SavingsGoal[]): SavingsGoal[] {
  if (typeof window === 'undefined') return defaults
  try { const s = localStorage.getItem(GOAL_KEY); return s ? JSON.parse(s) : defaults } catch { return defaults }
}
export function saveGoals(goals: SavingsGoal[]) { localStorage.setItem(GOAL_KEY, JSON.stringify(goals)) }

// ─── Personal finance category lists ──────────────────────────────────────────

export const INCOME_SOURCES        = ['Salary (Formula14)', 'Freelance / Other Coaching', 'Investments', 'Other']
export const EXPENSE_CATS_PERSONAL = ['Housing', 'Transport', 'Food & Groceries', 'Entertainment', 'Insurance', 'Health', 'Clothing', 'Other']

// ─── Shared UI components ──────────────────────────────────────────────────────

export function StatCard({ icon, label, value, sub, color = ACCENT, negative = false }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string; negative?: boolean
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: color + '1a' }}>
          <span style={{ color }}>{icon}</span>
        </span>
      </div>
      <p className="text-2xl font-bold" style={{ color: negative ? '#ef4444' : '#111827' }}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function CatBadge({ cat }: { cat: TxCategory }) {
  const c = ALL_CATS[cat]
  if (!c) return null
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: c.color, backgroundColor: c.bg }}>
      {c.label}
    </span>
  )
}

// ─── Recharts helpers ──────────────────────────────────────────────────────────

export function TooltipFormatter(v: unknown) { return fmtMoney(Number(v)) }

export function RevPieChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={2}>
          {data.map((c, i) => <Cell key={i} fill={c.color} />)}
        </Pie>
        <Tooltip formatter={TooltipFormatter} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MonthBarChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={TooltipFormatter} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="income"   name="Revenue"  fill={ACCENT}    radius={[3,3,0,0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#ef4444"   radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export type CashFlowEntry = { week: string; cashIn: number; cashOut: number; net: number }

export function CashFlowChart({ data }: { data: CashFlowEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={2} />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <Tooltip formatter={TooltipFormatter} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="cashIn"  name="Cash In"  stroke={ACCENT}   strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cashOut" name="Cash Out" stroke="#ef4444"  strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="net"     name="Net"      stroke="#10b981"  strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}
