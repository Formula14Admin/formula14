'use client'

import { useState, useMemo } from 'react'
import {
  IconArrowUpRight, IconArrowDownLeft, IconPlus, IconSearch,
  IconX, IconTrash, IconTrendingUp, IconTrendingDown,
  IconCurrencyDollar, IconChevronDown,
} from '@tabler/icons-react'
import {
  Transaction, TxType, TxCategory, IncomeCat, ExpenseCat,
  INCOME_CATS, EXPENSE_CATS, CHART_HISTORY,
  StatCard, CatBadge, MonthBarChart,
  fmtMoney, fmtDateShort, monthLabel, monthTotal,
  uid, INPUT, LABEL, ACCENT,
} from './_shared'

// ─── Add Transaction Modal ─────────────────────────────────────────────────────

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [type,      setType]      = useState<TxType>('income')
  const [date,      setDate]      = useState('2026-06-24')
  const [desc,      setDesc]      = useState('')
  const [amount,    setAmount]    = useState('')
  const [category,  setCategory]  = useState<TxCategory>('membership')
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')

  const cats = type === 'income'
    ? Object.entries(INCOME_CATS).map(([v, c]) => ({ value: v, label: c.label }))
    : Object.entries(EXPENSE_CATS).map(([v, c]) => ({ value: v, label: c.label }))

  const canSubmit = desc.trim() && parseFloat(amount) > 0

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      id: uid(), date, description: desc.trim(), type,
      category: category as TxCategory,
      amount: parseFloat(amount), reference: reference.trim(), notes: notes.trim(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-4 p-6">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1">
            {(['income', 'expense'] as TxType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategory(t === 'income' ? 'membership' : 'wages') }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all ${
                  type === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
                style={type === t ? { color: t === 'income' ? ACCENT : '#ef4444' } : {}}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Amount ($)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className={INPUT} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <input type="text" placeholder="Transaction description" value={desc} onChange={e => setDesc(e.target.value)} className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Category</label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value as TxCategory)} className={INPUT + ' appearance-none pr-8'}>
                {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Reference <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. WK-2026-06-24" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={INPUT + ' resize-none'} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={handleSubmit} disabled={!canSubmit}
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

// ─── Transactions Tab ──────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: '2026-06', label: 'Jun 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: 'all',     label: 'All time' },
]

export function TransactionsTab({
  transactions, onAdd, onDelete, showAddModalProp = false, onAddModalClose,
}: {
  transactions: Transaction[]
  onAdd: (t: Transaction) => void
  onDelete: (id: string) => void
  showAddModalProp?: boolean
  onAddModalClose?: () => void
}) {
  const [period,     setPeriod]     = useState('2026-06')
  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all')
  const [search,     setSearch]     = useState('')
  const [showModal,  setShowModal]  = useState(false)

  // Allow parent to open the modal via prop
  const isModalOpen = showModal || showAddModalProp
  function closeModal() { setShowModal(false); onAddModalClose?.() }

  const periodTxns = useMemo(() =>
    period === 'all' ? transactions : transactions.filter(t => t.date.startsWith(period)),
    [transactions, period],
  )

  const filtered = useMemo(() =>
    periodTxns.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!`${t.description} ${t.reference} ${t.notes} ${t.category}`.toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => b.date.localeCompare(a.date)),
    [periodTxns, typeFilter, search],
  )

  const income   = periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net      = income - expenses

  // Chart data
  const chartData = useMemo(() => [
    ...CHART_HISTORY,
    { label: 'May', ym: '2026-05', income: monthTotal(transactions, '2026-05', 'income'), expenses: monthTotal(transactions, '2026-05', 'expense') },
    { label: 'Jun', ym: '2026-06', income: monthTotal(transactions, '2026-06', 'income'), expenses: monthTotal(transactions, '2026-06', 'expense') },
  ], [transactions])

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<IconArrowUpRight size={16}/>}   label={`Income — ${period === 'all' ? 'All time' : monthLabel(period)}`} value={fmtMoney(income)}   sub={`${periodTxns.filter(t => t.type==='income').length} transactions`} />
        <StatCard icon={<IconArrowDownLeft size={16}/>}  label={`Expenses`}          value={fmtMoney(expenses)} sub={`${periodTxns.filter(t => t.type==='expense').length} transactions`} color="#ef4444" negative />
        <StatCard icon={net>=0 ? <IconTrendingUp size={16}/> : <IconTrendingDown size={16}/>}  label="Net P&L"  value={fmtMoney(Math.abs(net))}  sub={net >= 0 ? 'Profit' : 'Loss'} color={net>=0 ? '#10b981' : '#ef4444'} />
        <StatCard icon={<IconCurrencyDollar size={16}/>} label="Transactions"        value={String(periodTxns.length)} sub="in selected period" color="#8b5cf6" />
      </div>

      {/* 6-month chart */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-gray-900">6-Month Overview</h2>
        <p className="mb-4 text-xs text-gray-400">Jan – Jun 2026</p>
        <MonthBarChart data={chartData} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" style={{ minWidth: 200, flex: '0 1 220px' }}>
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search transactions…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} type="button" onClick={() => setPeriod(p.value)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={period === p.value ? { backgroundColor: '#1f2937', color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'income', 'expense'] as const).map(k => (
            <button key={k} type="button" onClick={() => setTypeFilter(k)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
              style={typeFilter === k
                ? { backgroundColor: k === 'income' ? ACCENT : k === 'expense' ? '#ef4444' : '#374151', color: 'white' }
                : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
              }>
              {k}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">No transactions match your filters</div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Date', 'Description', 'Category', 'Amount', 'Reference', ''].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="group border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtDateShort(t.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: t.type === 'income' ? '#dcfce7' : '#fee2e2' }}>
                        {t.type === 'income'
                          ? <IconArrowUpRight size={13} style={{ color: '#15803d' }} />
                          : <IconArrowDownLeft size={13} style={{ color: '#ef4444' }} />}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{t.description}</div>
                        {t.notes && <div className="truncate text-xs text-gray-400" style={{ maxWidth: 260 }}>{t.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><CatBadge cat={t.category} /></td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {t.reference
                      ? <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">{t.reference}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => onDelete(t.id)}
                      className="rounded-lg p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-400 group-hover:opacity-100">
                      <IconTrash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
                <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">{filtered.length} transactions</td>
                <td className="px-4 py-3 text-right">
                  {(() => {
                    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                    const n = inc - exp
                    if (typeFilter === 'income')  return <span className="text-sm font-bold" style={{ color: '#15803d' }}>+{fmtMoney(inc)}</span>
                    if (typeFilter === 'expense') return <span className="text-sm font-bold" style={{ color: '#ef4444' }}>−{fmtMoney(exp)}</span>
                    return <span className="text-sm font-bold" style={{ color: n >= 0 ? '#15803d' : '#ef4444' }}>{n >= 0 ? '+' : '−'}{fmtMoney(Math.abs(n))}</span>
                  })()}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {isModalOpen && <AddModal onClose={closeModal} onAdd={t => { onAdd(t); closeModal() }} />}
    </div>
  )
}

// Export the Add button so page.tsx header can use it
export function AddTransactionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      style={{ backgroundColor: ACCENT }}
    >
      <IconPlus size={16} /> Add Transaction
    </button>
  )
}
