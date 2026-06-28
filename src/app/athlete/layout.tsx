import AthleteSidebar from '@/components/AthleteSidebar'

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AthleteSidebar />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f4f6f9' }}>
        {children}
      </main>
    </div>
  )
}
