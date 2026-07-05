'use client'

import { useState } from 'react'
import { StaffMember, loadPayRuns, savePayRuns, fmtMoney, ACCENT } from '../team/_shared'
import { SUPER_RATE, TODAY_ISO } from './_shared'
import { Badge } from './_ui'

export function PayrollTab({ staff: _staff }: { staff: StaffMember[] }) {
  const [payRuns, setPayRuns] = useState(loadPayRuns)
  const [selected, setSelected] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)

  const totalYTD = payRuns.filter(r => r.status === 'processed').reduce((a, r) => a + r.totalAmount, 0)
  const pending = payRuns.filter(r => r.status === 'pending')
  const totalPending = pending.reduce((a, r) => a + r.totalAmount, 0)
  const totalSuper = Math.round(totalYTD * SUPER_RATE)

  function runPayroll(id: string) {
    setRunningId(id)
    setTimeout(() => {
      const updated = payRuns.map(r => r.id === id ? { ...r, status: 'processed' as const, processedDate: TODAY_ISO } : r)
      savePayRuns(updated)
      setPayRuns(updated)
      setRunningId(null)
      window.dispatchEvent(new Event('storage'))
    }, 1200)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">YTD Payroll</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalYTD)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{payRuns.filter(r => r.status === 'processed').length} pay runs processed</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Pending Payroll</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalPending)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{pending.length} run{pending.length !== 1 ? 's' : ''} awaiting processing</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Super Payable (YTD)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalSuper)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{(SUPER_RATE * 100).toFixed(1)}% of processed payroll</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Super</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...payRuns].reverse().map(run => {
              const STATUS_B: Record<string, { label: string; color: string; bg: string }> = {
                processed: { label: 'Processed', color: '#15803d', bg: '#dcfce7' },
                pending:   { label: 'Pending',   color: '#854d0e', bg: '#fef9c3' },
                failed:    { label: 'Failed',    color: '#b91c1c', bg: '#fee2e2' },
              }
              const badge = STATUS_B[run.status]
              const isRunning = runningId === run.id
              return (
                <>
                  <tr key={run.id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${selected === run.id ? 'bg-[#6BA3D6]/5' : ''}`}
                    onClick={() => setSelected(selected === run.id ? null : run.id)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{run.periodLabel}</td>
                    <td className="px-4 py-3 text-gray-600">{run.staffCount} staff</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmtMoney(run.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtMoney(Math.round(run.totalAmount * SUPER_RATE))}</td>
                    <td className="px-4 py-3"><Badge label={badge.label} color={badge.color} bg={badge.bg} /></td>
                    <td className="px-4 py-3 text-right">
                      {run.status === 'pending' && (
                        <button onClick={e => { e.stopPropagation(); runPayroll(run.id) }} disabled={isRunning}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                          style={{ backgroundColor: ACCENT }}>
                          {isRunning ? 'Running…' : 'Run Payroll'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {selected === run.id && (
                    <tr key={run.id + '_detail'}>
                      <td colSpan={6} className="bg-gray-50 px-4 pb-4 pt-0">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <p className="mb-3 text-xs font-bold uppercase text-gray-400">Pay Run Entries</p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="pb-2 text-left font-semibold">Staff</th>
                                <th className="pb-2 text-left font-semibold">Rate</th>
                                <th className="pb-2 text-right font-semibold">Hours/Sessions</th>
                                <th className="pb-2 text-right font-semibold">Gross</th>
                                <th className="pb-2 text-right font-semibold">Super</th>
                              </tr>
                            </thead>
                            <tbody>
                              {run.entries.map(e => (
                                <tr key={e.staffId} className="border-t border-gray-100">
                                  <td className="py-1.5 font-medium text-gray-800">{e.staffName}</td>
                                  <td className="py-1.5 text-gray-600">${e.rate}/{e.rateType === 'hourly' ? 'hr' : 'session'}</td>
                                  <td className="py-1.5 text-right text-gray-600">{e.rateType === 'hourly' ? `${e.hours}h` : `${e.sessions} sessions`}</td>
                                  <td className="py-1.5 text-right font-bold text-gray-900">{fmtMoney(e.adjustedAmount)}</td>
                                  <td className="py-1.5 text-right text-gray-600">{fmtMoney(Math.round(e.adjustedAmount * SUPER_RATE))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-200">
                                <td colSpan={3} className="pt-2 text-right text-xs font-bold uppercase text-gray-400">Total</td>
                                <td className="pt-2 text-right text-sm font-bold text-gray-900">{fmtMoney(run.totalAmount)}</td>
                                <td className="pt-2 text-right text-sm font-bold text-gray-600">{fmtMoney(Math.round(run.totalAmount * SUPER_RATE))}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
