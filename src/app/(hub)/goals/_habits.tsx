'use client'

import { useState, useMemo } from 'react'
import {
  IconPlus, IconX, IconCheck, IconChevronDown, IconBell,
  IconFlame, IconCalendarStats,
} from '@tabler/icons-react'
import {
  Habit, Goal, HabitFreq, HabitType,
  ACCENT, INPUT, LABEL, TODAY,
  HABIT_TYPE_COLORS, HABIT_TYPE_LABELS, DAY_LABELS,
  uid, isScheduledOn, calcStreak, completedToday, cellColor,
} from './_shared'

// ─── Completion Ring ───────────────────────────────────────────────────────────

function CompletionRing({ percent }: { percent: number }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
      <circle
        cx="55" cy="55" r={r}
        fill="none"
        stroke={percent === 100 ? '#10b981' : ACCENT}
        strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="50" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#111827">{percent}%</text>
      <text x="55" y="67" textAnchor="middle" fontSize="10" fill="#9ca3af">today</text>
    </svg>
  )
}

// ─── Habit Card ────────────────────────────────────────────────────────────────

function HabitCard({
  habit, goals, onToggle,
}: {
  habit: Habit
  goals: Goal[]
  onToggle: (id: string) => void
}) {
  const done   = completedToday(habit)
  const streak = calcStreak(habit)
  const linked = goals.find(g => g.id === habit.linkedGoalId)
  const tc     = HABIT_TYPE_COLORS[habit.type]

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4 transition-all duration-300 shadow-sm"
      style={{ backgroundColor: done ? '#f0fdf4' : 'white', border: `1.5px solid ${done ? '#86efac' : '#f3f4f6'}` }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(habit.id)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300"
        style={done ? { backgroundColor: '#10b981', borderColor: '#10b981' } : { borderColor: '#d1d5db' }}
      >
        {done && <IconCheck size={18} color="white" strokeWidth={3} />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{habit.name}</p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tc + '20', color: tc }}>
            {HABIT_TYPE_LABELS[habit.type]}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          <span className="capitalize">{habit.frequency === 'custom' ? habit.customDays.map(d => DAY_LABELS[d]).join('/') : habit.frequency}</span>
          {linked && <><span>·</span><span>→ {linked.title}</span></>}
          {habit.reminderTime && <><span>·</span><span className="flex items-center gap-0.5"><IconBell size={11} />{habit.reminderTime}</span></>}
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1.5 text-xs font-bold text-orange-600">
          <IconFlame size={13} />
          {streak}d
        </div>
      )}
    </div>
  )
}

// ─── Add Habit Modal ───────────────────────────────────────────────────────────

export function AddHabitModal({
  goals, onClose, onAdd,
  prefill,
}: {
  goals: Goal[]
  onClose: () => void
  onAdd: (h: Habit) => void
  prefill?: { name: string; type: HabitType }
}) {
  const [name,       setName]       = useState(prefill?.name ?? '')
  const [linkedGoal, setLinkedGoal] = useState('')
  const [freq,       setFreq]       = useState<HabitFreq>('daily')
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5])
  const [reminder,   setReminder]   = useState('')
  const [type,       setType]       = useState<HabitType>(prefill?.type ?? 'physical')
  const [error,      setError]      = useState('')

  function toggleDay(d: number) {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  function handleSubmit() {
    if (!name.trim()) { setError('Habit name is required'); return }
    onAdd({
      id: uid(),
      name: name.trim(),
      linkedGoalId: linkedGoal || undefined,
      frequency: freq,
      customDays: freq === 'custom' ? customDays : [],
      reminderTime: reminder || undefined,
      type,
      completions: {},
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl mb-8">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Add Habit</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className={LABEL}>Habit Name {error && <span className="ml-1 normal-case font-normal text-red-500">{error}</span>}</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. 100 free throws" className={INPUT + (error ? ' border-red-400' : '')} />
          </div>

          <div>
            <label className={LABEL}>Habit Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(HABIT_TYPE_LABELS) as [HabitType, string][]).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={type === v ? { backgroundColor: HABIT_TYPE_COLORS[v] + '20', borderColor: HABIT_TYPE_COLORS[v], color: HABIT_TYPE_COLORS[v] } : { borderColor: '#e5e7eb', color: '#9ca3af' }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Linked Goal <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <div className="relative">
              <select value={linkedGoal} onChange={e => setLinkedGoal(e.target.value)} className={INPUT + ' appearance-none pr-8'}>
                <option value="">None</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <IconChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekdays', 'custom'] as HabitFreq[]).map(f => (
                <button key={f} type="button" onClick={() => setFreq(f)}
                  className="flex-1 rounded-xl border py-2 text-xs font-semibold capitalize transition"
                  style={freq === f ? { backgroundColor: ACCENT + '18', borderColor: ACCENT, color: ACCENT } : { borderColor: '#e5e7eb', color: '#9ca3af' }}>
                  {f}
                </button>
              ))}
            </div>
            {freq === 'custom' && (
              <div className="mt-2 flex gap-1.5">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition"
                    style={customDays.includes(i) ? { backgroundColor: ACCENT, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL}>Reminder Time <span className="normal-case font-normal text-gray-400">(optional)</span></label>
            <input type="time" value={reminder} onChange={e => setReminder(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSubmit}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            Add Habit
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contribution Graph ────────────────────────────────────────────────────────

function ContributionGraph({ habits }: { habits: Habit[] }) {
  // Build 5-week grid (Mon–Sun columns of days, weeks as rows in display)
  // Start from Mon 25 May → end Sun 28 Jun, 35 cells
  const cells = useMemo(() => {
    const startDate = new Date('2026-05-25')  // Monday
    const todayDate = new Date(TODAY)
    const result: { date: string; ratio: number; future: boolean }[] = []

    for (let i = 0; i < 35; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const isFuture = d > todayDate
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      let scheduled = 0, completed = 0
      habits.forEach(h => {
        if (isScheduledOn(h, d)) {
          scheduled++
          if (h.completions[key]) completed++
        }
      })
      result.push({ date: key, ratio: isFuture ? -1 : scheduled === 0 ? 0 : completed / scheduled, future: isFuture })
    }
    return result
  }, [habits])

  // Display: 5 rows (weeks) × 7 cols (Mon–Sun)
  const WEEK_ROWS: typeof cells[] = Array.from({ length: 5 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  const weekLabels = ['May 25', 'Jun 1', 'Jun 8', 'Jun 15', 'Jun 22']
  const dayLabels  = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-400 pl-10">
        {dayLabels.map((l, i) => <span key={i} className="w-7 text-center font-semibold">{l}</span>)}
      </div>
      <div className="space-y-1.5">
        {WEEK_ROWS.map((week, wi) => (
          <div key={wi} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right text-[10px] text-gray-400">{weekLabels[wi]}</span>
            {week.map((cell, di) => (
              <div
                key={di}
                title={cell.future ? 'Future' : `${cell.date}: ${Math.round(cell.ratio * 100)}% habits complete`}
                className="h-7 w-7 cursor-default rounded-md transition-transform hover:scale-110"
                style={{ backgroundColor: cellColor(cell.ratio) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
        <span>Less</span>
        {[0, 0.33, 0.66, 1].map(r => (
          <span key={r} className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: cellColor(r) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Weekly Summary ────────────────────────────────────────────────────────────

function WeeklySummary({ habits }: { habits: Habit[] }) {
  const days = useMemo(() => {
    const today = new Date(TODAY)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - 6 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dow = d.getDay()
      const label = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow]
      let scheduled = 0, done = 0
      habits.forEach(h => { if (isScheduledOn(h, d)) { scheduled++; if (h.completions[key]) done++ } })
      return { key, label, dayNum: d.getDate(), scheduled, done }
    })
  }, [habits])

  const weekScore = days.reduce((s, d) => s + (d.scheduled > 0 ? d.done / d.scheduled : 0), 0) / 7

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">This Week</h3>
          <p className="text-xs text-gray-400">Jun 18 – Jun 24</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: ACCENT }}>{Math.round(weekScore * 100)}%</p>
          <p className="text-[11px] text-gray-400">weekly score</p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(d => {
          const pct = d.scheduled > 0 ? d.done / d.scheduled : -1
          const color = pct < 0 ? '#f3f4f6' : cellColor(pct)
          const isToday = d.key === TODAY
          return (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-semibold ${isToday ? 'text-gray-900' : 'text-gray-400'}`}>{d.label}</span>
              <div
                className="flex h-10 w-full items-center justify-center rounded-lg text-[11px] font-bold"
                style={{ backgroundColor: color, color: pct >= 0.5 ? 'white' : '#9ca3af' }}
              >
                {d.scheduled > 0 ? `${d.done}/${d.scheduled}` : '—'}
              </div>
              <span className={`text-[10px] ${isToday ? 'font-bold text-gray-700' : 'text-gray-400'}`}>{d.dayNum}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Habits Tab ────────────────────────────────────────────────────────────────

export function HabitsTab({
  habits, goals, onToggle, onAdd,
  prefillHabit, onPrefillConsumed,
}: {
  habits: Habit[]
  goals: Goal[]
  onToggle: (id: string) => void
  onAdd: (h: Habit) => void
  prefillHabit?: { name: string; type: HabitType }
  onPrefillConsumed?: () => void
}) {
  const [showModal, setShowModal] = useState(!!prefillHabit)
  const [view,      setView]      = useState<'today' | 'history'>('today')

  const todayDate = new Date(TODAY)
  const todayScheduled = habits.filter(h => isScheduledOn(h, todayDate))
  const todayDone      = todayScheduled.filter(h => h.completions[TODAY])
  const completionPct  = todayScheduled.length === 0 ? 0 : Math.round(todayDone.length / todayScheduled.length * 100)

  function handleAdd(h: Habit) {
    onAdd(h)
    onPrefillConsumed?.()
    setShowModal(false)
  }

  return (
    <div className="space-y-6">

      {/* Top stats row */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Completion ring */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <CompletionRing percent={completionPct} />
          <p className="text-sm font-semibold text-gray-700">
            {todayDone.length} of {todayScheduled.length} habits complete
          </p>
          {completionPct === 100 && (
            <p className="text-xs font-bold text-green-600">🎉 All habits done today!</p>
          )}
        </div>

        {/* Weekly summary */}
        <div className="flex-1 w-full">
          <WeeklySummary habits={habits} />
        </div>
      </div>

      {/* View toggle + add button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {([['today', "Today's Habits"], ['history', 'History']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition"
              style={view === v ? { backgroundColor: 'white', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,.08)' } : { color: '#6b7280' }}
            >
              {v === 'history' && <IconCalendarStats size={14} />}
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <IconPlus size={16} /> Add Habit
        </button>
      </div>

      {view === 'today' && (
        <>
          {/* Scheduled today */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Scheduled Today</h3>
            {todayScheduled.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
                No habits scheduled for today — enjoy your rest day!
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayScheduled.map(h => <HabitCard key={h.id} habit={h} goals={goals} onToggle={onToggle} />)}
              </div>
            )}
          </div>

          {/* Not scheduled today */}
          {habits.filter(h => !isScheduledOn(h, todayDate)).length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Not Scheduled Today</h3>
              <div className="space-y-2">
                {habits.filter(h => !isScheduledOn(h, todayDate)).map(h => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm opacity-50 shadow-sm">
                    <span className="font-medium text-gray-600">{h.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{h.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'history' && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-gray-900">Habit History</h3>
          <p className="mb-5 text-xs text-gray-400">Past 5 weeks — colour intensity shows daily completion rate</p>
          <ContributionGraph habits={habits} />
        </div>
      )}

      {showModal && (
        <AddHabitModal
          goals={goals}
          onClose={() => { setShowModal(false); onPrefillConsumed?.() }}
          onAdd={handleAdd}
          prefill={prefillHabit}
        />
      )}
    </div>
  )
}

