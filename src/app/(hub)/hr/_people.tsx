'use client'

import { useState, useMemo } from 'react'
import {
  IconPlus, IconX, IconCheck, IconSearch, IconEdit, IconUpload,
  IconEye, IconEyeOff, IconFile,
} from '@tabler/icons-react'
import { sendEmail } from '@/lib/send-email'
import {
  StaffMember, StaffDocument, EmploymentType, StaffStatus, PayRateType, DocType, DocStatus,
  saveStaff,
  EMPLOYMENT_LABELS, STATUS_COLORS, DOC_TYPE_LABELS, DOC_STATUS_COLORS,
  fmtMoney, fmtDate, initials, avatarColor, maskSensitive, uid, ACCENT,
} from '../team/_shared'
import { AppRole, AppRoleMap, TODAY_ISO, saveAppRoles } from './_shared'
import { Avatar, Badge, ModalField, ModalSelect } from './_ui'

export const EMPTY_STAFF: Omit<StaffMember, 'id' | 'documents'> & { appRole: AppRole } = {
  firstName: '', lastName: '', role: '', employmentType: 'full-time', status: 'active',
  email: '', phone: '', startDate: TODAY_ISO, payRate: 0, payRateType: 'hourly',
  bsb: '', accountNumber: '', tfn: '', emergencyContactName: '', emergencyContactPhone: '',
  notes: '', appRole: 'employed-coach',
}

const ADD_SECTIONS = ['personal', 'employment', 'compensation', 'banking', 'tax', 'documents', 'notes']

export function PeopleTab({ staff, setStaff, appRoles, setAppRoles }: {
  staff: StaffMember[]
  setStaff: (s: StaffMember[]) => void
  appRoles: AppRoleMap
  setAppRoles: (r: AppRoleMap) => void
}) {
  const [search, setSearch]   = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd]  = useState(false)
  const [form, setForm]        = useState<typeof EMPTY_STAFF>({ ...EMPTY_STAFF })
  const [addSection, setAddSection] = useState<string>('personal')
  const [showSensitive, setShowSensitive] = useState(false)
  const [invited, setInvited]  = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [staffToast, setStaffToast] = useState<string | null>(null)

  function showStaffToast(msg: string) { setStaffToast(msg); setTimeout(() => setStaffToast(null), 4000) }

  function handleDeactivate(id: string) {
    const updated = staff.map(s => s.id === id ? { ...s, status: 'inactive' as StaffStatus } : s)
    saveStaff(updated); setStaff(updated)
    showStaffToast('Staff member marked as inactive.')
  }

  function handleReactivate(id: string) {
    const updated = staff.map(s => s.id === id ? { ...s, status: 'active' as StaffStatus } : s)
    saveStaff(updated); setStaff(updated)
    showStaffToast('Staff member reactivated.')
  }

  function handleDelete(id: string) {
    setDeleting(true)
    const updated = staff.filter(s => s.id !== id)
    saveStaff(updated); setStaff(updated)
    if (selected === id) setSelected(null)
    setConfirmDeleteId(null)
    setDeleting(false)
    showStaffToast('Staff member deleted.')
  }

  const filtered = useMemo(() =>
    staff.filter(s => {
      if (!showInactive && s.status === 'inactive') return false
      return `${s.firstName} ${s.lastName} ${s.role}`.toLowerCase().includes(search.toLowerCase())
    }),
  [staff, search, showInactive])

  const selectedStaff = staff.find(s => s.id === selected) ?? null

  function handleAdd() {
    const member: StaffMember = { ...form, id: uid(), documents: [] }
    const newRoles = { ...appRoles, [member.id]: form.appRole }
    const updated = [...staff, member]
    saveStaff(updated)
    saveAppRoles(newRoles)
    setStaff(updated)
    setAppRoles(newRoles)
    setShowAdd(false)
    setForm({ ...EMPTY_STAFF })
    setInvited(true)
    setTimeout(() => setInvited(false), 3000)
    if (member.email) {
      sendEmail({
        template: 'staff-invitation',
        to: member.email,
        data: { firstName: member.firstName, lastName: member.lastName, email: member.email, role: member.role || 'Coach', appRole: form.appRole || 'coach' },
      }).catch(console.error)
    }
  }

  return (
    <div className="flex h-full min-h-0 gap-5 p-6">
      {/* Left — directory */}
      <div className="flex w-80 shrink-0 flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6BA3D6]" />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: ACCENT }}>
            <IconPlus size={16} /> Add
          </button>
        </div>

        {invited && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <IconCheck size={15} /> Invitation email queued.
          </div>
        )}

        {staff.some(s => s.status === 'inactive') && (
          <button type="button" onClick={() => setShowInactive(v => !v)}
            className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
            style={showInactive ? { backgroundColor: '#6b7280', color: 'white', borderColor: '#6b7280' } : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </button>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto">
          {filtered.map(s => {
            const role = appRoles[s.id]
            const isSelected = s.id === selected
            const inactive = s.status === 'inactive'
            return (
              <div key={s.id} className="relative">
                <button type="button" onClick={() => setSelected(isSelected ? null : s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${isSelected ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                  style={{ opacity: inactive ? 0.6 : 1 }}>
                  <Avatar firstName={s.firstName} lastName={s.lastName} size={40} />
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="truncate text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                    <p className="truncate text-xs text-gray-500">{s.role}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge label={EMPLOYMENT_LABELS[s.employmentType]} color="#6b7280" bg="#f3f4f6" />
                      {role === 'director' && <Badge label="Director" color="#4a7fb5" bg="#eff6ff" />}
                      {inactive && <Badge label="Inactive" color="#6b7280" bg="#f3f4f6" />}
                      {!inactive && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />}
                    </div>
                  </div>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  <button type="button" onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === s.id ? null : s.id) }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    ⋯
                  </button>
                  {actionMenuId === s.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                      <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button type="button" onClick={() => { setActionMenuId(null); setSelected(s.id) }}
                          className="flex w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">View Profile</button>
                        {inactive ? (
                          <button type="button" onClick={() => { setActionMenuId(null); handleReactivate(s.id) }}
                            className="flex w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50">Reactivate</button>
                        ) : (
                          <button type="button" onClick={() => { setActionMenuId(null); handleDeactivate(s.id) }}
                            className="flex w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Mark as Inactive</button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button type="button" onClick={() => { setActionMenuId(null); setConfirmDeleteId(s.id) }}
                          className="flex w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right — detail panel */}
      <div className="min-w-0 flex-1">
        {!selectedStaff ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
            <div className="text-center">
              <p className="text-sm text-gray-400">Select a staff member to view details</p>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-4">
              <Avatar firstName={selectedStaff.firstName} lastName={selectedStaff.lastName} size={56} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{selectedStaff.firstName} {selectedStaff.lastName}</h2>
                <p className="text-sm text-gray-500">{selectedStaff.role} · {EMPLOYMENT_LABELS[selectedStaff.employmentType]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge label={selectedStaff.status === 'active' ? 'Active' : 'Inactive'} color={STATUS_COLORS[selectedStaff.status]} bg={selectedStaff.status === 'active' ? '#dcfce7' : '#f3f4f6'} />
                  {appRoles[selectedStaff.id] && (
                    <Badge label={appRoles[selectedStaff.id] === 'director' ? 'Director' : 'Employed Coach'} color="#4a7fb5" bg="#eff6ff" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedStaff.status === 'active' ? (
                  <button type="button" onClick={() => handleDeactivate(selectedStaff.id)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50">Mark Inactive</button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(selectedStaff.id)}
                    className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-600 hover:bg-green-50">Reactivate</button>
                )}
                <button type="button" onClick={() => setConfirmDeleteId(selectedStaff.id)}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><IconEdit size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><p className="text-xs font-semibold uppercase text-gray-400">Email</p><p className="mt-0.5 text-gray-800">{selectedStaff.email}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Phone</p><p className="mt-0.5 text-gray-800">{selectedStaff.phone}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Start Date</p><p className="mt-0.5 text-gray-800">{fmtDate(selectedStaff.startDate)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Pay Rate</p><p className="mt-0.5 text-gray-800">{fmtMoney(selectedStaff.payRate)}/{selectedStaff.payRateType === 'hourly' ? 'hr' : 'session'}</p></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase text-gray-400">BSB</p>
                  <button onClick={() => setShowSensitive(!showSensitive)} className="text-gray-400 hover:text-gray-600">
                    {showSensitive ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                  </button>
                </div>
                <p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.bsb : maskSensitive(selectedStaff.bsb)}</p>
              </div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Account</p><p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.accountNumber : maskSensitive(selectedStaff.accountNumber)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">TFN</p><p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.tfn : maskSensitive(selectedStaff.tfn)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Emergency Contact</p><p className="mt-0.5 text-gray-800">{selectedStaff.emergencyContactName} · {selectedStaff.emergencyContactPhone}</p></div>
            </div>

            {selectedStaff.notes && (
              <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <strong className="text-xs font-semibold uppercase text-gray-400 block mb-1">Notes</strong>
                {selectedStaff.notes}
              </div>
            )}

            {selectedStaff.documents.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Documents</p>
                <div className="space-y-2">
                  {selectedStaff.documents.map(doc => {
                    const colors = DOC_STATUS_COLORS[doc.status]
                    return (
                      <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <IconFile size={15} className="shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{doc.name}</p>
                          {doc.expiryDate && <p className="text-xs text-gray-500">Expires {fmtDate(doc.expiryDate)}</p>}
                        </div>
                        <Badge label={doc.status} color={colors.text} bg={colors.bg} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add New Employee</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-6 py-2">
              {ADD_SECTIONS.map(sec => (
                <button key={sec} type="button" onClick={() => setAddSection(sec)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${addSection === sec ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={addSection === sec ? { backgroundColor: ACCENT } : undefined}>
                  {sec}
                </button>
              ))}
            </div>
            <div className="p-6 space-y-4">
              {addSection === 'personal' && <>
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="First Name" value={form.firstName} onChange={v => setForm(f => ({...f, firstName: v}))} />
                  <ModalField label="Last Name"  value={form.lastName}  onChange={v => setForm(f => ({...f, lastName: v}))} />
                </div>
                <ModalField label="Email Address" value={form.email}  onChange={v => setForm(f => ({...f, email: v}))} type="email" />
                <ModalField label="Phone Number"  value={form.phone}  onChange={v => setForm(f => ({...f, phone: v}))} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="Emergency Contact Name"  value={form.emergencyContactName}  onChange={v => setForm(f => ({...f, emergencyContactName: v}))} />
                  <ModalField label="Emergency Contact Phone" value={form.emergencyContactPhone} onChange={v => setForm(f => ({...f, emergencyContactPhone: v}))} />
                </div>
              </>}
              {addSection === 'employment' && <>
                <ModalField label="Job Title / Role" value={form.role} onChange={v => setForm(f => ({...f, role: v}))} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalSelect label="Employment Type" value={form.employmentType} onChange={v => setForm(f => ({...f, employmentType: v as EmploymentType}))}
                    options={[['full-time','Full Time'],['part-time','Part Time'],['casual','Casual'],['contractor','Contractor']]} />
                  <ModalSelect label="App Role" value={form.appRole} onChange={v => setForm(f => ({...f, appRole: v as AppRole}))}
                    options={[['director','Director'],['employed-coach','Employed Coach']]} />
                </div>
                <ModalField label="Start Date" value={form.startDate} onChange={v => setForm(f => ({...f, startDate: v}))} type="date" />
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  An invitation email will be queued to the employee&apos;s address once saved.
                </div>
              </>}
              {addSection === 'compensation' && <>
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="Pay Rate ($)" value={String(form.payRate)} onChange={v => setForm(f => ({...f, payRate: parseFloat(v) || 0}))} type="number" />
                  <ModalSelect label="Rate Type" value={form.payRateType} onChange={v => setForm(f => ({...f, payRateType: v as PayRateType}))}
                    options={[['hourly','Per Hour'],['per-session','Per Session']]} />
                </div>
                <p className="text-xs text-gray-500">Superannuation is calculated at {(0.115 * 100).toFixed(1)}% on top of base pay.</p>
              </>}
              {addSection === 'banking' && <>
                <ModalField label="BSB" value={form.bsb} onChange={v => setForm(f => ({...f, bsb: v}))} placeholder="000-000" />
                <ModalField label="Account Number" value={form.accountNumber} onChange={v => setForm(f => ({...f, accountNumber: v}))} />
              </>}
              {addSection === 'tax' && <>
                <ModalField label="Tax File Number (TFN)" value={form.tfn} onChange={v => setForm(f => ({...f, tfn: v}))} placeholder="123 456 789" />
                <p className="text-xs text-gray-500">TFN is stored securely and only shown to Directors.</p>
              </>}
              {addSection === 'documents' && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <IconUpload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Documents can be uploaded after the employee record is saved.</p>
                </div>
              )}
              {addSection === 'notes' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Internal Notes</label>
                  <textarea rows={5} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] resize-none"
                    placeholder="Notes visible to Directors only…" />
                </div>
              )}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={!form.firstName || !form.lastName || !form.email}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}>
                Save & Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (() => {
        const s = staff.find(x => x.id === confirmDeleteId)
        if (!s) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <IconX size={24} className="text-red-600" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">Delete {s.firstName} {s.lastName}?</h2>
              <p className="mb-6 text-sm text-gray-500">
                This will permanently remove their profile, pay history and all associated records.
                <strong className="font-semibold text-gray-700"> This cannot be undone.</strong>
              </p>
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                To preserve history, consider <strong>Mark as Inactive</strong> instead.
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => handleDelete(confirmDeleteId)} disabled={deleting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}>
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {staffToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {staffToast}
        </div>
      )}
    </div>
  )
}

