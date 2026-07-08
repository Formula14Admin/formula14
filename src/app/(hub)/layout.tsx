import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import BookingNotificationBell from '@/components/BookingNotificationBell'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={<div className="hidden md:block md:w-64 md:shrink-0" style={{ backgroundColor: '#1a1a1a' }} />}>
        <Sidebar />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0" style={{ backgroundColor: '#f4f6f9' }}>
        {children}
      </main>
      <BookingNotificationBell />
    </div>
  )
}
