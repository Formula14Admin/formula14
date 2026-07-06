'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { IconChevronLeft, IconCheck, IconChevronRight, IconUser } from '@tabler/icons-react'
import { calcCompletionPct, loadProfileFromSupabase, type WizardDraft, EMPTY_DRAFT } from '@/lib/athleteProfile'
import { useActiveAthlete } from '@/lib/activeAthlete'

const ACCENT = '#6BA3D6'

const STEPS = [
  { n: 1,  label: 'Basketball Information', weight: 20 },
  { n: 2,  label: 'Basketball Details',     weight: 5  },
  { n: 3,  label: 'Playing Style',          weight: 5  },
  { n: 4,  label: 'Strengths & Areas',      weight: 10 },
  { n: 5,  label: 'Goals',                  weight: 15 },
  { n: 6,  label: 'Training Habits',        weight: 10 },
  { n: 7,  label: 'Physical Information',   weight: 5  },
  { n: 8,  label: 'Medical Information',    weight: 10 },
  { n: 9,  label: 'Communication',          weight: 5  },
  { n: 10, label: 'Athlete Mindset',        weight: 5  },
  { n: 11, label: 'Additional Information', weight: 10 },
]

export default function AthleteProfilePage() {
  const { data: session } = useSession()
  const { activeId: athleteId } = useActiveAthlete()
  const name     = session?.user?.name  ?? 'Athlete'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const lsKey = athleteId ? `f14_profile_wizard_${athleteId}` : null

  const [draft,  setDraft]  = useState<WizardDraft>(EMPTY_DRAFT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!athleteId || !lsKey) return
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) setDraft(prev => ({ ...prev, ...JSON.parse(raw) }))
    } catch {}
    loadProfileFromSupabase(athleteId).then(remote => {
      if (Object.keys(remote).length > 0) {
        setDraft(prev => ({ ...prev, ...remote }))
      }
    })
    setLoaded(true)
  }, [athleteId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct      = loaded ? calcCompletionPct(draft) : 0
  const complete = pct === 100

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/athlete/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100">
            <IconChevronLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Athlete Profile</h1>
            <p className="text-xs text-gray-400">{pct}% complete</p>
          </div>
          <Link href="/athlete/profile/complete"
            className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: complete ? '#10b981' : ACCENT }}>
            {complete ? 'Edit Profile' : 'Complete Profile →'}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6">

        {/* Progress card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: ACCENT }}>
                {initials}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{name}</p>
                <p className="text-sm text-gray-400">{session?.user?.email}</p>
              </div>
              {complete && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <IconCheck size={16} color="#16a34a" strokeWidth={2.5} />
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500">Profile Completion</span>
                <span className="text-xs font-bold" style={{ color: complete ? '#10b981' : ACCENT }}>{pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: complete ? '#10b981' : ACCENT }} />
              </div>
              {!complete && (
                <p className="mt-2 text-xs text-gray-400">Complete your profile so your coach can personalise your sessions.</p>
              )}
            </div>
          </div>
        </div>

        {/* Steps checklist */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-gray-900">Profile Steps</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {STEPS.map(s => {
              const done = draft.completedSteps.includes(s.n)
              return (
                <Link key={s.n} href={`/athlete/profile/complete?step=${s.n}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={done
                      ? { backgroundColor: '#10b981' }
                      : { backgroundColor: '#f3f4f6' }}>
                    {done
                      ? <IconCheck size={13} color="#fff" strokeWidth={3} />
                      : <span className="text-[11px] font-bold text-gray-400">{s.n}</span>}
                  </span>
                  <span className={`flex-1 text-sm font-medium ${done ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</span>
                  <span className="text-[10px] font-semibold text-gray-300">{s.weight}%</span>
                  <IconChevronRight size={14} className="text-gray-300" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Profile summary (only show filled fields) */}
        {loaded && (draft.primaryPosition || draft.strengths || draft.goal12Months || draft.mindset) && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-sm font-bold text-gray-900">Profile Summary</h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              {draft.primaryPosition && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">Position</span>
                  <span className="text-gray-800">{draft.primaryPosition}{draft.secondaryPosition ? ` / ${draft.secondaryPosition}` : ''}</span>
                </div>
              )}
              {draft.dominantHand && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">Hand</span>
                  <span className="text-gray-800">{draft.dominantHand}</span>
                </div>
              )}
              {draft.playingStyles.length > 0 && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">Style</span>
                  <span className="text-gray-800">{draft.playingStyles.join(', ')}</span>
                </div>
              )}
              {draft.strengths && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">Strengths</span>
                  <span className="text-gray-800 line-clamp-2">{draft.strengths}</span>
                </div>
              )}
              {draft.goal12Months && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">12-month goal</span>
                  <span className="text-gray-800 line-clamp-2">{draft.goal12Months}</span>
                </div>
              )}
              {draft.mindset && (
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-semibold text-gray-400">Mindset</span>
                  <span className="text-gray-800">{draft.mindset}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!complete && (
          <Link href="/athlete/profile/complete"
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            <IconUser size={16} />
            Continue Completing Profile
          </Link>
        )}
      </div>
    </div>
  )
}
