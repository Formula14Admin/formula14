'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  IconLayoutDashboard, IconReceipt, IconChartBar, IconUser,
  IconSparkles, IconSend, IconMail, IconX, IconCheck,
  IconPlus, IconChevronDown,
} from '@tabler/icons-react'
import {
  Transaction, PersonalTx, SavingsGoal,
  loadTransactions, saveTransactions,
  loadPersonalTxns, savePersonalTxns,
  loadGoals, saveGoals,
  uid, ACCENT, INPUT, LABEL,
} from './_shared'
import { OverviewTab }      from './_overview'
import { TransactionsTab }  from './_transactions'
import { ReportsTab }       from './_reports'
import { PersonalTab }      from './_personal'
import { AskClaudeTab }     from './_claude'
import { loadRecipients, type Recipient } from '@/lib/finances-recipients'
import { sendEmail } from '@/lib/send-email'

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'transactions' | 'reports' | 'personal' | 'claude'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',      label: 'Overview',      icon: <IconLayoutDashboard size={15} /> },
  { id: 'transactions',  label: 'Transactions',  icon: <IconReceipt size={15} /> },
  { id: 'reports',       label: 'Reports',       icon: <IconChartBar size={15} /> },
  { id: 'personal',      label: 'Personal',      icon: <IconUser size={15} /> },
  { id: 'claude',        label: 'Ask Claude',    icon: <IconSparkles size={15} /> },
]

// ─── Send Summary Modal ────────────────────────────────────────────────────────

type SummaryPeriod = 'this-month' | 'last-month' | 'this-fy' | 'last-fy' | 'custom'

const PERIOD_OPTS: { id: SummaryPeriod; label: string }[] = [
  { id: 'this-month', label: 'This Month'          },
  { id: 'last-month', label: 'Last Month'          },
  { id: 'this-fy',    label: 'This Financial Year' },
  { id: 'last-fy',    label: 'Last Financial Year' },
  { id: 'custom',     label: 'Custom Date Range'   },
]

const INCLUDE_OPTS = [
  { id: 'revenue',      label: 'Revenue breakdown'         },
  { id: 'expenses',     label: 'Expense breakdown'          },
  { id: 'net',          label: 'Net profit / loss'          },
  { id: 'transactions', label: 'Transaction list'           },
  { id: 'membership',   label: 'Membership revenue summary' },
  { id: 'invoices',     label: 'Outstanding invoices'       },
  { id: 'pnl',          label: 'Monthly P&L table'          },
]

function pLabel(p: SummaryPeriod, f: string, t: string) {
  if (p === 'this-month') return 'June 2026'
  if (p === 'last-month') return 'May 2026'
  if (p === 'this-fy')    return 'FY 2025–26'
  if (p === 'last-fy')    return 'FY 2024–25'
  if (f && t)             return `${f} to ${t}`
  return 'Custom Range'
}

type SummaryRecipient = { name: string; email: string }

function SendSummaryModal({ onClose, onSend }: {
  onClose: () => void
  onSend: (recipients: SummaryRecipient[], subject: string, period: string, includes: string[], notes: string) => void
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [customEmail, setCustomEmail] = useState('')
  const [period,     setPeriod]     = useState<SummaryPeriod>('this-month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [includes,   setIncludes]   = useState(() => new Set(INCLUDE_OPTS.map(o => o.id)))
  const [notes,      setNotes]      = useState('')

  useEffect(() => { setRecipients(loadRecipients()) }, [])

  function toggle(id: string) { setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n }) }
  function toggleInc(id: string) { setIncludes(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n }) }

  const subject = `Formula14 Financial Summary — ${pLabel(period, customFrom, customTo)}`
  const selectedRecipients: SummaryRecipient[] = [
    ...recipients.filter(r => selected.has(r.id)).map(r => ({ name: r.name, email: r.email })),
    ...(customEmail.trim() ? [{ name: customEmail.trim(), email: customEmail.trim() }] : []),
  ]
  const selectedNames = selectedRecipients.map(r => r.name)
  const canSend = selectedRecipients.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT+'1a' }}>
              <IconSend size={16} style={{ color: ACCENT }} />
            </span>
            <h2 className="font-bold text-gray-900">Send Financial Summary</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Recipients */}
          <div>
            <label className={LABEL + ' mb-2'}>Send To</label>
            <div className="grid grid-cols-2 gap-2">
              {recipients.map(r => {
                const on = selected.has(r.id)
                return (
                  <button key={r.id} type="button" onClick={() => toggle(r.id)}
                    className={`flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${on?'border-[#6BA3D6] bg-[#6BA3D6]/5':'border-gray-200 hover:border-gray-300'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on?'border-[#6BA3D6] bg-[#6BA3D6]':'border-gray-300'}`}>
                      {on && <IconCheck size={10} style={{ color: 'white' }} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <p className="truncate text-[11px] text-gray-400">{r.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{r.role}</span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-gray-500">Custom email</label>
              <div className="relative">
                <IconMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" placeholder="other@example.com" value={customEmail} onChange={e=>setCustomEmail(e.target.value)} className={INPUT+' pl-9'} />
              </div>
            </div>
          </div>

          {/* Period */}
          <div>
            <label className={LABEL + ' mb-2'}>Summary Period</label>
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_OPTS.map(p => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={period===p.id?{backgroundColor:'#1f2937',color:'white'}:{backgroundColor:'white',color:'#6b7280',border:'1px solid #e5e7eb'}}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1"><label className="mb-1 block text-xs text-gray-500">From</label><input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className={INPUT} /></div>
                <div className="flex-1"><label className="mb-1 block text-xs text-gray-500">To</label><input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} className={INPUT} /></div>
              </div>
            )}
          </div>

          {/* Include */}
          <div>
            <label className={LABEL + ' mb-2'}>Include in Summary</label>
            <div className="grid grid-cols-2 gap-2">
              {INCLUDE_OPTS.map(o => {
                const on = includes.has(o.id)
                return (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                    <span onClick={() => toggleInc(o.id)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on?'border-[#6BA3D6] bg-[#6BA3D6]':'border-gray-300'}`}>
                      {on && <IconCheck size={10} style={{ color: 'white' }} />}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{o.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any additional message…" className={INPUT+' resize-none'} />
          </div>

          {/* Subject preview */}
          <div>
            <label className={LABEL + ' mb-1'}>Email Subject Preview</label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <IconMail size={14} className="shrink-0 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{subject}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">{canSend ? `Sending to ${selectedNames.length} recipient${selectedNames.length!==1?'s':''}` : 'Select at least one recipient'}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={() => onSend(selectedRecipients, subject, pLabel(period, customFrom, customTo), [...includes], notes)} disabled={!canSend}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}>
              <IconSend size={15} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const id = setTimeout(onClose, 6000); return () => clearTimeout(id) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-xl bg-gray-900 px-4 py-3.5 text-white shadow-2xl">
      <IconCheck size={18} className="mt-0.5 shrink-0 text-green-400" />
      <p className="flex-1 text-sm leading-relaxed">{message}</p>
      <button onClick={onClose} className="ml-1 shrink-0 text-gray-400 hover:text-white"><IconX size={16} /></button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const [tab,          setTab]          = useState<TabId>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [personalTxns, setPersonalTxns] = useState<PersonalTx[]>([])
  const [goals,        setGoals]        = useState<SavingsGoal[]>([])
  const [showSend,     setShowSend]     = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)
  const [showAddTx,    setShowAddTx]    = useState(false)

  useEffect(() => {
    setTransactions(loadTransactions([]))
    setPersonalTxns(loadPersonalTxns([]))
    setGoals(loadGoals([]))
  }, [])

  useEffect(() => { if (transactions.length) saveTransactions(transactions) }, [transactions])
  useEffect(() => { if (personalTxns.length) savePersonalTxns(personalTxns) }, [personalTxns])
  useEffect(() => { if (goals.length) saveGoals(goals) }, [goals])

  const addTransaction = useCallback((t: Transaction) => setTransactions(prev => [t, ...prev]), [])
  const delTransaction = useCallback((id: string)      => setTransactions(prev => prev.filter(t => t.id !== id)), [])
  const addPersonalTx  = useCallback((t: PersonalTx)   => setPersonalTxns(prev => [t, ...prev]), [])
  const addGoal        = useCallback((g: SavingsGoal)  => setGoals(prev => [...prev, g]), [])

  const triggerToast = useCallback((msg: string) => setToast(msg), [])

  async function handleSend(
    summaryRecipients: SummaryRecipient[],
    subject: string,
    period: string,
    includes: string[],
    notes: string,
  ) {
    setShowSend(false)
    const now = new Date().toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })
    const includeLabels = INCLUDE_OPTS.filter(o => includes.includes(o.id)).map(o => o.label)
    try {
      await Promise.all(summaryRecipients.map(r =>
        sendEmail({
          template: 'finance-summary',
          to: r.email,
          data: { recipientName: r.name, period, includes: includeLabels, notes: notes || undefined, generatedAt: now },
        })
      ))
      triggerToast(`Financial summary sent to ${summaryRecipients.map(r => r.name).join(', ')}`)
    } catch {
      triggerToast('Error sending summary — please try again')
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finances</h1>
            <p className="text-sm text-gray-500">Business · Personal · AI-powered insights</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Context-sensitive action buttons */}
            {tab === 'transactions' && (
              <button onClick={() => setShowAddTx(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                <IconPlus size={15} /> Add Transaction
              </button>
            )}
            {(tab === 'overview' || tab === 'reports') && (
              <button onClick={() => setShowSend(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                <IconSend size={15} /> Send Summary
              </button>
            )}
            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-gray-50 p-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  } ${t.id === 'claude' && tab === t.id ? 'text-[#6BA3D6]' : ''}`}>
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'overview'     && <OverviewTab     transactions={transactions} />}
        {tab === 'transactions' && <TransactionsTab transactions={transactions} onAdd={addTransaction} onDelete={delTransaction} showAddModalProp={showAddTx} onAddModalClose={() => setShowAddTx(false)} />}
{tab === 'reports'      && <ReportsTab      transactions={transactions} />}
        {tab === 'personal'     && <PersonalTab     txns={personalTxns} goals={goals} onAddTx={addPersonalTx} onAddGoal={addGoal} />}
        {tab === 'claude'       && <AskClaudeTab    transactions={transactions} personalTxns={personalTxns} />}
      </div>

      {showSend && <SendSummaryModal onClose={() => setShowSend(false)} onSend={handleSend} />}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
