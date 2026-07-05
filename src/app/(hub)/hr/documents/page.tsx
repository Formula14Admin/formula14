'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStaff, saveStaff, StaffMember } from '../../team/_shared'
import { DocumentsTab } from '../_documents'

export default function DocumentsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  useEffect(() => { setStaff(loadStaff()) }, [])
  const handleSetStaff = useCallback((s: StaffMember[]) => { saveStaff(s); setStaff(s) }, [])
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500">Staff documents and compliance files</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DocumentsTab staff={staff} setStaff={handleSetStaff} />
      </div>
    </div>
  )
}
