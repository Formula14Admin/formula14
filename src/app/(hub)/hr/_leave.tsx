'use client'

import { useState } from 'react'
import { IconPlus, IconX, IconCheck } from '@tabler/icons-react'
import { SelectPicker } from '@/components/ui/Pickers'
import { StaffMember, EMPLOYMENT_LABELS, ACCENT } from '../team/_shared'
import {
  LeaveRequest, LeaveStatus, LeaveType,
  loadLeave, saveLeave, leaveBalance,
  LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS, TODAY_ISO,
} from './_shared'
import { Avatar, Badge, ModalField, ModalSelect } from './_ui'
import { uid } from '../team/_shared'

export function LeaveTab({ staff }: { staff: StaffMember[] }) {
  const [leave, setLeave] = useState<LeaveRequest[]>(loadLeave)
  const [view, setView] = useState<'requests' | 'balances'>('requests')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ staffId: staff[0]?.id ?? '', type: 'annual' as LeaveType, startDate: TODAY_ISO, endDate: TODAY_ISO, reason: '' })

  function approve(id: string) {
    const updated = leave.map(l => l.id === id ? { ...l, status: 'approved' as LeaveStatus } : l)
    setLeave(updated); saveLeave(updated)
  }
  function decline(id: string) {
    const updated = leave.map(l => l.id === id ? { ...l, status: 'declined' as LeaveStatus } : l)
    setLeave(updated); saveLeave(updated)
  }

  function handleSubmit() {
    const s = staff.find(st => st.id === form.staffId)
    if (!s) return
    const days = Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    const req: LeaveRequest = {
      id: uid(), staffId: s.id, staffName: `${s.firstName} ${s.lastName}`,
      type: form.type, startDate: form.startDate, endDate: form.endDate,
      days, reason: form.reason, status: 'pending', submittedDate: TODAY_ISO,
    }
    const updated = [...leave, req]
    setLeave(updated); saveLeave(updated)
    setShowAdd(false)
  }

  function fmtDateShort(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  const STATUS_BADGE: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Pending',  color: '#854d0e', bg: '#fef9c3' },
    approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
    declined: { label: 'Declined', color: '#b91c1c', bg: '#fee2e2' },
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {(['requests', 'balances'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${view === v ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              style={view === v ? { backgroundColor: ACCENT } : undefined}>
              {v === 'requests' ? 'Leave Requests' : 'Balances'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={16} /> Request Leave
        </button>
      </div>

      {view === 'requests' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {leave.length === 0 && (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-gray-400 text-sm">No leave requests.</div>
          )}
          {leave.map(l => {
            const badge = STATUS_BADGE[l.status]
            return (
              <div key={l.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: LEAVE_TYPE_COLORS[l.type] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{l.staffName}</p>
                  <p className="text-xs text-gray-500">
                    {LEAVE_TYPE_LABELS[l.type]} · {fmtDateShort(l.startDate)}{l.startDate !== l.endDate ? ` – ${fmtDateShort(l.endDate)}` : ''} ({l.days} day{l.days !== 1 ? 's' : ''})
                  </p>
                  {l.reason && <p className="mt-0.5 text-xs text-gray-400 italic">{l.reason}</p>}
                </div>
                <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                {l.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => approve(l.id)} className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"><IconCheck size={13} /> Approve</button>
                    <button onClick={() => decline(l.id)} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"><IconX size={13} /> Decline</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'balances' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {staff.map(s => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Avatar firstName={s.firstName} lastName={s.lastName} size={36} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-500">{EMPLOYMENT_LABELS[s.employmentType]}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['annual', 'sick', 'personal'] as LeaveType[]).map(type => {
                  const { total, used } = leaveBalance(s, leave, type)
                  if (total === 0) return null
                  const remaining = total - used
                  const pct = total > 0 ? (used / total) * 100 : 0
                  return (
                    <div key={type} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-bold uppercase text-gray-400">{LEAVE_TYPE_LABELS[type]}</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{remaining}<span className="text-xs font-normal text-gray-400">/{total} days</span></p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: LEAVE_TYPE_COLORS[type] }} />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">{used} used</p>
                    </div>
                  )
                })}
              </div>
              {s.employmentType === 'casual' && (
                <p className="mt-3 text-xs text-gray-400 italic">Casual employees receive leave loading in their hourly rate. No accrued leave balance applies.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Request Leave</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <ModalSelect label="Staff Member" value={form.staffId} onChange={v => setForm(f => ({...f, staffId: v}))}
                options={staff.map(s => [s.id, `${s.firstName} ${s.lastName}`])} />
              <ModalSelect label="Leave Type" value={form.type} onChange={v => setForm(f => ({...f, type: v as LeaveType}))}
                options={[['annual','Annual Leave'],['sick','Sick Leave'],['personal','Personal Leave'],['other','Other']]} />
              <div className="grid grid-cols-2 gap-4">
                <ModalField label="Start Date" value={form.startDate} onChange={v => setForm(f => ({...f, startDate: v}))} type="date" />
                <ModalField label="End Date"   value={form.endDate}   onChange={v => setForm(f => ({...f, endDate: v}))}   type="date" />
              </div>
              <ModalField label="Reason (optional)" value={form.reason} onChange={v => setForm(f => ({...f, reason: v}))} />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} className="rounded-xl px-5 py-2 text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
