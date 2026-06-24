'use client'

import { useMemo } from 'react'
import {
  IconTrendingUp, IconTrendingDown, IconCurrencyDollar, IconReceipt,
  IconCalendar, IconUsers, IconChartPie,
} from '@tabler/icons-react'
import {
  Transaction, INCOME_CATS, EXPENSE_CATS, CHART_HISTORY,
  StatCard, CatBadge, RevPieChart, fmtMoney, fmtK, fmtDateShort,
  monthTotal, ACCENT,
} from './_shared'

const CURRENT_YM = '2026-06'
const PREV_YM    = '2026-05'

export function OverviewTab({ transactions }: { transactions: Transaction[] }) {

  const junIncome   = useMemo(() => monthTotal(transactions, CURRENT_YM, 'income'),   [transactions])
  const junExpenses = useMemo(() => monthTotal(transactions, CURRENT_YM, 'expense'),  [transactions])
  const junNet      = junIncome - junExpenses
  const mayIncome   = useMemo(() => monthTotal(transactions, PREV_YM, 'income'),      [transactions])
  const mayExpenses = useMemo(() => monthTotal(transactions, PREV_YM, 'expense'),     [transactions])

  const ytdIncome = useMemo(() => {
    const hist = CHART_HISTORY.reduce((s, m) => s + m.income, 0)
    return hist + monthTotal(transactions, '2026-05', 'income') + monthTotal(transactions, '2026-06', 'income')
  }, [transactions])

  // Weekly membership average this month
  const weeklyMembership = useMemo(() => {
    const total = transactions
      .filter(t => t.date.startsWith(CURRENT_YM) && t.category === 'membership' && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    return Math.round(total / 3)
  }, [transactions])

  // Revenue pie — derived from June transactions
  const revPie = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter(t => t.date.startsWith(CURRENT_YM) && t.type === 'income')
      .forEach(t => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return Object.entries(INCOME_CATS)
      .map(([key, c]) => ({ name: c.label, value: map[key] ?? 0, color: c.chartColor }))
      .filter(d => d.value > 0)
  }, [transactions])

  // Expense pie — derived from June transactions
  const expPie = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter(t => t.date.startsWith(CURRENT_YM) && t.type === 'expense')
      .forEach(t => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return Object.entries(EXPENSE_CATS)
      .map(([key, c]) => ({ name: c.label, value: map[key] ?? 0, color: c.chartColor }))
      .filter(d => d.value > 0)
  }, [transactions])

  // Recent transactions
  const recent = useMemo(() =>
    [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions]
  )

  const health = [
    { label: 'Membership Retention',   value: '87%',   color: '#10b981' },
    { label: 'Avg Revenue / Athlete',  value: fmtK(Math.round(junIncome / 24)),  color: ACCENT },
    { label: 'Sessions / Week (avg)',  value: '5.4',   color: '#8b5cf6' },
    { label: 'Outstanding Debt',       value: '$2,419',color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={<IconTrendingUp size={16}/>}      label="Revenue (Jun)"         value={fmtMoney(junIncome)}   sub={`${fmtMoney(mayIncome)} in May`} />
        <StatCard icon={<IconTrendingDown size={16}/>}    label="Expenses (Jun)"        value={fmtMoney(junExpenses)} sub={`${fmtMoney(mayExpenses)} in May`} color="#ef4444" negative />
        <StatCard icon={<IconChartPie size={16}/>}        label="Net Profit (Jun)"      value={fmtMoney(junNet)}      sub="Partial month" color="#10b981" />
        <StatCard icon={<IconReceipt size={16}/>}         label="Outstanding Invoices"  value="$2,419"                sub="3 invoices pending" color="#f59e0b" />
        <StatCard icon={<IconCalendar size={16}/>}        label="Weekly Membership Rev" value={fmtMoney(weeklyMembership)} sub="Recurring weekly" color="#8b5cf6" />
        <StatCard icon={<IconCurrencyDollar size={16}/>}  label="Year to Date Revenue"  value={fmtK(ytdIncome)}       sub="Jul 2025 – Jun 2026" />
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Revenue Breakdown <span className="font-normal text-gray-400">— Jun 2026</span></h2>
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <RevPieChart data={revPie} />
            </div>
            <div className="flex-1 space-y-1.5">
              {revPie.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{fmtMoney(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Expense Breakdown <span className="font-normal text-gray-400">— Jun 2026</span></h2>
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <RevPieChart data={expPie} />
            </div>
            <div className="flex-1 space-y-1.5">
              {expPie.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{fmtMoney(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900">Recent Transactions</h2>
          <p className="text-xs text-gray-400">Latest 8 entries across all periods</p>
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
              {recent.map(t => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDateShort(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[260px] truncate">{t.description}</td>
                  <td className="px-4 py-3"><CatBadge cat={t.category} /></td>
                  <td className="px-4 py-3 font-bold" style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={t.type === 'income' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#ef4444' }}>
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial health */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-gray-900">Financial Health Indicators</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {health.map(h => (
            <div key={h.label} className="rounded-xl border border-gray-100 p-4">
              <p className="mb-1 text-xs text-gray-500">{h.label}</p>
              <p className="text-2xl font-bold" style={{ color: h.color }}>{h.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
