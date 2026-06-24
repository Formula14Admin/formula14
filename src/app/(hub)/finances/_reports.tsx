'use client'

import { useMemo } from 'react'
import { Transaction, CHART_HISTORY, CASH_FLOW_DATA, MonthBarChart, CashFlowChart, fmtMoney, fmtK, monthTotal } from './_shared'

const FY_MONTHS = [
  { month: 'Jul 2025', revenue: 7800,  expenses: 3400 },
  { month: 'Aug 2025', revenue: 8100,  expenses: 3500 },
  { month: 'Sep 2025', revenue: 7500,  expenses: 3600 },
  { month: 'Oct 2025', revenue: 9200,  expenses: 3550 },
  { month: 'Nov 2025', revenue: 9800,  expenses: 3700 },
  { month: 'Dec 2025', revenue: 6200,  expenses: 3400 },
  // Jan–Apr come from CHART_HISTORY
]

export function ReportsTab({ transactions }: { transactions: Transaction[] }) {
  const monthlyPnL = useMemo(() => {
    const histRows = [
      ...FY_MONTHS,
      ...CHART_HISTORY.map(h => ({ month: `${h.label} 2026`, revenue: h.income, expenses: h.expenses })),
    ]
    const liveRows = [
      { month: 'May 2026', revenue: monthTotal(transactions, '2026-05', 'income'), expenses: monthTotal(transactions, '2026-05', 'expense') },
      { month: 'Jun 2026', revenue: monthTotal(transactions, '2026-06', 'income'), expenses: monthTotal(transactions, '2026-06', 'expense'), partial: true },
    ]
    const all = [...histRows, ...liveRows]
    let running = 0
    return all.map(m => {
      const net = m.revenue - m.expenses
      running += net
      return { ...m, net, running }
    })
  }, [transactions])

  const chartData = useMemo(() => [
    ...CHART_HISTORY,
    { label: 'May', ym: '2026-05', income: monthTotal(transactions, '2026-05', 'income'), expenses: monthTotal(transactions, '2026-05', 'expense') },
    { label: 'Jun', ym: '2026-06', income: monthTotal(transactions, '2026-06', 'income'), expenses: monthTotal(transactions, '2026-06', 'expense') },
  ], [transactions])

  const totals = monthlyPnL.reduce((a, m) => ({ revenue: a.revenue + m.revenue, expenses: a.expenses + m.expenses, net: a.net + m.net }), { revenue: 0, expenses: 0, net: 0 })

  return (
    <div className="space-y-6">

      {/* Bar chart + Cash flow */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-gray-900">Revenue vs Expenses</h2>
          <p className="mb-4 text-xs text-gray-400">Jan – Jun 2026</p>
          <MonthBarChart data={chartData} />
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-gray-900">Weekly Cash Flow</h2>
          <p className="mb-4 text-xs text-gray-400">Past 13 weeks</p>
          <CashFlowChart data={CASH_FLOW_DATA} />
        </div>
      </div>

      {/* Monthly P&L table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900">Monthly P&L</h2>
          <p className="text-xs text-gray-400">FY 2025–26 (Jul 2025 – Jun 2026)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Month', 'Revenue', 'Expenses', 'Net Profit', 'Running Total'].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyPnL.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${'partial' in m && m.partial ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-700">
                    {m.month}{('partial' in m && m.partial) ? <span className="ml-1 text-[10px] text-gray-400">*</span> : null}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800">{fmtK(m.revenue)}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#ef4444' }}>{fmtK(m.expenses)}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: m.net >= 0 ? '#15803d' : '#ef4444' }}>
                    {m.net >= 0 ? '+' : '−'}{fmtK(Math.abs(m.net))}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-gray-700">{fmtK(m.running)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f0f9ff', borderTop: '2px solid #e5e7eb' }}>
                <td className="px-4 py-2.5 text-xs font-bold uppercase text-gray-500">FY Total</td>
                <td className="px-4 py-2.5 font-bold text-gray-800">{fmtK(totals.revenue)}</td>
                <td className="px-4 py-2.5 font-bold" style={{ color: '#ef4444' }}>{fmtK(totals.expenses)}</td>
                <td className="px-4 py-2.5 font-bold" style={{ color: '#15803d' }}>+{fmtK(totals.net)}</td>
                <td className="px-4 py-2.5 font-bold text-gray-800">{fmtK(monthlyPnL[monthlyPnL.length - 1]?.running ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="px-5 pb-3 pt-1 text-[10px] text-gray-400">* Partial month</p>
      </div>
    </div>
  )
}
