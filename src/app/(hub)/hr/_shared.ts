import type { StaffMember, EmploymentType } from '../team/_shared'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppRole = 'director' | 'employed-coach'
export type LeaveStatus = 'pending' | 'approved' | 'declined'
export type LeaveType = 'annual' | 'sick' | 'personal' | 'other'

export interface AppRoleMap { [staffId: string]: AppRole }

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  submittedDate: string
}

export interface PerformanceReview {
  id: string
  staffId: string
  staffName: string
  period: string
  rating: number
  selfAssessment: string
  managerNotes: string
  actionItems: string[]
  completedDate: string | null
}

export interface OnboardingTask {
  id: string
  label: string
  category: string
  dueDays: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const ONBOARDING_TASKS: OnboardingTask[] = [
  { id: 'ot1',  label: 'Complete tax file number declaration',    category: 'Tax & Banking',   dueDays: 1  },
  { id: 'ot2',  label: 'Provide bank account details',           category: 'Tax & Banking',   dueDays: 1  },
  { id: 'ot3',  label: 'Submit Working With Children Check',     category: 'Compliance',      dueDays: 3  },
  { id: 'ot4',  label: 'Sign employment contract',               category: 'Compliance',      dueDays: 1  },
  { id: 'ot5',  label: 'Upload coaching qualifications',         category: 'Compliance',      dueDays: 5  },
  { id: 'ot6',  label: 'Facility induction walkthrough',         category: 'Training',        dueDays: 3  },
  { id: 'ot7',  label: 'Complete safety & emergency procedures', category: 'Training',        dueDays: 5  },
  { id: 'ot8',  label: 'Set up staff email account',            category: 'System Access',   dueDays: 1  },
  { id: 'ot9',  label: 'Log into Formula14 platform',           category: 'System Access',   dueDays: 2  },
  { id: 'ot10', label: 'Review coaching standards & code',      category: 'Training',        dueDays: 7  },
  { id: 'ot11', label: 'Meet with Head Coach (1:1)',            category: 'Orientation',     dueDays: 5  },
  { id: 'ot12', label: 'Attend first group session (shadow)',   category: 'Orientation',     dueDays: 14 },
]

export const SUPER_RATE = 0.115

export const LS_LEAVE    = 'f14_hr_leave'
export const LS_REVIEWS  = 'f14_hr_reviews'
export const LS_ONBOARD  = 'f14_hr_onboarding'
export const LS_APP_ROLE = 'f14_hr_app_roles'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal Leave', other: 'Other',
}
export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  annual: '#6BA3D6', sick: '#f59e0b', personal: '#8b5cf6', other: '#9ca3af',
}

export const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ── localStorage helpers ──────────────────────────────────────────────────────

export function loadLeave(): LeaveRequest[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(LS_LEAVE); return r ? JSON.parse(r) : [] } catch { return [] }
}
export function saveLeave(d: LeaveRequest[]): void { localStorage.setItem(LS_LEAVE, JSON.stringify(d)) }

export function loadReviews(): PerformanceReview[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem(LS_REVIEWS); return r ? JSON.parse(r) : [] } catch { return [] }
}
export function saveReviews(d: PerformanceReview[]): void { localStorage.setItem(LS_REVIEWS, JSON.stringify(d)) }

export function loadOnboarding(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try { const r = localStorage.getItem(LS_ONBOARD); return r ? JSON.parse(r) : {} } catch { return {} }
}
export function saveOnboarding(d: Record<string, string[]>): void { localStorage.setItem(LS_ONBOARD, JSON.stringify(d)) }

export function loadAppRoles(): AppRoleMap {
  const defaults: AppRoleMap = { s1: 'director', s2: 'director', s3: 'employed-coach' }
  if (typeof window === 'undefined') return defaults
  try { const r = localStorage.getItem(LS_APP_ROLE); return r ? JSON.parse(r) : defaults } catch { return defaults }
}
export function saveAppRoles(d: AppRoleMap): void { localStorage.setItem(LS_APP_ROLE, JSON.stringify(d)) }

// ── Utility functions ─────────────────────────────────────────────────────────

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export function leaveBalance(
  staff: StaffMember,
  leaveList: LeaveRequest[],
  type: LeaveType,
): { total: number; used: number } {
  const totals: Record<LeaveType, Record<EmploymentType, number>> = {
    annual:   { 'full-time': 20, 'part-time': 14, casual: 0, contractor: 0 },
    sick:     { 'full-time': 10, 'part-time': 10, casual: 0, contractor: 0 },
    personal: { 'full-time': 2,  'part-time': 2,  casual: 0, contractor: 0 },
    other:    { 'full-time': 0,  'part-time': 0,  casual: 0, contractor: 0 },
  }
  const total = totals[type][staff.employmentType] ?? 0
  const used = leaveList
    .filter(l => l.staffId === staff.id && l.type === type && l.status === 'approved')
    .reduce((acc, l) => acc + l.days, 0)
  return { total, used }
}
