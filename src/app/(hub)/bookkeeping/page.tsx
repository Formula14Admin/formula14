'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
import { DatePicker, SelectPicker } from '@/components/ui/Pickers'

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
  onAdd: (t: Omit<Transaction, 'id'>) => void
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
              <DatePicker value={date} onChange={setDate} />
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
            <SelectPicker
              value={category}
              onChange={v => setCategory(v as TxCategory)}
              options={catOptions}
            />
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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [period, setPeriod] = useState('2026-06')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) {
          setTransactions((data as unknown[]).map(rawRow => {
            const r = rawRow as { id: string; created_at: string; description: string; type: string; category: string; amount: number; reference: string; notes: string }
            return {
              id:          r.id,
              date:        r.created_at.slice(0, 10),
              description: (r.description ?? '') as string,
              type:        (r.type === 'credit' ? 'income' : 'expense') as TxType,
              category:    (r.category ?? 'other-income') as TxCategory,
              amount:      r.amount,
              reference:   (r.reference ?? '') as string,
              notes:       (r.notes ?? '') as string,
            }
          }))
        }
      } catch (e) { console.error('[bookkeeping] load failed:', e) }
    })()
  }, [])

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

  // YTD: computed from all real transactions
  const ytdIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const ytdExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const ytdNet      = ytdIncome - ytdExpenses

  // Chart data: group real transactions by month
  const chartData: MonthBar[] = useMemo(() => {
    const monthMap = new Map<string, { income: number; expenses: number }>()
    transactions.forEach(t => {
      const ym = t.date.slice(0, 7)
      if (!monthMap.has(ym)) monthMap.set(ym, { income: 0, expenses: 0 })
      const m = monthMap.get(ym)!
      if (t.type === 'income') m.income += t.amount
      else m.expenses += t.amount
    })
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, { income, expenses }]) => {
        const [y, mo] = ym.split('-')
        const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-AU', { month: 'short' })
        return { label, ym, income, expenses }
      })
  }, [transactions])

  async function handleAddTransaction(t: Omit<Transaction, 'id'>) {
    const { data, error } = await supabase.from('transactions').insert({
      description:    t.description,
      type:           t.type === 'income' ? 'credit' : 'debit',
      category:       t.category,
      amount:         t.amount,
      reference:      t.reference || null,
      notes:          t.notes || null,
      payment_status: 'completed',
      created_at:     new Date(t.date + 'T12:00:00').toISOString(),
    }).select().single()
    if (error) { console.error('[bookkeeping] insert failed:', error); return }
    if (data) {
      const r = data as { id: string; created_at: string; description: string; type: string; category: string; amount: number; reference: string; notes: string }
      const inserted: Transaction = {
        id:          r.id,
        date:        r.created_at.slice(0, 10),
        description: (r.description ?? '') as string,
        type:        (r.type === 'credit' ? 'income' : 'expense') as TxType,
        category:    (r.category ?? 'other-income') as TxCategory,
        amount:      r.amount,
        reference:   (r.reference ?? '') as string,
        notes:       (r.notes ?? '') as string,
      }
      setTransactions(prev => [inserted, ...prev])
      setShowAddModal(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
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
              <h2 className="text-sm font-bold text-gray-900">Monthly Overview</h2>
              <p className="text-xs text-gray-400">{chartData.length === 0 ? 'No data yet' : `${chartData[0].label} – ${chartData[chartData.length - 1].label}`}</p>
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
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(chartData.length, 1)}, minmax(0, 1fr))` }}>
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
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
            <p className="mt-1 text-xs text-gray-400">Click &apos;Add Transaction&apos; to record your first entry</p>
          </div>
        ) : (
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
                {filtered.map((t) => (
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
        )}

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
