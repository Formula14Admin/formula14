'use client'

export const ACCENT = '#6BA3D6'
export const TODAY  = '2026-06-24'
export const INPUT  = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
export const LABEL  = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalCategory = 'skill' | 'physical' | 'competition' | 'personal' | 'academic'
export type GoalStatus   = 'in-progress' | 'achieved' | 'overdue'
export type HabitType    = 'physical' | 'mental' | 'nutrition' | 'recovery' | 'study'
export type HabitFreq    = 'daily' | 'weekdays' | 'custom'

export interface Milestone {
  id: string
  text: string
  completed: boolean
  completedDate?: string
}

export interface ReflectionNote {
  id: string
  date: string
  text: string
}

export interface Goal {
  id: string
  title: string
  category: GoalCategory
  targetDate: string
  why: string
  successMetric: string
  milestones: Milestone[]
  shareWithCoach: boolean
  coachNote?: string
  reflections: ReflectionNote[]
  createdAt: string
}

export interface Habit {
  id: string
  name: string
  linkedGoalId?: string
  frequency: HabitFreq
  customDays: number[]   // 0=Sun … 6=Sat
  reminderTime?: string  // "07:00"
  type: HabitType
  completions: Record<string, boolean>  // "2026-06-24": true
}

// ─── Labels & colours ─────────────────────────────────────────────────────────

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  skill:       'Skill Development',
  physical:    'Physical',
  competition: 'Competition',
  personal:    'Personal',
  academic:    'Academic',
}

export const GOAL_CATEGORY_COLORS: Record<GoalCategory, { bg: string; text: string }> = {
  skill:       { bg: '#dbeafe', text: '#1d4ed8' },
  physical:    { bg: '#dcfce7', text: '#15803d' },
  competition: { bg: '#fef3c7', text: '#92400e' },
  personal:    { bg: '#f3e8ff', text: '#6b21a8' },
  academic:    { bg: '#e0f2fe', text: '#0369a1' },
}

export const GOAL_STATUS_STYLES: Record<GoalStatus, { bg: string; text: string; label: string }> = {
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' },
  achieved:      { bg: '#dcfce7', text: '#15803d', label: 'Achieved'    },
  overdue:       { bg: '#fee2e2', text: '#b91c1c', label: 'Overdue'     },
}

export const HABIT_TYPE_COLORS: Record<HabitType, string> = {
  physical:  '#10b981',
  mental:    '#8b5cf6',
  nutrition: '#f59e0b',
  recovery:  '#6BA3D6',
  study:     '#ec4899',
}

export const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  physical:  'Physical',
  mental:    'Mental',
  nutrition: 'Nutrition',
  recovery:  'Recovery',
  study:     'Study',
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Habit suggestions by goal category ───────────────────────────────────────

export const HABIT_SUGGESTIONS: Record<GoalCategory, { name: string; type: HabitType }[]> = {
  skill: [
    { name: '100 skill repetitions',      type: 'physical'  },
    { name: 'Watch 1 training drill video', type: 'mental'  },
    { name: 'Ball handling warm-up (10 min)', type: 'physical' },
  ],
  physical: [
    { name: 'Complete today\'s training session', type: 'physical' },
    { name: '10 min foam rolling',           type: 'recovery'  },
    { name: 'Drink 2L of water',             type: 'nutrition' },
  ],
  competition: [
    { name: 'Review game film (15 min)',  type: 'mental'   },
    { name: 'Mental rehearsal / visualisation', type: 'mental' },
    { name: 'Complete training session', type: 'physical'  },
  ],
  personal: [
    { name: 'Journal progress (5 min)',  type: 'mental'   },
    { name: 'Sleep 8+ hours',            type: 'recovery' },
    { name: 'Mindfulness (5 min)',        type: 'mental'   },
  ],
  academic: [
    { name: 'Study 30 minutes',         type: 'study'    },
    { name: 'Complete all homework',    type: 'study'    },
    { name: 'Review notes before bed',  type: 'study'    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0
export function uid(): string { return `g${Date.now()}${++_seq}` }

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}

export function daysUntil(iso: string): number {
  const [y, m, d]   = iso.split('-').map(Number)
  const [ty, tm, td] = TODAY.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const now    = new Date(ty, tm - 1, td)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export function goalStatus(goal: Goal): GoalStatus {
  const allDone = goal.milestones.length > 0 && goal.milestones.every(m => m.completed)
  if (allDone) return 'achieved'
  if (daysUntil(goal.targetDate) < 0) return 'overdue'
  return 'in-progress'
}

export function goalProgress(goal: Goal): number {
  if (goal.milestones.length === 0) return 0
  return Math.round(goal.milestones.filter(m => m.completed).length / goal.milestones.length * 100)
}

export function isScheduledOn(habit: Habit, date: Date): boolean {
  const dow = date.getDay()
  if (habit.frequency === 'daily')    return true
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5
  return habit.customDays.includes(dow)
}

export function calcStreak(habit: Habit): number {
  let streak = 0
  const d = new Date(TODAY)
  for (let i = 0; i < 100; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (isScheduledOn(habit, d)) {
      if (habit.completions[key]) {
        streak++
      } else if (i === 0) {
        // today not yet done — peek from yesterday
        d.setDate(d.getDate() - 1)
        continue
      } else {
        break
      }
    }
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function completedToday(habit: Habit): boolean {
  return !!habit.completions[TODAY]
}

// Build colour for contribution graph cell (0..1 ratio, or -1 = future)
export function cellColor(ratio: number): string {
  if (ratio < 0) return '#f3f4f6'  // future
  if (ratio === 0) return '#e5e7eb'
  if (ratio < 0.5) return '#bfdbfe'
  if (ratio < 0.75) return `${ACCENT}99`
  if (ratio < 1) return `${ACCENT}cc`
  return ACCENT
}

// ─── Sample data ──────────────────────────────────────────────────────────────

export const INIT_GOALS: Goal[] = [
  {
    id: 'g1',
    title: 'Make the U18 rep squad',
    category: 'competition',
    targetDate: '2026-09-30',
    why: 'Playing rep ball is the next step to being scouted for elite pathways. I want to prove I can compete at the highest junior level.',
    successMetric: 'Be named in the U18 state selection squad after tryouts in September',
    shareWithCoach: true,
    coachNote: 'Great attitude in training — focus on your defensive footwork before tryouts.',
    milestones: [
      { id: 'm1', text: 'Improve vertical jump by 3cm',         completed: true,  completedDate: '2026-06-10' },
      { id: 'm2', text: 'Score 15+ points in a rep trial game', completed: true,  completedDate: '2026-06-18' },
      { id: 'm3', text: 'Get selected for U18 training squad',  completed: false },
      { id: 'm4', text: 'Complete full selection process',       completed: false },
    ],
    reflections: [
      { id: 'r1', date: '2026-06-18', text: 'Hit 17 points in the trial today — felt really good. Defence needs more work but offensively I\'m in form.' },
    ],
    createdAt: '2026-05-01',
  },
  {
    id: 'g2',
    title: 'Improve 3-point shooting to 40%',
    category: 'skill',
    targetDate: '2026-08-31',
    why: 'My shooting percentage is holding me back from the next level. Becoming a reliable shooter from three opens up so many more options.',
    successMetric: 'Shoot 40% or better from 3-point range across 3 consecutive games',
    shareWithCoach: true,
    coachNote: 'Your release is much more consistent — keep drilling the catch-and-shoot.',
    milestones: [
      { id: 'm5', text: 'Shoot 30% from 3 in practice consistently', completed: true, completedDate: '2026-05-28' },
      { id: 'm6', text: 'Shoot 35% from 3 in a game',                completed: true, completedDate: '2026-06-15' },
      { id: 'm7', text: 'Shoot 40% from 3 across 3 games',           completed: false },
    ],
    reflections: [
      { id: 'r2', date: '2026-06-15', text: 'Shot 37% tonight (8/22). Getting closer. The extra reps are definitely paying off.' },
      { id: 'r3', date: '2026-06-20', text: 'Bad shooting night — only 25%. Didn\'t warm up properly before the game. Lesson learned.' },
    ],
    createdAt: '2026-04-15',
  },
  {
    id: 'g3',
    title: 'Run 5km in under 25 minutes',
    category: 'physical',
    targetDate: '2026-07-31',
    why: 'Building my aerobic base will help me stay strong in the fourth quarter when others are fading.',
    successMetric: 'Complete an official 5km run in under 25 minutes',
    shareWithCoach: false,
    milestones: [
      { id: 'm8', text: 'Run 5km in under 30 minutes',  completed: true, completedDate: '2026-05-01' },
      { id: 'm9', text: 'Run 5km in under 27 minutes',  completed: true, completedDate: '2026-05-20' },
      { id: 'm10', text: 'Run 5km in under 25 minutes', completed: true, completedDate: '2026-06-12' },
    ],
    reflections: [
      { id: 'r4', date: '2026-06-12', text: 'Did it! 24:48 this morning. All that early morning running paid off. On to the next goal!' },
    ],
    createdAt: '2026-04-01',
  },
]

// Helper to build completion records from a list of date strings
function cx(dates: string[]): Record<string, boolean> {
  return Object.fromEntries(dates.map(d => [d, true]))
}

export const INIT_HABITS: Habit[] = [
  {
    id: 'h1',
    name: '100 3-point shots',
    linkedGoalId: 'g2',
    frequency: 'daily',
    customDays: [],
    reminderTime: '07:00',
    type: 'physical',
    completions: cx([
      '2026-06-13','2026-06-14','2026-06-15','2026-06-16','2026-06-17',
      '2026-06-18','2026-06-19','2026-06-20','2026-06-21','2026-06-22',
      '2026-06-23','2026-06-24',
      '2026-06-08','2026-06-09','2026-06-10',
      '2026-06-04','2026-06-05',
      '2026-06-01','2026-05-30','2026-05-28','2026-05-27',
    ]),
  },
  {
    id: 'h2',
    name: 'Complete training session',
    linkedGoalId: 'g1',
    frequency: 'weekdays',
    customDays: [],
    type: 'physical',
    completions: cx([
      '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19',
      '2026-06-22','2026-06-23','2026-06-24',
      '2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12',
      '2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05',
      '2026-05-25','2026-05-26','2026-05-27','2026-05-28','2026-05-29',
    ]),
  },
  {
    id: 'h3',
    name: 'Review game film (15 min)',
    linkedGoalId: 'g1',
    frequency: 'custom',
    customDays: [1, 3, 5],  // Mon, Wed, Fri
    type: 'mental',
    completions: cx([
      '2026-06-22','2026-06-20','2026-06-17','2026-06-15',  // streak 4 → current
      '2026-06-24',  // Wed = scheduled
      '2026-06-12','2026-06-10','2026-06-08',
      '2026-06-05','2026-06-03','2026-06-01',
      '2026-05-29','2026-05-27',
    ]),
  },
  {
    id: 'h4',
    name: '10 min foam rolling',
    linkedGoalId: undefined,
    frequency: 'daily',
    customDays: [],
    type: 'recovery',
    completions: cx([
      '2026-06-22','2026-06-23','2026-06-24',
      '2026-06-16','2026-06-17',
      '2026-06-10',
      '2026-06-05','2026-06-03',
      '2026-05-28',
    ]),
  },
  {
    id: 'h5',
    name: 'Drink 2L of water',
    linkedGoalId: 'g3',
    frequency: 'daily',
    customDays: [],
    type: 'nutrition',
    completions: cx([
      '2026-06-10','2026-06-11','2026-06-12','2026-06-13','2026-06-14',
      '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19',
      '2026-06-20','2026-06-21','2026-06-22','2026-06-23','2026-06-24',
      '2026-06-03','2026-06-04','2026-06-05','2026-06-06',
      '2026-05-28','2026-05-29','2026-05-30',
    ]),
  },
  {
    id: 'h6',
    name: 'Journal progress',
    linkedGoalId: undefined,
    frequency: 'daily',
    customDays: [],
    type: 'mental',
    completions: cx([
      '2026-06-23','2026-06-24',
      '2026-06-15','2026-06-10','2026-06-05','2026-06-01',
    ]),
  },
]

// ─── localStorage ─────────────────────────────────────────────────────────────

const GOALS_KEY  = 'f14_goals'
const HABITS_KEY = 'f14_habits'

export function loadGoals(): Goal[] {
  if (typeof window === 'undefined') return INIT_GOALS
  try { const r = localStorage.getItem(GOALS_KEY);  return r ? JSON.parse(r) : INIT_GOALS } catch { return INIT_GOALS }
}
export function saveGoals(g: Goal[]): void { localStorage.setItem(GOALS_KEY, JSON.stringify(g)) }

export function loadHabits(): Habit[] {
  if (typeof window === 'undefined') return INIT_HABITS
  try { const r = localStorage.getItem(HABITS_KEY); return r ? JSON.parse(r) : INIT_HABITS } catch { return INIT_HABITS }
}
export function saveHabits(h: Habit[]): void { localStorage.setItem(HABITS_KEY, JSON.stringify(h)) }
