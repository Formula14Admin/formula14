'use client'

import { IconAlertCircle, IconInfoCircle, IconCircleCheck } from '@tabler/icons-react'
import { StaffMember, EMPLOYMENT_LABELS, fmtDate } from '../team/_shared'
import { TODAY_ISO } from './_shared'
import { Avatar, Badge } from './_ui'

type ComplianceStatus = 'ok' | 'expiring' | 'expired' | 'missing'
interface ComplianceItem { key: string; label: string }

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { key: 'wwcc',      label: 'Working With Children Check' },
  { key: 'first-aid', label: 'First Aid Certificate' },
  { key: 'coaching',  label: 'Coaching Qualification' },
  { key: 'contract',  label: 'Signed Contract' },
]

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string; dot: string }> = {
  ok:       { label: 'OK',       color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  expiring: { label: 'Expiring', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  expired:  { label: 'Expired',  color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
  missing:  { label: 'Missing',  color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
}

export function ComplianceTab({ staff }: { staff: StaffMember[] }) {
  const today = new Date()
  const soonDate = new Date(today); soonDate.setDate(today.getDate() + 30)
  const soonIso = soonDate.toISOString().slice(0, 10)

  function getStatus(s: StaffMember, key: string): { status: ComplianceStatus; expiry: string | null } {
    if (key === 'wwcc') {
      const doc = s.documents.find(d => d.type === 'wwcc')
      if (!doc) return { status: 'missing', expiry: null }
      if (doc.expiryDate && doc.expiryDate < TODAY_ISO) return { status: 'expired', expiry: doc.expiryDate }
      if (doc.expiryDate && doc.expiryDate <= soonIso) return { status: 'expiring', expiry: doc.expiryDate }
      return { status: 'ok', expiry: doc.expiryDate ?? null }
    }
    if (key === 'contract') {
      const doc = s.documents.find(d => d.type === 'contract' && d.status === 'verified')
      return doc ? { status: 'ok', expiry: null } : { status: 'missing', expiry: null }
    }
    if (key === 'coaching') {
      const doc = s.documents.find(d => d.type === 'qualification')
      if (!doc) return { status: 'missing', expiry: null }
      if (doc.expiryDate && doc.expiryDate < TODAY_ISO) return { status: 'expired', expiry: doc.expiryDate }
      if (doc.expiryDate && doc.expiryDate <= soonIso) return { status: 'expiring', expiry: doc.expiryDate }
      return { status: 'ok', expiry: doc.expiryDate ?? null }
    }
    if (key === 'first-aid') {
      const hasFirstAid = s.id === 's1'
      return hasFirstAid ? { status: 'ok', expiry: '2027-06-30' } : { status: 'missing', expiry: null }
    }
    return { status: 'missing', expiry: null }
  }

  const allStatuses = staff.flatMap(s => COMPLIANCE_ITEMS.map(item => getStatus(s, item.key).status))
  const issues = allStatuses.filter(s => s !== 'ok').length
  const critical = allStatuses.filter(s => s === 'expired' || s === 'missing').length

  function fmtDateShort(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5 flex gap-4">
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${critical > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {critical > 0 ? <IconAlertCircle size={16} className="text-red-500" /> : <IconCircleCheck size={16} className="text-green-500" />}
          <span className={`text-sm font-semibold ${critical > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''}` : 'All critical checks passed'}
          </span>
        </div>
        {issues > critical && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
            <IconInfoCircle size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{issues - critical} expiring soon</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 w-48">Staff Member</th>
              {COMPLIANCE_ITEMS.map(item => (
                <th key={item.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Avatar firstName={s.firstName} lastName={s.lastName} size={28} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                      <p className="text-[10px] text-gray-400">{EMPLOYMENT_LABELS[s.employmentType]}</p>
                    </div>
                  </div>
                </td>
                {COMPLIANCE_ITEMS.map(item => {
                  const { status, expiry } = getStatus(s, item.key)
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <td key={item.key} className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        {expiry && <span className="text-[10px] text-gray-400">{status === 'expiring' ? 'Exp ' : ''}{fmtDateShort(expiry)}</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Actions Required</h3>
        <div className="space-y-2">
          {staff.flatMap(s =>
            COMPLIANCE_ITEMS.map(item => {
              const { status, expiry } = getStatus(s, item.key)
              if (status === 'ok') return null
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={`${s.id}-${item.key}`} className="flex items-center gap-3 rounded-xl border p-3 bg-white"
                  style={{ borderColor: status === 'expired' || status === 'missing' ? '#fecaca' : '#fde68a' }}>
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                  <p className="text-sm text-gray-800">
                    <strong>{s.firstName} {s.lastName}</strong> — {item.label}
                    {status === 'missing' ? ' is missing' : status === 'expired' ? ` expired ${expiry ? fmtDate(expiry) : ''}` : ` expires ${expiry ? fmtDate(expiry) : ''}`}
                  </p>
                  <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                </div>
              )
            })
          ).filter(Boolean)}
        </div>
      </div>
    </div>
  )
}
