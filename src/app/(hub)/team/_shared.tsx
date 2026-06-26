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

// ─── Sample data ──────────────────────────────────────────────────────────────

export const INIT_STAFF: StaffMember[] = [
  {
    id: 's1',
    firstName: 'Matt',
    lastName: 'Brasser',
    role: 'Head Coach',
    employmentType: 'full-time',
    status: 'active',
    email: 'matt@formula14.com.au',
    phone: '0400 123 456',
    startDate: '2022-01-15',
    payRate: 30,
    payRateType: 'hourly',
    bsb: '633-000',
    accountNumber: '12345678',
    tfn: '123456782',
    emergencyContactName: 'Sarah Brasser',
    emergencyContactPhone: '0400 789 012',
    notes: 'Head coach and founder. Responsible for Elite and Individual programs. Also handles admin and business operations.',
    documents: [
      { id: 'd1', name: 'Working With Children Check', type: 'wwcc', uploadedDate: '2024-01-10', expiryDate: '2029-01-10', status: 'verified' },
      { id: 'd2', name: 'Basketball Australia Level 2 Coaching Cert', type: 'qualification', uploadedDate: '2023-06-15', expiryDate: '2026-06-15', status: 'verified' },
      { id: 'd3', name: 'Employment Contract', type: 'contract', uploadedDate: '2022-01-15', expiryDate: null, status: 'verified' },
    ],
  },
  {
    id: 's2',
    firstName: 'Jade',
    lastName: 'Brasser',
    role: 'Assistant Coach',
    employmentType: 'part-time',
    status: 'active',
    email: 'jade@formula14.com.au',
    phone: '0411 234 567',
    startDate: '2023-03-01',
    payRate: 25,
    payRateType: 'hourly',
    bsb: '734-000',
    accountNumber: '87654321',
    tfn: '987654321',
    emergencyContactName: 'Tom Brasser',
    emergencyContactPhone: '0411 890 123',
    notes: 'Skills and conditioning specialist. Runs group sessions and shooting clinics. Available Tue–Sat.',
    documents: [
      { id: 'd4', name: 'Working With Children Check', type: 'wwcc', uploadedDate: '2023-02-20', expiryDate: '2028-02-20', status: 'verified' },
      { id: 'd5', name: 'Basketball Australia Level 1 Coaching Cert', type: 'qualification', uploadedDate: '2023-03-01', expiryDate: '2026-03-01', status: 'expired' },
      { id: 'd6', name: 'Employment Contract', type: 'contract', uploadedDate: '2023-03-01', expiryDate: null, status: 'verified' },
    ],
  },
  {
    id: 's3',
    firstName: 'Sam',
    lastName: 'Torres',
    role: 'Casual Coach',
    employmentType: 'casual',
    status: 'active',
    email: 'sam.torres@email.com',
    phone: '0422 345 678',
    startDate: '2024-09-01',
    payRate: 45,
    payRateType: 'per-session',
    bsb: '082-156',
    accountNumber: '45678901',
    tfn: '456789012',
    emergencyContactName: 'Maria Torres',
    emergencyContactPhone: '0422 901 234',
    notes: 'Casual relief coach. Available weekends and school holidays. Great with junior groups.',
    documents: [
      { id: 'd7', name: 'Working With Children Check', type: 'wwcc', uploadedDate: '2024-08-15', expiryDate: '2029-08-15', status: 'verified' },
      { id: 'd8', name: 'Casual Engagement Letter', type: 'contract', uploadedDate: '2024-09-01', expiryDate: null, status: 'verified' },
    ],
  },
]

export const INIT_PAY_RUNS: PayRun[] = [
  {
    id: 'pr1',
    periodLabel: '1 May 2026 – 14 May 2026',
    periodType: 'fortnightly',
    processedDate: '2026-05-15',
    status: 'processed',
    totalAmount: 2050,
    staffCount: 2,
    entries: [
      { staffId: 's1', staffName: 'Matt Brasser', sessions: 0, hours: 40, rate: 30, rateType: 'hourly', calculatedAmount: 1200, adjustedAmount: 1200, notes: '' },
      { staffId: 's2', staffName: 'Jade Brasser',  sessions: 0, hours: 34, rate: 25, rateType: 'hourly', calculatedAmount:  850, adjustedAmount:  850, notes: '' },
    ],
  },
  {
    id: 'pr2',
    periodLabel: '15 May 2026 – 28 May 2026',
    periodType: 'fortnightly',
    processedDate: '2026-05-29',
    status: 'processed',
    totalAmount: 2050,
    staffCount: 2,
    entries: [
      { staffId: 's1', staffName: 'Matt Brasser', sessions: 0, hours: 40, rate: 30, rateType: 'hourly', calculatedAmount: 1200, adjustedAmount: 1200, notes: '' },
      { staffId: 's2', staffName: 'Jade Brasser',  sessions: 0, hours: 34, rate: 25, rateType: 'hourly', calculatedAmount:  850, adjustedAmount:  850, notes: '' },
    ],
  },
  {
    id: 'pr3',
    periodLabel: '1 Jun 2026 – 14 Jun 2026',
    periodType: 'fortnightly',
    processedDate: '2026-06-15',
    status: 'processed',
    totalAmount: 2050,
    staffCount: 2,
    entries: [
      { staffId: 's1', staffName: 'Matt Brasser', sessions: 0, hours: 40, rate: 30, rateType: 'hourly', calculatedAmount: 1200, adjustedAmount: 1200, notes: '' },
      { staffId: 's2', staffName: 'Jade Brasser',  sessions: 0, hours: 34, rate: 25, rateType: 'hourly', calculatedAmount:  850, adjustedAmount:  850, notes: '' },
    ],
  },
  {
    id: 'pr4',
    periodLabel: '15 Jun 2026 – 28 Jun 2026',
    periodType: 'fortnightly',
    processedDate: null,
    status: 'pending',
    totalAmount: 2410,
    staffCount: 3,
    entries: [
      { staffId: 's1', staffName: 'Matt Brasser', sessions: 0, hours: 40, rate: 30, rateType: 'hourly',      calculatedAmount: 1200, adjustedAmount: 1200, notes: '' },
      { staffId: 's2', staffName: 'Jade Brasser',  sessions: 0, hours: 34, rate: 25, rateType: 'hourly',      calculatedAmount:  850, adjustedAmount:  850, notes: '' },
      { staffId: 's3', staffName: 'Sam Torres',   sessions: 8, hours:  0, rate: 45, rateType: 'per-session', calculatedAmount:  360, adjustedAmount:  360, notes: '8 sessions 15–28 Jun' },
    ],
  },
]

// ─── Session history (would come from booking system in prod) ─────────────────

interface SessionRecord {
  date: string
  name: string
  type: string
  athletes: number
  durationMins: number
}

export function getStaffSessions(staffId: string): SessionRecord[] {
  const base: Record<string, SessionRecord[]> = {
    s1: [
      { date: '2026-06-23', name: 'Elite Training — Mon AM',   type: 'Elite',       athletes: 6,  durationMins: 90 },
      { date: '2026-06-20', name: 'Individual — Jake R.',      type: 'Individual',  athletes: 1,  durationMins: 60 },
      { date: '2026-06-18', name: 'Group Skills — Tue PM',     type: 'Group',       athletes: 8,  durationMins: 75 },
      { date: '2026-06-16', name: 'Elite Training — Mon AM',   type: 'Elite',       athletes: 6,  durationMins: 90 },
      { date: '2026-06-13', name: 'Individual — Liam T.',      type: 'Individual',  athletes: 1,  durationMins: 60 },
      { date: '2026-06-11', name: 'Group Skills — Wed PM',     type: 'Group',       athletes: 9,  durationMins: 75 },
      { date: '2026-06-09', name: 'Elite Training — Mon AM',   type: 'Elite',       athletes: 6,  durationMins: 90 },
      { date: '2026-06-06', name: 'Individual — Mia K.',       type: 'Individual',  athletes: 1,  durationMins: 60 },
    ],
    s2: [
      { date: '2026-06-22', name: 'Shooting Clinic — Sun',     type: 'Group',       athletes: 10, durationMins: 60 },
      { date: '2026-06-19', name: 'Group Skills — Thu PM',     type: 'Group',       athletes: 8,  durationMins: 75 },
      { date: '2026-06-17', name: 'Conditioning — Tue AM',     type: 'Group',       athletes: 6,  durationMins: 60 },
      { date: '2026-06-15', name: 'Shooting Clinic — Sun',     type: 'Group',       athletes: 9,  durationMins: 60 },
      { date: '2026-06-12', name: 'Group Skills — Thu PM',     type: 'Group',       athletes: 7,  durationMins: 75 },
      { date: '2026-06-10', name: 'Conditioning — Tue AM',     type: 'Group',       athletes: 5,  durationMins: 60 },
    ],
    s3: [
      { date: '2026-06-22', name: 'Junior Group — Sun AM',     type: 'Group',       athletes: 8,  durationMins: 60 },
      { date: '2026-06-21', name: 'Junior Group — Sat AM',     type: 'Group',       athletes: 10, durationMins: 60 },
      { date: '2026-06-15', name: 'Junior Group — Sun AM',     type: 'Group',       athletes: 9,  durationMins: 60 },
      { date: '2026-06-14', name: 'Junior Group — Sat AM',     type: 'Group',       athletes: 8,  durationMins: 60 },
    ],
  }
  return base[staffId] ?? []
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

export function loadStaff(): StaffMember[] {
  if (typeof window === 'undefined') return INIT_STAFF
  try {
    const raw = localStorage.getItem(STAFF_KEY)
    return raw ? (JSON.parse(raw) as StaffMember[]) : INIT_STAFF
  } catch {
    return INIT_STAFF
  }
}

export function saveStaff(staff: StaffMember[]): void {
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff))
}

export function loadPayRuns(): PayRun[] {
  if (typeof window === 'undefined') return INIT_PAY_RUNS
  try {
    const raw = localStorage.getItem(PAY_RUN_KEY)
    return raw ? (JSON.parse(raw) as PayRun[]) : INIT_PAY_RUNS
  } catch {
    return INIT_PAY_RUNS
  }
}

export function savePayRuns(runs: PayRun[]): void {
  localStorage.setItem(PAY_RUN_KEY, JSON.stringify(runs))
}
