'use client'

import { useState, useEffect } from 'react'
import { IconUsersGroup, IconX } from '@tabler/icons-react'
import { StaffMember, PayRun, loadStaff, saveStaff, loadPayRuns, savePayRuns, ACCENT } from './_shared'
import { StaffTab } from './_staff'
import { PayrollTab } from './_payroll'

type Tab = 'staff' | 'payroll'

const TABS: { id: Tab; label: string }[] = [
  { id: 'staff',   label: 'Staff'   },
  { id: 'payroll', label: 'Payroll' },
]

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl">
      {message}
      <button onClick={onClose} className="rounded-full p-0.5 hover:bg-white/10"><IconX size={14} /></button>
    </div>
  )
}

export default function TeamPage() {
  const [tab,      setTab]      = useState<Tab>('staff')
  const [staff,    setStaff]    = useState<StaffMember[]>([])
  const [payRuns,  setPayRuns]  = useState<PayRun[]>([])
  const [toast,    setToast]    = useState<string | null>(null)

  useEffect(() => {
    setStaff(loadStaff())
    setPayRuns(loadPayRuns())
  }, [])

  function addStaff(m: StaffMember) {
    const next = [...staff, m]
    setStaff(next)
    saveStaff(next)
    setToast(`${m.firstName} ${m.lastName} added to the team.`)
  }

  function saveNotes(id: string, notes: string) {
    const next = staff.map(s => s.id === id ? { ...s, notes } : s)
    setStaff(next)
    saveStaff(next)
  }

  function addPayRun(run: PayRun) {
    const next = [...payRuns, run]
    setPayRuns(next)
    savePayRuns(next)
    setToast(`Pay run processed — ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(run.totalAmount)} for ${run.staffCount} staff.`)
  }

  const activeStaff = staff.filter(s => s.status === 'active').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: ACCENT + '18' }}>
              <IconUsersGroup size={20} style={{ color: ACCENT }} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Team</h1>
              <p className="text-xs text-gray-400">{activeStaff} active staff member{activeStaff !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="rounded-lg px-5 py-1.5 text-sm font-semibold transition"
                style={tab === t.id
                  ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
                  : { color: '#6b7280' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'staff' && (
          <StaffTab staff={staff} onAdd={addStaff} onSaveNotes={saveNotes} />
        )}
        {tab === 'payroll' && (
          <PayrollTab staff={staff} payRuns={payRuns} onAddPayRun={addPayRun} />
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
