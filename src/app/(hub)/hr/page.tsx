'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStaff, saveStaff, StaffMember } from '../team/_shared'
import { loadAppRoles, saveAppRoles, AppRoleMap } from './_shared'
import { PeopleTab } from './_people'

export default function HRPage() {
  const [staff,     setStaff]     = useState<StaffMember[]>([])
  const [appRoles,  setAppRoles]  = useState<AppRoleMap>({})
  const [loaded,    setLoaded]    = useState(false)

  useEffect(() => {
    setStaff(loadStaff())
    setAppRoles(loadAppRoles())
    setLoaded(true)
  }, [])

  const handleSetStaff     = useCallback((s: StaffMember[]) => { saveStaff(s);     setStaff(s)    }, [])
  const handleSetAppRoles  = useCallback((r: AppRoleMap)    => { saveAppRoles(r);  setAppRoles(r) }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">People</h1>
        <p className="text-sm text-gray-500">Staff directory and profiles</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {loaded && (
          <PeopleTab
            staff={staff}
            setStaff={handleSetStaff}
            appRoles={appRoles}
            setAppRoles={handleSetAppRoles}
          />
        )}
      </div>
    </div>
  )
}
