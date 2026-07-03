'use client'

export const ACCENT = '#6BA3D6'
export const INPUT  = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
export const LABEL  = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

export type EmploymentType = 'full-time' | 'part-time' | 'casual' | 'contractor'
export type StaffStatus    = 'active' | 'inactive'
export type PayRateType    = 'hourly' | 'per-session'
export type DocType        = 'wwcc' | 'qualification' | 'contract' | 'other'
export type DocStatus      = 'verified' | 'pending' | 'expired'
export type PayRunStatus   = 'processed' | 'pending' | 'failed'
export type PayPeriodType  = 'weekly' | 'fortnightly' | 'monthly'

export interface StaffDocument {
  id: string
  name: string
  type: DocType
  uploadedDate: string
  expiryDate: string | null
  status: DocStatus
}

export interface StaffMember {
  id: string
  firstName: string
  lastName: string
  role: string
  employmentType: EmploymentType
  status: StaffStatus
  email: string
  phone: string
  startDate: string
  payRate: number
  payRateType: PayRateType
  bsb: string
  accountNumber: string
  tfn: string
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
  documents: StaffDocument[]
}

export interface PayRunEntry {
  staffId: string
  staffName: string
  sessions: number
  hours: number
  rate: number
  rateType: PayRateType
  calculatedAmount: number
  adjustedAmount: number
  notes: string
}

export interface PayRun {
  id: string
  periodLabel: string
  periodType: PayPeriodType
  processedDate: string | null
  status: PayRunStatus
  totalAmount: number
  staffCount: number
  entries: PayRunEntry[]
}

// ─── Session history ──────────────────────────────────────────────────────────

interface SessionRecord {
  date: string
  name: string
  type: string
  athletes: number
  durationMins: number
}

export function getStaffSessions(_staffId: string): SessionRecord[] {
  return []
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0
export function uid(): string {
  return `tm${Date.now()}${++_seq}`
}

export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

const AVATAR_COLORS = [ACCENT, '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']
export function avatarColor(name: string): string {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function maskSensitive(value: string): string {
  return '•'.repeat(Math.min(value.length, 8))
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  'full-time':  'Full Time',
  'part-time':  'Part Time',
  'casual':     'Casual',
  'contractor': 'Contractor',
}

export const STATUS_COLORS: Record<StaffStatus, string> = {
  active:   '#10b981',
  inactive: '#9ca3af',
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  wwcc:          'WWCC',
  qualification: 'Qualification',
  contract:      'Contract',
  other:         'Other',
}

export const DOC_STATUS_COLORS: Record<DocStatus, { bg: string; text: string }> = {
  verified: { bg: '#dcfce7', text: '#15803d' },
  pending:  { bg: '#fef9c3', text: '#854d0e' },
  expired:  { bg: '#fee2e2', text: '#b91c1c' },
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const STAFF_KEY    = 'f14_team_staff'
const PAY_RUN_KEY  = 'f14_team_pay_runs'
const STAFF_FLUSH  = 'f14_team_flushed_v2'

export function loadStaff(): StaffMember[] {
  if (typeof window === 'undefined') return []
  if (!localStorage.getItem(STAFF_FLUSH)) {
    localStorage.removeItem(STAFF_KEY)
    localStorage.removeItem(PAY_RUN_KEY)
    localStorage.setItem(STAFF_FLUSH, '1')
  }
  try {
    const raw = localStorage.getItem(STAFF_KEY)
    return raw ? (JSON.parse(raw) as StaffMember[]) : []
  } catch {
    return []
  }
}

export function saveStaff(staff: StaffMember[]): void {
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff))
}

export function loadPayRuns(): PayRun[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PAY_RUN_KEY)
    return raw ? (JSON.parse(raw) as PayRun[]) : []
  } catch {
    return []
  }
}

export function savePayRuns(runs: PayRun[]): void {
  localStorage.setItem(PAY_RUN_KEY, JSON.stringify(runs))
}
