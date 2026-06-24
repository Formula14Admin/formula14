'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  IconTrendingUp, IconTrendingDown, IconCurrencyDollar, IconReceipt,
  IconCalendar, IconUsers, IconAlertTriangle, IconPlus, IconX,
  IconInfoCircle, IconTarget, IconChartPie, IconBriefcase, IconUser,
  IconArrowUpRight, IconArrowDownLeft, IconCheck,
} from '@tabler/icons-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT  = '#6BA3D6'
const BG      = '#f4f6f9'
const LABEL   = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT   = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

function fmt(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDec(n: number) {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Business — sample data ───────────────────────────────────────────────────

const REV_CATEGORIES = [
  { name: 'Memberships',         value: 1100, color: '#6BA3D6' },
  { name: 'Individual Sessions', value: 860,  color: '#3b82f6' },
  { name: 'Small Group',         value: 540,  color: '#8b5cf6' },
  { name: 'Programs',            value: 600,  color: '#06b6d4' },
  { name: 'Casual Shooting',     value: 315,  color: '#10b981' },
  { name: 'Shooting Machine',    value: 220,  color: '#f59e0b' },
  { name: 'Weight Room',         value: 180,  color: '#f97316' },
  { name: 'Sponsorships',        value: 500,  color: '#ec4899' },
]

const EXP_CATEGORIES = [
  { name: 'Facility',   value: 800,  color: '#ef4444' },
  { name: 'Equipment',  value: 380,  color: '#f97316' },
  { name: 'Marketing',  value: 210,  color: '#f59e0b' },
  { name: 'Staff',      value: 2050, color: '#8b5cf6' },
  { name: 'Insurance',  value: 185,  color: '#ec4899' },
  { name: 'Other',      value: 190,  color: '#6b7280' },
]

const MONTHLY_PNL = [
  { month: 'Jul 2025', revenue: 7800,  expenses: 3400, net:  4400, running:   4400 },
  { month: 'Aug 2025', revenue: 8100,  expenses: 3500, net:  4600, running:   9000 },
  { month: 'Sep 2025', revenue: 7500,  expenses: 3600, net:  3900, running:  12900 },
  { month: 'Oct 2025', revenue: 9200,  expenses: 3550, net:  5650, running:  18550 },
  { month: 'Nov 2025', revenue: 9800,  expenses: 3700, net:  6100, running:  24650 },
  { month: 'Dec 2025', revenue: 6200,  expenses: 3400, net:  2800, running:  27450 },
  { month: 'Jan 2026', revenue: 7800,  expenses: 5200, net:  2600, running:  30050 },
  { month: 'Feb 2026', revenue: 8400,  expenses: 5300, net:  3100, running:  33150 },
  { month: 'Mar 2026', revenue: 9100,  expenses: 5450, net:  3650, running:  36800 },
  { month: 'Apr 2026', revenue: 9600,  expenses: 5550, net:  4050, running:  40850 },
  { month: 'May 2026', revenue: 10200, expenses: 5600, net:  4600, running:  45450 },
  { month: 'Jun 2026', revenue: 4315,  expenses: 3815, net:   500, running:  45950, partial: true },
]

// Weekly cash flow — last 13 weeks
const CASH_FLOW = [
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

// ─── Business recent transactions ─────────────────────────────────────────────

const BIZ_RECENT = [
  { date: '2026-06-23', desc: 'Casual sessions × 3',                type: 'income',  cat: 'Casual',      amount: 135 },
  { date: '2026-06-22', desc: 'Membership fees — weekly billing',    type: 'income',  cat: 'Memberships', amount: 275 },
  { date: '2026-06-20', desc: 'Digital marketing — Meta Ads',        type: 'expense', cat: 'Marketing',   amount: 80  },
  { date: '2026-06-18', desc: 'Merchandise — training apparel',      type: 'income',  cat: 'Other',       amount: 95  },
  { date: '2026-06-17', desc: 'Casual sessions × 3',                type: 'income',  cat: 'Casual',      amount: 135 },
  { date: '2026-06-16', desc: 'Program package — Marcus Davies',     type: 'income',  cat: 'Programs',    amount: 280 },
  { date: '2026-06-15', desc: 'Membership fees — weekly billing',    type: 'income',  cat: 'Memberships', amount: 236 },
  { date: '2026-06-15', desc: 'Matt Brasser — coaching wages',       type: 'expense', cat: 'Staff',       amount: 1200},
  { date: '2026-06-15', desc: 'Jade Wilson — coaching wages',        type: 'expense', cat: 'Staff',       amount: 850 },
  { date: '2026-06-11', desc: 'Court hire — external booking',       type: 'income',  cat: 'Other',       amount: 150 },
]

// ─── Shared small components ──────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = ACCENT, negative = false }: {
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

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Business Finance Tab ─────────────────────────────────────────────────────

function BusinessTab() {
  const thisMonth = MONTHLY_PNL.find(m => m.partial)!
  const prevMonth = MONTHLY_PNL[MONTHLY_PNL.length - 2]
  const ytdRevenue = MONTHLY_PNL.reduce((s, m) => s + m.revenue, 0)
  const weeklyMembership = 275

  const health = [
    { label: 'Membership Retention Rate', value: '87%',   icon: <IconUsers size={16} />,          color: '#10b981' },
    { label: 'Avg Revenue per Athlete',    value: '$177',  icon: <IconCurrencyDollar size={16} />, color: ACCENT    },
    { label: 'Sessions per Week (avg)',    value: '5.4',   icon: <IconCalendar size={16} />,       color: '#8b5cf6' },
    { label: 'Outstanding Debt Total',     value: '$2,419',icon: <IconReceipt size={16} />,        color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<IconTrendingUp size={16} />}      label="Total Revenue (Jun)"      value={fmt(thisMonth.revenue)}    sub={`${fmt(prevMonth.revenue)} in May`} />
        <StatCard icon={<IconTrendingDown size={16} />}    label="Total Expenses (Jun)"     value={fmt(thisMonth.expenses)}   sub={`${fmt(prevMonth.expenses)} in May`} color="#ef4444" negative />
        <StatCard icon={<IconChartPie size={16} />}        label="Net Profit (Jun)"         value={fmt(thisMonth.net)}        sub="Partial month" color="#10b981" />
        <StatCard icon={<IconReceipt size={16} />}         label="Outstanding Invoices"     value="$2,419"                    sub="3 invoices pending" color="#f59e0b" />
        <StatCard icon={<IconCalendar size={16} />}        label="Weekly Membership Rev"    value={fmt(weeklyMembership)}     sub="Recurring weekly" color="#8b5cf6" />
        <StatCard icon={<IconTrendingUp size={16} />}      label="Year to Date Revenue"     value={fmt(ytdRevenue)}           sub="Jul 2025 – Jun 2026" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Revenue Breakdown */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader title="Revenue Breakdown" sub="June 2026 by category" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={REV_CATEGORIES} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {REV_CATEGORIES.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => fmtDec(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {REV_CATEGORIES.map(c => (
                <div key={c.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-gray-600">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader title="Expense Breakdown" sub="June 2026 by category" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={EXP_CATEGORIES} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {EXP_CATEGORIES.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => fmtDec(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {EXP_CATEGORIES.map(c => (
                <div key={c.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-gray-600">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <SectionHeader title="Recent Transactions" sub="Last 10 transactions from Bookkeeping" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Date', 'Description', 'Category', 'Amount', 'Type'].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BIZ_RECENT.map((t, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{t.date.slice(5).replace('-', '/')}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.desc}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{t.cat}</span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '−'}{fmtDec(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={t.type === 'income' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#ef4444' }}
                    >
                      {t.type === 'income' ? <IconArrowUpRight size={11} /> : <IconArrowDownLeft size={11} />}
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly P&L + Cash Flow */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

        {/* Monthly P&L table (3 cols) */}
        <div className="rounded-xl bg-white shadow-sm xl:col-span-3">
          <div className="border-b border-gray-100 px-5 py-4">
            <SectionHeader title="Monthly P&L" sub="FY 2025–26 (Jul 2025 – Jun 2026)" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  {['Month', 'Revenue', 'Expenses', 'Net Profit', 'Running Total'].map(h => (
                    <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHLY_PNL.map((m, i) => (
                  <tr key={i} className={`border-b border-gray-50 last:border-0 ${m.partial ? 'opacity-60' : ''} hover:bg-gray-50`}>
                    <td className="px-4 py-2.5 font-medium text-gray-700">
                      {m.month}{m.partial && <span className="ml-1 text-[10px] text-gray-400">*</span>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{fmt(m.revenue)}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#ef4444' }}>{fmt(m.expenses)}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: m.net >= 0 ? '#15803d' : '#ef4444' }}>
                      {m.net >= 0 ? '+' : '−'}{fmt(Math.abs(m.net))}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{fmt(m.running)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f9ff', borderTop: '2px solid #e5e7eb' }}>
                  <td className="px-4 py-2.5 text-xs font-bold uppercase text-gray-500">FY Total</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800">{fmt(MONTHLY_PNL.reduce((s,m)=>s+m.revenue,0))}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: '#ef4444' }}>{fmt(MONTHLY_PNL.reduce((s,m)=>s+m.expenses,0))}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: '#15803d' }}>+{fmt(MONTHLY_PNL.reduce((s,m)=>s+m.net,0))}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800">{fmt(MONTHLY_PNL[MONTHLY_PNL.length-1].running)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-5 pb-3 pt-1 text-[10px] text-gray-400">* Partial month</p>
        </div>

        {/* Cash Flow chart (2 cols) */}
        <div className="rounded-xl bg-white p-5 shadow-sm xl:col-span-2">
          <SectionHeader title="Weekly Cash Flow" sub="Past 13 weeks" />
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={CASH_FLOW} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: unknown) => fmtDec(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cashIn"  name="Cash In"  stroke={ACCENT}    strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cashOut" name="Cash Out" stroke="#ef4444"   strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="net"     name="Net"      stroke="#10b981"   strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Health */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <SectionHeader title="Financial Health Indicators" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {health.map(h => (
            <div key={h.label} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: h.color + '1a' }}>
                  <span style={{ color: h.color }}>{h.icon}</span>
                </span>
                <p className="text-xs text-gray-500">{h.label}</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{h.value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Personal Finance Types & Data ────────────────────────────────────────────

type PersonalTxType = 'income' | 'expense'

interface PersonalTx {
  id: string
  date: string
  description: string
  type: PersonalTxType
  category: string
  amount: number
}

const INCOME_SOURCES = ['Salary (Formula14)', 'Freelance / Other Coaching', 'Investments', 'Other']
const EXPENSE_CATS_PERSONAL = ['Housing', 'Transport', 'Food & Groceries', 'Entertainment', 'Insurance', 'Health', 'Clothing', 'Other']

const INIT_PERSONAL_TX: PersonalTx[] = [
  { id: 'p01', date: '2026-06-01', description: 'Salary — Formula14',        type: 'income',  category: 'Salary (Formula14)',    amount: 3500 },
  { id: 'p02', date: '2026-06-01', description: 'Rent — June',                type: 'expense', category: 'Housing',               amount: 1800 },
  { id: 'p03', date: '2026-06-02', description: 'Grocery shop — Coles',       type: 'expense', category: 'Food & Groceries',      amount: 210  },
  { id: 'p04', date: '2026-06-03', description: 'Petrol',                      type: 'expense', category: 'Transport',             amount: 85   },
  { id: 'p05', date: '2026-06-05', description: 'Health insurance',            type: 'expense', category: 'Insurance',             amount: 180  },
  { id: 'p06', date: '2026-06-07', description: 'Dinner out',                  type: 'expense', category: 'Entertainment',         amount: 75   },
  { id: 'p07', date: '2026-06-09', description: 'Freelance session — private', type: 'income',  category: 'Freelance / Other Coaching', amount: 200 },
  { id: 'p08', date: '2026-06-10', description: 'Grocery shop — Aldi',         type: 'expense', category: 'Food & Groceries',      amount: 95   },
  { id: 'p09', date: '2026-06-12', description: 'Car rego — annual',           type: 'expense', category: 'Transport',             amount: 420  },
  { id: 'p10', date: '2026-06-14', description: 'Netflix / Spotify',           type: 'expense', category: 'Entertainment',         amount: 28   },
  { id: 'p11', date: '2026-06-15', description: 'Salary — Formula14',        type: 'income',  category: 'Salary (Formula14)',    amount: 3500 },
  { id: 'p12', date: '2026-06-16', description: 'Grocery shop — Coles',       type: 'expense', category: 'Food & Groceries',      amount: 195  },
  { id: 'p13', date: '2026-06-18', description: 'Gym membership',              type: 'expense', category: 'Health',               amount: 55   },
  { id: 'p14', date: '2026-06-20', description: 'Training shoes',              type: 'expense', category: 'Clothing',             amount: 160  },
  { id: 'p15', date: '2026-06-22', description: 'Petrol',                      type: 'expense', category: 'Transport',             amount: 80   },
]

const PERSONAL_MONTHLY = [
  { month: 'Jan 2026', income: 7200, expenses: 3850, net:  3350 },
  { month: 'Feb 2026', income: 7100, expenses: 3900, net:  3200 },
  { month: 'Mar 2026', income: 7400, expenses: 4100, net:  3300 },
  { month: 'Apr 2026', income: 7200, expenses: 3750, net:  3450 },
  { month: 'May 2026', income: 7500, expenses: 4200, net:  3300 },
  { month: 'Jun 2026', income: 7200, expenses: 3383, net:  3817, partial: true },
]

interface SavingsGoal {
  id: string; name: string; target: number; saved: number; color: string
}

const INIT_GOALS: SavingsGoal[] = [
  { id: 'g1', name: 'Emergency Fund',    target: 10000, saved: 6500,  color: '#6BA3D6' },
  { id: 'g2', name: 'New Car',           target: 25000, saved: 8200,  color: '#10b981' },
  { id: 'g3', name: 'Holiday — Japan',   target: 5000,  saved: 3100,  color: '#f59e0b' },
]

// ─── Personal Add Modal ───────────────────────────────────────────────────────

function PersonalModal({ type, onClose, onAdd }: {
  type: PersonalTxType; onClose: () => void; onAdd: (t: PersonalTx) => void
}) {
  const [desc, setDesc]     = useState('')
  const [amount, setAmount] = useState('')
  const [cat, setCat]       = useState(type === 'income' ? INCOME_SOURCES[0] : EXPENSE_CATS_PERSONAL[0])
  const [date, setDate]     = useState('2026-06-24')

  const cats = type === 'income' ? INCOME_SOURCES : EXPENSE_CATS_PERSONAL
  const canSubmit = desc.trim() && parseFloat(amount) > 0

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      id: Math.random().toString(36).slice(2),
      date, description: desc.trim(), type, category: cat, amount: parseFloat(amount),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add {type === 'income' ? 'Personal Income' : 'Personal Expense'}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className={LABEL}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <input type="text" placeholder="e.g. Monthly rent" value={desc} onChange={e => setDesc(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Amount ($)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)} className={INPUT}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={handleSubmit} disabled={!canSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: type === 'income' ? '#10b981' : '#ef4444' }}
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Personal Finance Tab ─────────────────────────────────────────────────────

function PersonalTab() {
  const [txns, setTxns]           = useState<PersonalTx[]>(INIT_PERSONAL_TX)
  const [goals, setGoals]         = useState<SavingsGoal[]>(INIT_GOALS)
  const [modal, setModal]         = useState<PersonalTxType | null>(null)
  const [newGoalName, setNewGoalName]     = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [addingGoal, setAddingGoal]       = useState(false)

  const income   = useMemo(() => txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [txns])
  const expenses = useMemo(() => txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [txns])
  const savings  = income - expenses

  function handleAdd(t: PersonalTx) { setTxns(prev => [t, ...prev]); setModal(null) }

  function addGoal() {
    if (!newGoalName.trim() || parseFloat(newGoalTarget) <= 0) return
    setGoals(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      name: newGoalName.trim(), target: parseFloat(newGoalTarget), saved: 0,
      color: ['#6BA3D6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][prev.length % 5],
    }])
    setNewGoalName(''); setNewGoalTarget(''); setAddingGoal(false)
  }

  // Income by source for bar chart
  const incomeBySource = INCOME_SOURCES.map(s => ({
    name: s.replace(' (Formula14)', ''),
    amount: txns.filter(t => t.type === 'income' && t.category === s).reduce((sum, t) => sum + t.amount, 0),
  })).filter(s => s.amount > 0)

  // Expenses by category for bar chart
  const expByCategory = EXPENSE_CATS_PERSONAL.map(c => ({
    name: c,
    amount: txns.filter(t => t.type === 'expense' && t.category === c).reduce((sum, t) => sum + t.amount, 0),
  })).filter(c => c.amount > 0)

  return (
    <div className="space-y-6">

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800">Personal finances are tracked separately from Formula14 business finances.</p>
          <p className="mt-0.5 text-sm text-amber-700">Keep these records separate for tax purposes. This section is for personal reference only and is completely separate from the Bookkeeping module. Do not mix personal and business transactions.</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<IconArrowUpRight size={16} />} label="Personal Income (Jun)"   value={fmt(income)}   sub="This month" color="#10b981" />
        <StatCard icon={<IconArrowDownLeft size={16}/>} label="Personal Expenses (Jun)" value={fmt(expenses)} sub="This month" color="#ef4444" negative />
        <StatCard icon={<IconCheck size={16} />}        label="Personal Savings (Jun)"  value={fmt(savings)}  sub="Income − Expenses" color={savings >= 0 ? '#10b981' : '#ef4444'} negative={savings < 0} />
        <StatCard icon={<IconTrendingUp size={16} />}   label="Net Personal Position"   value={savings >= 0 ? `+${fmt(savings)}` : fmt(savings)} sub="This month" color={savings >= 0 ? ACCENT : '#ef4444'} />
      </div>

      {/* Income + Expense charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader title="Income by Source" sub="June 2026" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeBySource} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: unknown) => fmtDec(Number(v))} />
              <Bar dataKey="amount" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <SectionHeader title="Expenses by Category" sub="June 2026" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expByCategory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: unknown) => fmtDec(Number(v))} />
              <Bar dataKey="amount" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings goals */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader title="Savings Goals" sub="Track progress toward personal financial targets" />
          <button
            onClick={() => setAddingGoal(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={13} /> Add Goal
          </button>
        </div>

        {addingGoal && (
          <div className="mb-4 flex items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex-1">
              <label className={LABEL}>Goal Name</label>
              <input type="text" placeholder="e.g. House deposit" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className={INPUT} />
            </div>
            <div className="w-36">
              <label className={LABEL}>Target Amount ($)</label>
              <input type="number" min="0" placeholder="0" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} className={INPUT} />
            </div>
            <button onClick={addGoal} className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Save</button>
            <button onClick={() => setAddingGoal(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {goals.map(g => {
            const pct = Math.min(100, (g.saved / g.target) * 100)
            return (
              <div key={g.id} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <IconTarget size={16} style={{ color: g.color }} />
                  <p className="text-sm font-semibold text-gray-800">{g.name}</p>
                </div>
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>{fmt(g.saved)} saved</span>
                  <span>{fmt(g.target)} target</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <p className="mt-1.5 text-right text-xs font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Personal Transactions</h2>
            <p className="text-xs text-gray-400">June 2026 — completely separate from business bookkeeping</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModal('income')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: '#10b981' }}
            >
              <IconPlus size={13} /> Add Income
            </button>
            <button
              onClick={() => setModal('expense')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: '#ef4444' }}
            >
              <IconPlus size={13} /> Add Expense
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Date', 'Description', 'Category', 'Amount', 'Type'].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{t.date.slice(5).replace('-', '/')}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.description}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{t.category}</span>
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '−'}{fmtDec(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={t.type === 'income' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#ef4444' }}
                    >
                      {t.type === 'income' ? <IconArrowUpRight size={11} /> : <IconArrowDownLeft size={11} />}
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <SectionHeader title="Personal Monthly Summary" sub="Jan – Jun 2026" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Month', 'Income', 'Expenses', 'Net Savings'].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONAL_MONTHLY.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 last:border-0 ${m.partial ? 'opacity-60' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{m.month}{m.partial && <span className="ml-1 text-[10px] text-gray-400">*</span>}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#15803d' }}>{fmt(m.income)}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#ef4444' }}>{fmt(m.expenses)}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: m.net >= 0 ? '#15803d' : '#ef4444' }}>
                    {m.net >= 0 ? '+' : '−'}{fmt(Math.abs(m.net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 pb-3 pt-1 text-[10px] text-gray-400">* Partial month</p>
      </div>

      {modal && <PersonalModal type={modal} onClose={() => setModal(null)} onAdd={handleAdd} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'business' | 'personal'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'business', label: 'Business Finances', icon: <IconBriefcase size={16} /> },
  { id: 'personal', label: 'Personal Finances', icon: <IconUser size={16} /> },
]

export default function FinancesPage() {
  const [tab, setTab] = useState<TabId>('business')

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finances</h1>
            <p className="text-sm text-gray-500">Business and personal financial overview</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {tab === 'business' ? <BusinessTab /> : <PersonalTab />}
      </div>
    </div>
  )
}
