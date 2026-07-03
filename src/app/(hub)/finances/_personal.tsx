'use client'

import { useState, useMemo } from 'react'
import { IconAlertTriangle, IconPlus, IconX, IconArrowUpRight, IconArrowDownLeft, IconCheck, IconTarget } from '@tabler/icons-react'
import {
  PersonalTx, PersonalTxType, SavingsGoal,
  INCOME_SOURCES, EXPENSE_CATS_PERSONAL,
  StatCard, fmtMoney, fmtK, INPUT, LABEL, ACCENT,
} from './_shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DatePicker, SelectPicker } from '@/components/ui/Pickers'

// ─── Add Personal Transaction Modal ───────────────────────────────────────────

function PersonalModal({ type, onClose, onAdd }: {
  type: PersonalTxType; onClose: () => void; onAdd: (t: PersonalTx) => void
}) {
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const [cat,    setCat]    = useState(type === 'income' ? INCOME_SOURCES[0] : EXPENSE_CATS_PERSONAL[0])
  const [date,   setDate]   = useState(new Date().toISOString().slice(0, 10))

  const cats = type === 'income' ? INCOME_SOURCES : EXPENSE_CATS_PERSONAL
  const canSubmit = desc.trim() && parseFloat(amount) > 0

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({ id: Math.random().toString(36).slice(2), date, description: desc.trim(), type, category: cat, amount: parseFloat(amount) })
    onClose()
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
            <DatePicker value={date} onChange={setDate} />
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
            <SelectPicker
              value={cat}
              onChange={setCat}
              options={cats.map(c => ({ value: c, label: c }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={handleSubmit} disabled={!canSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: type === 'income' ? '#10b981' : '#ef4444' }}
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Personal Tab ──────────────────────────────────────────────────────────────

export function PersonalTab({ txns, goals, onAddTx, onAddGoal }: {
  txns: PersonalTx[]
  goals: SavingsGoal[]
  onAddTx: (t: PersonalTx) => void
  onAddGoal: (g: SavingsGoal) => void
}) {
  const [modal,          setModal]          = useState<PersonalTxType | null>(null)
  const [addingGoal,     setAddingGoal]     = useState(false)
  const [newGoalName,    setNewGoalName]    = useState('')
  const [newGoalTarget,  setNewGoalTarget]  = useState('')

  const income   = useMemo(() => txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [txns])
  const expenses = useMemo(() => txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [txns])
  const savings  = income - expenses

  const incomeBySource = useMemo(() => INCOME_SOURCES.map(s => ({
    name: s.replace(' (Formula14)', ''),
    amount: txns.filter(t => t.type === 'income' && t.category === s).reduce((sum, t) => sum + t.amount, 0),
  })).filter(s => s.amount > 0), [txns])

  const expByCategory = useMemo(() => EXPENSE_CATS_PERSONAL.map(c => ({
    name: c,
    amount: txns.filter(t => t.type === 'expense' && t.category === c).reduce((sum, t) => sum + t.amount, 0),
  })).filter(c => c.amount > 0), [txns])

  // Compute monthly summary dynamically from real transactions
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { income: number; expenses: number }> = {}
    txns.forEach(t => {
      const ym = t.date.slice(0, 7)
      if (!byMonth[ym]) byMonth[ym] = { income: 0, expenses: 0 }
      if (t.type === 'income') byMonth[ym].income += t.amount
      else byMonth[ym].expenses += t.amount
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, d]) => {
        const [y, m] = ym.split('-')
        const month = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
        return { month, income: d.income, expenses: d.expenses, net: d.income - d.expenses }
      })
  }, [txns])

  function addGoal() {
    if (!newGoalName.trim() || parseFloat(newGoalTarget) <= 0) return
    const colors = [ACCENT, '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    onAddGoal({ id: Math.random().toString(36).slice(2), name: newGoalName.trim(), target: parseFloat(newGoalTarget), saved: 0, color: colors[goals.length % colors.length] })
    setNewGoalName(''); setNewGoalTarget(''); setAddingGoal(false)
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <IconAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800">Personal finances are tracked separately from Formula14 business finances.</p>
          <p className="mt-0.5 text-sm text-amber-700">Keep these records separate for tax purposes. Do not mix personal and business transactions.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<IconArrowUpRight size={16}/>} label="Total Income"   value={fmtMoney(income)}   color="#10b981" />
        <StatCard icon={<IconArrowDownLeft size={16}/>} label="Total Expenses" value={fmtMoney(expenses)} color="#ef4444" negative />
        <StatCard icon={<IconCheck size={16}/>}         label="Net Savings"    value={fmtMoney(savings)}  color={savings>=0 ? '#10b981' : '#ef4444'} negative={savings<0} />
        <StatCard icon={<IconArrowUpRight size={16}/>}  label="Net Position"   value={savings>=0 ? `+${fmtMoney(savings)}` : fmtMoney(savings)} color={savings>=0 ? ACCENT : '#ef4444'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Income by Source</h2>
          {incomeBySource.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">No income recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incomeBySource} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip formatter={(v: unknown) => fmtMoney(Number(v))} />
                <Bar dataKey="amount" name="Income" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Expenses by Category</h2>
          {expByCategory.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">No expenses recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={expByCategory} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: unknown) => fmtMoney(Number(v))} />
                <Bar dataKey="amount" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Savings goals */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Savings Goals</h2>
          <button onClick={() => setAddingGoal(true)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: ACCENT }}>
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
              <label className={LABEL}>Target ($)</label>
              <input type="number" min="0" placeholder="0" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} className={INPUT} />
            </div>
            <button onClick={addGoal} className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>Save</button>
            <button onClick={() => setAddingGoal(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-500">Cancel</button>
          </div>
        )}
        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No savings goals yet — add one to get started</p>
        ) : (
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
                    <span>{fmtK(g.saved)} saved</span>
                    <span>{fmtK(g.target)} target</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                  </div>
                  <p className="mt-1.5 text-right text-xs font-bold" style={{ color: g.color }}>{pct.toFixed(0)}%</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transaction log */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Personal Transactions</h2>
            <p className="text-xs text-gray-400">Completely separate from business bookkeeping</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal('income')} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#10b981' }}>
              <IconPlus size={13} /> Add Income
            </button>
            <button onClick={() => setModal('expense')} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: '#ef4444' }}>
              <IconPlus size={13} /> Add Expense
            </button>
          </div>
        </div>
        {txns.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No personal transactions yet</div>
        ) : (
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
                {[...txns].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{t.date.slice(5).replace('-', '/')}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.description}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{t.category}</span></td>
                    <td className="px-4 py-3 font-bold" style={{ color: t.type === 'income' ? '#15803d' : '#ef4444' }}>
                      {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={t.type === 'income' ? { background: '#dcfce7', color: '#15803d' } : { background: '#fee2e2', color: '#ef4444' }}>
                        {t.type === 'income' ? <IconArrowUpRight size={11} /> : <IconArrowDownLeft size={11} />}
                        {t.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly summary — computed from real transactions */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold text-gray-900">Monthly Summary</h2>
          <p className="text-xs text-gray-400">Grouped by month from your recorded transactions</p>
        </div>
        {monthlyData.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No transactions recorded yet</div>
        ) : (
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
                {monthlyData.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-700">{m.month}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#15803d' }}>{fmtK(m.income)}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#ef4444' }}>{fmtK(m.expenses)}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: m.net >= 0 ? '#15803d' : '#ef4444' }}>{m.net >= 0 ? '+' : '−'}{fmtK(Math.abs(m.net))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <PersonalModal type={modal} onClose={() => setModal(null)} onAdd={t => { onAddTx(t); setModal(null) }} />}
    </div>
  )
}
