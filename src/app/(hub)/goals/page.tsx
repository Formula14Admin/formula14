'use client'

import { useState, useEffect } from 'react'
import { IconTrophy, IconX, IconCheck, IconSparkles } from '@tabler/icons-react'
import {
  Goal, Habit, HabitType,
  ACCENT, TODAY,
  HABIT_SUGGESTIONS, HABIT_TYPE_LABELS,
  uid,
  loadGoals, saveGoals, loadHabits, saveHabits,
  goalStatus,
} from './_shared'
import { GoalsTab } from './_goals'
import { HabitsTab } from './_habits'

type Tab = 'goals' | 'habits'

// ─── Suggested Habits Modal ────────────────────────────────────────────────────

function SuggestedHabitsModal({
  goalTitle,
  suggestions,
  goals,
  onClose,
  onAddHabit,
}: {
  goalTitle: string
  suggestions: { name: string; type: HabitType }[]
  goals: Goal[]
  onClose: () => void
  onAddHabit: (h: Habit) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2]))
  const [done,     setDone]     = useState(false)

  function toggle(i: number) {
    setSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  function addSelected() {
    const goalId = goals[goals.length - 1]?.id
    selected.forEach(i => {
      const s = suggestions[i]
      onAddHabit({
        id: uid(),
        name: s.name,
        linkedGoalId: goalId,
        frequency: 'daily',
        customDays: [],
        type: s.type,
        completions: {},
      })
    })
    setDone(true)
    setTimeout(onClose, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: ACCENT }}>
            <IconSparkles size={16} />
            <span className="text-xs font-bold uppercase tracking-wide">Suggested Habits</span>
          </div>
          <h2 className="font-bold text-gray-900">Goal created — start building habits</h2>
          <p className="mt-1 text-sm text-gray-400">Based on your new goal: <span className="font-semibold text-gray-700">{goalTitle}</span></p>
        </div>

        <div className="p-5 space-y-2.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition"
              style={selected.has(i) ? { borderColor: ACCENT, backgroundColor: ACCENT + '10' } : { borderColor: '#e5e7eb' }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={selected.has(i) ? { backgroundColor: ACCENT, borderColor: ACCENT } : { borderColor: '#d1d5db' }}
              >
                {selected.has(i) && <IconCheck size={12} color="white" strokeWidth={3} />}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                <p className="text-[11px] text-gray-400">{HABIT_TYPE_LABELS[s.type]} · Daily</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Skip</button>
          <button
            type="button"
            onClick={addSelected}
            disabled={selected.size === 0 || done}
            className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: done ? '#10b981' : ACCENT }}
          >
            {done ? <><IconCheck size={15} /> Added!</> : `Add ${selected.size} Habit${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white shadow-xl">
      {message}
      <button onClick={onClose} className="rounded-full p-0.5 hover:bg-white/10"><IconX size={14} /></button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'goals',  label: 'My Goals'     },
  { id: 'habits', label: 'Daily Habits' },
]

export default function GoalsPage() {
  const [tab,    setTab]    = useState<Tab>('goals')
  const [goals,  setGoals]  = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [toast,  setToast]  = useState<string | null>(null)

  // Suggested habits state: shown after creating a goal
  const [pendingSuggestions, setPendingSuggestions] = useState<{
    goalTitle: string
    suggestions: { name: string; type: HabitType }[]
  } | null>(null)

  // Prefill habit from suggestion click-through
  const [prefillHabit, setPrefillHabit] = useState<{ name: string; type: HabitType } | undefined>()

  useEffect(() => {
    setGoals(loadGoals())
    setHabits(loadHabits())
  }, [])

  // ─── Goals callbacks ─────────────────────────────────────────────────────────

  function addGoal(g: Goal) {
    const next = [...goals, g]
    setGoals(next)
    saveGoals(next)
    setToast(`Goal "${g.title}" created!`)
    const sugg = HABIT_SUGGESTIONS[g.category]
    if (sugg.length > 0) {
      setPendingSuggestions({ goalTitle: g.title, suggestions: sugg })
    }
  }

  function toggleMilestone(goalId: string, milestoneId: string) {
    const next = goals.map(g => {
      if (g.id !== goalId) return g
      return {
        ...g,
        milestones: g.milestones.map(m =>
          m.id !== milestoneId ? m : {
            ...m,
            completed: !m.completed,
            completedDate: !m.completed ? TODAY : undefined,
          }
        ),
      }
    })
    setGoals(next)
    saveGoals(next)
  }

  function addReflection(goalId: string, text: string) {
    const next = goals.map(g =>
      g.id !== goalId ? g : {
        ...g,
        reflections: [...g.reflections, { id: uid(), date: TODAY, text }],
      }
    )
    setGoals(next)
    saveGoals(next)
  }

  function deleteReflection(goalId: string, reflectionId: string) {
    const next = goals.map(g =>
      g.id !== goalId ? g : { ...g, reflections: g.reflections.filter(r => r.id !== reflectionId) }
    )
    setGoals(next)
    saveGoals(next)
  }

  // ─── Habits callbacks ─────────────────────────────────────────────────────────

  function toggleHabit(habitId: string) {
    const next = habits.map(h => {
      if (h.id !== habitId) return h
      const done = !!h.completions[TODAY]
      const completions = { ...h.completions }
      if (done) { delete completions[TODAY] } else { completions[TODAY] = true }
      return { ...h, completions }
    })
    setHabits(next)
    saveHabits(next)
  }

  function addHabit(h: Habit) {
    const next = [...habits, h]
    setHabits(next)
    saveHabits(next)
    setToast(`Habit "${h.name}" added!`)
  }

  // ─── Derived stats ────────────────────────────────────────────────────────────

  const activeGoals  = goals.filter(g => goalStatus(g) === 'in-progress').length
  const achieved     = goals.filter(g => goalStatus(g) === 'achieved').length
  const todayDate    = new Date(TODAY)
  const todayHabits  = habits.filter(h => {
    const dow = todayDate.getDay()
    if (h.frequency === 'daily') return true
    if (h.frequency === 'weekdays') return dow >= 1 && dow <= 5
    return h.customDays.includes(dow)
  })
  const todayDone    = todayHabits.filter(h => h.completions[TODAY]).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: ACCENT + '18' }}>
              <IconTrophy size={20} style={{ color: ACCENT }} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Goal Setting</h1>
              <p className="text-xs text-gray-400">
                {activeGoals} active goal{activeGoals !== 1 ? 's' : ''} · {achieved} achieved · {todayDone}/{todayHabits.length} habits today
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="rounded-lg px-5 py-1.5 text-sm font-semibold transition"
                style={tab === t.id
                  ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
                  : { color: '#6b7280' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'goals' && (
          <GoalsTab
            goals={goals}
            habits={habits}
            onAdd={addGoal}
            onToggleMilestone={toggleMilestone}
            onAddReflection={addReflection}
            onDeleteReflection={deleteReflection}
          />
        )}
        {tab === 'habits' && (
          <HabitsTab
            habits={habits}
            goals={goals}
            onToggle={toggleHabit}
            onAdd={addHabit}
            prefillHabit={prefillHabit}
            onPrefillConsumed={() => setPrefillHabit(undefined)}
          />
        )}
      </div>

      {/* Suggested habits modal */}
      {pendingSuggestions && (
        <SuggestedHabitsModal
          goalTitle={pendingSuggestions.goalTitle}
          suggestions={pendingSuggestions.suggestions}
          goals={goals}
          onClose={() => setPendingSuggestions(null)}
          onAddHabit={h => { addHabit(h) }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
