'use client'

import { useState } from 'react'
import {
  IconPlus, IconX, IconMail, IconPhone,
  IconEye, IconEyeOff, IconUpload, IconAlertTriangle,
  IconBriefcase, IconCurrencyDollar, IconCheck,
} from '@tabler/icons-react'
import { DatePicker, SelectPicker } from '@/components/ui/Pickers'
import {
  StaffMember, StaffDocument, EmploymentType, PayRateType, DocType,
  ACCENT, INPUT, LABEL,
  EMPLOYMENT_LABELS, STATUS_COLORS, DOC_TYPE_LABELS, DOC_STATUS_COLORS,
  uid, initials, avatarColor, maskSensitive, fmtDate, fmtDateShort, fmtMoney,
  getStaffSessions, loadPayRuns,
} from './_shared'

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ member, onClick }: { member: StaffMember; onClick: () => void }) {
  const color = avatarColor(`${member.firstName} ${member.lastName}`)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-[#6BA3D6]/30 text-left"
    >
      <div className="flex w-full items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initials(member.firstName, member.lastName)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900">{member.firstName} {member.lastName}</div>
          <div className="text-sm text-gray-500">{member.role}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: '#f0f9ff', color: ACCENT }}>
              {EMPLOYMENT_LABELS[member.employmentType]}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: STATUS_COLORS[member.status] }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[member.status] }} />
              {member.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1.5 border-t border-gray-50 pt-3 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <IconMail size={13} className="shrink-0 text-gray-400" />
          <span className="truncate">{member.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <IconPhone size={13} className="shrink-0 text-gray-400" />
          <span>{member.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <IconCurrencyDollar size={13} className="shrink-0 text-gray-400" />
          <span>
            {fmtMoney(member.payRate)}/{member.payRateType === 'hourly' ? 'hr' : 'session'}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Add Staff Modal ───────────────────────────────────────────────────────────

const ROLE_SUGGESTIONS = ['Head Coach', 'Assistant Coach', 'Casual Coach', 'Admin', 'Physiotherapist', 'Strength & Conditioning Coach', 'Other']

const EMPTY_STAFF: Omit<StaffMember, 'id' | 'documents'> = {
  firstName: '', lastName: '', role: '', employmentType: 'casual', status: 'active',
  email: '', phone: '', startDate: '2026-06-24',
  payRate: 0, payRateType: 'per-session',
  bsb: '', accountNumber: '', tfn: '',
  emergencyContactName: '', emergencyContactPhone: '',
  notes: '',
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-2 pt-1">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</span>
    </div>
  )
}

export function AddStaffModal({ onClose, onAdd }: { onClose: () => void; onAdd: (m: StaffMember) => void }) {
  const [form, setForm] = useState({ ...EMPTY_STAFF })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => { const e = { ...prev }; delete e[k]; return e })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.role.trim())      e.role      = 'Required'
    if (!form.email.trim())     e.email     = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onAdd({ ...form, id: uid(), documents: [] })
    onClose()
  }

  const Field = ({ label, id, err, children }: { label: string; id: string; err?: string; children: React.ReactNode }) => (
    <div>
      <label htmlFor={id} className={LABEL}>{label}{err && <span className="ml-1 normal-case font-normal text-red-500">{err}</span>}</label>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add Staff Member</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-5 p-6">
          <SectionHeading>Personal Information</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" id="fn" err={errors.firstName}>
              <input id="fn" type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} className={INPUT + (errors.firstName ? ' border-red-400' : '')} placeholder="Matt" />
            </Field>
            <Field label="Last Name" id="ln" err={errors.lastName}>
              <input id="ln" type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} className={INPUT + (errors.lastName ? ' border-red-400' : '')} placeholder="Smith" />
            </Field>
          </div>

          <SectionHeading>Role & Employment</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" id="role" err={errors.role}>
              <div className="relative">
                <input id="role" list="role-list" type="text" value={form.role} onChange={e => set('role', e.target.value)} className={INPUT} placeholder="e.g. Head Coach" />
                <datalist id="role-list">{ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}</datalist>
              </div>
            </Field>
            <Field label="Employment Type" id="empType">
              <SelectPicker
                value={form.employmentType}
                onChange={v => set('employmentType', v as EmploymentType)}
                options={Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" id="start">
              <DatePicker value={form.startDate} onChange={v => set('startDate', v)} />
            </Field>
            <Field label="Status" id="status">
              <div className="flex gap-2 pt-1">
                {(['active', 'inactive'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className="flex-1 rounded-xl border py-2 text-sm font-semibold capitalize transition"
                    style={form.status === s ? { backgroundColor: STATUS_COLORS[s] + '20', borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : { borderColor: '#e5e7eb', color: '#9ca3af' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <SectionHeading>Contact</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" id="email" err={errors.email}>
              <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT + (errors.email ? ' border-red-400' : '')} placeholder="coach@formula14.com.au" />
            </Field>
            <Field label="Phone" id="phone">
              <input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={INPUT} placeholder="04XX XXX XXX" />
            </Field>
          </div>

          <SectionHeading>Pay</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pay Rate ($)" id="rate">
              <input id="rate" type="number" min="0" step="0.01" value={form.payRate || ''} onChange={e => set('payRate', parseFloat(e.target.value) || 0)} className={INPUT} placeholder="0.00" />
            </Field>
            <Field label="Rate Type" id="rateType">
              <div className="flex gap-2 pt-1">
                {([['hourly', 'Per Hour'], ['per-session', 'Per Session']] as [PayRateType, string][]).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('payRateType', v)}
                    className="flex-1 rounded-xl border py-2 text-sm font-semibold transition"
                    style={form.payRateType === v ? { backgroundColor: ACCENT + '20', borderColor: ACCENT, color: ACCENT } : { borderColor: '#e5e7eb', color: '#9ca3af' }}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <SectionHeading>
            <span className="flex items-center gap-1.5">Financial Details <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">SENSITIVE</span></span>
          </SectionHeading>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            BSB, Account Number and TFN are stored locally and displayed masked. Only authorised staff should have access.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="BSB" id="bsb">
              <input id="bsb" type="text" value={form.bsb} onChange={e => set('bsb', e.target.value)} className={INPUT} placeholder="XXX-XXX" maxLength={7} />
            </Field>
            <Field label="Account Number" id="acct">
              <input id="acct" type="text" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} className={INPUT} placeholder="XXXXXXXX" />
            </Field>
          </div>
          <Field label="Tax File Number (TFN)" id="tfn">
            <input id="tfn" type="text" value={form.tfn} onChange={e => set('tfn', e.target.value)} className={INPUT} placeholder="XXX XXX XXX" maxLength={11} />
          </Field>

          <SectionHeading>Emergency Contact</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" id="ecname">
              <input id="ecname" type="text" value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} className={INPUT} />
            </Field>
            <Field label="Phone" id="ecphone">
              <input id="ecphone" type="tel" value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} className={INPUT} />
            </Field>
          </div>

          <SectionHeading>Documents</SectionHeading>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-400">
            <IconUpload size={16} />
            <span>Document uploads available once staff member is created.</span>
          </div>

          <SectionHeading>Notes</SectionHeading>
          <textarea
            rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes about this staff member…"
            className={INPUT + ' resize-none'}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={handleSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Add Staff Member
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Staff Detail Panel ────────────────────────────────────────────────────────

type PanelTab = 'overview' | 'documents' | 'sessions' | 'payroll' | 'notes'

function SensitiveField({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-2 font-mono text-sm text-gray-700">
        {show ? value : maskSensitive(value)}
        <button type="button" onClick={() => setShow(p => !p)} className="text-gray-400 hover:text-gray-600">
          {show ? <IconEyeOff size={14} /> : <IconEye size={14} />}
        </button>
      </dd>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-700">{value}</dd>
    </div>
  )
}

export function StaffDetailPanel({
  member,
  onClose,
  onSaveNotes,
}: {
  member: StaffMember
  onClose: () => void
  onSaveNotes: (id: string, notes: string) => void
}) {
  const [tab, setTab]   = useState<PanelTab>('overview')
  const [notes, setNotes] = useState(member.notes)
  const [saved, setSaved] = useState(false)
  const color = avatarColor(`${member.firstName} ${member.lastName}`)
  const sessions = getStaffSessions(member.id)
  const payHistory = loadPayRuns().flatMap(r => r.entries.filter(e => e.staffId === member.id).map(e => ({ ...e, periodLabel: r.periodLabel, status: r.status, processedDate: r.processedDate })))

  function saveNotes() {
    onSaveNotes(member.id, notes)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS: { id: PanelTab; label: string }[] = [
    { id: 'overview',   label: 'Overview'  },
    { id: 'documents',  label: 'Documents' },
    { id: 'sessions',   label: 'Sessions'  },
    { id: 'payroll',    label: 'Payroll'   },
    { id: 'notes',      label: 'Notes'     },
  ]

  const expiredDocs = member.documents.filter(d => d.status === 'expired').length

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-screen w-[440px] flex-col overflow-hidden bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <span
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {initials(member.firstName, member.lastName)}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900">{member.firstName} {member.lastName}</h2>
            <p className="text-sm text-gray-500">{member.role} · {EMPLOYMENT_LABELS[member.employmentType]}</p>
            <div className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: STATUS_COLORS[member.status] }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[member.status] }} />
              {member.status === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
          <button onClick={onClose} className="mt-0.5 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-0 border-b border-gray-100 px-5">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative flex items-center gap-1 px-2 py-2.5 text-xs font-semibold transition"
              style={tab === t.id ? { color: ACCENT } : { color: '#9ca3af' }}
            >
              {t.label}
              {t.id === 'documents' && expiredDocs > 0 && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white">{expiredDocs}</span>
              )}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: ACCENT }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {tab === 'overview' && (
            <dl className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Email" value={<a href={`mailto:${member.email}`} className="hover:underline" style={{ color: ACCENT }}>{member.email}</a>} />
                <DetailItem label="Phone" value={member.phone || '—'} />
                <DetailItem label="Start Date" value={fmtDate(member.startDate)} />
                <DetailItem label="Pay Rate" value={`${fmtMoney(member.payRate)}/${member.payRateType === 'hourly' ? 'hr' : 'session'}`} />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Financial Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <SensitiveField label="BSB" value={member.bsb || 'Not set'} />
                  <SensitiveField label="Account No." value={member.accountNumber || 'Not set'} />
                </div>
                <div className="mt-4">
                  <SensitiveField label="Tax File Number (TFN)" value={member.tfn || 'Not set'} />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Name" value={member.emergencyContactName || '—'} />
                  <DetailItem label="Phone" value={member.emergencyContactPhone || '—'} />
                </div>
              </div>
            </dl>
          )}

          {tab === 'documents' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled
                title="Requires file storage integration"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed"
              >
                <IconUpload size={15} /> Upload Document
              </button>
              {member.documents.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">No documents on file</p>
              )}
              {member.documents.map(doc => {
                const sc = DOC_STATUS_COLORS[doc.status]
                return (
                  <div key={doc.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{doc.name}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{DOC_TYPE_LABELS[doc.type]}</span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      {doc.status === 'expired' && <IconAlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />}
                    </div>
                    <div className="mt-2 flex gap-4 text-[11px] text-gray-400">
                      <span>Uploaded {fmtDateShort(doc.uploadedDate)}</span>
                      {doc.expiryDate && <span>Expires {fmtDateShort(doc.expiryDate)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'sessions' && (
            <div>
              {sessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No session history available</p>
              ) : (
                <div className="space-y-2">
                  <p className="mb-3 text-[11px] text-gray-400">Showing recent sessions coached</p>
                  {sessions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <span>{fmtDateShort(s.date)}</span>
                          <span>·</span>
                          <span>{s.durationMins} min</span>
                          <span>·</span>
                          <span>{s.athletes} athletes</span>
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: ACCENT + '18', color: ACCENT }}>
                        {s.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'payroll' && (
            <div>
              {payHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No payroll history available</p>
              ) : (
                <div className="space-y-2">
                  {payHistory.map((p, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800">{p.periodLabel}</p>
                        <span className="font-bold text-sm" style={{ color: '#15803d' }}>{fmtMoney(p.adjustedAmount)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        {p.rateType === 'hourly'
                          ? <span>{p.hours} hrs × {fmtMoney(p.rate)}/hr</span>
                          : <span>{p.sessions} sessions × {fmtMoney(p.rate)}/session</span>}
                        <span className="rounded-full px-2 py-0.5 font-semibold"
                          style={p.status === 'processed' ? { backgroundColor: '#dcfce7', color: '#15803d' } : { backgroundColor: '#fef9c3', color: '#854d0e' }}>
                          {p.status === 'processed' ? 'Processed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="flex flex-col gap-3">
              <textarea
                rows={10}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes about this staff member…"
                className={INPUT + ' resize-none'}
              />
              <button
                type="button"
                onClick={saveNotes}
                className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: saved ? '#10b981' : ACCENT }}
              >
                {saved ? <><IconCheck size={15} /> Saved</> : 'Save Notes'}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ─── Staff Tab ─────────────────────────────────────────────────────────────────

export function StaffTab({
  staff,
  onAdd,
  onSaveNotes,
}: {
  staff: StaffMember[]
  onAdd: (m: StaffMember) => void
  onSaveNotes: (id: string, notes: string) => void
}) {
  const [showModal,    setShowModal]    = useState(false)
  const [selectedId,   setSelectedId]  = useState<string | null>(null)
  const [filter,       setFilter]      = useState<'all' | 'active' | 'inactive'>('all')

  const selectedMember = staff.find(s => s.id === selectedId) ?? null

  const filtered = staff.filter(s => filter === 'all' || s.status === filter)
  const activeCount = staff.filter(s => s.status === 'active').length

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white p-1">
            {([['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition"
                style={filter === v ? { backgroundColor: '#1f2937', color: 'white' } : { color: '#6b7280' }}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-400">{activeCount} active · {staff.length} total</span>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <IconPlus size={16} /> Add Staff Member
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <IconBriefcase size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">No staff members found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(m => (
            <StaffCard key={m.id} member={m} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>
      )}

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onAdd={m => { onAdd(m); setShowModal(false) }} />}
      {selectedMember && (
        <StaffDetailPanel
          member={selectedMember}
          onClose={() => setSelectedId(null)}
          onSaveNotes={onSaveNotes}
        />
      )}
    </div>
  )
}

