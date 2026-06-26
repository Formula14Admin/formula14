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

// Hardcoded Jan–Apr 2026 history
export const CHART_HISTORY = [
  { label: 'Jan', ym: '2026-01', income: 7800,  expenses: 5200 },
  { label: 'Feb', ym: '2026-02', income: 8400,  expenses: 5300 },
  { label: 'Mar', ym: '2026-03', income: 9100,  expenses: 5450 },
  { label: 'Apr', ym: '2026-04', income: 9600,  expenses: 5550 },
]

export const CASH_FLOW_DATA = [
  { week: '24 Mar', cashIn: 2350, cashOut: 1400, net:  950 },
  { week: '31 Mar', cashIn: 2700, cashOut: 2800, net: -100 },
  { week: '7 Apr',  cashIn: 2900, cashOut: 1380, net: 1520 },
  { week: '14 Apr', cashIn: 3100, cashOut: 2750, net:  350 },
  { week: '21 Apr', cashIn: 2600, cashOut: 1350, net: 1250 },
  { week: '28 Apr', cashIn: 3200, cashOut: 2900, net:  300 },
  { week: '5 May',  cashIn: 3400, cashOut: 1420, net: 1980 },
  { week: '12 May', cashIn: 3100, cashOut: 1500, net: 1600 },
  { week: '19 May', cashIn: 2800, cashOut: 2600, net:  200 },
  { week: '26 May', cashIn: 3500, cashOut: 1450, net: 2050 },
  { week: '2 Jun',  cashIn: 3200, cashOut: 2850, net:  350 },
  { week: '9 Jun',  cashIn: 2950, cashOut: 1380, net: 1570 },
  { week: '16 Jun', cashIn: 2100, cashOut: 1490, net:  610 },
]

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

const TX_KEY   = 'f14_bk_transactions'
const PTX_KEY  = 'f14_personal_txns'
const GOAL_KEY = 'f14_savings_goals'

export function loadTransactions(defaults: Transaction[]): Transaction[] {
  if (typeof window === 'undefined') return defaults
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

export function CashFlowChart({ data }: { data: typeof CASH_FLOW_DATA }) {
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

// ─── Sample transaction data ───────────────────────────────────────────────────

export const INIT_TRANSACTIONS: Transaction[] = [
  // ── June 2026 Income
  { id: 'j01', date: '2026-06-01', description: 'Membership fees — weekly billing',        type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-06-01', notes: 'Jordan $79, Mia $59, Tyler $39, Emma $59, Liam $39' },
  { id: 'j02', date: '2026-06-02', description: 'Casual session — Tyler Ross',              type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'j03', date: '2026-06-04', description: 'Casual session — Devon Knox',              type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'j04', date: '2026-06-05', description: 'Casual session — Kai Okafor',              type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'j05', date: '2026-06-06', description: 'Program package — Aisha Thompson (8-wk)', type: 'income',  category: 'program',      amount:  320.00, reference: 'PROG-AT-001',  notes: '8-week individual development program' },
  { id: 'j06', date: '2026-06-07', description: 'Court hire — external booking',            type: 'income',  category: 'court-hire',   amount:  150.00, reference: 'CH-0607',       notes: 'Saturday morning, 2 hrs' },
  { id: 'j07', date: '2026-06-08', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-06-08', notes: '' },
  { id: 'j08', date: '2026-06-09', description: 'Casual sessions × 2',                     type: 'income',  category: 'casual',       amount:   90.00, reference: '',              notes: '' },
  { id: 'j09', date: '2026-06-11', description: 'Court hire — external booking',            type: 'income',  category: 'court-hire',   amount:  150.00, reference: 'CH-0611',       notes: 'Thursday evening, 2 hrs' },
  { id: 'j10', date: '2026-06-12', description: 'Casual session — Marcus Davies',           type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'j11', date: '2026-06-14', description: 'Casual sessions × 2',                     type: 'income',  category: 'casual',       amount:   90.00, reference: '',              notes: '' },
  { id: 'j12', date: '2026-06-15', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  236.00, reference: 'WK-2026-06-15', notes: 'Tyler Brooks payment failed — $39 outstanding' },
  { id: 'j13', date: '2026-06-16', description: 'Program package — Marcus Davies (6-wk)',   type: 'income',  category: 'program',      amount:  280.00, reference: 'PROG-MD-001',  notes: '6-week post-training conditioning program' },
  { id: 'j14', date: '2026-06-17', description: 'Casual sessions × 3',                     type: 'income',  category: 'casual',       amount:  135.00, reference: '',              notes: '' },
  { id: 'j15', date: '2026-06-18', description: 'Merchandise — training apparel',           type: 'income',  category: 'merchandise',  amount:   95.00, reference: 'MERCH-001',     notes: 'F14 singlets × 2, shorts × 1' },
  // ── June 2026 Expenses
  { id: 'j20', date: '2026-06-01', description: 'Matt Brasser — coaching wages',            type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0601',  notes: 'Fortnightly — 1–14 Jun' },
  { id: 'j21', date: '2026-06-01', description: 'Jade Brasser — coaching wages',             type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0601',  notes: 'Fortnightly — 1–14 Jun' },
  { id: 'j22', date: '2026-06-01', description: 'Facility hire — gymnasium (June)',         type: 'expense', category: 'facility',     amount:  800.00, reference: 'FACIL-2406',    notes: 'Monthly lease, Oakleigh facility' },
  { id: 'j23', date: '2026-06-02', description: 'Public liability insurance — June',        type: 'expense', category: 'insurance',    amount:  185.00, reference: 'INS-2406',      notes: '' },
  { id: 'j24', date: '2026-06-06', description: 'Training equipment — cones & balls',       type: 'expense', category: 'equipment',    amount:  340.00, reference: 'EQ-001',        notes: '12 agility cones, 4 training balls' },
  { id: 'j25', date: '2026-06-08', description: 'Meta Ads — social media marketing',        type: 'expense', category: 'marketing',    amount:  150.00, reference: 'MKT-0608',      notes: 'Jun 8–21 campaign' },
  { id: 'j26', date: '2026-06-12', description: 'Admin software subscription',              type: 'expense', category: 'admin',        amount:  149.00, reference: 'ADMIN-JUN',     notes: 'Monthly SaaS tools' },
  { id: 'j27', date: '2026-06-15', description: 'Matt Brasser — coaching wages',            type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0615',  notes: 'Fortnightly — 15–28 Jun' },
  { id: 'j28', date: '2026-06-15', description: 'Jade Brasser — coaching wages',             type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0615',  notes: 'Fortnightly — 15–28 Jun' },
  { id: 'j29', date: '2026-06-18', description: 'Electricity — facility share',             type: 'expense', category: 'utilities',    amount:  220.00, reference: 'UTIL-JUN',      notes: 'Pro-rata electricity for training space' },
  // ── May 2026 Income
  { id: 'm01', date: '2026-05-04', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-05-04', notes: '' },
  { id: 'm02', date: '2026-05-05', description: 'Casual session — Liam Carter',             type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'm03', date: '2026-05-07', description: 'Program package — Tyler Ross (6-wk)',      type: 'income',  category: 'program',      amount:  240.00, reference: 'PROG-TR-001',  notes: '6-week ball-handling program' },
  { id: 'm04', date: '2026-05-07', description: 'Court hire — external booking',            type: 'income',  category: 'court-hire',   amount:  150.00, reference: 'CH-0507',       notes: '' },
  { id: 'm05', date: '2026-05-11', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-05-11', notes: '' },
  { id: 'm06', date: '2026-05-12', description: 'Casual sessions × 2',                     type: 'income',  category: 'casual',       amount:   90.00, reference: '',              notes: '' },
  { id: 'm07', date: '2026-05-14', description: 'Casual session — Devon Knox',              type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'm08', date: '2026-05-18', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-05-18', notes: '' },
  { id: 'm09', date: '2026-05-19', description: 'Casual sessions × 3',                     type: 'income',  category: 'casual',       amount:  135.00, reference: '',              notes: '' },
  { id: 'm10', date: '2026-05-20', description: 'Court hire — external booking',            type: 'income',  category: 'court-hire',   amount:  150.00, reference: 'CH-0520',       notes: '' },
  { id: 'm11', date: '2026-05-21', description: 'Casual session — Priya Mehta',             type: 'income',  category: 'casual',       amount:   45.00, reference: '',              notes: '' },
  { id: 'm12', date: '2026-05-22', description: 'Merchandise — singlets & shorts',          type: 'income',  category: 'merchandise',  amount:  120.00, reference: 'MERCH-005',     notes: '' },
  { id: 'm13', date: '2026-05-25', description: 'Membership fees — weekly billing',         type: 'income',  category: 'membership',   amount:  275.00, reference: 'WK-2026-05-25', notes: '' },
  { id: 'm14', date: '2026-05-26', description: 'Court hire — external booking',            type: 'income',  category: 'court-hire',   amount:  150.00, reference: 'CH-0526',       notes: '' },
  { id: 'm15', date: '2026-05-27', description: 'Casual sessions × 2',                     type: 'income',  category: 'casual',       amount:   90.00, reference: '',              notes: '' },
  { id: 'm16', date: '2026-05-28', description: 'Program package — Zara Obi (4-wk)',       type: 'income',  category: 'program',      amount:  160.00, reference: 'PROG-ZO-001',  notes: '' },
  // ── May 2026 Expenses
  { id: 'm20', date: '2026-05-01', description: 'Matt Brasser — coaching wages',            type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0501',  notes: 'Fortnightly — 1–14 May' },
  { id: 'm21', date: '2026-05-01', description: 'Jade Brasser — coaching wages',             type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0501',  notes: 'Fortnightly — 1–14 May' },
  { id: 'm22', date: '2026-05-01', description: 'Facility hire — gymnasium (May)',          type: 'expense', category: 'facility',     amount:  800.00, reference: 'FACIL-2405',    notes: 'Monthly lease, Oakleigh facility' },
  { id: 'm23', date: '2026-05-02', description: 'Public liability insurance — May',         type: 'expense', category: 'insurance',    amount:  185.00, reference: 'INS-2405',      notes: '' },
  { id: 'm24', date: '2026-05-10', description: 'Marketing — print flyers & signage',       type: 'expense', category: 'marketing',    amount:  120.00, reference: 'MKT-0510',      notes: '' },
  { id: 'm25', date: '2026-05-12', description: 'Admin software subscription',              type: 'expense', category: 'admin',        amount:  149.00, reference: 'ADMIN-MAY',     notes: '' },
  { id: 'm26', date: '2026-05-15', description: 'Matt Brasser — coaching wages',            type: 'expense', category: 'wages',        amount: 1200.00, reference: 'PAY-MB-0515',  notes: 'Fortnightly — 15–28 May' },
  { id: 'm27', date: '2026-05-15', description: 'Jade Brasser — coaching wages',             type: 'expense', category: 'wages',        amount:  850.00, reference: 'PAY-JW-0515',  notes: 'Fortnightly — 15–28 May' },
  { id: 'm28', date: '2026-05-20', description: 'Electricity — facility share',             type: 'expense', category: 'utilities',    amount:  195.00, reference: 'UTIL-MAY',      notes: '' },
  { id: 'm29', date: '2026-05-28', description: 'Equipment — basketball tape & pump',       type: 'expense', category: 'equipment',    amount:   75.00, reference: 'EQ-002',        notes: '' },
]

// ─── Personal finance data ─────────────────────────────────────────────────────

export const INCOME_SOURCES     = ['Salary (Formula14)', 'Freelance / Other Coaching', 'Investments', 'Other']
export const EXPENSE_CATS_PERSONAL = ['Housing', 'Transport', 'Food & Groceries', 'Entertainment', 'Insurance', 'Health', 'Clothing', 'Other']

export const INIT_PERSONAL_TX: PersonalTx[] = [
  { id: 'p01', date: '2026-06-01', description: 'Salary — Formula14',             type: 'income',  category: 'Salary (Formula14)',         amount: 3500 },
  { id: 'p02', date: '2026-06-01', description: 'Rent — June',                    type: 'expense', category: 'Housing',                    amount: 1800 },
  { id: 'p03', date: '2026-06-02', description: 'Grocery shop — Coles',           type: 'expense', category: 'Food & Groceries',           amount:  210 },
  { id: 'p04', date: '2026-06-03', description: 'Petrol',                         type: 'expense', category: 'Transport',                  amount:   85 },
  { id: 'p05', date: '2026-06-05', description: 'Health insurance',               type: 'expense', category: 'Insurance',                  amount:  180 },
  { id: 'p06', date: '2026-06-07', description: 'Dinner out',                     type: 'expense', category: 'Entertainment',              amount:   75 },
  { id: 'p07', date: '2026-06-09', description: 'Freelance session — private',    type: 'income',  category: 'Freelance / Other Coaching', amount:  200 },
  { id: 'p08', date: '2026-06-10', description: 'Grocery shop — Aldi',            type: 'expense', category: 'Food & Groceries',           amount:   95 },
  { id: 'p09', date: '2026-06-12', description: 'Car rego — annual',              type: 'expense', category: 'Transport',                  amount:  420 },
  { id: 'p10', date: '2026-06-14', description: 'Netflix / Spotify',              type: 'expense', category: 'Entertainment',              amount:   28 },
  { id: 'p11', date: '2026-06-15', description: 'Salary — Formula14',             type: 'income',  category: 'Salary (Formula14)',         amount: 3500 },
  { id: 'p12', date: '2026-06-16', description: 'Grocery shop — Coles',           type: 'expense', category: 'Food & Groceries',           amount:  195 },
  { id: 'p13', date: '2026-06-18', description: 'Gym membership',                 type: 'expense', category: 'Health',                     amount:   55 },
  { id: 'p14', date: '2026-06-20', description: 'Training shoes',                 type: 'expense', category: 'Clothing',                   amount:  160 },
  { id: 'p15', date: '2026-06-22', description: 'Petrol',                         type: 'expense', category: 'Transport',                  amount:   80 },
]

export const INIT_GOALS: SavingsGoal[] = [
  { id: 'g1', name: 'Emergency Fund',  target: 10000, saved: 6500, color: '#6BA3D6' },
  { id: 'g2', name: 'New Car',         target: 25000, saved: 8200, color: '#10b981' },
  { id: 'g3', name: 'Holiday — Japan', target:  5000, saved: 3100, color: '#f59e0b' },
]

export const PERSONAL_MONTHLY = [
  { month: 'Jan 2026', income: 7200, expenses: 3850, net:  3350 },
  { month: 'Feb 2026', income: 7100, expenses: 3900, net:  3200 },
  { month: 'Mar 2026', income: 7400, expenses: 4100, net:  3300 },
  { month: 'Apr 2026', income: 7200, expenses: 3750, net:  3450 },
  { month: 'May 2026', income: 7500, expenses: 4200, net:  3300 },
  { month: 'Jun 2026', income: 7200, expenses: 3383, net:  3817, partial: true },
]
