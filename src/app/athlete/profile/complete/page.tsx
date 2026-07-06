'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconCheck, IconLock, IconPlus, IconTrash, IconChevronLeft, IconArrowLeft } from '@tabler/icons-react'
import {
  type WizardDraft, EMPTY_DRAFT,
  BLANK_DOMESTIC, BLANK_JR_REP, BLANK_SCHOOL, BLANK_BIGV,
  BLANK_COLLEGIATE, BLANK_PATHWAY, BLANK_PROFESSIONAL, BLANK_OTHER,
  calcCompletionPct, saveProfileToSupabase, loadProfileFromSupabase,
} from '@/lib/athleteProfile'
import { useActiveAthlete } from '@/lib/activeAthlete'

const ACCENT   = '#6BA3D6'

// ── Step definitions ──────────────────────────────────────────────────────────

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

// ── Shared form primitives ────────────────────────────────────────────────────

const LBL = 'mb-1.5 block text-sm font-semibold text-gray-700'
const INP = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const SEL = INP + ' cursor-pointer'
const TXA = INP + ' resize-none'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={LBL}>{label}{required && <span className="ml-1 text-red-400">*</span>}</label>
      {children}
    </div>
  )
}

function Chips({ options, value, onChange, multi = true }: {
  options: string[]; value: string | string[]
  onChange: (v: string | string[]) => void; multi?: boolean
}) {
  function toggle(opt: string) {
    if (!multi) { onChange(value === opt ? '' : opt); return }
    const arr = value as string[]
    onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
  }
  const isSelected = (opt: string) => Array.isArray(value) ? value.includes(opt) : value === opt
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
          style={isSelected(opt)
            ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff' }
            : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return <h3 className="mb-4 mt-2 border-b border-gray-100 pb-2 text-xs font-bold uppercase tracking-widest text-gray-400">{label}</h3>
}

// ── Basketball level card grid ─────────────────────────────────────────────────

const LEVEL_CARDS = [
  { id: 'domestic',   label: 'Domestic Basketball',                        note: '' },
  { id: 'junior_rep', label: 'Junior Representative Basketball',           note: '' },
  { id: 'school',     label: 'School Basketball',                          note: '' },
  { id: 'bv_pathway', label: 'BV High Performance Pathways',               note: '' },
  { id: 'bigv_nbl1',  label: 'Big V / NBL1',                              note: '' },
  { id: 'ba_pathway', label: 'BA High Performance Pathways',               note: '' },
  { id: 'collegiate', label: 'Collegiate Basketball',                       note: '' },
  { id: 'nbl',        label: 'NBL',                                        note: 'Male' },
  { id: 'wnbl',       label: 'WNBL',                                       note: 'Female' },
  { id: 'nba',        label: 'NBA',                                        note: 'Male' },
  { id: 'wnba',       label: 'WNBA',                                       note: 'Female' },
  { id: 'other',      label: 'Other',                                      note: '' },
]

const POSITIONS = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Centre']
const AGE_GROUPS = ['U8','U10','U12','U14','U16','U18','U20','U23','Opens','Seniors']

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
      <IconPlus size={13} /> Add Another
    </button>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-400 transition hover:border-red-200 hover:text-red-500">
      <IconTrash size={12} /> Remove
    </button>
  )
}

// ── Step 1 sub-forms ──────────────────────────────────────────────────────────

function DomesticSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const teams = draft.domestic
  function update(i: number, key: keyof typeof teams[0], val: string | boolean) {
    setDraft(p => { const next = [...p.domestic]; next[i] = { ...next[i], [key]: val }; return { ...p, domestic: next } })
  }
  return (
    <div className="space-y-4">
      {teams.map((t, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Team {i + 1}</span>
            {teams.length > 1 && <RemoveBtn onClick={() => setDraft(p => ({ ...p, domestic: p.domestic.filter((_,j)=>j!==i) }))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Club"><input className={INP} value={t.club} onChange={e=>update(i,'club',e.target.value)} placeholder="Club name" /></Field>
            <Field label="Age Group"><select className={SEL} value={t.ageGroup} onChange={e=>update(i,'ageGroup',e.target.value)}><option value="">Select…</option>{AGE_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
            <Field label="Team Name"><input className={INP} value={t.teamName} onChange={e=>update(i,'teamName',e.target.value)} placeholder="e.g. Kings Red" /></Field>
            <Field label="Division"><input className={INP} value={t.division} onChange={e=>update(i,'division',e.target.value)} placeholder="e.g. Division 1" /></Field>
            <Field label="Position"><select className={SEL} value={t.primaryPosition} onChange={e=>update(i,'primaryPosition',e.target.value)}><option value="">Select…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></Field>
            <Field label="Coach Name"><input className={INP} value={t.coachName} onChange={e=>update(i,'coachName',e.target.value)} placeholder="Coach's name" /></Field>
          </div>
          <Field label="Coach Contact"><input className={INP} value={t.coachContact} onChange={e=>update(i,'coachContact',e.target.value)} placeholder="Phone or email" /></Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={t.isCurrent} onChange={e=>update(i,'isCurrent',e.target.checked)} className="rounded accent-[#6BA3D6]" />
            Currently playing for this team
          </label>
        </div>
      ))}
      <AddBtn onClick={() => setDraft(p => ({ ...p, domestic: [...p.domestic, { ...BLANK_DOMESTIC }] }))} />
    </div>
  )
}

function JuniorRepSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const entries = draft.juniorRep
  function update(i: number, key: keyof typeof entries[0], val: string | boolean) {
    setDraft(p => { const next = [...p.juniorRep]; next[i] = { ...next[i], [key]: val }; return { ...p, juniorRep: next } })
  }
  return (
    <div className="space-y-4">
      {entries.map((t, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Entry {i + 1}</span>
            {entries.length > 1 && <RemoveBtn onClick={() => setDraft(p => ({ ...p, juniorRep: p.juniorRep.filter((_,j)=>j!==i) }))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Association"><input className={INP} value={t.association} onChange={e=>update(i,'association',e.target.value)} placeholder="e.g. Metro North" /></Field>
            <Field label="Age Group"><select className={SEL} value={t.ageGroup} onChange={e=>update(i,'ageGroup',e.target.value)}><option value="">Select…</option>{AGE_GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
            <Field label="Team"><input className={INP} value={t.team} onChange={e=>update(i,'team',e.target.value)} placeholder="Team name" /></Field>
            <Field label="Grade"><input className={INP} value={t.grade} onChange={e=>update(i,'grade',e.target.value)} placeholder="e.g. A Grade" /></Field>
            <Field label="Position"><select className={SEL} value={t.primaryPosition} onChange={e=>update(i,'primaryPosition',e.target.value)}><option value="">Select…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></Field>
            <Field label="Coach Name"><input className={INP} value={t.coachName} onChange={e=>update(i,'coachName',e.target.value)} placeholder="Coach's name" /></Field>
          </div>
          <Field label="Coach Contact"><input className={INP} value={t.coachContact} onChange={e=>update(i,'coachContact',e.target.value)} placeholder="Phone or email" /></Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={t.isCurrent} onChange={e=>update(i,'isCurrent',e.target.checked)} className="rounded accent-[#6BA3D6]" />
            Currently playing
          </label>
        </div>
      ))}
      <AddBtn onClick={() => setDraft(p => ({ ...p, juniorRep: [...p.juniorRep, { ...BLANK_JR_REP }] }))} />
    </div>
  )
}

function SchoolSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const entries = draft.school
  function update(i: number, key: keyof typeof entries[0], val: string | boolean) {
    setDraft(p => { const next = [...p.school]; next[i] = { ...next[i], [key]: val }; return { ...p, school: next } })
  }
  return (
    <div className="space-y-4">
      {entries.map((t, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">School {i + 1}</span>
            {entries.length > 1 && <RemoveBtn onClick={() => setDraft(p => ({ ...p, school: p.school.filter((_,j)=>j!==i) }))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="School"><input className={INP} value={t.school} onChange={e=>update(i,'school',e.target.value)} placeholder="School name" /></Field>
            <Field label="Year Level"><input className={INP} value={t.yearLevel} onChange={e=>update(i,'yearLevel',e.target.value)} placeholder="e.g. Year 10" /></Field>
            <Field label="Team"><input className={INP} value={t.team} onChange={e=>update(i,'team',e.target.value)} placeholder="e.g. 1st V" /></Field>
            <Field label="Coach"><input className={INP} value={t.coach} onChange={e=>update(i,'coach',e.target.value)} placeholder="Coach's name" /></Field>
            <Field label="Position"><select className={SEL} value={t.primaryPosition} onChange={e=>update(i,'primaryPosition',e.target.value)}><option value="">Select…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={t.isCurrent} onChange={e=>update(i,'isCurrent',e.target.checked)} className="rounded accent-[#6BA3D6]" />
            Currently at this school
          </label>
        </div>
      ))}
      <AddBtn onClick={() => setDraft(p => ({ ...p, school: [...p.school, { ...BLANK_SCHOOL }] }))} />
    </div>
  )
}

function BigvSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const t = draft.bigvNbl1
  function update(key: keyof typeof t, val: string | boolean) {
    setDraft(p => ({ ...p, bigvNbl1: { ...p.bigvNbl1, [key]: val } }))
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Association"><input className={INP} value={t.association} onChange={e=>update('association',e.target.value)} placeholder="e.g. Basketball Victoria" /></Field>
        <Field label="League"><input className={INP} value={t.league} onChange={e=>update('league',e.target.value)} placeholder="e.g. NBL1 South" /></Field>
        <Field label="Division"><input className={INP} value={t.division} onChange={e=>update('division',e.target.value)} placeholder="e.g. Men's" /></Field>
        <Field label="Team"><input className={INP} value={t.team} onChange={e=>update('team',e.target.value)} placeholder="Team name" /></Field>
        <Field label="Position"><select className={SEL} value={t.primaryPosition} onChange={e=>update('primaryPosition',e.target.value)}><option value="">Select…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select></Field>
        <Field label="Coach"><input className={INP} value={t.coach} onChange={e=>update('coach',e.target.value)} placeholder="Coach's name" /></Field>
      </div>
      <Field label="Junior Playing History"><textarea className={TXA} rows={2} value={t.juniorPlayingHistory} onChange={e=>update('juniorPlayingHistory',e.target.value)} placeholder="Brief junior playing background…" /></Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={t.isCurrent} onChange={e=>update('isCurrent',e.target.checked)} className="rounded accent-[#6BA3D6]" />
        Currently playing in this competition
      </label>
    </div>
  )
}

function PathwaySubForm({ entries, onChange, label }: {
  entries: WizardDraft['bvPathways']
  onChange: (next: typeof entries) => void
  label: string
}) {
  const PROGRAMS_BV = ['Centre of Excellence','Emerging Talent Program','Boomers Academy','Opals Academy','Other']
  const PROGRAMS_BA = ['Australian Boomers','Australian Opals','Junior Boomers','Junior Opals','3×3 Australia','Rollers','Gliders','Other']
  const programs = label.startsWith('BV') ? PROGRAMS_BV : PROGRAMS_BA

  function update(i: number, key: keyof typeof entries[0], val: string) {
    const next = [...entries]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }
  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Entry {i + 1}</span>
            {entries.length > 1 && <RemoveBtn onClick={() => onChange(entries.filter((_,j)=>j!==i))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Program">
              <select className={SEL} value={e.program} onChange={ev=>update(i,'program',ev.target.value)}>
                <option value="">Select…</option>{programs.map(p=><option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Year"><input type="number" className={INP} value={e.year} onChange={ev=>update(i,'year',ev.target.value)} placeholder="e.g. 2024" min="2000" max="2035" /></Field>
            <Field label="Status">
              <select className={SEL} value={e.participationStatus} onChange={ev=>update(i,'participationStatus',ev.target.value)}>
                <option value="current">Current</option><option value="previous">Previous</option>
              </select>
            </Field>
            <Field label="Coach"><input className={INP} value={e.coach} onChange={ev=>update(i,'coach',ev.target.value)} placeholder="Coach's name" /></Field>
          </div>
          <Field label="Notes"><textarea className={TXA} rows={2} value={e.notes} onChange={ev=>update(i,'notes',ev.target.value)} placeholder="Any additional notes…" /></Field>
        </div>
      ))}
      <AddBtn onClick={() => onChange([...entries, { ...BLANK_PATHWAY }])} />
    </div>
  )
}

function ProfessionalSubForm({ entries, onChange, league }: {
  entries: WizardDraft['nbl']; onChange: (n: typeof entries) => void; league: string
}) {
  function update(i: number, key: keyof typeof entries[0], val: string) {
    const next = [...entries]; next[i] = { ...next[i], [key]: val }; onChange(next)
  }
  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">{league} Season {i + 1}</span>
            {entries.length > 1 && <RemoveBtn onClick={() => onChange(entries.filter((_,j)=>j!==i))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Organisation / Club"><input className={INP} value={e.organisation} onChange={ev=>update(i,'organisation',ev.target.value)} placeholder="Team name" /></Field>
            <Field label="Season"><input type="number" className={INP} value={e.season} onChange={ev=>update(i,'season',ev.target.value)} placeholder="e.g. 2024" /></Field>
            <Field label="Contract Type"><input className={INP} value={e.contractType} onChange={ev=>update(i,'contractType',ev.target.value)} placeholder="e.g. Standard, 10-Day" /></Field>
            <Field label="Head Coach"><input className={INP} value={e.coach} onChange={ev=>update(i,'coach',ev.target.value)} placeholder="Coach's name" /></Field>
          </div>
        </div>
      ))}
      <AddBtn onClick={() => onChange([...entries, { ...BLANK_PROFESSIONAL }])} />
    </div>
  )
}

function CollegiateSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const t = draft.collegiate
  function update(key: keyof typeof t, val: string | boolean) {
    setDraft(p => ({ ...p, collegiate: { ...p.collegiate, [key]: val } }))
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="College / University"><input className={INP} value={t.collegeUniversity} onChange={e=>update('collegeUniversity',e.target.value)} placeholder="e.g. University of Arizona" /></Field>
        <Field label="Division"><input className={INP} value={t.division} onChange={e=>update('division',e.target.value)} placeholder="e.g. NCAA D1" /></Field>
        <Field label="Conference"><input className={INP} value={t.conference} onChange={e=>update('conference',e.target.value)} placeholder="e.g. Pac-12" /></Field>
        <Field label="Year in Program">
          <select className={SEL} value={t.yearInProgram} onChange={e=>update('yearInProgram',e.target.value)}>
            <option value="">Select…</option>
            {['Freshman','Sophomore','Junior','Senior','Graduate'].map(y=><option key={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Head Coach"><input className={INP} value={t.coach} onChange={e=>update('coach',e.target.value)} placeholder="Coach's name" /></Field>
      </div>
      <Field label="Playing History"><textarea className={TXA} rows={2} value={t.playingHistory} onChange={e=>update('playingHistory',e.target.value)} placeholder="Brief history…" /></Field>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={t.isCurrent} onChange={e=>update('isCurrent',e.target.checked)} className="rounded accent-[#6BA3D6]" />
        Currently playing collegiate basketball
      </label>
    </div>
  )
}

function OtherSubForm({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const entries = draft.otherComp
  function update(i: number, key: keyof typeof entries[0], val: string) {
    setDraft(p => { const next = [...p.otherComp]; next[i] = { ...next[i], [key]: val }; return { ...p, otherComp: next } })
  }
  return (
    <div className="space-y-4">
      {entries.map((e, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Competition {i + 1}</span>
            {entries.length > 1 && <RemoveBtn onClick={() => setDraft(p => ({ ...p, otherComp: p.otherComp.filter((_,j)=>j!==i) }))} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Competition Name"><input className={INP} value={e.competitionName} onChange={ev=>update(i,'competitionName',ev.target.value)} placeholder="Name of competition" /></Field>
            <Field label="Organisation"><input className={INP} value={e.organisation} onChange={ev=>update(i,'organisation',ev.target.value)} placeholder="Organising body" /></Field>
            <Field label="Team"><input className={INP} value={e.team} onChange={ev=>update(i,'team',ev.target.value)} placeholder="Team name" /></Field>
          </div>
          <Field label="Description"><textarea className={TXA} rows={2} value={e.description} onChange={ev=>update(i,'description',ev.target.value)} placeholder="Brief description…" /></Field>
        </div>
      ))}
      <AddBtn onClick={() => setDraft(p => ({ ...p, otherComp: [...p.otherComp, { ...BLANK_OTHER }] }))} />
    </div>
  )
}

// ── Step renderers ────────────────────────────────────────────────────────────

function Step1({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  function toggleLevel(id: string) {
    setDraft(p => ({
      ...p,
      selectedLevels: p.selectedLevels.includes(id)
        ? p.selectedLevels.filter(l => l !== id)
        : [...p.selectedLevels, id],
    }))
  }
  const selected = draft.selectedLevels
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-sm font-semibold text-gray-700">What level(s) of basketball do you currently or have previously participated in?</p>
        <p className="mb-4 text-xs text-gray-400">Select all that apply.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LEVEL_CARDS.map(c => {
            const sel = selected.includes(c.id)
            return (
              <button key={c.id} type="button" onClick={() => toggleLevel(c.id)}
                className="relative flex flex-col items-start rounded-xl border p-3 text-left transition"
                style={sel
                  ? { backgroundColor: `${ACCENT}12`, borderColor: ACCENT }
                  : { backgroundColor: '#fafafa', borderColor: '#e5e7eb' }}>
                {sel && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT }}><IconCheck size={11} color="#fff" strokeWidth={3} /></span>}
                <span className="text-sm font-semibold text-gray-900">{c.label}</span>
                {c.note && <span className="mt-0.5 text-[10px] font-medium text-gray-400">{c.note}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="space-y-6">
          {selected.includes('domestic')   && <><SectionDivider label="Domestic Basketball" /><DomesticSubForm draft={draft} setDraft={setDraft} /></>}
          {selected.includes('junior_rep') && <><SectionDivider label="Junior Representative Basketball" /><JuniorRepSubForm draft={draft} setDraft={setDraft} /></>}
          {selected.includes('school')     && <><SectionDivider label="School Basketball" /><SchoolSubForm draft={draft} setDraft={setDraft} /></>}
          {selected.includes('bigv_nbl1')  && <><SectionDivider label="Big V / NBL1" /><BigvSubForm draft={draft} setDraft={setDraft} /></>}
          {selected.includes('bv_pathway') && <><SectionDivider label="BV High Performance Pathways" /><PathwaySubForm label="BV" entries={draft.bvPathways} onChange={next => setDraft(p=>({...p,bvPathways:next}))} /></>}
          {selected.includes('ba_pathway') && <><SectionDivider label="BA High Performance Pathways" /><PathwaySubForm label="BA" entries={draft.baPathways} onChange={next => setDraft(p=>({...p,baPathways:next}))} /></>}
          {selected.includes('collegiate') && <><SectionDivider label="Collegiate Basketball" /><CollegiateSubForm draft={draft} setDraft={setDraft} /></>}
          {selected.includes('nbl')  && <><SectionDivider label="NBL" /><ProfessionalSubForm league="NBL"  entries={draft.nbl}  onChange={next=>setDraft(p=>({...p,nbl:next}))}  /></>}
          {selected.includes('wnbl') && <><SectionDivider label="WNBL" /><ProfessionalSubForm league="WNBL" entries={draft.wnbl} onChange={next=>setDraft(p=>({...p,wnbl:next}))} /></>}
          {selected.includes('nba')  && <><SectionDivider label="NBA" /><ProfessionalSubForm league="NBA"  entries={draft.nba}  onChange={next=>setDraft(p=>({...p,nba:next}))}  /></>}
          {selected.includes('wnba') && <><SectionDivider label="WNBA" /><ProfessionalSubForm league="WNBA" entries={draft.wnba} onChange={next=>setDraft(p=>({...p,wnba:next}))} /></>}
          {selected.includes('other')      && <><SectionDivider label="Other Competitions" /><OtherSubForm draft={draft} setDraft={setDraft} /></>}
        </div>
      )}
    </div>
  )
}

function Step2({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  function set(key: keyof WizardDraft, val: string) { setDraft(p=>({...p,[key]:val})) }
  return (
    <div className="space-y-5">
      <Field label="Primary Position" required>
        <select className={SEL} value={draft.primaryPosition} onChange={e=>set('primaryPosition',e.target.value)}>
          <option value="">Select position…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Secondary Position">
        <select className={SEL} value={draft.secondaryPosition} onChange={e=>set('secondaryPosition',e.target.value)}>
          <option value="">None / Select…</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Dominant Hand" required>
        <Chips options={['Right','Left','Both']} value={draft.dominantHand} onChange={v=>set('dominantHand',v as string)} multi={false} />
      </Field>
    </div>
  )
}

function Step3({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const STYLES = ['Shooter','Slasher','Playmaker','Defender','Rebounder','Athletic Finisher','High IQ Player','Energy Player','Versatile','Post Player']
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select all playing styles that describe your game.</p>
      <Chips options={STYLES} value={draft.playingStyles} onChange={v=>setDraft(p=>({...p,playingStyles:v as string[]}))} />
    </div>
  )
}

function Step4({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const AREAS = ['Shooting','Finishing','Ball Handling','Passing','Decision Making','Basketball IQ','Footwork','Defence','Rebounding','Strength','Speed','Agility','Conditioning','Confidence','Leadership','Mental Toughness','Other']
  return (
    <div className="space-y-5">
      <Field label="My biggest strengths" required>
        <textarea className={TXA} rows={3} value={draft.strengths} onChange={e=>setDraft(p=>({...p,strengths:e.target.value}))} placeholder="e.g. Court vision, three-point shooting, competitiveness under pressure" />
      </Field>
      <Field label="Areas I want to work on" required>
        <div className="mb-3">
          <Chips options={AREAS} value={draft.areasToImprove} onChange={v=>setDraft(p=>({...p,areasToImprove:v as string[]}))} />
        </div>
      </Field>
    </div>
  )
}

function Step5({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  return (
    <div className="space-y-5">
      <Field label="Biggest basketball goal over the next 12 months" required>
        <textarea className={TXA} rows={3} value={draft.goal12Months} onChange={e=>setDraft(p=>({...p,goal12Months:e.target.value}))} placeholder="What do you want to achieve in the next year?" />
      </Field>
      <Field label="Long term basketball dream">
        <textarea className={TXA} rows={3} value={draft.longTermDream} onChange={e=>setDraft(p=>({...p,longTermDream:e.target.value}))} placeholder="Where do you see yourself in 5–10 years?" />
      </Field>
      <Field label="What do you hope Formula14 helps you achieve?" required>
        <textarea className={TXA} rows={3} value={draft.formula14Goal} onChange={e=>setDraft(p=>({...p,formula14Goal:e.target.value}))} placeholder="e.g. Sharpen my shooting mechanics, improve my athleticism, earn a rep spot" />
      </Field>
    </div>
  )
}

function Step6({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  function set(key: keyof WizardDraft, val: string) { setDraft(p=>({...p,[key]:val})) }
  return (
    <div className="space-y-5">
      <Field label="How many times do you train each week?" required>
        <select className={SEL} value={draft.weeklyTrainingSessions} onChange={e=>set('weeklyTrainingSessions',e.target.value)}>
          <option value="">Select…</option>{['1','2','3','4','5','6','7+'].map(n=><option key={n}>{n}</option>)}
        </select>
      </Field>
      <Field label="How many games per week?">
        <select className={SEL} value={draft.weeklyGames} onChange={e=>set('weeklyGames',e.target.value)}>
          <option value="">Select…</option>{['0','1','2','3+'].map(n=><option key={n}>{n}</option>)}
        </select>
      </Field>
      <Field label="How often do you do individual skill work?">
        <select className={SEL} value={draft.individualSkillFrequency} onChange={e=>set('individualSkillFrequency',e.target.value)}>
          <option value="">Select…</option>
          {['Daily','4–6×/week','2–3×/week','Once a week','Rarely','Never'].map(n=><option key={n}>{n}</option>)}
        </select>
      </Field>
    </div>
  )
}

function Step7({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  function set(key: keyof WizardDraft, val: string) { setDraft(p=>({...p,[key]:val})) }
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">Optional — helps your coach track your physical development over time.</p>
      <div>
        <label className={LBL}>Height</label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(['cm','ft'] as const).map(u=>(
              <button key={u} type="button" onClick={()=>setDraft(p=>({...p,heightUnit:u}))}
                className="px-3 py-2 font-semibold transition"
                style={draft.heightUnit===u?{backgroundColor:ACCENT,color:'#fff'}:{backgroundColor:'#fff',color:'#6b7280'}}>
                {u}
              </button>
            ))}
          </div>
          {draft.heightUnit==='cm'
            ? <input type="number" className={INP} value={draft.heightValue} onChange={e=>set('heightValue',e.target.value)} placeholder="e.g. 183" />
            : <div className="flex gap-2 flex-1">
                <input type="number" className={INP} value={draft.heightFt} onChange={e=>set('heightFt',e.target.value)} placeholder="ft" />
                <input type="number" className={INP} value={draft.heightIn} onChange={e=>set('heightIn',e.target.value)} placeholder="in" />
              </div>}
        </div>
      </div>
      <div>
        <label className={LBL}>Weight</label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(['kg','lbs'] as const).map(u=>(
              <button key={u} type="button" onClick={()=>setDraft(p=>({...p,weightUnit:u}))}
                className="px-3 py-2 font-semibold transition"
                style={draft.weightUnit===u?{backgroundColor:ACCENT,color:'#fff'}:{backgroundColor:'#fff',color:'#6b7280'}}>
                {u}
              </button>
            ))}
          </div>
          <input type="number" className={INP} value={draft.weightValue} onChange={e=>set('weightValue',e.target.value)} placeholder={draft.weightUnit==='kg'?'e.g. 78':'e.g. 172'} />
        </div>
      </div>
      <Field label="Wingspan (cm) — optional"><input type="number" className={INP} value={draft.wingspanCm} onChange={e=>set('wingspanCm',e.target.value)} placeholder="e.g. 190" /></Field>
      <Field label="Vertical Jump (cm) — optional"><input type="number" className={INP} value={draft.verticalJumpCm} onChange={e=>set('verticalJumpCm',e.target.value)} placeholder="e.g. 68" /></Field>
    </div>
  )
}

function Step8({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  function set(key: keyof WizardDraft, val: string) { setDraft(p=>({...p,[key]:val})) }
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3" style={{ border: '1px solid #fcd34d' }}>
        <IconLock size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">This information is kept strictly confidential. It is only accessible to your coach and Formula14 directors and will never be shared with third parties.</p>
      </div>
      <Field label="Current injuries or physical limitations">
        <textarea className={TXA} rows={3} value={draft.currentInjuries} onChange={e=>set('currentInjuries',e.target.value)} placeholder="Describe any current injuries, pain or physical restrictions. Write 'None' if none." />
      </Field>
      <Field label="Medical conditions">
        <textarea className={TXA} rows={3} value={draft.medicalConditions} onChange={e=>set('medicalConditions',e.target.value)} placeholder="Any relevant medical conditions your coach should be aware of. Write 'None' if none." />
      </Field>
      <Field label="Allergies">
        <textarea className={TXA} rows={2} value={draft.allergies} onChange={e=>set('allergies',e.target.value)} placeholder="Any allergies. Write 'None' if none." />
      </Field>
    </div>
  )
}

function Step9({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  return (
    <div className="space-y-5">
      <Field label="Preferred contact method">
        <select className={SEL} value={draft.preferredContactMethod} onChange={e=>setDraft(p=>({...p,preferredContactMethod:e.target.value}))}>
          <option value="">Select…</option>
          {['Email','SMS','App Notification'].map(m=><option key={m}>{m}</option>)}
        </select>
      </Field>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Receive tips & updates from Formula14</p>
          <p className="text-xs text-gray-400">Training tips, program updates, and development resources</p>
        </div>
        <button type="button" onClick={()=>setDraft(p=>({...p,receiveTipsUpdates:!p.receiveTipsUpdates}))}
          className="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors"
          style={{ backgroundColor: draft.receiveTipsUpdates ? ACCENT : '#d1d5db' }}>
          <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: draft.receiveTipsUpdates ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>
    </div>
  )
}

function Step10({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  const MINDSETS = [
    'I play for fun',
    'I want to improve my game',
    'I want to make representative basketball',
    'I want to make state teams',
    'I want to play college basketball',
    'I want to play professionally',
    'I want to become the best player I can be',
  ]
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Select the statement that best describes your basketball mindset.</p>
      {MINDSETS.map(m => {
        const sel = draft.mindset === m
        return (
          <button key={m} type="button" onClick={()=>setDraft(p=>({...p,mindset:sel?'':m}))}
            className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition"
            style={sel?{borderColor:ACCENT,backgroundColor:`${ACCENT}08`}:{borderColor:'#e5e7eb',backgroundColor:'#fafafa'}}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
              style={sel?{borderColor:ACCENT,backgroundColor:ACCENT}:{borderColor:'#d1d5db'}}>
              {sel && <IconCheck size={11} color="#fff" strokeWidth={3} />}
            </span>
            <span className="text-sm font-semibold text-gray-900">{m}</span>
          </button>
        )
      })}
    </div>
  )
}

function Step11({ draft, setDraft }: { draft: WizardDraft; setDraft: React.Dispatch<React.SetStateAction<WizardDraft>> }) {
  return (
    <div className="space-y-4">
      <Field label="Is there anything else you would like your coach to know before working with you?">
        <textarea className={TXA} rows={5} value={draft.additionalInfo} onChange={e=>setDraft(p=>({...p,additionalInfo:e.target.value}))} placeholder="Share anything that would help your coach understand you better — background, context, preferences, or anything else on your mind. (Optional)" />
      </Field>
    </div>
  )
}

const STEP_COMPONENTS = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9, Step10, Step11]

// ── Main wizard component ─────────────────────────────────────────────────────

export default function ProfileCompletePageWrapper() {
  return (
    <Suspense>
      <ProfileCompletePage />
    </Suspense>
  )
}

function ProfileCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeId: athleteId } = useActiveAthlete()

  const lsKey = athleteId ? `f14_profile_wizard_${athleteId}` : null

  const [step,     setStep]     = useState(() => {
    const s = parseInt(searchParams.get('step') ?? '1')
    return s >= 1 && s <= 11 ? s : 1
  })
  const [draft,    setDraft]    = useState<WizardDraft>(EMPTY_DRAFT)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [complete, setComplete] = useState(false)

  // Load from localStorage then hydrate from Supabase when active athlete is known
  useEffect(() => {
    if (!athleteId || !lsKey) return
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) setDraft(prev => ({ ...prev, ...JSON.parse(raw) }))
    } catch {}
    loadProfileFromSupabase(athleteId).then(loaded => {
      if (Object.keys(loaded).length > 0) {
        setDraft(prev => {
          const merged = { ...prev, ...loaded }
          try { localStorage.setItem(lsKey, JSON.stringify(merged)) } catch {}
          return merged
        })
      }
    })
  }, [athleteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage on every draft change
  useEffect(() => {
    if (!lsKey) return
    try { localStorage.setItem(lsKey, JSON.stringify(draft)) } catch {}
  }, [draft, lsKey])

  const pct = calcCompletionPct(draft)

  function markStepComplete(n: number) {
    setDraft(p => {
      if (p.completedSteps.includes(n)) return p
      return { ...p, completedSteps: [...p.completedSteps, n] }
    })
  }

  async function handleSaveStep() {
    markStepComplete(step)
    setSaving(true)
    try {
      if (athleteId) await saveProfileToSupabase(athleteId, { ...draft, completedSteps: draft.completedSteps.includes(step) ? draft.completedSteps : [...draft.completedSteps, step] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  async function handleNext() {
    await handleSaveStep()
    if (step < 11) setStep(s => s + 1)
  }

  async function handleComplete() {
    markStepComplete(11)
    setSaving(true)
    try {
      const finalDraft = { ...draft, completedSteps: [...new Set([...draft.completedSteps, 11])] }
      if (athleteId) await saveProfileToSupabase(athleteId, finalDraft)
      setComplete(true)
    } finally { setSaving(false) }
  }

  async function handleSaveAndExit() {
    await handleSaveStep()
    router.push('/athlete/dashboard')
  }

  // Completion screen
  if (complete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <IconCheck size={36} color="#16a34a" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Profile Complete!</h1>
          <p className="mt-3 text-gray-500">Your coach now has everything they need to help you reach your goals. We can't wait to get started.</p>
          <button onClick={() => router.push('/athlete/dashboard')}
            className="mt-8 w-full rounded-2xl py-3.5 text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const StepContent = STEP_COMPONENTS[step - 1]

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Athlete Profile</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : ACCENT }} />
          </div>
          <p className="mt-1 text-xs text-gray-400">{pct}% complete</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {STEPS.map(s => {
            const done    = draft.completedSteps.includes(s.n)
            const current = step === s.n
            return (
              <button key={s.n} type="button" onClick={() => setStep(s.n)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50"
                style={current ? { backgroundColor: `${ACCENT}0e` } : {}}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={done ? { backgroundColor: '#10b981', color: '#fff' } : current ? { backgroundColor: ACCENT, color: '#fff' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                  {done ? <IconCheck size={12} strokeWidth={3} /> : s.n}
                </span>
                <span className={`text-sm font-medium ${current ? 'text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'}`}>{s.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <button type="button" onClick={handleSaveAndExit}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
            Save &amp; Exit
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Progress header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => step > 1 ? setStep(s=>s-1) : router.push('/athlete/dashboard')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <IconChevronLeft size={20} />
              </button>
              <div>
                <p className="text-base font-bold text-gray-900">{STEPS[step-1].label}</p>
                <p className="text-xs text-gray-400">Step {step} of 11 — {pct}% Complete</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <button type="button" onClick={handleSaveAndExit}
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-700">
                Save &amp; Exit
              </button>
              {saved && <span className="text-xs font-semibold text-green-600">✓ Saved</span>}
            </div>
          </div>
          {/* Mobile progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 md:hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
          </div>
        </div>

        {/* Step form */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <StepContent draft={draft} setDraft={setDraft} />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <button type="button" onClick={() => step > 1 && setStep(s=>s-1)} disabled={step === 1}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
              <IconArrowLeft size={16} /> Back
            </button>
            {step < 11 ? (
              <button type="button" onClick={handleNext} disabled={saving}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 sm:flex-none sm:px-8"
                style={{ backgroundColor: ACCENT }}>
                {saving ? 'Saving…' : saved ? '✓ Saved — Next →' : 'Save & Next →'}
              </button>
            ) : (
              <button type="button" onClick={handleComplete} disabled={saving}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60 sm:flex-none sm:px-8"
                style={{ backgroundColor: '#10b981' }}>
                {saving ? 'Saving…' : 'Complete Profile ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
