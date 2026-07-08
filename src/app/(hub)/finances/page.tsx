'use client'

import { useState, useEffect, useCallback } from 'react'
import { IconSend, IconMail, IconX, IconCheck, IconRefresh, IconLayoutDashboard, IconList, IconCloudDownload } from '@tabler/icons-react'
import {
  Transaction,
  rowToTransaction,
  ACCENT, INPUT, LABEL,
} from './_shared'
import { OverviewTab } from './_overview'
import { TransactionsTab } from './_transactions'
import { loadRecipients, type Recipient } from '@/lib/finances-recipients'
import { sendEmail } from '@/lib/send-email'
import { supabase } from '@/lib/supabase'

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

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function lastMonthLabel() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function pLabel(p: SummaryPeriod, f: string, t: string) {
  if (p === 'this-month') return currentMonthLabel()
  if (p === 'last-month') return lastMonthLabel()
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
  const [recipients,   setRecipients]  = useState<Recipient[]>([])
  const [selected,     setSelected]    = useState<Set<string>>(new Set())
  const [customEmail,  setCustomEmail] = useState('')
  const [period,       setPeriod]      = useState<SummaryPeriod>('this-month')
  const [customFrom,   setCustomFrom]  = useState('')
  const [customTo,     setCustomTo]    = useState('')
  const [includes,     setIncludes]    = useState(() => new Set(INCLUDE_OPTS.map(o => o.id)))
  const [notes,        setNotes]       = useState('')

  useEffect(() => { setRecipients(loadRecipients()) }, [])

  function toggle(id: string)    { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleInc(id: string) { setIncludes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const subject = `Formula14 Financial Summary — ${pLabel(period, customFrom, customTo)}`
  const selectedRecipients: SummaryRecipient[] = [
    ...recipients.filter(r => selected.has(r.id)).map(r => ({ name: r.name, email: r.email })),
    ...(customEmail.trim() ? [{ name: customEmail.trim(), email: customEmail.trim() }] : []),
  ]
  const canSend = selectedRecipients.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT + '1a' }}>
              <IconSend size={16} style={{ color: ACCENT }} />
            </span>
            <h2 className="font-bold text-gray-900">Send Financial Summary</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className={LABEL + ' mb-2'}>Send To</label>
            <div className="grid grid-cols-2 gap-2">
              {recipients.map(r => {
                const on = selected.has(r.id)
                return (
                  <button key={r.id} type="button" onClick={() => toggle(r.id)}
                    className={`flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${on ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}>
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
                <input type="email" placeholder="other@example.com" value={customEmail} onChange={e => setCustomEmail(e.target.value)} className={INPUT + ' pl-9'} />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL + ' mb-2'}>Summary Period</label>
            <div className="flex flex-wrap gap-1.5">
              {PERIOD_OPTS.map(p => (
                <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={period === p.id ? { backgroundColor: '#1f2937', color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {p.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1"><label className="mb-1 block text-xs text-gray-500">From</label><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={INPUT} /></div>
                <div className="flex-1"><label className="mb-1 block text-xs text-gray-500">To</label><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={INPUT} /></div>
              </div>
            )}
          </div>

          <div>
            <label className={LABEL + ' mb-2'}>Include in Summary</label>
            <div className="grid grid-cols-2 gap-2">
              {INCLUDE_OPTS.map(o => {
                const on = includes.has(o.id)
                return (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
                    <span onClick={() => toggleInc(o.id)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}>
                      {on && <IconCheck size={10} style={{ color: 'white' }} />}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{o.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional message…" className={INPUT + ' resize-none'} />
          </div>

          <div>
            <label className={LABEL + ' mb-1'}>Email Subject Preview</label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <IconMail size={14} className="shrink-0 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{subject}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">{canSend ? `Sending to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}` : 'Select at least one recipient'}</p>
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

type Tab = 'overview' | 'transactions'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',      label: 'Overview',     icon: <IconLayoutDashboard size={15} /> },
  { id: 'transactions',  label: 'Transactions', icon: <IconList size={15} /> },
]

export default function FinancesPage() {
  const [tab,          setTab]          = useState<Tab>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showSend,     setShowSend]     = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)
  const [bankConnected, setBankConnected] = useState(false)
  const [syncing,       setSyncing]       = useState(false)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .order('date', { ascending: false })
    if (!error && data) {
      setTransactions(data.map(rowToTransaction))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchTransactions()
    supabase
      .from('bank_connections')
      .select('status')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()
      .then(({ data }) => { if (data?.status === 'connected') setBankConnected(true) })
  }, [fetchTransactions])

  const addTransaction = useCallback(async (t: Transaction) => {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({
        date:            t.date,
        description:     t.description,
        type:            t.type,
        category:        t.category,
        amount:          t.amount,
        reference:       t.reference || null,
        notes:           t.notes || null,
        receipt_url:     t.receiptUrl ?? null,
        gst_amount:      t.gstAmount ?? null,
        payment_method:  t.paymentMethod ?? null,
        is_reimbursable: t.isReimbursable ?? false,
        source:          'manual',
      })
      .select()
      .single()
    if (!error && data) {
      setTransactions(prev => [rowToTransaction(data), ...prev])
    }
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    await supabase.from('finance_transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const triggerToast = useCallback((msg: string) => setToast(msg), [])

  async function syncBank() {
    setSyncing(true)
    try {
      const res = await fetch('/api/basiq/sync', { method: 'POST' })
      const json = await res.json() as { imported?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Sync failed')
      triggerToast(`Bank sync complete — ${json.imported} new transaction${json.imported !== 1 ? 's' : ''} imported`)
      await fetchTransactions()
    } catch (e) {
      triggerToast(e instanceof Error ? e.message : 'Sync error')
    } finally {
      setSyncing(false)
    }
  }

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
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finances</h1>
            <p className="hidden text-sm text-gray-500 sm:block">Business financial overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void fetchTransactions()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <IconRefresh size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {bankConnected && (
              <button
                onClick={() => void syncBank()}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <IconCloudDownload size={15} className={syncing ? 'animate-bounce' : ''} />
                <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync Bank'}</span>
              </button>
            )}
            <button onClick={() => setShowSend(true)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 sm:px-4"
              style={{ backgroundColor: ACCENT }}>
              <IconSend size={15} /> <span className="hidden sm:inline">Send Summary</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
              style={tab === t.id
                ? { backgroundColor: ACCENT + '18', color: ACCENT }
                : { color: '#6b7280' }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
          </div>
        ) : tab === 'overview' ? (
          <OverviewTab transactions={transactions} />
        ) : (
          <TransactionsTab
            transactions={transactions}
            onAdd={addTransaction}
            onDelete={deleteTransaction}
          />
        )}
      </div>

      {showSend && <SendSummaryModal onClose={() => setShowSend(false)} onSend={handleSend} />}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
