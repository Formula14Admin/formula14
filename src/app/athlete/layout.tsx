import AthleteNav from '@/components/AthleteNav'

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <AthleteNav />
      <main>{children}</main>
    </div>
  )
}
