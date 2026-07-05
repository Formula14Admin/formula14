'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { IconCheck, IconChevronLeft } from '@tabler/icons-react'

const ACCENT = '#6BA3D6'
const LS_KEY = 'f14_athlete_profile'

interface AthleteProfile {
  // Playing background
  yearsPlaying:     string
  position:         string
  currentClub:      string
  competitionLevel: string
  repExperience:    string
  // Goals
  shortTermGoal:    string
  longTermGoal:     string
  primaryImprovement: string
  // Training
  strengths:        string
  weaknesses:       string
  trainingStyle:    string
  trainingFrequency: string
  // Additional
  dominantHand:     string
  height:           string
  weight:           string
  injuries:         string
  howHeard:         string
}

const EMPTY: AthleteProfile = {
  yearsPlaying: '', position: '', currentClub: '', competitionLevel: '', repExperience: '',
  shortTermGoal: '', longTermGoal: '', primaryImprovement: '',
  strengths: '', weaknesses: '', trainingStyle: '', trainingFrequency: '',
  dominantHand: '', height: '', weight: '', injuries: '', howHeard: '',
}

const REQUIRED_FIELDS: (keyof AthleteProfile)[] = [
  'yearsPlaying', 'position', 'shortTermGoal', 'longTermGoal',
  'strengths', 'weaknesses', 'trainingFrequency',
]

function pctComplete(p: AthleteProfile): number {
  const done = REQUIRED_FIELDS.filter(k => p[k].trim() !== '').length
  return Math.round((done / REQUIRED_FIELDS.length) * 100)
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const LABEL = 'mb-1.5 block text-sm font-semibold text-gray-700'
const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const TEXTAREA = INPUT + ' resize-none'
const SELECT = INPUT + ' cursor-pointer'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-5 px-6 py-5">{children}</div>
    </div>
  )
}

function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const sel = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(sel ? '' : opt)}
            className="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
            style={sel
              ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff' }
              : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AthleteProfilePage() {
  const { data: session } = useSession()
  const name     = session?.user?.name  ?? 'Athlete'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const [profile,  setProfile]  = useState<AthleteProfile>(EMPTY)
  const [saved,    setSaved]    = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setProfile(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [])

  function set<K extends keyof AthleteProfile>(key: K, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)) } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const pct       = loaded ? pctComplete(profile) : 0
  const isComplete = pct === 100

  if (!loaded) return null

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/athlete/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100">
              <IconChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">Athlete Profile</h1>
              <p className="text-xs text-gray-400">{pct}% complete</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="hidden sm:flex flex-1 max-w-[160px] flex-col gap-1">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: isComplete ? '#10b981' : ACCENT }}
              />
            </div>
          </div>
          <button
            type="button"
            form="profile-form"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: saved ? '#10b981' : ACCENT }}
          >
            {saved ? <><IconCheck size={14} strokeWidth={3} /> Saved</> : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">

        {/* Completion callout */}
        {isComplete ? (
          <div className="flex items-center gap-3 rounded-2xl bg-green-50 px-5 py-4" style={{ border: '1.5px solid #86efac' }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
              <IconCheck size={18} color="#16a34a" strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-bold text-green-900">Profile complete</p>
              <p className="text-sm text-green-700">Your coach has everything they need to personalise your sessions.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <div className="shrink-0 text-center">
              <span className="text-2xl font-black" style={{ color: ACCENT }}>{pct}%</span>
              <p className="text-[10px] font-semibold text-gray-400">complete</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Almost there — finish your profile</p>
              <p className="mt-0.5 text-xs text-gray-500">Your coach uses this to tailor your training and track your development.</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
              </div>
            </div>
          </div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: ACCENT }}>
            {initials}
          </div>
          <div>
            <p className="font-bold text-gray-900">{name}</p>
            <p className="text-sm text-gray-400">{session?.user?.email}</p>
          </div>
        </div>

        <form id="profile-form" onSubmit={handleSave} className="space-y-5">

          {/* ── Section 1: Your Game ─────────────────────────────────── */}
          <Section title="Your Game">
            <div>
              <label className={LABEL}>How long have you been playing basketball? <span className="text-red-400">*</span></label>
              <ChipGroup
                options={['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years']}
                value={profile.yearsPlaying}
                onChange={v => set('yearsPlaying', v)}
              />
            </div>

            <div>
              <label className={LABEL}>Primary position <span className="text-red-400">*</span></label>
              <ChipGroup
                options={['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Centre', 'Multiple']}
                value={profile.position}
                onChange={v => set('position', v)}
              />
            </div>

            <div>
              <label className={LABEL}>Current club or team <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={profile.currentClub} onChange={e => set('currentClub', e.target.value)} placeholder="e.g. Sydney Kings Academy" className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>Competition level</label>
              <select value={profile.competitionLevel} onChange={e => set('competitionLevel', e.target.value)} className={SELECT}>
                <option value="">Select level…</option>
                <option>Recreational</option>
                <option>School sport</option>
                <option>Junior club</option>
                <option>Junior representative</option>
                <option>Senior club</option>
                <option>Senior representative</option>
                <option>Semi-professional</option>
              </select>
            </div>

            <div>
              <label className={LABEL}>Representative experience</label>
              <ChipGroup
                options={['None', 'Local / Regional', 'State level', 'National level']}
                value={profile.repExperience}
                onChange={v => set('repExperience', v)}
              />
            </div>
          </Section>

          {/* ── Section 2: Goals ─────────────────────────────────────── */}
          <Section title="Your Goals">
            <div>
              <label className={LABEL}>Short-term goal (next 3 months) <span className="text-red-400">*</span></label>
              <textarea
                rows={3} value={profile.shortTermGoal}
                onChange={e => set('shortTermGoal', e.target.value)}
                placeholder="e.g. Improve my off-the-dribble shooting consistency"
                className={TEXTAREA}
              />
            </div>

            <div>
              <label className={LABEL}>Long-term goal <span className="text-red-400">*</span></label>
              <textarea
                rows={3} value={profile.longTermGoal}
                onChange={e => set('longTermGoal', e.target.value)}
                placeholder="e.g. Make the U18 state representative squad"
                className={TEXTAREA}
              />
            </div>

            <div>
              <label className={LABEL}>What aspect of your game do you most want to improve?</label>
              <ChipGroup
                options={['Shooting', 'Ball handling', 'Defence', 'Athleticism', 'Basketball IQ', 'Leadership', 'Finishing']}
                value={profile.primaryImprovement}
                onChange={v => set('primaryImprovement', v)}
              />
            </div>
          </Section>

          {/* ── Section 3: Self-Assessment ───────────────────────────── */}
          <Section title="Self-Assessment">
            <div>
              <label className={LABEL}>My biggest strengths <span className="text-red-400">*</span></label>
              <textarea
                rows={3} value={profile.strengths}
                onChange={e => set('strengths', e.target.value)}
                placeholder="e.g. Court vision, three-point shooting, competitiveness"
                className={TEXTAREA}
              />
            </div>

            <div>
              <label className={LABEL}>Areas I want to work on <span className="text-red-400">*</span></label>
              <textarea
                rows={3} value={profile.weaknesses}
                onChange={e => set('weaknesses', e.target.value)}
                placeholder="e.g. Left-hand finishing, lateral quickness, free throws"
                className={TEXTAREA}
              />
            </div>

            <div>
              <label className={LABEL}>How do you prefer to train?</label>
              <ChipGroup
                options={['Solo drills', 'Small group', 'Large group', 'Mix of everything']}
                value={profile.trainingStyle}
                onChange={v => set('trainingStyle', v)}
              />
            </div>

            <div>
              <label className={LABEL}>Sessions per week you are targeting <span className="text-red-400">*</span></label>
              <ChipGroup
                options={['1', '2', '3', '4', '5+']}
                value={profile.trainingFrequency}
                onChange={v => set('trainingFrequency', v)}
              />
            </div>
          </Section>

          {/* ── Section 4: Additional Information ───────────────────── */}
          <Section title="Additional Information">
            <div>
              <label className={LABEL}>Dominant hand</label>
              <ChipGroup
                options={['Right', 'Left', 'Ambidextrous']}
                value={profile.dominantHand}
                onChange={v => set('dominantHand', v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Height <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={profile.height} onChange={e => set('height', e.target.value)} placeholder="e.g. 183 cm" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Weight <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={profile.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 78 kg" className={INPUT} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Any injuries or physical limitations we should know about? <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                rows={2} value={profile.injuries}
                onChange={e => set('injuries', e.target.value)}
                placeholder="e.g. Left ankle sprain recovering, avoid high-impact landing drills"
                className={TEXTAREA}
              />
            </div>

            <div>
              <label className={LABEL}>How did you hear about Formula14?</label>
              <select value={profile.howHeard} onChange={e => set('howHeard', e.target.value)} className={SELECT}>
                <option value="">Select…</option>
                <option>Social media</option>
                <option>Friend or family referral</option>
                <option>Coach referral</option>
                <option>Google / online search</option>
                <option>School or academy</option>
                <option>Saw a game or event</option>
                <option>Other</option>
              </select>
            </div>
          </Section>

          {/* Save */}
          <button
            type="submit"
            className="w-full rounded-2xl py-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: saved ? '#10b981' : ACCENT }}
          >
            {saved ? '✓ Profile Saved' : 'Save Profile'}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            <span className="text-red-400">*</span> Required fields are used by your coach before your first session.
          </p>
        </form>
      </div>
    </div>
  )
}
