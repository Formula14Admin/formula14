'use client'

import { useState } from 'react'
import {
  IconPlus, IconX, IconCheck, IconChevronDown,
  IconCalendar, IconTarget, IconTrophy,
  IconLock, IconWorldShare, IconMessageCircle, IconTrash,
} from '@tabler/icons-react'
import {
  Goal, Milestone, GoalCategory, GoalStatus, Habit, ReflectionNote,
  ACCENT, INPUT, LABEL, TODAY,
  GOAL_CATEGORY_LABELS, GOAL_CATEGORY_COLORS, GOAL_STATUS_STYLES,
  uid, fmtDate, daysUntil, goalStatus, goalProgress, calcStreak,
} from './_shared'

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = ACCENT }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

export function GoalCard({ goal, habits, onClick, onToggleMilestone }: {
  goal: Goal
  habits: Habit[]
  onClick: () => void
  onToggleMilestone: (goalId: string, milestoneId: string) => void
}) {
  const status  = goalStatus(goal)
  const pct     = goalProgress(goal)
  const ss      = GOAL_STATUS_STYLES[status]
  const cc      = GOAL_CATEGORY_COLORS[goal.category]
  const days    = daysUntil(goal.targetDate)
  const linked  = habits.filter(h => h.linkedGoalId === goal.id).length

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:shadow-md hover:ring-[#6BA3D6]/30">
      {/* Header – clickable */}
      <button type="button" onClick={onClick} className="flex-1 p-5 text-left">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: cc.bg, color: cc.text }}>
              {GOAL_CATEGORY_LABELS[goal.category]}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: ss.bg, color: ss.text }}>
              {ss.label}
            </span>
          </div>
          {goal.shareWithCoach && <IconWorldShare size={14} className="mt-0.5 shrink-0 text-gray-400" />}
        </div>

        <h3 className="mb-1 font-bold text-gray-900 leading-snug">{goal.title}</h3>

        <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <IconCalendar size={12} />
            {fmtDate(goal.targetDate)}
          </span>
          {status === 'in-progress' && (
            <span className={days <= 14 ? 'font-semibold text-amber-600' : ''}>
              {days > 0 ? `${days}d remaining` : `${Math.abs(days)}d overdue`}
            </span>
          )}
          {linked > 0 && <span>{linked} habit{linked > 1 ? 's' : ''} linked</span>}
        </div>

        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones</span>
          <span className="font-bold" style={{ color: ACCENT }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={status === 'achieved' ? '#10b981' : ACCENT} />
      </button>

      {/* Milestones quick-list */}
      {goal.milestones.length > 0 && (
        <div className="border-t border-gray-50 px-5 py-3 space-y-1.5">
          {goal.milestones.slice(0, 3).map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggleMilestone(goal.id, m.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-xs transition hover:bg-gray-50"
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={m.completed ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { borderColor: '#d1d5db' }}
              >
                {m.completed && <IconCheck size={9} color="white" strokeWidth={3} />}
              </span>
              <span className={m.completed ? 'line-through text-gray-400' : 'text-gray-700'}>{m.text}</span>
            </button>
          ))}
          {goal.milestones.length > 3 && (
            <p className="pl-2 text-[11px] text-gray-400">+{goal.milestones.length - 3} more milestone{goal.milestones.length - 3 > 1 ? 's' : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Goal Modal ────────────────────────────────────────────────────────────

function MilestoneInput({ milestones, onChange }: {
  milestones: Omit<Milestone, 'completed'>[]
  onChange: (ms: Omit<Milestone, 'completed'>[]) => void
}) {
  function add() {
    if (milestones.length >= 5) return
    onChange([...milestones, { id: uid(), text: '' }])
  }
  function update(id: string, text: string) {
    onChange(milestones.map(m => m.id === id ? { ...m, text } : m))
  }
  function remove(id: string) {
    onChange(milestones.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-2">
      {milestones.map((m, i) => (
        <div key={m.id} className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-[10px] font-bold text-gray-400">{i + 1}</span>
          <input
            type="text"
            value={m.text}
            onChange={e => update(m.id, e.target.value)}
            placeholder={`Milestone ${i + 1} — e.g. "Shoot 35% in a game"`}
            className={INPUT}
          />
          <button type="button" onClick={() => remove(m.id)} className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-400">
            <IconX size={14} />
          </button>
        </div>
      ))}
      {milestones.length < 5 && (
        <button type="button" onClick={add} className="flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80" style={{ color: ACCENT }}>
          <IconPlus size={14} /> Add milestone
        </button>
      )}
    </div>
  )
}

export function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (g: Goal) => void }) {
  const [title,    setTitle]    = useState('')
  const [category, setCategory] = useState<GoalCategory>('skill')
  const [target,   setTarget]   = useState('')
  const [why,      setWhy]      = useState('')
  const [metric,   setMetric]   = useState('')
  const [ms,       setMs]       = useState<Omit<Milestone, 'completed'>[]>([{ id: uid(), text: '' }])
  const [share,    setShare]    = useState(true)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())  e.title  = 'Required'
    if (!target)        e.target = 'Required'
    if (!why.trim())    e.why    = 'Required'
    if (!metric.trim()) e.metric = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onAdd({
      id: uid(),
      title: title.trim(),
      category,
      targetDate: target,
      why: why.trim(),
      successMetric: metric.trim(),
      milestones: ms.filter(m => m.text.trim()).map(m => ({ ...m, completed: false })),
      shareWithCoach: share,
      reflections: [],
      createdAt: TODAY,
    })
  }

  const err = (k: string) => errors[k] ? <span className="ml-1 normal-case font-normal text-red-500 text-[11px]">{errors[k]}</span> : null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add Goal</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className={LABEL}>Goal Title {err('title')}</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Make the U18 rep squad" className={INPUT + (errors.title ? ' border-red-400' : '')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value as GoalCategory)} className={INPUT + ' appearance-none pr-8'}>
                  {(Object.entries(GOAL_CATEGORY_LABELS) as [GoalCategory, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div>
              <label className={LABEL}>Target Date {err('target')}</label>
              <input type="date" value={target} onChange={e => setTarget(e.target.value)} min={TODAY} className={INPUT + (errors.target ? ' border-red-400' : '')} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Why does this goal matter to you? {err('why')}</label>
            <textarea rows={2} value={why} onChange={e => setWhy(e.target.value)} placeholder="The motivation and purpose behind this goal…" className={INPUT + ' resize-none' + (errors.why ? ' border-red-400' : '')} />
          </div>

          <div>
            <label className={LABEL}>Success Metric — how will you know when you've achieved it? {err('metric')}</label>
            <input type="text" value={metric} onChange={e => setMetric(e.target.value)} placeholder="e.g. Shoot 40% from 3 across 3 consecutive games" className={INPUT + (errors.metric ? ' border-red-400' : '')} />
          </div>

          <div>
            <label className={LABEL}>Milestones <span className="normal-case font-normal text-gray-400">(up to 5)</span></label>
            <MilestoneInput milestones={ms} onChange={setMs} />
          </div>

          <div>
            <label className={LABEL}>Coach Visibility</label>
            <button
              type="button"
              onClick={() => setShare(p => !p)}
              className="flex w-full items-center gap-3 rounded-xl border p-3 transition"
              style={share ? { borderColor: ACCENT, backgroundColor: ACCENT + '10' } : { borderColor: '#e5e7eb' }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: share ? ACCENT + '20' : '#f3f4f6' }}>
                {share ? <IconWorldShare size={16} style={{ color: ACCENT }} /> : <IconLock size={16} className="text-gray-400" />}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">{share ? 'Shared with coach' : 'Private goal'}</p>
                <p className="text-xs text-gray-400">{share ? 'Your coach can see this goal and leave notes' : 'Only you can see this goal'}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button" onClick={handleSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goal Detail Panel ─────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'milestones' | 'habits' | 'reflection'

function ReflectionEntry({ note, onDelete }: { note: ReflectionNote; onDelete: () => void }) {
  return (
    <div className="group rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">{fmtDate(note.date)}</span>
        <button type="button" onClick={onDelete} className="rounded p-0.5 text-gray-300 opacity-0 hover:text-red-400 group-hover:opacity-100 transition">
          <IconTrash size={13} />
        </button>
      </div>
      <p className="text-sm leading-relaxed text-gray-700">{note.text}</p>
    </div>
  )
}

export function GoalDetailPanel({
  goal, habits, onClose, onToggleMilestone, onAddReflection, onDeleteReflection,
}: {
  goal: Goal
  habits: Habit[]
  onClose: () => void
  onToggleMilestone: (goalId: string, milestoneId: string) => void
  onAddReflection: (goalId: string, text: string) => void
  onDeleteReflection: (goalId: string, reflectionId: string) => void
}) {
  const [tab,        setTab]        = useState<DetailTab>('overview')
  const [reflection, setReflection] = useState('')

  const status   = goalStatus(goal)
  const pct      = goalProgress(goal)
  const ss       = GOAL_STATUS_STYLES[status]
  const cc       = GOAL_CATEGORY_COLORS[goal.category]
  const linked   = habits.filter(h => h.linkedGoalId === goal.id)

  const TABS: { id: DetailTab; label: string }[] = [
    { id: 'overview',    label: 'Overview'    },
    { id: 'milestones',  label: 'Milestones'  },
    { id: 'habits',      label: `Habits (${linked.length})` },
    { id: 'reflection',  label: 'Reflection'  },
  ]

  function submitReflection() {
    if (!reflection.trim()) return
    onAddReflection(goal.id, reflection.trim())
    setReflection('')
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col overflow-hidden bg-white shadow-2xl">

        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: cc.bg, color: cc.text }}>
                {GOAL_CATEGORY_LABELS[goal.category]}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: ss.bg, color: ss.text }}>
                {ss.label}
              </span>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
          </div>
          <h2 className="mb-1 pr-4 text-base font-bold text-gray-900 leading-snug">{goal.title}</h2>
          <div className="mb-3 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><IconCalendar size={12} />{fmtDate(goal.targetDate)}</span>
            <span className="flex items-center gap-1">
              {goal.shareWithCoach ? <><IconWorldShare size={12} className="text-gray-400" />Shared with coach</> : <><IconLock size={12} />Private</>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar pct={pct} color={status === 'achieved' ? '#10b981' : ACCENT} />
            <span className="shrink-0 text-xs font-bold" style={{ color: ACCENT }}>{pct}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-0 border-b border-gray-100 px-5">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className="relative px-3 py-2.5 text-xs font-semibold transition"
              style={tab === t.id ? { color: ACCENT } : { color: '#9ca3af' }}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: ACCENT }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === 'overview' && (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Why this goal matters</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{goal.why}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Success metric</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{goal.successMetric}</p>
              </div>
              {goal.shareWithCoach && goal.coachNote && (
                <div className="rounded-xl border-l-4 bg-blue-50 p-4" style={{ borderColor: ACCENT }}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold" style={{ color: ACCENT }}>
                    <IconMessageCircle size={13} /> Coach Note
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{goal.coachNote}</p>
                </div>
              )}
            </>
          )}

          {tab === 'milestones' && (
            <div className="space-y-2">
              {goal.milestones.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No milestones added</p>}
              {goal.milestones.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleMilestone(goal.id, m.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:bg-gray-100"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
                    style={m.completed ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { borderColor: '#d1d5db' }}>
                    {m.completed && <IconCheck size={11} color="white" strokeWidth={3} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      <span className="mr-2 text-xs text-gray-400">{i + 1}.</span>{m.text}
                    </p>
                    {m.completed && m.completedDate && (
                      <p className="text-xs text-gray-400">Completed {fmtDate(m.completedDate)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'habits' && (
            <div>
              {linked.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
                  <IconTarget size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">No habits linked to this goal yet.</p>
                  <p className="text-xs text-gray-400">Go to Daily Habits and link a habit to this goal.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linked.map(h => {
                    const streak = calcStreak(h)
                    return (
                      <div key={h.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{h.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{h.frequency}</p>
                        </div>
                        {streak > 0 && (
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-600">
                            🔥 {streak}d streak
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'reflection' && (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Add reflection</label>
                <textarea
                  rows={3}
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                  placeholder="Log your thoughts, what's working, what you need to change…"
                  className={INPUT + ' resize-none'}
                />
                <button
                  type="button"
                  onClick={submitReflection}
                  disabled={!reflection.trim()}
                  className="mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: ACCENT }}
                >
                  Save Note
                </button>
              </div>
              {[...goal.reflections].reverse().map(note => (
                <ReflectionEntry key={note.id} note={note} onDelete={() => onDeleteReflection(goal.id, note.id)} />
              ))}
              {goal.reflections.length === 0 && (
                <p className="text-center text-sm text-gray-400">No reflection notes yet. Start logging your journey!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Goals Tab ─────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | GoalStatus

export function GoalsTab({
  goals, habits, onAdd, onToggleMilestone, onAddReflection, onDeleteReflection,
}: {
  goals: Goal[]
  habits: Habit[]
  onAdd: (g: Goal) => void
  onToggleMilestone: (goalId: string, milestoneId: string) => void
  onAddReflection: (goalId: string, text: string) => void
  onDeleteReflection: (goalId: string, reflectionId: string) => void
}) {
  const [showModal,   setShowModal]   = useState(false)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [filter,      setFilter]      = useState<FilterStatus>('all')

  const selectedGoal = goals.find(g => g.id === selectedId) ?? null

  const filtered = filter === 'all' ? goals : goals.filter(g => goalStatus(g) === filter)

  const counts = {
    all:          goals.length,
    'in-progress': goals.filter(g => goalStatus(g) === 'in-progress').length,
    achieved:     goals.filter(g => goalStatus(g) === 'achieved').length,
    overdue:      goals.filter(g => goalStatus(g) === 'overdue').length,
  }

  const FILTERS: { id: FilterStatus; label: string }[] = [
    { id: 'all',          label: `All (${counts.all})`         },
    { id: 'in-progress',  label: `In Progress (${counts['in-progress']})` },
    { id: 'achieved',     label: `Achieved (${counts.achieved})` },
    { id: 'overdue',      label: `Overdue (${counts.overdue})`  },
  ]

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={filter === f.id ? { backgroundColor: '#1f2937', color: 'white' } : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <IconPlus size={16} /> Add Goal
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <IconTrophy size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">
            {filter === 'all' ? 'No goals yet' : `No ${filter} goals`}
          </p>
          {filter === 'all' && <p className="mt-1 text-xs text-gray-400">Set your first goal to get started</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              habits={habits}
              onClick={() => setSelectedId(g.id)}
              onToggleMilestone={onToggleMilestone}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddGoalModal onClose={() => setShowModal(false)} onAdd={g => { onAdd(g); setShowModal(false) }} />
      )}

      {selectedGoal && (
        <GoalDetailPanel
          goal={selectedGoal}
          habits={habits}
          onClose={() => setSelectedId(null)}
          onToggleMilestone={onToggleMilestone}
          onAddReflection={onAddReflection}
          onDeleteReflection={onDeleteReflection}
        />
      )}
    </div>
  )
}

