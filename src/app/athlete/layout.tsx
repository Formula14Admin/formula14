import AthleteSidebar from '@/components/AthleteSidebar'
import AthleteModuleGuard from '@/components/AthleteModuleGuard'
import ModuleVisibilityProvider from '@/components/ModuleVisibilityProvider'
import { ActiveAthleteProvider } from '@/lib/activeAthlete'

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleVisibilityProvider>
      <ActiveAthleteProvider>
        <div className="flex h-screen overflow-hidden">
          <AthleteSidebar />
          <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f4f6f9' }}>
            <AthleteModuleGuard>
              {children}
            </AthleteModuleGuard>
          </main>
        </div>
      </ActiveAthleteProvider>
    </ModuleVisibilityProvider>
  )
}
