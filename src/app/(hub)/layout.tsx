import Sidebar from '@/components/Sidebar'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f4f6f9' }}>
        {children}
      </main>
    </div>
  )
}
