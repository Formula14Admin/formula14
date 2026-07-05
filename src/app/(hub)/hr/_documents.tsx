'use client'

import { useState, useMemo } from 'react'
import { IconFile, IconPlus, IconX, IconDownload, IconAlertCircle, IconInfoCircle, IconUpload } from '@tabler/icons-react'
import { SelectPicker } from '@/components/ui/Pickers'
import {
  StaffMember, StaffDocument, DocType, DocStatus,
  saveStaff, DOC_TYPE_LABELS, DOC_STATUS_COLORS, fmtDate, uid, ACCENT,
} from '../team/_shared'
import { TODAY_ISO } from './_shared'
import { Badge, ModalField, ModalSelect } from './_ui'

export function DocumentsTab({ staff, setStaff }: { staff: StaffMember[]; setStaff: (s: StaffMember[]) => void }) {
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ staffId: staff[0]?.id ?? '', name: '', type: 'wwcc' as DocType, expiryDate: '', status: 'pending' as DocStatus })

  const today = new Date()
  const soon = new Date(today); soon.setDate(soon.getDate() + 30)
  const soonIso = soon.toISOString().slice(0, 10)

  const allDocs = useMemo(() => {
    const out: Array<{ staffId: string; staffName: string; doc: StaffDocument }> = []
    staff.forEach(s => {
      if (filterStaff !== 'all' && s.id !== filterStaff) return
      s.documents.forEach(doc => out.push({ staffId: s.id, staffName: `${s.firstName} ${s.lastName}`, doc }))
    })
    return out.sort((a, b) => {
      const ae = a.doc.expiryDate ?? '9999', be = b.doc.expiryDate ?? '9999'
      return ae.localeCompare(be)
    })
  }, [staff, filterStaff])

  const expiringSoon = allDocs.filter(({ doc }) => doc.expiryDate && doc.expiryDate <= soonIso && doc.expiryDate >= TODAY_ISO).length
  const expired = allDocs.filter(({ doc }) => doc.expiryDate && doc.expiryDate < TODAY_ISO).length

  function handleAddDoc() {
    const updated = staff.map(s => {
      if (s.id !== form.staffId) return s
      const newDoc: StaffDocument = {
        id: uid(), name: form.name, type: form.type,
        uploadedDate: TODAY_ISO, expiryDate: form.expiryDate || null, status: form.status,
      }
      return { ...s, documents: [...s.documents, newDoc] }
    })
    saveStaff(updated)
    setStaff(updated)
    setShowAdd(false)
    setForm({ staffId: staff[0]?.id ?? '', name: '', type: 'wwcc', expiryDate: '', status: 'pending' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {(expiringSoon > 0 || expired > 0) && (
        <div className="mb-5 flex gap-3">
          {expired > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
              <IconAlertCircle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-700">{expired} expired document{expired !== 1 ? 's' : ''}</span>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <IconInfoCircle size={16} className="text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{expiringSoon} expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <SelectPicker value={filterStaff} onChange={setFilterStaff}
          options={[{ value: 'all', label: 'All Staff' }, ...staff.map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]} />
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={16} /> Add Document
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {allDocs.length === 0 && (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-sm text-gray-400">No documents found.</div>
        )}
        {allDocs.map(({ staffName, doc }) => {
          const colors = DOC_STATUS_COLORS[doc.status]
          const isExpiringSoon = doc.expiryDate && doc.expiryDate <= soonIso && doc.expiryDate >= TODAY_ISO
          const isExpired = doc.expiryDate && doc.expiryDate < TODAY_ISO
          return (
            <div key={doc.id} className={`flex items-center gap-4 rounded-2xl border p-4 bg-white shadow-sm ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-amber-200' : 'border-gray-200'}`}>
              <IconFile size={20} className={`shrink-0 ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{staffName} · {DOC_TYPE_LABELS[doc.type]}</p>
                {doc.expiryDate && (
                  <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                    {isExpired ? 'Expired' : 'Expires'} {fmtDate(doc.expiryDate)}
                    {isExpiringSoon && !isExpired && ' — renew soon'}
                  </p>
                )}
              </div>
              <Badge label={doc.status} color={colors.text} bg={colors.bg} />
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconDownload size={15} /></button>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Upload Document</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <ModalSelect label="Staff Member" value={form.staffId} onChange={v => setForm(f => ({...f, staffId: v}))}
                options={staff.map(s => [s.id, `${s.firstName} ${s.lastName}`])} />
              <ModalField label="Document Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
              <ModalSelect label="Type" value={form.type} onChange={v => setForm(f => ({...f, type: v as DocType}))}
                options={[['wwcc','WWCC'],['qualification','Qualification'],['contract','Contract'],['other','Other']]} />
              <ModalField label="Expiry Date (leave blank if none)" value={form.expiryDate} onChange={v => setForm(f => ({...f, expiryDate: v}))} type="date" />
              <ModalSelect label="Status" value={form.status} onChange={v => setForm(f => ({...f, status: v as DocStatus}))}
                options={[['pending','Pending Verification'],['verified','Verified'],['expired','Expired']]} />
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                <div>
                  <IconUpload size={24} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-400">File upload available in production build</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddDoc} disabled={!form.name}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: ACCENT }}>Save Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
