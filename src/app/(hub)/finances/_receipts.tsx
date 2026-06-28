'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  IconUpload, IconCamera, IconPlus, IconSearch, IconFilter,
  IconChevronDown, IconX, IconCheck, IconEye, IconPencil,
  IconTrash, IconDownload, IconMail, IconDotsVertical,
  IconFileTypePdf, IconPhoto, IconReceipt2, IconAlertCircle,
  IconRefresh, IconCloudUpload, IconZoomIn, IconZoomOut,
  IconArrowLeft, IconArrowRight, IconPrinter, IconExternalLink,
  IconTag, IconCalendar, IconCurrencyDollar, IconUser,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Types + constants ────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

export interface Receipt {
  id:              string
  uploaded_by:     string
  merchant_name:   string | null
  purchase_date:   string | null
  amount:          number | null
  gst_amount:      number | null
  category:        string | null
  description:     string | null
  payment_method:  string | null
  is_reimbursable: boolean
  status:          'unreviewed' | 'reviewed' | 'exported'
  image_url:       string | null
  thumbnail_url:   string | null
  file_type:       'image' | 'pdf' | 'manual'
  transaction_id:  string | null
  created_at:      string
  updated_at:      string
}

type ReceiptStatus = Receipt['status']

const CATEGORIES = [
  'Facility Costs', 'Equipment', 'Marketing & Advertising', 'Staff & Wages',
  'Insurance', 'Software & Subscriptions', 'Meals & Entertainment',
  'Travel & Transport', 'Coaching Materials', 'Other',
] as const

const PAYMENT_METHODS = ['Business Card', 'Personal Card', 'Cash', 'Bank Transfer'] as const

const UPLOADERS = [
  { id: 'matt', label: 'Matt' },
  { id: 'jade', label: 'Jade' },
] as const

const CAT_COLORS: Record<string, string> = {
  'Facility Costs':           '#6BA3D6',
  'Equipment':                '#7C3AED',
  'Marketing & Advertising':  '#EC4899',
  'Staff & Wages':            '#F59E0B',
  'Insurance':                '#EF4444',
  'Software & Subscriptions': '#14B8A6',
  'Meals & Entertainment':    '#F97316',
  'Travel & Transport':       '#10B981',
  'Coaching Materials':       '#8B5CF6',
  'Other':                    '#6B7280',
}

const STATUS_STYLES: Record<ReceiptStatus, { label: string; bg: string; text: string }> = {
  unreviewed: { label: 'Unreviewed', bg: '#FEF3C7', text: '#92400E' },
  reviewed:   { label: 'Reviewed',   bg: '#D1FAE5', text: '#065F46' },
  exported:   { label: 'Exported',   bg: '#F3F4F6', text: '#374151' },
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dydrtbrhhgyppancbhpy.supabase.co'

function fmt$(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({ category }: { category: string | null }) {
  if (!category) return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">Uncategorised</span>
  )
  const color = CAT_COLORS[category] ?? '#6B7280'
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: color + '20', color }}>
      {category}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReceiptStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ─── Receipt thumbnail ────────────────────────────────────────────────────────

function Thumbnail({ receipt, size = 48 }: { receipt: Receipt; size?: number }) {
  if (receipt.file_type === 'manual') {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-lg bg-gray-100"
        style={{ width: size, height: size }}>
        <IconReceipt2 size={size * 0.45} className="text-gray-400" />
      </div>
    )
  }
  if (receipt.file_type === 'pdf') {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-lg bg-red-50"
        style={{ width: size, height: size }}>
        <IconFileTypePdf size={size * 0.45} className="text-red-400" />
      </div>
    )
  }
  const url = receipt.thumbnail_url ?? receipt.image_url
  if (!url) {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-lg bg-gray-100"
        style={{ width: size, height: size }}>
        <IconPhoto size={size * 0.45} className="text-gray-400" />
      </div>
    )
  }
  return (
    <img src={url} alt={receipt.merchant_name ?? 'Receipt'}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: size }} />
  )
}

// ─── Dropdown helper ──────────────────────────────────────────────────────────

function Select({
  value, onChange, children, placeholder,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm text-gray-700 outline-none focus:border-[#6BA3D6]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <IconChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

// ─── Receipt form (shared by upload + manual) ─────────────────────────────────

interface ReceiptFormData {
  merchant_name:   string
  purchase_date:   string
  amount:          string
  gst_amount:      string
  category:        string
  description:     string
  payment_method:  string
  is_reimbursable: boolean
  uploaded_by:     string
}

const EMPTY_FORM: ReceiptFormData = {
  merchant_name: '', purchase_date: '', amount: '', gst_amount: '',
  category: '', description: '', payment_method: 'Business Card',
  is_reimbursable: false, uploaded_by: 'matt',
}

function ReceiptForm({
  data, onChange,
}: {
  data:     ReceiptFormData
  onChange: (patch: Partial<ReceiptFormData>) => void
}) {
  function handleAmount(v: string) {
    onChange({ amount: v, gst_amount: v ? String((Number(v) / 11).toFixed(2)) : '' })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Merchant / Supplier *">
          <input type="text" className={INPUT_CLS} value={data.merchant_name}
            onChange={e => onChange({ merchant_name: e.target.value })} placeholder="e.g. Officeworks" />
        </Field>
        <Field label="Date of Purchase *">
          <input type="date" className={INPUT_CLS} value={data.purchase_date}
            onChange={e => onChange({ purchase_date: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount ($) *">
          <input type="number" step="0.01" min="0" className={INPUT_CLS} value={data.amount}
            onChange={e => handleAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="GST Amount ($)">
          <input type="number" step="0.01" min="0" className={INPUT_CLS} value={data.gst_amount}
            onChange={e => onChange({ gst_amount: e.target.value })} placeholder="Auto-calculated" />
        </Field>
      </div>
      <Field label="Category">
        <select className={INPUT_CLS} value={data.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">Select category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Description / Notes">
        <textarea className={INPUT_CLS} rows={2} value={data.description}
          onChange={e => onChange({ description: e.target.value })} placeholder="Optional notes…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Payment Method">
          <select className={INPUT_CLS} value={data.payment_method} onChange={e => onChange({ payment_method: e.target.value })}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Uploaded By">
          <select className={INPUT_CLS} value={data.uploaded_by} onChange={e => onChange({ uploaded_by: e.target.value })}>
            {UPLOADERS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5">
        <span
          onClick={() => onChange({ is_reimbursable: !data.is_reimbursable })}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${data.is_reimbursable ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}>
          {data.is_reimbursable && <IconCheck size={12} className="text-white" />}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">Reimbursable</p>
          <p className="text-xs text-gray-400">Paid personally by Matt or Jade — flag for reimbursement</p>
        </div>
      </label>
    </div>
  )
}

// ─── Upload modal ─────────────────────────────────────────────────────────────

type UploadStep = 'drop' | 'details' | 'saving'

interface FileWithPreview {
  file:    File
  preview: string | null
  type:    'image' | 'pdf'
}

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step,        setStep]        = useState<UploadStep>('drop')
  const [files,       setFiles]       = useState<FileWithPreview[]>([])
  const [fileIndex,   setFileIndex]   = useState(0)
  const [form,        setForm]        = useState<ReceiptFormData>(EMPTY_FORM)
  const [isDragging,  setIsDragging]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(raw: File[]) {
    const accepted = raw.filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    )
    if (!accepted.length) { setError('Please upload an image or PDF file.'); return }
    const mapped: FileWithPreview[] = accepted.map(f => ({
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      type: f.type === 'application/pdf' ? 'pdf' : 'image',
    }))
    setFiles(mapped)
    setFileIndex(0)
    setForm({ ...EMPTY_FORM, purchase_date: new Date().toISOString().slice(0, 10) })
    setStep('details')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  async function handleSave() {
    if (!form.merchant_name.trim()) { setError('Merchant name is required.'); return }
    if (!form.amount) { setError('Amount is required.'); return }
    setSaving(true)
    setError('')

    // Process files one by one (if multiple)
    for (let i = 0; i < files.length; i++) {
      const fw = files[i]
      let imageUrl: string | null = null

      // Upload to Supabase Storage
      const ext  = fw.file.name.split('.').pop() ?? 'jpg'
      const path = `${form.uploaded_by}/${Date.now()}-${i}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(path, fw.file, { contentType: fw.file.type, upsert: false })

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        imageUrl = publicUrl
      }

      await supabase.from('receipts').insert({
        uploaded_by:     form.uploaded_by,
        merchant_name:   form.merchant_name.trim() || null,
        purchase_date:   form.purchase_date || null,
        amount:          form.amount ? Number(form.amount) : null,
        gst_amount:      form.gst_amount ? Number(form.gst_amount) : null,
        category:        form.category || null,
        description:     form.description.trim() || null,
        payment_method:  form.payment_method || null,
        is_reimbursable: form.is_reimbursable,
        status:          'unreviewed',
        image_url:       imageUrl,
        thumbnail_url:   imageUrl,
        file_type:       fw.type,
      })
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  const current = files[fileIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Upload Receipt</h2>
            <p className="text-xs text-gray-400">
              {step === 'drop' ? 'Drop your receipt files here' : `${files.length} file${files.length > 1 ? 's' : ''} selected — fill in the details`}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'drop' ? (
            /* ── Drop zone ─────────────────────────────────────────────── */
            <div className="p-6">
              <div
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${isDragging ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: ACCENT + '18' }}>
                  <IconCloudUpload size={32} style={{ color: ACCENT }} />
                </div>
                <p className="text-base font-bold text-gray-900">Drop receipts here or click to browse</p>
                <p className="mt-1 text-sm text-gray-400">Supports JPG, PNG, PDF, HEIC — up to 10 MB each</p>
                <p className="mt-3 text-xs text-gray-300">You can upload multiple receipts at once</p>
              </div>
              <input ref={inputRef} type="file" multiple className="hidden"
                accept="image/*,.pdf,.heic,application/pdf"
                onChange={e => handleFiles(Array.from(e.target.files ?? []))} />
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            </div>
          ) : (
            /* ── Details form ───────────────────────────────────────────── */
            <div className="flex flex-col gap-0 md:flex-row">
              {/* Left: image preview */}
              <div className="flex w-full shrink-0 flex-col items-center justify-start bg-gray-50 p-4 md:w-56">
                {current?.type === 'image' && current.preview ? (
                  <img src={current.preview} alt="Receipt preview"
                    className="rounded-xl border border-gray-200 object-contain shadow-sm"
                    style={{ maxHeight: '300px', width: '100%' }} />
                ) : current?.type === 'pdf' ? (
                  <div className="flex h-40 w-full items-center justify-center rounded-xl border border-gray-200 bg-white">
                    <div className="text-center">
                      <IconFileTypePdf size={40} className="mx-auto text-red-400" />
                      <p className="mt-2 text-xs font-semibold text-gray-500">{current.file.name}</p>
                    </div>
                  </div>
                ) : null}
                {files.length > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setFileIndex(i => Math.max(0, i - 1))} disabled={fileIndex === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30">
                      <IconArrowLeft size={12} />
                    </button>
                    <span className="text-xs font-semibold text-gray-500">{fileIndex + 1} / {files.length}</span>
                    <button onClick={() => setFileIndex(i => Math.min(files.length - 1, i + 1))} disabled={fileIndex === files.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30">
                      <IconArrowRight size={12} />
                    </button>
                  </div>
                )}
                <button onClick={() => setStep('drop')} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
                  ← Choose different files
                </button>
              </div>

              {/* Right: form */}
              <div className="flex-1 p-5">
                {files.length > 1 && (
                  <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <strong>Note:</strong> The same details will be applied to all {files.length} receipts. Edit individually after saving.
                  </div>
                )}
                <ReceiptForm data={form} onChange={patch => setForm(p => ({ ...p, ...patch }))} />
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconCheck size={14} />}
              {saving ? 'Saving…' : `Save ${files.length > 1 ? `${files.length} Receipts` : 'Receipt'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Manual expense modal ─────────────────────────────────────────────────────

function ManualExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form,   setForm]   = useState<ReceiptFormData>({ ...EMPTY_FORM, purchase_date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!form.merchant_name.trim()) { setError('Merchant name is required.'); return }
    if (!form.amount) { setError('Amount is required.'); return }
    setSaving(true)
    await supabase.from('receipts').insert({
      uploaded_by:     form.uploaded_by,
      merchant_name:   form.merchant_name.trim(),
      purchase_date:   form.purchase_date || null,
      amount:          Number(form.amount),
      gst_amount:      form.gst_amount ? Number(form.gst_amount) : null,
      category:        form.category || null,
      description:     form.description.trim() || null,
      payment_method:  form.payment_method || null,
      is_reimbursable: form.is_reimbursable,
      status:          'unreviewed',
      file_type:       'manual',
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Manual Expense</h2>
            <p className="text-xs text-gray-400">Record an expense without a receipt image</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
            <IconAlertCircle size={15} className="shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">No receipt available — this entry will be flagged as a manual expense.</p>
          </div>
          <ReceiptForm data={form} onChange={patch => setForm(p => ({ ...p, ...patch }))} />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}>
            {saving ? <IconRefresh size={14} className="animate-spin" /> : <IconPlus size={14} />}
            {saving ? 'Saving…' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Receipt detail modal ─────────────────────────────────────────────────────

function ReceiptDetailModal({
  receipt: initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  receipt:   Receipt
  onClose:   () => void
  onSaved:   () => void
  onDeleted: () => void
}) {
  const [receipt, setReceipt] = useState<Receipt>(initial)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState<ReceiptFormData>({
    merchant_name:   initial.merchant_name   ?? '',
    purchase_date:   initial.purchase_date   ?? '',
    amount:          String(initial.amount   ?? ''),
    gst_amount:      String(initial.gst_amount ?? ''),
    category:        initial.category        ?? '',
    description:     initial.description     ?? '',
    payment_method:  initial.payment_method  ?? 'Business Card',
    is_reimbursable: initial.is_reimbursable,
    uploaded_by:     initial.uploaded_by,
  })
  const [saving,  setSaving]  = useState(false)
  const [zoom,    setZoom]    = useState(1)
  const imgRef = useRef<HTMLDivElement>(null)

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.min(4, Math.max(0.5, z + (e.deltaY < 0 ? 0.15 : -0.15))))
  }

  async function handleSave() {
    setSaving(true)
    const { data: updated } = await supabase
      .from('receipts')
      .update({
        merchant_name:   form.merchant_name || null,
        purchase_date:   form.purchase_date || null,
        amount:          form.amount ? Number(form.amount) : null,
        gst_amount:      form.gst_amount ? Number(form.gst_amount) : null,
        category:        form.category || null,
        description:     form.description || null,
        payment_method:  form.payment_method || null,
        is_reimbursable: form.is_reimbursable,
        uploaded_by:     form.uploaded_by,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', receipt.id)
      .select()
      .maybeSingle()
    setSaving(false)
    if (updated) setReceipt(updated as Receipt)
    setEditing(false)
    onSaved()
  }

  async function handleMarkReviewed() {
    const newStatus: ReceiptStatus = receipt.status === 'reviewed' ? 'unreviewed' : 'reviewed'
    await supabase.from('receipts').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', receipt.id)
    setReceipt(r => ({ ...r, status: newStatus }))
    onSaved()
  }

  async function handleDelete() {
    if (!window.confirm('Delete this receipt? This cannot be undone.')) return
    // Delete from storage if image exists
    if (receipt.image_url) {
      const path = receipt.image_url.split('/receipts/')[1]
      if (path) await supabase.storage.from('receipts').remove([path])
    }
    await supabase.from('receipts').delete().eq('id', receipt.id)
    onDeleted()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Thumbnail receipt={receipt} size={36} />
            <div>
              <p className="text-sm font-bold text-gray-900">{receipt.merchant_name ?? 'Receipt'}</p>
              <p className="text-xs text-gray-400">{fmtDate(receipt.purchase_date)} · {fmt$(receipt.amount)}</p>
            </div>
            <StatusBadge status={receipt.status} />
            {receipt.file_type === 'manual' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">No receipt</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <button onClick={handleMarkReviewed}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <IconCheck size={12} /> {receipt.status === 'reviewed' ? 'Mark Unreviewed' : 'Mark Reviewed'}
                </button>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  <IconPencil size={12} /> Edit
                </button>
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                  <IconTrash size={12} /> Delete
                </button>
              </>
            )}
            {editing && (
              <>
                <button onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}>
                  {saving ? <IconRefresh size={12} className="animate-spin" /> : <IconCheck size={12} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <IconX size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: image */}
          {receipt.file_type !== 'manual' && (
            <div className="relative flex w-1/2 shrink-0 items-center justify-center overflow-hidden bg-gray-50">
              {receipt.image_url && receipt.file_type === 'image' ? (
                <>
                  <div
                    ref={imgRef}
                    onWheel={handleWheel}
                    className="flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden p-4"
                  >
                    <img
                      src={receipt.image_url}
                      alt={receipt.merchant_name ?? 'Receipt'}
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-white/90 p-1 shadow-sm">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-100">
                      <IconZoomOut size={13} />
                    </button>
                    <span className="px-1 text-[11px] font-semibold text-gray-500">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-100">
                      <IconZoomIn size={13} />
                    </button>
                    <button onClick={() => setZoom(1)} className="ml-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600">Reset</button>
                  </div>
                  {receipt.image_url && (
                    <a href={receipt.image_url} target="_blank" rel="noopener noreferrer"
                      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm text-gray-500 hover:text-gray-800">
                      <IconExternalLink size={13} />
                    </a>
                  )}
                </>
              ) : receipt.file_type === 'pdf' && receipt.image_url ? (
                <a href={receipt.image_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 text-gray-500 hover:text-gray-700">
                  <IconFileTypePdf size={64} className="text-red-300" />
                  <span className="text-sm font-semibold">Open PDF</span>
                </a>
              ) : (
                <div className="text-gray-300"><IconPhoto size={64} /></div>
              )}
            </div>
          )}

          {/* Right: details */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 p-6">
              {editing ? (
                <ReceiptForm data={form} onChange={patch => setForm(p => ({ ...p, ...patch }))} />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Merchant</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{receipt.merchant_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Date</p>
                      <p className="mt-0.5 text-sm text-gray-900">{fmtDate(receipt.purchase_date)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Amount</p>
                      <p className="mt-0.5 text-lg font-bold text-gray-900">{fmt$(receipt.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">GST</p>
                      <p className="mt-0.5 text-sm text-gray-900">{fmt$(receipt.gst_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Category</p>
                      <div className="mt-1"><CatBadge category={receipt.category} /></div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Payment Method</p>
                      <p className="mt-0.5 text-sm text-gray-900">{receipt.payment_method ?? '—'}</p>
                    </div>
                  </div>
                  {receipt.description && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                      <p className="mt-0.5 text-sm text-gray-700">{receipt.description}</p>
                    </div>
                  )}
                  {receipt.is_reimbursable && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <IconAlertCircle size={14} className="text-amber-600" />
                      <p className="text-xs font-semibold text-amber-700">Flagged for reimbursement</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audit trail */}
            <div className="border-t border-gray-50 bg-gray-50 px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Audit Trail</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  Uploaded by <strong>{receipt.uploaded_by === 'matt' ? 'Matt' : 'Jade'}</strong> on {fmtDate(receipt.created_at)}
                </p>
                {receipt.updated_at !== receipt.created_at && (
                  <p className="text-xs text-gray-500">Last updated {fmtDate(receipt.updated_at)}</p>
                )}
                {receipt.status !== 'unreviewed' && (
                  <p className="text-xs text-gray-500">
                    Status: <strong>{STATUS_STYLES[receipt.status].label}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Export modal ─────────────────────────────────────────────────────────────

function ExportModal({ receipts, onClose }: { receipts: Receipt[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(receipts.map(r => r.id)))
  const [from,     setFrom]     = useState('')
  const [to,       setTo]       = useState('')
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState(false)

  const visible = useMemo(() => {
    if (!from && !to) return receipts
    return receipts.filter(r => {
      if (!r.purchase_date) return true
      if (from && r.purchase_date < from) return false
      if (to   && r.purchase_date > to)   return false
      return true
    })
  }, [receipts, from, to])

  const selectedList = visible.filter(r => selected.has(r.id))

  function toggleAll() {
    if (selectedList.length === visible.length) setSelected(new Set())
    else setSelected(new Set(visible.map(r => r.id)))
  }

  function exportCSV() {
    const headers = ['Merchant', 'Date', 'Amount', 'GST', 'Category', 'Payment Method', 'Status', 'Reimbursable', 'Uploaded By', 'Description']
    const rows = selectedList.map(r => [
      r.merchant_name ?? '',
      r.purchase_date ?? '',
      r.amount ?? '',
      r.gst_amount ?? '',
      r.category ?? '',
      r.payment_method ?? '',
      r.status,
      r.is_reimbursable ? 'Yes' : 'No',
      r.uploaded_by === 'matt' ? 'Matt' : 'Jade',
      (r.description ?? '').replace(/,/g, ';'),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `formula14-receipts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPrint() {
    const w = window.open('', '_blank')
    if (!w) return
    const rows = selectedList.map(r => `
      <tr>
        <td>${r.merchant_name ?? '—'}</td>
        <td>${r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('en-AU') : '—'}</td>
        <td style="text-align:right">${r.amount != null ? '$' + r.amount.toFixed(2) : '—'}</td>
        <td style="text-align:right">${r.gst_amount != null ? '$' + r.gst_amount.toFixed(2) : '—'}</td>
        <td>${r.category ?? 'Uncategorised'}</td>
        <td>${r.payment_method ?? '—'}</td>
        <td>${r.status}</td>
        <td>${r.uploaded_by === 'matt' ? 'Matt' : 'Jade'}</td>
      </tr>`).join('')
    const total = selectedList.reduce((s, r) => s + (r.amount ?? 0), 0)
    const totalGst = selectedList.reduce((s, r) => s + (r.gst_amount ?? 0), 0)
    w.document.write(`<!DOCTYPE html><html><head><title>Formula14 Expense Report</title>
      <style>body{font-family:sans-serif;padding:32px;color:#111}
        h1{font-size:20px;margin-bottom:4px}p.sub{color:#666;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#1a1a1a;color:#fff;padding:8px 10px;text-align:left}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#f9fafb}
        .total{margin-top:16px;font-size:14px;font-weight:600}
      </style></head><body>
      <h1>Formula14 Expense Report</h1>
      <p class="sub">Generated ${new Date().toLocaleDateString('en-AU')} · ${selectedList.length} receipts</p>
      <table><thead><tr><th>Merchant</th><th>Date</th><th>Amount</th><th>GST</th>
        <th>Category</th><th>Payment</th><th>Status</th><th>By</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="total">Total: $${total.toFixed(2)} (GST: $${totalGst.toFixed(2)})</p>
      </body></html>`)
    w.document.close()
    w.print()
  }

  async function emailAccountant() {
    setSending(true)
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'finance-summary',
          to: 'accounts@formula14.com.au',
          data: {
            recipientName: 'Accountant',
            period: `${from || 'All time'} to ${to || 'today'}`,
            includes: ['Receipt list', 'Category totals', 'GST summary'],
            notes: `${selectedList.length} receipts, total $${selectedList.reduce((s, r) => s + (r.amount ?? 0), 0).toFixed(2)}`,
            generatedAt: new Date().toLocaleString('en-AU'),
          },
          test: false,
        }),
      })
      setSent(true)
    } catch { /* ignore */ }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Export Expense Report</h2>
            <p className="text-xs text-gray-400">{selectedList.length} receipts selected · Total {fmt$(selectedList.reduce((s, r) => s + (r.amount ?? 0), 0))}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <IconX size={18} />
          </button>
        </div>

        {/* Date range */}
        <div className="shrink-0 border-b border-gray-50 bg-gray-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Date range:</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]" />
            <button onClick={toggleAll} className="ml-auto text-xs font-semibold" style={{ color: ACCENT }}>
              {selectedList.length === visible.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>

        {/* Receipt list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {visible.map(r => (
            <label key={r.id} className="flex cursor-pointer items-center gap-3 px-6 py-3 hover:bg-gray-50">
              <span onClick={() => setSelected(prev => {
                const next = new Set(prev)
                next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                return next
              })} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${selected.has(r.id) ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}>
                {selected.has(r.id) && <IconCheck size={9} className="text-white" />}
              </span>
              <Thumbnail receipt={r} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{r.merchant_name ?? 'Receipt'}</p>
                <p className="text-xs text-gray-400">{fmtDate(r.purchase_date)} · <CatBadge category={r.category} /></p>
              </div>
              <p className="shrink-0 text-sm font-bold text-gray-900">{fmt$(r.amount)}</p>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportCSV} disabled={!selectedList.length}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              <IconDownload size={14} /> Export CSV
            </button>
            <button onClick={exportPrint} disabled={!selectedList.length}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              <IconPrinter size={14} /> Export PDF
            </button>
            <button onClick={emailAccountant} disabled={!selectedList.length || sending}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}>
              {sending ? <IconRefresh size={14} className="animate-spin" /> : sent ? <IconCheck size={14} /> : <IconMail size={14} />}
              {sending ? 'Sending…' : sent ? 'Sent!' : 'Email Accountant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

function ReceiptMenu({
  receipt, onView, onEdit, onExport, onDelete,
}: {
  receipt:  Receipt
  onView:   () => void
  onEdit:   () => void
  onExport: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const items = [
    { icon: <IconEye size={13} />,      label: 'View',   fn: onView   },
    { icon: <IconPencil size={13} />,   label: 'Edit',   fn: onEdit   },
    { icon: <IconDownload size={13} />, label: 'Export', fn: onExport },
    { icon: <IconTrash size={13} />,    label: 'Delete', fn: onDelete, danger: true },
  ]

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <IconDotsVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {items.map(it => (
            <button key={it.label} onClick={() => { it.fn(); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 ${it.danger ? 'text-red-500' : 'text-gray-700'}`}>
              {it.icon} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, alert, icon, color,
}: {
  label: string; value: string | number; sub?: string; alert?: boolean
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="flex flex-1 items-center gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + '18' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl font-black text-gray-900">{value}</p>
          {alert && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">!</span>}
        </div>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main ReceiptsTab ─────────────────────────────────────────────────────────

export function ReceiptsTab() {
  const [receipts,     setReceipts]     = useState<Receipt[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBy,     setFilterBy]     = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [sort,         setSort]         = useState<'date' | 'amount' | 'merchant'>('date')
  const [showUpload,   setShowUpload]   = useState(false)
  const [showScan,     setShowScan]     = useState(false)
  const [showManual,   setShowManual]   = useState(false)
  const [showExport,   setShowExport]   = useState(false)
  const [viewing,      setViewing]      = useState<Receipt | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })
    setReceipts((data ?? []) as Receipt[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Stats
  const monthStr = thisMonth()
  const thisMonthReceipts = receipts.filter(r => (r.purchase_date ?? r.created_at).startsWith(monthStr))
  const totalValue     = thisMonthReceipts.reduce((s, r) => s + (r.amount ?? 0), 0)
  const unreviewed     = receipts.filter(r => r.status === 'unreviewed').length
  const needsCat       = receipts.filter(r => !r.category).length

  // Filtering + sorting
  const filtered = useMemo(() => {
    let list = receipts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.merchant_name ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        String(r.amount ?? '').includes(q)
      )
    }
    if (filterCat)    list = list.filter(r => r.category === filterCat)
    if (filterStatus) list = list.filter(r => r.status === filterStatus)
    if (filterBy)     list = list.filter(r => r.uploaded_by === filterBy)
    if (filterFrom)   list = list.filter(r => (r.purchase_date ?? '') >= filterFrom)
    if (filterTo)     list = list.filter(r => (r.purchase_date ?? '') <= filterTo)
    list = [...list].sort((a, b) => {
      if (sort === 'amount')   return (b.amount ?? 0) - (a.amount ?? 0)
      if (sort === 'merchant') return (a.merchant_name ?? '').localeCompare(b.merchant_name ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return list
  }, [receipts, search, filterCat, filterStatus, filterBy, filterFrom, filterTo, sort])

  function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setShowScan(false)
    setShowUpload(true)
  }

  async function handleDeleteFromList(id: string) {
    if (!window.confirm('Delete this receipt?')) return
    const r = receipts.find(x => x.id === id)
    if (r?.image_url) {
      const path = r.image_url.split('/receipts/')[1]
      if (path) await supabase.storage.from('receipts').remove([path])
    }
    await supabase.from('receipts').delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-5">
      {/* Scan input (hidden) */}
      <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={handleScan} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Receipts</h1>
          <p className="text-sm text-gray-400">Capture and manage all Formula14 expenses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => scanInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <IconCamera size={15} /> Scan Receipt
          </button>
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            <IconPlus size={15} /> Add Manual
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: ACCENT }}>
            <IconUpload size={15} /> Upload Receipt
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Receipts this month" value={thisMonthReceipts.length}
          icon={<IconReceipt2 size={20} style={{ color: ACCENT }} />} color={ACCENT}
          sub={`${receipts.length} total`} />
        <StatCard label="Spend this month" value={fmt$(totalValue)}
          icon={<IconCurrencyDollar size={20} className="text-emerald-500" />} color="#10B981" />
        <StatCard label="Unreviewed" value={unreviewed} alert={unreviewed > 0}
          icon={<IconEye size={20} className="text-amber-500" />} color="#F59E0B"
          sub="Needs attention" />
        <StatCard label="Uncategorised" value={needsCat} alert={needsCat > 0}
          icon={<IconTag size={20} className="text-purple-500" />} color="#7C3AED"
          sub="Pending category" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, description, amount…"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-700 outline-none focus:border-[#6BA3D6]"
          />
        </div>
        <Select value={filterCat} onChange={setFilterCat} placeholder="All Categories">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={filterStatus} onChange={setFilterStatus} placeholder="All Statuses">
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="exported">Exported</option>
        </Select>
        <Select value={filterBy} onChange={setFilterBy} placeholder="All Users">
          {UPLOADERS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
        <div className="flex items-center gap-1">
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]" />
          <span className="text-xs text-gray-300">–</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]" />
        </div>
        <Select value={sort} onChange={v => setSort(v as typeof sort)} placeholder="">
          <option value="date">Newest first</option>
          <option value="amount">Highest amount</option>
          <option value="merchant">Merchant A–Z</option>
        </Select>
        {(search || filterCat || filterStatus || filterBy || filterFrom || filterTo) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterStatus(''); setFilterBy(''); setFilterFrom(''); setFilterTo('') }}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600">
            <IconX size={12} /> Clear
          </button>
        )}
        <button onClick={() => setShowExport(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <IconDownload size={13} /> Export
        </button>
      </div>

      {/* Receipts list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
          <IconReceipt2 size={40} className="mb-3 text-gray-200" />
          <p className="text-sm font-semibold text-gray-400">
            {receipts.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}
          </p>
          {receipts.length === 0 && (
            <button onClick={() => setShowUpload(true)}
              className="mt-4 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: ACCENT }}>
              <IconUpload size={14} /> Upload your first receipt
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="divide-y divide-gray-50">
            {filtered.map(r => (
              <div key={r.id}
                className="group flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                onClick={() => setViewing(r)}
              >
                <Thumbnail receipt={r} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{r.merchant_name ?? <span className="text-gray-400">No merchant</span>}</p>
                    <CatBadge category={r.category} />
                    {r.file_type === 'manual' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">No receipt</span>
                    )}
                    {r.is_reimbursable && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Reimbursable</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><IconCalendar size={11} />{fmtDate(r.purchase_date)}</span>
                    <span className="flex items-center gap-1"><IconUser size={11} />{r.uploaded_by === 'matt' ? 'Matt' : 'Jade'}</span>
                    {r.payment_method && <span>{r.payment_method}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-base font-black text-gray-900">{fmt$(r.amount)}</p>
                  <StatusBadge status={r.status} />
                  <div onClick={e => e.stopPropagation()}>
                    <ReceiptMenu
                      receipt={r}
                      onView={() => setViewing(r)}
                      onEdit={() => setViewing(r)}
                      onExport={() => setShowExport(true)}
                      onDelete={() => handleDeleteFromList(r.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-50 bg-gray-50 px-5 py-3 text-right text-xs font-semibold text-gray-400">
            {filtered.length} receipt{filtered.length !== 1 ? 's' : ''} · Total {fmt$(filtered.reduce((s, r) => s + (r.amount ?? 0), 0))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSaved={load} />}
      {showManual && <ManualExpenseModal onClose={() => setShowManual(false)} onSaved={load} />}
      {showExport && <ExportModal receipts={filtered} onClose={() => setShowExport(false)} />}
      {viewing && (
        <ReceiptDetailModal
          receipt={viewing}
          onClose={() => setViewing(null)}
          onSaved={() => { load(); setViewing(null) }}
          onDeleted={() => { load(); setViewing(null) }}
        />
      )}
    </div>
  )
}
