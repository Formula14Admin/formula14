'use client'

import { useState } from 'react'
import {
  IconPlus, IconX, IconUsers, IconClock,
  IconCalendar, IconCurrencyDollar, IconCircleCheck,
} from '@tabler/icons-react'
import { DatePicker } from '@/components/ui/Pickers'
import {
  PayRun, PayRunEntry, StaffMember, PayPeriodType,
  ACCENT, INPUT, LABEL,
  EMPLOYMENT_LABELS,
  uid, fmtMoney, fmtDate,
} from './_shared'

// ─── Overview Cards ────────────────────────────────────────────────────────────

function PayCard({
  icon, label, value, sub, color = ACCENT,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color?: string
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: color + '18' }}>
          <span style={{ color }}>{icon}</span>
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Create Pay Run Modal ──────────────────────────────────────────────────────

function CreatePayRunModal({
  staff,
  onClose,
  onProcess,
}: {
  staff: StaffMember[]
  onClose: () => void
  onProcess: (run: PayRun) => void
}) {
  const [periodType, setPeriodType] = useState<PayPeriodType>('fortnightly')
  const [startDate,  setStartDate]  = useState('2026-07-01')
  const [endDate,    setEndDate]    = useState('2026-07-14')
  const [overrides,  setOverrides]  = useState<Record<string, number>>({})
  const [processing, setProcessing] = useState(false)
  const [done,       setDone]       = useState(false)

  const activeStaff = staff.filter(s => s.status === 'active')

  function calcForStaff(s: StaffMember): PayRunEntry {
    const sessions = s.payRateType === 'per-session' ? 8 : 0
    const hours    = s.payRateType === 'hourly' ? (periodType === 'weekly' ? 20 : periodType === 'fortnightly' ? 40 : 86) : 0
    const base     = s.payRateType === 'hourly' ? hours * s.payRate : sessions * s.payRate
    return {
      staffId: s.id,
      staffName: `${s.firstName} ${s.lastName}`,
      sessions,
      hours,
      rate: s.payRate,
      rateType: s.payRateType,
      calculatedAmount: base,
      adjustedAmount: overrides[s.id] ?? base,
      notes: '',
    }
  }

  const entries = activeStaff.map(calcForStaff)
  const total   = entries.reduce((s, e) => s + e.adjustedAmount, 0)

  const periodLabel = startDate && endDate
    ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
    : ''

  function handleProcess() {
    if (processing || done) return
    setProcessing(true)
    setTimeout(() => {
      onProcess({
        id: uid(),
        periodLabel,
        periodType,
        processedDate: '2026-07-01',
        status: 'processed',
        totalAmount: total,
        staffCount: activeStaff.length,
        entries,
      })
      setProcessing(false)
      setDone(true)
      setTimeout(onClose, 1200)
    }, 1400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Create Pay Run</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Period type */}
          <div>
            <label className={LABEL}>Pay Period Type</label>
            <div className="flex gap-2">
              {(['weekly', 'fortnightly', 'monthly'] as PayPeriodType[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodType(p)}
                  className="flex-1 rounded-xl border py-2 text-sm font-semibold capitalize transition"
                  style={periodType === p ? { backgroundColor: ACCENT + '18', borderColor: ACCENT, color: ACCENT } : { borderColor: '#e5e7eb', color: '#9ca3af' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className={LABEL}>End Date</label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>

          {/* Staff breakdown */}
          <div>
            <label className={LABEL}>Staff Breakdown</label>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    {['Staff', 'Rate', 'Hours / Sessions', 'Calculated', 'Final Amount'].map(h => (
                      <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.staffId} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-800">{e.staffName}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {fmtMoney(e.rate)}/{e.rateType === 'hourly' ? 'hr' : 'session'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {e.rateType === 'hourly' ? `${e.hours} hrs` : `${e.sessions} sessions`}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtMoney(e.calculatedAmount)}</td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                          <input
                            type="number"
                            value={overrides[e.staffId] ?? e.calculatedAmount}
                            onChange={ev => setOverrides(p => ({ ...p, [e.staffId]: parseFloat(ev.target.value) || 0 }))}
                            className="w-28 rounded-lg border border-gray-200 bg-white py-1.5 pl-6 pr-2 text-sm font-semibold text-gray-800 outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/20"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f9ff', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">Total Pay Run</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: '#15803d' }}>{fmtMoney(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
            Demo mode — processing this pay run will record it in history but will not initiate any real payment transfers.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing || done}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: done ? '#10b981' : ACCENT }}
          >
            {done ? (
              <><IconCircleCheck size={15} /> Pay Run Processed!</>
            ) : processing ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing…</>
            ) : (
              <>Process Pay Run — {fmtMoney(total)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────

export function PayrollTab({
  staff,
  payRuns,
  onAddPayRun,
}: {
  staff: StaffMember[]
  payRuns: PayRun[]
  onAddPayRun: (run: PayRun) => void
}) {
  const [showModal, setShowModal] = useState(false)

  const processed  = payRuns.filter(r => r.status === 'processed')
  const pending    = payRuns.filter(r => r.status === 'pending')
  const thisMonth  = processed.filter(r => r.periodLabel.includes('Jun 2026'))
  const monthTotal = thisMonth.reduce((s, r) => s + r.totalAmount, 0)
  const activeStaff = staff.filter(s => s.status === 'active').length

  return (
    <div className="space-y-6">

      {/* Demo banner */}
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <IconCircleCheck size={16} className="shrink-0 text-amber-500" />
        <span><strong>Demo Mode</strong> — Pay runs are simulated and do not connect to a real payroll system (e.g. Xero Payroll).</span>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <PayCard icon={<IconCurrencyDollar size={18} />} label="Payroll This Month" value={fmtMoney(monthTotal)} sub="Jun 2026 (fortnightly)" />
        <PayCard icon={<IconCalendar size={18} />} label="Next Pay Run" value="1 Jul 2026" sub="Fortnightly · ~$2,410" color="#8b5cf6" />
        <PayCard icon={<IconUsers size={18} />} label="Active Staff" value={String(activeStaff)} sub={`${staff.length} total registered`} color="#10b981" />
        <PayCard icon={<IconClock size={18} />} label="Outstanding" value={String(pending.length)} sub="pending pay run" color={pending.length > 0 ? '#f59e0b' : '#10b981'} />
      </div>

      {/* Pay run history */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Pay Run History</h2>
            <p className="text-xs text-gray-400">{payRuns.length} pay run{payRuns.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            <IconPlus size={15} /> Create Pay Run
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                {['Period', 'Type', 'Staff', 'Total Amount', 'Processed', 'Status'].map(h => (
                  <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...payRuns].reverse().map(run => (
                <tr key={run.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{run.periodLabel}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">{run.periodType}</td>
                  <td className="px-4 py-3 text-gray-500">{run.staffCount} staff</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{fmtMoney(run.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-500">{run.processedDate ? fmtDate(run.processedDate) : '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                      style={
                        run.status === 'processed'
                          ? { backgroundColor: '#dcfce7', color: '#15803d' }
                          : run.status === 'pending'
                          ? { backgroundColor: '#fef9c3', color: '#854d0e' }
                          : { backgroundColor: '#fee2e2', color: '#b91c1c' }
                      }
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payRuns.length === 0 && (
          <div className="py-14 text-center text-sm text-gray-400">No pay runs recorded yet</div>
        )}
      </div>

      {/* Per-staff breakdown for most recent run */}
      {payRuns.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">Latest Pay Run Breakdown</h2>
            <p className="text-xs text-gray-400">{payRuns[payRuns.length - 1].periodLabel}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  {['Staff Member', 'Role', 'Type', 'Hours / Sessions', 'Rate', 'Amount'].map(h => (
                    <th key={h} className="border-b border-gray-100 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payRuns[payRuns.length - 1].entries.map(e => {
                  const member = staff.find(s => s.id === e.staffId)
                  return (
                    <tr key={e.staffId} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-800">{e.staffName}</td>
                      <td className="px-4 py-3 text-gray-500">{member?.role ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {member ? EMPLOYMENT_LABELS[member.employmentType] : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {e.rateType === 'hourly' ? `${e.hours} hrs` : `${e.sessions} sessions`}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{fmtMoney(e.rate)}/{e.rateType === 'hourly' ? 'hr' : 'session'}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#15803d' }}>{fmtMoney(e.adjustedAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f9ff', borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase text-gray-500">Total</td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {fmtMoney(payRuns[payRuns.length - 1].entries.reduce((s, e) => s + e.adjustedAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <CreatePayRunModal
          staff={staff}
          onClose={() => setShowModal(false)}
          onProcess={run => { onAddPayRun(run); setShowModal(false) }}
        />
      )}
    </div>
  )
}

