'use client'

import { IconTarget } from '@tabler/icons-react'

export default function ShootingTestPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: '#6BA3D6' + '18' }}
        >
          <IconTarget size={28} style={{ color: '#6BA3D6' }} strokeWidth={1.5} />
        </div>
        <span
          className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
          style={{ backgroundColor: '#6BA3D6' + '15', color: '#6BA3D6' }}
        >
          Coming Soon
        </span>
        <h1 className="mb-2 mt-3 text-2xl font-bold text-gray-900">Shooting Test &amp; Leaderboards</h1>
        <p className="text-sm text-gray-500">Run standardised shooting tests and track athlete leaderboards</p>
      </div>
    </div>
  )
}
