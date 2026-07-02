'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconPlus, IconSearch, IconX, IconTrash, IconCheck, IconUser,
  IconForms, IconClipboard, IconFileText, IconStar, IconAlertTriangle,
  IconHeartbeat, IconChartBar, IconLink, IconPencil, IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'esignature' | 'heading' | 'paragraph'

interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
  content?: string
}

type FormCategory = 'intake' | 'waiver' | 'feedback' | 'assessment' | 'incident' | 'health' | 'custom'
type FormStatus = 'active' | 'draft' | 'archived'

interface AppForm {
  id: string
  name: string
  description: string
  category: FormCategory
  status: FormStatus
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

interface Submission {
  id: string
  formId: string
  submittedAt: string
  submittedBy: string
  data: Record<string, string | string[]>
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

type CatConfig = {
  label: string; color: string; bg: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}

const CATEGORY_CONFIG: Record<FormCategory, CatConfig> = {
  intake:     { label: 'Intake',      color: '#1d4ed8', bg: '#dbeafe', Icon: IconClipboard },
  waiver:     { label: 'Waiver',      color: '#6d28d9', bg: '#ede9fe', Icon: IconFileText },
  feedback:   { label: 'Feedback',    color: '#15803d', bg: '#dcfce7', Icon: IconStar },
  assessment: { label: 'Assessment',  color: '#b45309', bg: '#fef3c7', Icon: IconChartBar },
  incident:   { label: 'Incident',    color: '#b91c1c', bg: '#fee2e2', Icon: IconAlertTriangle },
  health:     { label: 'Health',      color: '#0f766e', bg: '#ccfbf1', Icon: IconHeartbeat },
  custom:     { label: 'Custom',      color: '#374151', bg: '#f3f4f6', Icon: IconForms },
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text Field', textarea: 'Long Text', select: 'Dropdown',
  radio: 'Multiple Choice', checkbox: 'Checkboxes', date: 'Date',
  esignature: 'E-Signature', heading: 'Section Heading', paragraph: 'Paragraph',
}

const BUILDER_TYPES: FieldType[] = ['text','textarea','select','radio','checkbox','date','esignature','heading','paragraph']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function blankField(type: FieldType): FormField {
  const f: FormField = { id: uid(), type, label: FIELD_TYPE_LABELS[type], required: false }
  if (type === 'select' || type === 'radio' || type === 'checkbox') f.options = ['Option 1', 'Option 2']
  if (type === 'esignature') f.placeholder = 'Type your full name as your electronic signature'
  return f
}

const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

// ─── Badges ───────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: FormCategory }) {
  const c = CATEGORY_CONFIG[category]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.color }}>
      <c.Icon size={10} />
      {c.label}
    </span>
  )
}

function StatusBadge({ status }: { status: FormStatus }) {
  const s = { active: { bg:'#dcfce7', color:'#15803d', label:'Active' }, draft: { bg:'#fef3c7', color:'#b45309', label:'Draft' }, archived: { bg:'#f3f4f6', color:'#6b7280', label:'Archived' } }[status]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}

// ─── Field Preview (read-only) ────────────────────────────────────────────────

function FieldPreview({ field }: { field: FormField }) {
  if (field.type === 'heading') return (
    <div className="pt-3 pb-1">
      <h3 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">{field.label}</h3>
    </div>
  )
  if (field.type === 'paragraph') return (
    <p className="py-1 text-sm leading-relaxed text-gray-500">{field.content}</p>
  )
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}{field.required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {(field.type === 'text' || field.type === 'esignature') && (
        <div className="h-9 rounded-lg border border-gray-200 bg-gray-50" />
      )}
      {field.type === 'textarea' && <div className="h-20 rounded-lg border border-gray-200 bg-gray-50" />}
      {field.type === 'date' && <div className="h-9 w-44 rounded-lg border border-gray-200 bg-gray-50" />}
      {field.type === 'select' && (
        <div className="flex h-9 items-center rounded-lg border border-gray-200 bg-gray-50 px-3">
          <span className="text-sm text-gray-400">Select…</span>
        </div>
      )}
      {field.type === 'radio' && (
        <div className="flex flex-wrap gap-3">
          {field.options?.map(o => (
            <div key={o} className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full border-2 border-gray-200" />
              <span className="text-sm text-gray-500">{o}</span>
            </div>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="flex flex-col gap-1.5">
          {field.options?.map(o => (
            <div key={o} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-gray-200" />
              <span className="text-sm text-gray-500">{o}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Field Input (interactive / fill mode) ────────────────────────────────────

function FieldInput({ field, value, onChange }: {
  field: FormField
  value: string | string[]
  onChange: (v: string | string[]) => void
}) {
  if (field.type === 'heading') return (
    <div className="pt-3 pb-1">
      <h3 className="border-b border-gray-100 pb-2 text-sm font-bold text-gray-900">{field.label}</h3>
    </div>
  )
  if (field.type === 'paragraph') return (
    <p className="py-1 text-sm leading-relaxed text-gray-500">{field.content}</p>
  )

  const str = typeof value === 'string' ? value : ''
  const arr = Array.isArray(value) ? value : []

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}{field.required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {field.type === 'text' && (
        <input type="text" value={str} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder} className={INPUT} />
      )}
      {field.type === 'esignature' && (
        <div>
          <input type="text" value={str} onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder} className={INPUT + ' font-mono italic'} />
          <p className="mt-1 text-xs text-gray-400">Typing your name constitutes a legally binding electronic signature.</p>
        </div>
      )}
      {field.type === 'textarea' && (
        <textarea rows={3} value={str} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder} className={INPUT + ' resize-none'} />
      )}
      {field.type === 'date' && (
        <input type="date" value={str} onChange={e => onChange(e.target.value)} className={INPUT + ' max-w-xs'} />
      )}
      {field.type === 'select' && (
        <div className="relative">
          <select value={str} onChange={e => onChange(e.target.value)} className={INPUT + ' appearance-none pr-8'}>
            <option value="">Select…</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      )}
      {field.type === 'radio' && (
        <div className="flex flex-wrap gap-4">
          {field.options?.map(o => (
            <label key={o} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={field.id} value={o} checked={str === o}
                onChange={() => onChange(o)} className="accent-[#6BA3D6]" />
              <span className="text-sm text-gray-700">{o}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="flex flex-col gap-2">
          {field.options?.map(o => (
            <label key={o} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={arr.includes(o)}
                onChange={() => onChange(arr.includes(o) ? arr.filter(v => v !== o) : [...arr, o])}
                className="accent-[#6BA3D6]" />
              <span className="text-sm text-gray-700">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Fill Modal ───────────────────────────────────────────────────────────────

function FillModal({ form, onClose, onSubmit }: {
  form: AppForm
  onClose: () => void
  onSubmit: (s: Submission) => void
}) {
  const [submitterName, setSubmitterName] = useState('')
  const [vals, setVals] = useState<Record<string, string | string[]>>({})
  const [done, setDone] = useState(false)

  function setVal(id: string, v: string | string[]) { setVals(p => ({ ...p, [id]: v })) }
  function getVal(id: string, type: FieldType) { return type === 'checkbox' ? (vals[id] ?? []) : (vals[id] ?? '') }

  function submit() {
    onSubmit({ id: uid(), formId: form.id, submittedAt: new Date().toISOString(),
      submittedBy: submitterName.trim() || 'Anonymous', data: vals })
    setDone(true)
  }

  const cat = CATEGORY_CONFIG[form.category]

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor:'#dcfce7' }}>
          <IconCheck size={28} style={{ color:'#15803d' }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Form Submitted</h2>
        <p className="mt-2 text-sm text-gray-500">Response recorded successfully.</p>
        <button onClick={onClose} className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}>Close</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="mx-auto my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: cat.bg }}>
              <cat.Icon size={18} style={{ color: cat.color }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{form.name}</h2>
              <p className="text-xs text-gray-400">{form.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-xl bg-blue-50 p-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-600">Submitted by</label>
            <input type="text" value={submitterName} onChange={e => setSubmitterName(e.target.value)}
              placeholder="Enter your name…"
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          {form.fields.map(field => (
            <FieldInput key={field.id} field={field}
              value={getVal(field.id, field.type)}
              onChange={v => setVal(field.id, v)} />
          ))}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100 bg-white px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            Submit Form
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Form Modal (builder) ─────────────────────────────────────────────────

function NewFormModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (form: AppForm) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<FormCategory>('custom')
  const [fields, setFields] = useState<FormField[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  function addField(type: FieldType) {
    const f = blankField(type)
    setFields(p => [...p, f])
    setShowPicker(false)
    setExpanded(f.id)
  }
  function updateField(id: string, patch: Partial<FormField>) {
    setFields(p => p.map(f => f.id === id ? { ...f, ...patch } : f))
  }
  function removeField(id: string) {
    setFields(p => p.filter(f => f.id !== id))
    if (expanded === id) setExpanded(null)
  }
  function moveField(id: string, dir: -1 | 1) {
    setFields(p => {
      const i = p.findIndex(f => f.id === id)
      if (i < 0) return p
      const next = [...p]
      const j = i + dir
      if (j < 0 || j >= next.length) return p
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function save(status: FormStatus) {
    const now = new Date().toISOString().split('T')[0]
    onSave({ id: uid(), name: name.trim(), description: description.trim(), category, status, fields, createdAt: now, updatedAt: now })
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="ml-auto flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">New Form</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Metadata */}
          <div className="mb-5 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className={LABEL}>Form Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Parent Consent Form" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Description</label>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brief description…" className={INPUT + ' resize-none'} />
            </div>
            <div>
              <label className={LABEL}>Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value as FormCategory)}
                  className={INPUT + ' appearance-none pr-8'}>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="mb-3 flex items-center justify-between">
            <span className={LABEL}>Form Fields</span>
            <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
          </div>

          {fields.length === 0 && (
            <div className="mb-3 rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              No fields yet — add your first field below
            </div>
          )}

          <div className="space-y-2 mb-3">
            {fields.map((field, i) => (
              <div key={field.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <div className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
                  onClick={() => setExpanded(expanded === field.id ? null : field.id)}>
                  <div className="flex flex-col">
                    <button onClick={e => { e.stopPropagation(); moveField(field.id, -1) }} disabled={i === 0}
                      className="rounded p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <IconChevronRight size={11} style={{ transform:'rotate(-90deg)' }} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveField(field.id, 1) }} disabled={i === fields.length - 1}
                      className="rounded p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <IconChevronRight size={11} style={{ transform:'rotate(90deg)' }} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">{field.label || FIELD_TYPE_LABELS[field.type]}</span>
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        {FIELD_TYPE_LABELS[field.type]}
                      </span>
                      {field.required && <span className="text-red-400 text-xs shrink-0">*</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeField(field.id) }}
                    className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400">
                    <IconTrash size={13} />
                  </button>
                  <IconChevronDown size={13} className="shrink-0 text-gray-300 transition-transform"
                    style={{ transform: expanded === field.id ? 'rotate(180deg)' : undefined }} />
                </div>

                {expanded === field.id && (
                  <div className="border-t border-gray-50 px-4 py-4 space-y-3">
                    {field.type !== 'paragraph' && (
                      <div>
                        <label className={LABEL}>{field.type === 'heading' ? 'Heading Text' : 'Label'}</label>
                        <input type="text" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className={INPUT} />
                      </div>
                    )}
                    {field.type === 'paragraph' && (
                      <div>
                        <label className={LABEL}>Paragraph Text</label>
                        <textarea rows={3} value={field.content ?? ''} onChange={e => updateField(field.id, { content: e.target.value })} className={INPUT + ' resize-none'} />
                      </div>
                    )}
                    {['text','textarea','esignature'].includes(field.type) && (
                      <div>
                        <label className={LABEL}>Placeholder</label>
                        <input type="text" value={field.placeholder ?? ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} className={INPUT} />
                      </div>
                    )}
                    {['select','radio','checkbox'].includes(field.type) && (
                      <div>
                        <label className={LABEL}>Options (one per line)</label>
                        <textarea rows={4} value={(field.options ?? []).join('\n')}
                          onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                          className={INPUT + ' resize-none font-mono text-xs'} />
                      </div>
                    )}
                    {!['heading','paragraph'].includes(field.type) && (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={field.required ?? false}
                          onChange={e => updateField(field.id, { required: e.target.checked })} className="accent-[#6BA3D6]" />
                        <span className="text-sm text-gray-700">Required field</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showPicker ? (
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className={LABEL + ' mb-2'}>Choose field type</p>
              <div className="grid grid-cols-3 gap-1.5">
                {BUILDER_TYPES.map(type => (
                  <button key={type} onClick={() => addField(type)}
                    className="rounded-lg border border-gray-100 px-2 py-2 text-left text-xs font-medium text-gray-700 transition hover:border-[#6BA3D6] hover:bg-blue-50 hover:text-[#6BA3D6]">
                    {FIELD_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPicker(false)} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-400 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
              <IconPlus size={15} />
              Add Field
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => save('draft')} disabled={!name.trim()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            Save Draft
          </button>
          <button onClick={() => save('active')} disabled={!name.trim()}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}>
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type DetailTab = 'submissions' | 'preview' | 'settings'

function DetailPanel({ form, submissions, onClose, onFill, onStatusChange, onDelete }: {
  form: AppForm
  submissions: Submission[]
  onClose: () => void
  onFill: () => void
  onStatusChange: (s: FormStatus) => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('submissions')
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const cat = CATEGORY_CONFIG[form.category]

  const formSubs = submissions.filter(s => s.formId === form.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  function copyLink() { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }

  const fieldMap: Record<string, FormField> = {}
  form.fields.forEach(f => { fieldMap[f.id] = f })
  const inputFields = form.fields.filter(f => !['heading','paragraph'].includes(f.type))

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 p-5">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: cat.bg }}>
                <cat.Icon size={20} style={{ color: cat.color }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 leading-snug">{form.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <CategoryBadge category={form.category} />
                  <StatusBadge status={form.status} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
          </div>

          {form.description && <p className="mb-3 text-sm leading-relaxed text-gray-500">{form.description}</p>}

          <div className="flex gap-2">
            <button onClick={onFill} disabled={form.status !== 'active'}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}>
              <IconPencil size={14} />
              Fill Form
            </button>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
              {linkCopied ? <IconCheck size={14} style={{ color:'#15803d' }} /> : <IconLink size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {(['submissions','preview','settings'] as DetailTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition"
                style={tab === t
                  ? { backgroundColor:'white', color:'#111827', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }
                  : { color:'#6b7280' }}>
                {t === 'submissions' ? `Submissions (${formSubs.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {tab === 'submissions' && (
            <div className="p-4">
              {formSubs.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <IconForms size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">No submissions yet</p>
                  {form.status === 'active' && (
                    <button onClick={onFill} className="mt-3 text-sm font-semibold" style={{ color: ACCENT }}>
                      Fill this form →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {formSubs.map(sub => {
                    const open = expandedSub === sub.id
                    return (
                      <div key={sub.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                        <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                          onClick={() => setExpandedSub(open ? null : sub.id)}>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: cat.bg }}>
                            <IconUser size={14} style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-semibold text-gray-900">{sub.submittedBy}</div>
                            <div className="text-xs text-gray-400">{fmtDateTime(sub.submittedAt)}</div>
                          </div>
                          <IconChevronDown size={14} className="shrink-0 text-gray-300 transition-transform"
                            style={{ transform: open ? 'rotate(180deg)' : undefined }} />
                        </button>
                        {open && (
                          <div className="space-y-3 border-t border-gray-50 px-4 py-4">
                            {inputFields.map(field => {
                              const val = sub.data[field.id]
                              if (!val || (Array.isArray(val) && val.length === 0)) return null
                              return (
                                <div key={field.id}>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{field.label}</div>
                                  <div className="mt-0.5 text-sm text-gray-700">
                                    {Array.isArray(val) ? val.join(', ') : val}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'preview' && (
            <div className="space-y-4 p-4">
              {form.fields.length === 0
                ? <p className="py-8 text-center text-sm text-gray-400">This form has no fields yet.</p>
                : form.fields.map(f => <FieldPreview key={f.id} field={f} />)}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-4 p-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Form Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Category', CATEGORY_CONFIG[form.category].label],
                    ['Created', fmtDate(form.createdAt)],
                    ['Last Updated', fmtDate(form.updatedAt)],
                    ['Input Fields', `${inputFields.length} fields`],
                    ['Submissions', `${formSubs.length} total`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="mt-0.5 font-medium text-gray-700">{v}</div>
                    </div>
                  ))}
                  <div>
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="mt-0.5"><StatusBadge status={form.status} /></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Change Status</p>
                <div className="space-y-1.5">
                  {(['active','draft','archived'] as FormStatus[]).map(s => (
                    <button key={s} onClick={() => onStatusChange(s)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-gray-50"
                      style={form.status === s ? { backgroundColor:'#f3f4f6' } : {}}>
                      <StatusBadge status={s} />
                      {form.status === s && <span className="ml-auto text-xs text-gray-400">Current</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-red-100 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-red-400">Danger Zone</p>
                <button onClick={onDelete}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50">
                  <IconTrash size={15} />
                  Delete Form
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({ form, submissionCount, onClick, onFill }: {
  form: AppForm
  submissionCount: number
  onClick: () => void
  onFill: (e: React.MouseEvent) => void
}) {
  const cat = CATEGORY_CONFIG[form.category]
  const inputFieldCount = form.fields.filter(f => !['heading','paragraph'].includes(f.type)).length

  return (
    <div onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: cat.bg }}>
          <cat.Icon size={20} style={{ color: cat.color }} />
        </div>
        <StatusBadge status={form.status} />
      </div>

      <h3 className="text-sm font-bold leading-snug text-gray-900">{form.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{form.description}</p>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <IconForms size={12} />
          {inputFieldCount} field{inputFieldCount !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1">
          <IconUser size={12} />
          {submissionCount} submission{submissionCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
        <CategoryBadge category={form.category} />
        <button onClick={onFill} disabled={form.status !== 'active'}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-30"
          style={{ backgroundColor: ACCENT }}>
          Fill
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CAT_PILLS = [
  { value: 'all', label: 'All' },
  ...Object.entries(CATEGORY_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
]

export default function FormsPage() {
  const [forms, setForms] = useState<AppForm[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selected, setSelected] = useState<AppForm | null>(null)
  const [fillTarget, setFillTarget] = useState<AppForm | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Load forms from Supabase on mount
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false })
        if (data) setForms(data.map(r => ({
          id: r.id as string,
          name: (r.title as string) ?? '',
          description: '',
          category: ((r.folder as string) ?? 'custom') as FormCategory,
          status: 'active' as FormStatus,
          fields: Array.isArray(r.fields) ? r.fields as FormField[] : [],
          createdAt: (r.created_at as string) ?? '',
          updatedAt: (r.updated_at as string) ?? '',
        })))
      } catch (e) { console.error('[forms] load failed:', e) }
    })()
  }, [])

  const filtered = useMemo(() =>
    forms.filter(f => {
      if (catFilter !== 'all' && f.category !== catFilter) return false
      if (statusFilter !== 'all' && f.status !== statusFilter) return false
      if (search && !`${f.name} ${f.description}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }),
    [forms, catFilter, statusFilter, search],
  )

  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    submissions.forEach(s => { c[s.formId] = (c[s.formId] ?? 0) + 1 })
    return c
  }, [submissions])

  const activeCount  = forms.filter(f => f.status === 'active').length
  const draftCount   = forms.filter(f => f.status === 'draft').length
  const totalSubs    = submissions.length
  const monthSubs    = submissions.filter(s => s.submittedAt.startsWith('2026-06')).length

  async function loadResponses(formId: string) {
    try {
      const { data } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })
      if (data) {
        const mapped: Submission[] = data.map(r => {
          const resp = ((r.responses ?? {}) as Record<string, string | string[]>)
          const submittedBy = typeof (resp as Record<string, unknown>)._by === 'string'
            ? (resp as Record<string, unknown>)._by as string
            : 'Anonymous'
          const { _by: _b, ...formData } = resp as { _by?: string } & Record<string, string | string[]>
          void _b
          return {
            id: r.id as string,
            formId: r.form_id as string,
            submittedAt: r.submitted_at as string,
            submittedBy,
            data: formData,
          }
        })
        setSubmissions(prev => {
          const filtered = prev.filter(s => s.formId !== formId)
          return [...filtered, ...mapped]
        })
      }
    } catch (e) { console.error('[forms] load responses failed:', e) }
  }

  function selectForm(form: AppForm | null) {
    setSelected(form)
    if (form) void loadResponses(form.id)
  }

  async function addSubmission(s: Submission) {
    setSubmissions(p => [...p, s])
    setFillTarget(null)
    try {
      const responses: Record<string, unknown> = { ...s.data, _by: s.submittedBy }
      await supabase.from('form_responses').insert({ form_id: s.formId, responses })
    } catch (e) { console.error('[forms] submit failed:', e) }
  }

  async function addForm(form: AppForm) {
    try {
      const { data, error } = await supabase
        .from('forms')
        .insert({ title: form.name, folder: form.category, fields: form.fields })
        .select()
        .single()
      if (error) throw error
      const saved: AppForm = { ...form, id: data.id as string }
      setForms(p => [...p, saved])
      setShowNew(false)
      setSelected(saved)
    } catch (e) { console.error('[forms] create failed:', e) }
  }

  function updateStatus(id: string, status: FormStatus) {
    setForms(p => p.map(f => f.id === id ? { ...f, status } : f))
    setSelected(p => p?.id === id ? { ...p, status } : p)
  }

  async function deleteForm(id: string) {
    try {
      await supabase.from('forms').delete().eq('id', id)
      setForms(p => p.filter(f => f.id !== id))
      setSelected(null)
    } catch (e) { console.error('[forms] delete failed:', e) }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Forms</h1>
            <p className="text-sm text-gray-500">Intake forms, waivers, assessments, and more</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            <IconPlus size={16} />
            New Form
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Forms',        value: forms.length, sub: `${activeCount} active` },
            { label: 'Draft Forms',        value: draftCount,   sub: 'Not yet published' },
            { label: 'Total Submissions',  value: totalSubs,    sub: 'All time' },
            { label: 'This Month',         value: monthSubs,    sub: 'Jun 2026' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="mt-0.5 text-xs text-gray-400">{sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" style={{ minWidth: 180, maxWidth: 260, flex: '0 1 220px' }}>
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search forms…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6BA3D6]" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CAT_PILLS.map(({ value, label }) => {
              const active = catFilter === value
              const cfg = value !== 'all' ? CATEGORY_CONFIG[value as FormCategory] : null
              return (
                <button key={value} onClick={() => setCatFilter(value)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                  style={active
                    ? { backgroundColor: cfg?.color ?? '#1f2937', color: 'white' }
                    : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex gap-1.5">
            {['all','active','draft','archived'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition"
                style={statusFilter === s
                  ? { backgroundColor: '#1f2937', color: 'white' }
                  : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                {s === 'all' ? 'All status' : s}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-400">{filtered.length} form{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-semibold text-gray-400">No forms yet</p>
            <p className="mt-1 text-xs text-gray-400">Click &apos;New Form&apos; to create your first form</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
            <p className="text-sm text-gray-400">No forms match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(form => (
              <FormCard key={form.id} form={form}
                submissionCount={subCounts[form.id] ?? 0}
                onClick={() => selectForm(selected?.id === form.id ? null : form)}
                onFill={e => { e.stopPropagation(); setFillTarget(form) }} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DetailPanel form={selected} submissions={submissions}
          onClose={() => selectForm(null)}
          onFill={() => setFillTarget(selected)}
          onStatusChange={s => updateStatus(selected.id, s)}
          onDelete={() => { void deleteForm(selected.id) }} />
      )}

      {fillTarget && (
        <FillModal form={fillTarget} onClose={() => setFillTarget(null)} onSubmit={addSubmission} />
      )}

      {showNew && (
        <NewFormModal onClose={() => setShowNew(false)} onSave={addForm} />
      )}
    </div>
  )
}
