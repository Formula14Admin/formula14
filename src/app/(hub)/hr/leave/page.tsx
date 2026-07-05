'use client'

import { useState, useEffect } from 'react'
import { loadStaff, StaffMember } from '../../team/_shared'
import { LeaveTab } from '../_leave'

export default function LeavePage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  useEffect(() => { setStaff(loadStaff()) }, [])
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Leave</h1>
        <p className="text-sm text-gray-500">Leave requests and balances</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeaveTab staff={staff} />
      </div>
    </div>
  )
}
