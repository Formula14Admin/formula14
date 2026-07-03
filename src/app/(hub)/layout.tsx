import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="w-64 shrink-0" style={{ backgroundColor: '#1a1a1a' }} />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f4f6f9' }}>
        {children}
      </main>
    </div>
  )
}
