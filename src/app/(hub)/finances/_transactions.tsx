'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  IconArrowUpRight, IconArrowDownLeft, IconPlus, IconSearch,
  IconX, IconTrash, IconTrendingUp, IconTrendingDown,
  IconCurrencyDollar, IconChevronDown, IconPaperclip,
  IconDotsVertical, IconEye, IconUpload, IconFileTypePdf,
  IconCheck, IconExternalLink,
} from '@tabler/icons-react'
import {
  Transaction, TxType, TxCategory, IncomeCat, ExpenseCat,
  INCOME_CATS, EXPENSE_CATS,
  StatCard, CatBadge, MonthBarChart,
  fmtMoney, fmtDateShort, monthLabel, monthTotal,
  uid, INPUT, LABEL, ACCENT,
} from './_shared'
import { supabase } from '@/lib/supabase'

const PAYMENT_METHODS = ['Business Card', 'Personal Card', 'Cash', 'Bank Transfer'] as const

// ─── Receipt preview modal ────────────────────────────────────────────────────

function ReceiptPreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-2xl w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-bold text-gray-900">Receipt</p>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <IconExternalLink size={12} /> Open full size
            </a>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <IconX size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center bg-gray-50 p-4" style={{ minHeight: 300, maxHeight: '75vh' }}>
          {isPdf ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 text-gray-500 hover:text-gray-700">
              <IconFileTypePdf size={64} className="text-red-300" />
              <span className="text-sm font-semibold">Click to open PDF</span>
            </a>
          ) : (
            <img src={url} alt="Receipt" className="max-h-full max-w-full rounded-xl object-contain shadow-sm" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Row actions menu ─────────────────────────────────────────────────────────

function RowMenu({
  transaction,
  onDelete,
  onViewReceipt,
}: {
  transaction: Transaction
  onDelete: () => void
  onViewReceipt: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
      >
        <IconDotsVertical size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {transaction.receiptUrl && (
            <button
              type="button"
              onClick={() => { onViewReceipt(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <IconEye size={13} /> View Receipt
            </button>
          )}
          <button
            type="button"
            onClick={() => { onDelete(); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
          >
            <IconTrash size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Receipt upload widget ────────────────────────────────────────────────────

interface ReceiptState {
  file:       File
  previewUrl: string
  fileType:   'image' | 'pdf'
}

function ReceiptUpload({
  value,
  onChange,
}: {
  value:    ReceiptState | null
  onChange: (r: ReceiptState | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return
    onChange({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      fileType:   file.type === 'application/pdf' ? 'pdf' : 'image',
    })
  }

  if (value) {
    return (
      <div className="relative flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        {value.fileType === 'image' ? (
          <img src={value.previewUrl} alt="Receipt preview"
            className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
            <IconFileTypePdf size={28} className="text-red-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{value.file.name}</p>
          <p className="text-xs text-gray-400">{(value.file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <IconX size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-5 transition-colors ${dragging ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      <IconUpload size={20} className="mb-1.5 text-gray-300" />
      <p className="text-sm font-semibold text-gray-500">Attach Receipt <span className="font-normal text-gray-400">(optional)</span></p>
      <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, PDF, HEIC — up to 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.heic,application/pdf"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ─── Add Transaction Modal ─────────────────────────────────────────────────────

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Transaction) => void }) {
  const [type,          setType]          = useState<TxType>('income')
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10))
  const [desc,          setDesc]          = useState('')
  const [amount,        setAmount]        = useState('')
  const [gstAmount,     setGstAmount]     = useState('')
  const [category,      setCategory]      = useState<TxCategory>('membership')
  const [reference,     setReference]     = useState('')
  const [notes,         setNotes]         = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0])
  const [reimbursable,  setReimbursable]  = useState(false)
  const [receipt,       setReceipt]       = useState<ReceiptState | null>(null)
  const [saving,        setSaving]        = useState(false)

  const cats = type === 'income'
    ? Object.entries(INCOME_CATS).map(([v, c]) => ({ value: v, label: c.label }))
    : Object.entries(EXPENSE_CATS).map(([v, c]) => ({ value: v, label: c.label }))

  const canSubmit = desc.trim() && parseFloat(amount) > 0 && !saving

  function handleAmountChange(v: string) {
    setAmount(v)
    if (v && parseFloat(v) > 0) {
      setGstAmount((parseFloat(v) / 11).toFixed(2))
    } else {
      setGstAmount('')
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)

    let receiptUrl: string | undefined

    // Upload receipt to Supabase Storage if attached
    if (receipt) {
      const ext  = receipt.file.name.split('.').pop() ?? 'jpg'
      const path = `finance/${Date.now()}-${uid()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(path, receipt.file, { contentType: receipt.file.type, upsert: false })
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        receiptUrl = publicUrl
      }
    }

    onAdd({
      id:             uid(),
      date,
      description:    desc.trim(),
      type,
      category:       category as TxCategory,
      amount:         parseFloat(amount),
      reference:      reference.trim(),
      notes:          notes.trim(),
      ...(type === 'expense' ? {
        gstAmount:      gstAmount ? parseFloat(gstAmount) : undefined,
        paymentMethod:  paymentMethod || undefined,
        isReimbursable: reimbursable || undefined,
        receiptUrl,
      } : {}),
    })

    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Type toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1">
            {(['income', 'expense'] as TxType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  setCategory(t === 'income' ? 'membership' : 'wages')
                  if (t === 'income') { setReceipt(null); setReimbursable(false) }
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all ${
                  type === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
                style={type === t ? { color: t === 'income' ? ACCENT : '#ef4444' } : {}}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Receipt upload — expense only */}
          {type === 'expense' && (
            <ReceiptUpload value={receipt} onChange={setReceipt} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Amount ($)</label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={amount} onChange={e => handleAmountChange(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {/* GST — expense only */}
          {type === 'expense' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>GST Amount <span className="normal-case font-normal text-gray-400">(auto)</span></label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={gstAmount} onChange={e => setGstAmount(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Payment Method</label>
                <div className="relative">
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT + ' appearance-none pr-8'}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          )}

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
            <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. INV-001" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Notes <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={INPUT + ' resize-none'} />
          </div>

          {/* Reimbursable toggle — expense only */}
          {type === 'expense' && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
              <span
                onClick={() => setReimbursable(r => !r)}
                className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition-colors ${reimbursable ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}
                style={{ width: 18, height: 18 }}
              >
                {reimbursable && <IconCheck size={10} className="text-white" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Reimbursable</p>
                <p className="text-xs text-gray-400">Paid personally — flag for reimbursement</p>
              </div>
            </label>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={!canSubmit}
            className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: type === 'income' ? ACCENT : '#ef4444' }}
          >
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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

  const chartData = useMemo(() => [
    { label: 'May', ym: '2026-05', income: monthTotal(transactions, '2026-05', 'income'), expenses: monthTotal(transactions, '2026-05', 'expense') },
    { label: 'Jun', ym: '2026-06', income: monthTotal(transactions, '2026-06', 'income'), expenses: monthTotal(transactions, '2026-06', 'expense') },
  ], [transactions])

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<IconArrowUpRight size={16}/>}   label={`Income — ${period === 'all' ? 'All time' : monthLabel(period)}`} value={fmtMoney(income)}   sub={`${periodTxns.filter(t => t.type==='income').length} transactions`} />
        <StatCard icon={<IconArrowDownLeft size={16}/>}  label="Expenses"          value={fmtMoney(expenses)} sub={`${periodTxns.filter(t => t.type==='expense').length} transactions`} color="#ef4444" negative />
        <StatCard icon={net>=0 ? <IconTrendingUp size={16}/> : <IconTrendingDown size={16}/>} label="Net P&L" value={fmtMoney(Math.abs(net))} sub={net >= 0 ? 'Profit' : 'Loss'} color={net>=0 ? '#10b981' : '#ef4444'} />
        <StatCard icon={<IconCurrencyDollar size={16}/>} label="Transactions"      value={String(periodTxns.length)} sub="in selected period" color="#8b5cf6" />
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-gray-900">Monthly Overview</h2>
        <p className="mb-4 text-xs text-gray-400">Recent months</p>
        {chartData.some(d => d.income > 0 || d.expenses > 0) ? (
          <MonthBarChart data={chartData} />
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">No transaction data yet</div>
        )}
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
          <div className="py-14 text-center text-sm text-gray-400">
            {transactions.length === 0
              ? 'No transactions yet — add your first entry'
              : 'No transactions match your filters'}
          </div>
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{t.description}</span>
                          {/* Receipt paperclip badge */}
                          {t.receiptUrl && (
                            <button
                              type="button"
                              title="View receipt"
                              onClick={() => setPreviewUrl(t.receiptUrl!)}
                              className="flex items-center justify-center rounded p-0.5 text-[#6BA3D6] transition hover:bg-[#6BA3D6]/10"
                            >
                              <IconPaperclip size={12} />
                            </button>
                          )}
                          {t.isReimbursable && (
                            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Reimb.</span>
                          )}
                        </div>
                        {t.notes && <div className="truncate text-xs text-gray-400" style={{ maxWidth: 240 }}>{t.notes}</div>}
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
                    <RowMenu
                      transaction={t}
                      onDelete={() => onDelete(t.id)}
                      onViewReceipt={() => setPreviewUrl(t.receiptUrl!)}
                    />
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
      {previewUrl  && <ReceiptPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
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
