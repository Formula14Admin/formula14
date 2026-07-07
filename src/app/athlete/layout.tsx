import AthleteSidebar from '@/components/AthleteSidebar'
import AthleteModuleGuard from '@/components/AthleteModuleGuard'
import ModuleVisibilityProvider from '@/components/ModuleVisibilityProvider'
import AdminViewBanner from '@/components/AdminViewBanner'
import { ActiveAthleteProvider } from '@/lib/activeAthlete'

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleVisibilityProvider>
      <ActiveAthleteProvider>
        <div className="flex h-screen flex-col overflow-hidden">
          <AdminViewBanner />
          <div className="flex flex-1 overflow-hidden">
            <AthleteSidebar />
            <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f4f6f9' }}>
              <AthleteModuleGuard>
                {children}
              </AthleteModuleGuard>
            </main>
          </div>
        </div>
      </ActiveAthleteProvider>
    </ModuleVisibilityProvider>
  )
}
