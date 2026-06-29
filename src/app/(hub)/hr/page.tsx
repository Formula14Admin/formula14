'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { sendEmail } from '@/lib/send-email'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES } from '@/lib/sessionTypes'
import {
  IconBriefcase,
  IconUsers,
  IconCalendar,
  IconClipboardList,
  IconBeach,
  IconFile,
  IconStar,
  IconCash,
  IconShieldCheck,
  IconPlus,
  IconX,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconSearch,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconInfoCircle,
  IconDownload,
  IconUpload,
  IconMail,
  IconPhone,
  IconId,
  IconBuildingBank,
  IconCertificate,
  IconNotes,
  IconUserPlus,
  IconCircleCheck,
  IconCircleX,
  IconDots,
  IconEye,
  IconEyeOff,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react'
import {
  StaffMember,
  PayRun,
  PayRunEntry,
  StaffDocument,
  EmploymentType,
  StaffStatus,
  PayRateType,
  DocType,
  DocStatus,
  INIT_STAFF,
  INIT_PAY_RUNS,
  loadStaff,
  saveStaff,
  loadPayRuns,
  savePayRuns,
  EMPLOYMENT_LABELS,
  STATUS_COLORS,
  DOC_TYPE_LABELS,
  DOC_STATUS_COLORS,
  fmtMoney,
  fmtDate,
  fmtDateShort,
  initials,
  avatarColor,
  maskSensitive,
  uid,
  ACCENT,
} from '../team/_shared'

// ── Types ─────────────────────────────────────────────────────────────────────

type AppRole = 'director' | 'employed-coach'
type HRTab = 'people' | 'availability' | 'onboarding' | 'leave' | 'documents' | 'performance' | 'payroll' | 'compliance'
type AvailSub = 'overview' | 'coach' | 'facility'
type LeaveStatus = 'pending' | 'approved' | 'declined'
type LeaveType = 'annual' | 'sick' | 'personal' | 'other'

interface AppRoleMap { [staffId: string]: AppRole }

interface LeaveRequest {
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

interface PerformanceReview {
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

interface OnboardingTask {
  id: string
  label: string
  category: string
  dueDays: number
}

const ONBOARDING_TASKS: OnboardingTask[] = [
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

// Sample leave requests
const INIT_LEAVE: LeaveRequest[] = [
  { id: 'lr1', staffId: 's2', staffName: 'Jade Brasser',  type: 'annual',   startDate: '2026-07-07', endDate: '2026-07-11', days: 5,  reason: 'Family holiday',       status: 'pending',  submittedDate: '2026-06-20' },
  { id: 'lr2', staffId: 's3', staffName: 'Sam Torres',   type: 'sick',     startDate: '2026-06-18', endDate: '2026-06-18', days: 1,  reason: 'Unwell',               status: 'approved', submittedDate: '2026-06-18' },
  { id: 'lr3', staffId: 's1', staffName: 'Matt Brasser', type: 'personal', startDate: '2026-08-03', endDate: '2026-08-03', days: 1,  reason: 'Personal commitment',  status: 'pending',  submittedDate: '2026-06-22' },
]

// Sample performance reviews
const INIT_REVIEWS: PerformanceReview[] = [
  {
    id: 'pr1', staffId: 's1', staffName: 'Matt Brasser', period: 'H1 2026',
    rating: 5, selfAssessment: 'Strong season — athlete progress has been excellent across Elite and Individual programs. Systems are in place and running well.',
    managerNotes: 'Outstanding leadership and commitment to athlete development.',
    actionItems: ['Complete Level 3 coaching certification by Dec 2026', 'Onboard one additional casual coach by Aug 2026'],
    completedDate: '2026-06-15',
  },
  {
    id: 'pr2', staffId: 's2', staffName: 'Jade Brasser', period: 'H1 2026',
    rating: 4, selfAssessment: 'Great group session results but I need to update my Level 1 cert which expired.',
    managerNotes: 'Excellent with athletes, especially juniors. Must address qualification expiry as a priority.',
    actionItems: ['Renew Level 1 coaching cert immediately', 'Lead at least 2 shooting clinics independently by Sep 2026'],
    completedDate: '2026-06-16',
  },
  {
    id: 'pr3', staffId: 's3', staffName: 'Sam Torres', period: 'H1 2026',
    rating: 4, selfAssessment: 'Enjoyed working with the junior groups. Would love more hours if available.',
    managerNotes: 'Reliable and great with kids. Consider increasing hours if program expands.',
    actionItems: ['Complete first aid refresher by Aug 2026'],
    completedDate: null,
  },
]

// Superannuation rate
const SUPER_RATE = 0.115

// ── Helpers ───────────────────────────────────────────────────────────────────

const LS_LEAVE    = 'f14_hr_leave'
const LS_REVIEWS  = 'f14_hr_reviews'
const LS_ONBOARD  = 'f14_hr_onboarding'
const LS_APP_ROLE = 'f14_hr_app_roles'

function loadLeave(): LeaveRequest[] {
  if (typeof window === 'undefined') return INIT_LEAVE
  try { const r = localStorage.getItem(LS_LEAVE); return r ? JSON.parse(r) : INIT_LEAVE } catch { return INIT_LEAVE }
}
function saveLeave(d: LeaveRequest[]): void { localStorage.setItem(LS_LEAVE, JSON.stringify(d)) }

function loadReviews(): PerformanceReview[] {
  if (typeof window === 'undefined') return INIT_REVIEWS
  try { const r = localStorage.getItem(LS_REVIEWS); return r ? JSON.parse(r) : INIT_REVIEWS } catch { return INIT_REVIEWS }
}
function saveReviews(d: PerformanceReview[]): void { localStorage.setItem(LS_REVIEWS, JSON.stringify(d)) }

function loadOnboarding(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try { const r = localStorage.getItem(LS_ONBOARD); return r ? JSON.parse(r) : {} } catch { return {} }
}
function saveOnboarding(d: Record<string, string[]>): void { localStorage.setItem(LS_ONBOARD, JSON.stringify(d)) }

function loadAppRoles(): AppRoleMap {
  const defaults: AppRoleMap = { s1: 'director', s2: 'director', s3: 'employed-coach' }
  if (typeof window === 'undefined') return defaults
  try { const r = localStorage.getItem(LS_APP_ROLE); return r ? JSON.parse(r) : defaults } catch { return defaults }
}
function saveAppRoles(d: AppRoleMap): void { localStorage.setItem(LS_APP_ROLE, JSON.stringify(d)) }

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function leaveBalance(staff: StaffMember, leaveList: LeaveRequest[], type: LeaveType): { total: number; used: number } {
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

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = { annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal Leave', other: 'Other' }
const LEAVE_TYPE_COLORS: Record<LeaveType, string> = { annual: '#6BA3D6', sick: '#f59e0b', personal: '#8b5cf6', other: '#9ca3af' }

const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: bg, color }}>{label}</span>
  )
}

function Avatar({ firstName, lastName, size = 36 }: { firstName: string; lastName: string; size?: number }) {
  const bg = avatarColor(`${firstName} ${lastName}`)
  const font = Math.round(size * 0.36)
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: font }}>
      {initials(firstName, lastName)}
    </div>
  )
}

// ── People Tab ────────────────────────────────────────────────────────────────

const EMPTY_STAFF: Omit<StaffMember, 'id' | 'documents'> & { appRole: AppRole } = {
  firstName: '', lastName: '', role: '', employmentType: 'full-time', status: 'active',
  email: '', phone: '', startDate: TODAY_ISO, payRate: 0, payRateType: 'hourly',
  bsb: '', accountNumber: '', tfn: '', emergencyContactName: '', emergencyContactPhone: '',
  notes: '', appRole: 'employed-coach',
}

function PeopleTab({ staff, setStaff, appRoles, setAppRoles }: {
  staff: StaffMember[]
  setStaff: (s: StaffMember[]) => void
  appRoles: AppRoleMap
  setAppRoles: (r: AppRoleMap) => void
}) {
  const [search, setSearch]   = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd]  = useState(false)
  const [form, setForm]        = useState<typeof EMPTY_STAFF>({ ...EMPTY_STAFF })
  const [addSection, setAddSection] = useState<string>('personal')
  const [showSensitive, setShowSensitive] = useState(false)
  const [invited, setInvited]  = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [staffToast, setStaffToast] = useState<string | null>(null)

  function showStaffToast(msg: string) { setStaffToast(msg); setTimeout(() => setStaffToast(null), 4000) }

  function handleDeactivate(id: string) {
    const updated = staff.map(s => s.id === id ? { ...s, status: 'inactive' as StaffStatus } : s)
    saveStaff(updated); setStaff(updated)
    showStaffToast('Staff member marked as inactive.')
  }

  function handleReactivate(id: string) {
    const updated = staff.map(s => s.id === id ? { ...s, status: 'active' as StaffStatus } : s)
    saveStaff(updated); setStaff(updated)
    showStaffToast('Staff member reactivated.')
  }

  function handleDelete(id: string) {
    setDeleting(true)
    const updated = staff.filter(s => s.id !== id)
    saveStaff(updated); setStaff(updated)
    if (selected === id) setSelected(null)
    setConfirmDeleteId(null)
    setDeleting(false)
    showStaffToast('Staff member deleted.')
  }

  const filtered = useMemo(() =>
    staff.filter(s => {
      if (!showInactive && s.status === 'inactive') return false
      return `${s.firstName} ${s.lastName} ${s.role}`.toLowerCase().includes(search.toLowerCase())
    }),
  [staff, search, showInactive])

  const selectedStaff = staff.find(s => s.id === selected) ?? null

  function handleAdd() {
    const member: StaffMember = {
      ...form,
      id: uid(),
      documents: [],
    }
    const newRoles = { ...appRoles, [member.id]: form.appRole }
    const updated = [...staff, member]
    saveStaff(updated)
    saveAppRoles(newRoles)
    setStaff(updated)
    setAppRoles(newRoles)
    setShowAdd(false)
    setForm({ ...EMPTY_STAFF })
    setInvited(true)
    setTimeout(() => setInvited(false), 3000)
    if (member.email) {
      sendEmail({
        template: 'staff-invitation',
        to: member.email,
        data: {
          firstName: member.firstName,
          lastName:  member.lastName,
          email:     member.email,
          role:      member.role || 'Coach',
          appRole:   form.appRole || 'coach',
        },
      }).catch(console.error)
    }
  }

  const ADD_SECTIONS = ['personal', 'employment', 'compensation', 'banking', 'tax', 'documents', 'notes']

  return (
    <div className="flex h-full min-h-0 gap-5 p-6">
      {/* Left — directory */}
      <div className="flex w-80 shrink-0 flex-col gap-4">
        {/* Search + Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6BA3D6]" />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: ACCENT }}>
            <IconPlus size={16} /> Add
          </button>
        </div>

        {invited && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <IconCheck size={15} /> Invitation email queued.
          </div>
        )}

        {/* Show Inactive toggle */}
        {staff.some(s => s.status === 'inactive') && (
          <button type="button" onClick={() => setShowInactive(v => !v)}
            className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
            style={showInactive ? { backgroundColor: '#6b7280', color: 'white', borderColor: '#6b7280' } : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </button>
        )}

        {/* Staff cards */}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {filtered.map(s => {
            const role = appRoles[s.id]
            const isSelected = s.id === selected
            const inactive = s.status === 'inactive'
            return (
              <div key={s.id} className="relative">
                <button type="button" onClick={() => setSelected(isSelected ? null : s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${isSelected ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                  style={{ opacity: inactive ? 0.6 : 1 }}>
                  <Avatar firstName={s.firstName} lastName={s.lastName} size={40} />
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="truncate text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                    <p className="truncate text-xs text-gray-500">{s.role}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <Badge label={EMPLOYMENT_LABELS[s.employmentType]} color="#6b7280" bg="#f3f4f6" />
                      {role === 'director' && <Badge label="Director" color="#4a7fb5" bg="#eff6ff" />}
                      {inactive && <Badge label="Inactive" color="#6b7280" bg="#f3f4f6" />}
                      {!inactive && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />}
                    </div>
                  </div>
                </button>
                {/* Three-dot action menu */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                  <button type="button" onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === s.id ? null : s.id) }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    ⋯
                  </button>
                  {actionMenuId === s.id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setActionMenuId(null)} />
                      <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button type="button" onClick={() => { setActionMenuId(null); setSelected(s.id) }}
                          className="flex w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">View Profile</button>
                        {inactive ? (
                          <button type="button" onClick={() => { setActionMenuId(null); handleReactivate(s.id) }}
                            className="flex w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50">Reactivate</button>
                        ) : (
                          <button type="button" onClick={() => { setActionMenuId(null); handleDeactivate(s.id) }}
                            className="flex w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Mark as Inactive</button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button type="button" onClick={() => { setActionMenuId(null); setConfirmDeleteId(s.id) }}
                          className="flex w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right — detail panel */}
      <div className="min-w-0 flex-1">
        {!selectedStaff ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
            <div className="text-center">
              <IconUsers size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">Select a staff member to view details</p>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {/* Header */}
            <div className="mb-6 flex items-start gap-4">
              <Avatar firstName={selectedStaff.firstName} lastName={selectedStaff.lastName} size={56} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{selectedStaff.firstName} {selectedStaff.lastName}</h2>
                <p className="text-sm text-gray-500">{selectedStaff.role} · {EMPLOYMENT_LABELS[selectedStaff.employmentType]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge label={selectedStaff.status === 'active' ? 'Active' : 'Inactive'} color={STATUS_COLORS[selectedStaff.status]} bg={selectedStaff.status === 'active' ? '#dcfce7' : '#f3f4f6'} />
                  {appRoles[selectedStaff.id] && (
                    <Badge label={appRoles[selectedStaff.id] === 'director' ? 'Director' : 'Employed Coach'} color="#4a7fb5" bg="#eff6ff" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedStaff.status === 'active' ? (
                  <button type="button" onClick={() => handleDeactivate(selectedStaff.id)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                    Mark Inactive
                  </button>
                ) : (
                  <button type="button" onClick={() => handleReactivate(selectedStaff.id)}
                    className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-semibold text-green-600 hover:bg-green-50">
                    Reactivate
                  </button>
                )}
                <button type="button" onClick={() => setConfirmDeleteId(selectedStaff.id)}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                  Delete
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><IconEdit size={16} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><p className="text-xs font-semibold uppercase text-gray-400">Email</p><p className="mt-0.5 text-gray-800">{selectedStaff.email}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Phone</p><p className="mt-0.5 text-gray-800">{selectedStaff.phone}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Start Date</p><p className="mt-0.5 text-gray-800">{fmtDate(selectedStaff.startDate)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Pay Rate</p><p className="mt-0.5 text-gray-800">{fmtMoney(selectedStaff.payRate)}/{selectedStaff.payRateType === 'hourly' ? 'hr' : 'session'}</p></div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase text-gray-400">BSB</p>
                  <button onClick={() => setShowSensitive(!showSensitive)} className="text-gray-400 hover:text-gray-600">
                    {showSensitive ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                  </button>
                </div>
                <p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.bsb : maskSensitive(selectedStaff.bsb)}</p>
              </div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Account</p><p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.accountNumber : maskSensitive(selectedStaff.accountNumber)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">TFN</p><p className="mt-0.5 text-gray-800">{showSensitive ? selectedStaff.tfn : maskSensitive(selectedStaff.tfn)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-gray-400">Emergency Contact</p><p className="mt-0.5 text-gray-800">{selectedStaff.emergencyContactName} · {selectedStaff.emergencyContactPhone}</p></div>
            </div>

            {selectedStaff.notes && (
              <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700"><strong className="text-xs font-semibold uppercase text-gray-400 block mb-1">Notes</strong>{selectedStaff.notes}</div>
            )}

            {/* Documents */}
            {selectedStaff.documents.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Documents</p>
                <div className="space-y-2">
                  {selectedStaff.documents.map(doc => {
                    const colors = DOC_STATUS_COLORS[doc.status]
                    return (
                      <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <IconFile size={15} className="shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800">{doc.name}</p>
                          {doc.expiryDate && <p className="text-xs text-gray-500">Expires {fmtDate(doc.expiryDate)}</p>}
                        </div>
                        <Badge label={doc.status} color={colors.text} bg={colors.bg} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Add New Employee</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>

            {/* Section nav */}
            <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-6 py-2">
              {ADD_SECTIONS.map(sec => (
                <button key={sec} type="button" onClick={() => setAddSection(sec)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${addSection === sec ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  style={addSection === sec ? { backgroundColor: ACCENT } : undefined}>
                  {sec}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">

              {addSection === 'personal' && <>
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="First Name" value={form.firstName} onChange={v => setForm(f => ({...f, firstName: v}))} />
                  <ModalField label="Last Name"  value={form.lastName}  onChange={v => setForm(f => ({...f, lastName: v}))} />
                </div>
                <ModalField label="Email Address" value={form.email}  onChange={v => setForm(f => ({...f, email: v}))} type="email" />
                <ModalField label="Phone Number"  value={form.phone}  onChange={v => setForm(f => ({...f, phone: v}))} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="Emergency Contact Name"  value={form.emergencyContactName}  onChange={v => setForm(f => ({...f, emergencyContactName: v}))} />
                  <ModalField label="Emergency Contact Phone" value={form.emergencyContactPhone} onChange={v => setForm(f => ({...f, emergencyContactPhone: v}))} />
                </div>
              </>}

              {addSection === 'employment' && <>
                <ModalField label="Job Title / Role" value={form.role} onChange={v => setForm(f => ({...f, role: v}))} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalSelect label="Employment Type" value={form.employmentType} onChange={v => setForm(f => ({...f, employmentType: v as EmploymentType}))}
                    options={[['full-time','Full Time'],['part-time','Part Time'],['casual','Casual'],['contractor','Contractor']]} />
                  <ModalSelect label="App Role" value={form.appRole} onChange={v => setForm(f => ({...f, appRole: v as AppRole}))}
                    options={[['director','Director'],['employed-coach','Employed Coach']]} />
                </div>
                <ModalField label="Start Date" value={form.startDate} onChange={v => setForm(f => ({...f, startDate: v}))} type="date" />
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                  An invitation email will be queued to the employee&apos;s address once saved. They can set their own password on first login.
                </div>
              </>}

              {addSection === 'compensation' && <>
                <div className="grid grid-cols-2 gap-4">
                  <ModalField label="Pay Rate ($)" value={String(form.payRate)} onChange={v => setForm(f => ({...f, payRate: parseFloat(v) || 0}))} type="number" />
                  <ModalSelect label="Rate Type" value={form.payRateType} onChange={v => setForm(f => ({...f, payRateType: v as PayRateType}))}
                    options={[['hourly','Per Hour'],['per-session','Per Session']]} />
                </div>
                <p className="text-xs text-gray-500">Superannuation is calculated at {(SUPER_RATE * 100).toFixed(1)}% on top of base pay.</p>
              </>}

              {addSection === 'banking' && <>
                <ModalField label="BSB" value={form.bsb} onChange={v => setForm(f => ({...f, bsb: v}))} placeholder="000-000" />
                <ModalField label="Account Number" value={form.accountNumber} onChange={v => setForm(f => ({...f, accountNumber: v}))} />
              </>}

              {addSection === 'tax' && <>
                <ModalField label="Tax File Number (TFN)" value={form.tfn} onChange={v => setForm(f => ({...f, tfn: v}))} placeholder="123 456 789" />
                <p className="text-xs text-gray-500">TFN is stored securely and only shown to Directors.</p>
              </>}

              {addSection === 'documents' && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <IconUpload size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Documents can be uploaded after the employee record is saved.</p>
                  <p className="mt-1 text-xs text-gray-400">Go to HR → Documents to upload WWCC, contracts, and qualifications.</p>
                </div>
              )}

              {addSection === 'notes' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Internal Notes</label>
                  <textarea rows={5} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] resize-none"
                    placeholder="Notes visible to Directors only…" />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={!form.firstName || !form.lastName || !form.email}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}>
                Save & Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (() => {
        const s = staff.find(x => x.id === confirmDeleteId)
        if (!s) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <IconX size={24} className="text-red-600" />
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">Delete {s.firstName} {s.lastName}?</h2>
              <p className="mb-6 text-sm text-gray-500">
                This will permanently remove their profile, pay history and all associated records.
                <strong className="font-semibold text-gray-700"> This cannot be undone.</strong>
              </p>
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                To preserve history, consider <strong>Mark as Inactive</strong> instead — they can be reactivated at any time.
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={deleting}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={() => handleDelete(confirmDeleteId)} disabled={deleting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}>
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Staff toast ── */}
      {staffToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {staffToast}
        </div>
      )}
    </div>
  )
}

function ModalField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10" />
    </div>
  )
}

function ModalSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

// ── Availability Tab ───────────────────────────────────────────────────────────

// day_of_week: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat (JS Date.getDay() convention)
const DAYS_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_JS      = [1, 2, 3, 4, 5, 6, 0]  // maps DAYS_SHORT index → JS day-of-week
const AVAIL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const COACHED_TYPE_IDS = CANONICAL_SESSION_TYPES.filter(t => !t.selfServe).map(t => t.id)

function timeStr(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.slice(0, 5)
}

interface ExceptionRow {
  id: string
  appliesTo: string
  exceptionType: 'block' | 'extra'
  date: string
  startTime: string | null
  endTime: string | null
  reason: string | null
}

// ── Per-coach schedule editor ──────────────────────────────────────────────────

interface DaySlot {
  dow:       number    // JS day-of-week
  label:     string
  available: boolean
  start:     string   // 'HH:MM'
  end:       string
  types:     string[]
}

function CoachScheduleEditor({ coachId, coachName }: { coachId: string; coachName: string }) {
  const blank = (): DaySlot[] =>
    DAYS_SHORT.map((label, i) => ({
      dow: DOW_JS[i], label, available: false,
      start: '06:00', end: '21:00', types: [...COACHED_TYPE_IDS],
    }))

  const [days,    setDays]    = useState<DaySlot[]>(blank)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: err } = await supabase
          .from('coach_availability').select('*').eq('coach_id', coachId)
        if (err) throw err
        setDays(blank().map(slot => {
          const row = (data ?? []).find((r: Record<string, unknown>) => r.day_of_week === slot.dow)
          if (!row) return slot
          return {
            ...slot,
            available: true,
            start: timeStr(row.start_time as string) || '06:00',
            end:   timeStr(row.end_time   as string) || '21:00',
            types: (row.session_types_enabled as string[]) ?? [...COACHED_TYPE_IDS],
          }
        }))
      } catch (e) {
        setError('Failed to load schedule.')
        console.error('[CoachScheduleEditor]', e)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId])

  function toggle(idx: number) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, available: !d.available } : d))
  }
  function setStart(idx: number, v: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, start: v } : d))
  }
  function setEnd(idx: number, v: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, end: v } : d))
  }
  function toggleType(idx: number, typeId: string) {
    setDays(prev => prev.map((d, i) => {
      if (i !== idx) return d
      const types = d.types.includes(typeId) ? d.types.filter(t => t !== typeId) : [...d.types, typeId]
      return { ...d, types }
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const offDows = days.filter(d => !d.available).map(d => d.dow)
      if (offDows.length > 0) {
        const { error: de } = await supabase.from('coach_availability')
          .delete().eq('coach_id', coachId).in('day_of_week', offDows)
        if (de) throw de
      }
      for (const d of days.filter(d => d.available)) {
        const { error: ue } = await supabase.from('coach_availability').upsert({
          coach_id:              coachId,
          day_of_week:           d.dow,
          start_time:            d.start,
          end_time:              d.end,
          session_types_enabled: d.types,
        }, { onConflict: 'coach_id,day_of_week' })
        if (ue) throw ue
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError('Save failed — check console.')
      console.error('[CoachScheduleEditor save]', e)
    } finally {
      setSaving(false)
    }
  }

  const INPUT = 'rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#6BA3D6] focus:outline-none focus:ring-1 focus:ring-[#6BA3D6]/20'

  if (loading) return <p className="py-4 text-sm text-gray-400">Loading {coachName}&apos;s schedule…</p>

  return (
    <div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4 w-12">Day</th>
              <th className="pb-2 pr-4 w-28">Available</th>
              <th className="pb-2 pr-6">Hours</th>
              <th className="pb-2">Session types they coach</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, idx) => (
              <tr key={d.label} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 font-semibold text-gray-700">{d.label}</td>
                <td className="py-2.5 pr-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={d.available} onChange={() => toggle(idx)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#6BA3D6]" />
                    <span className={`text-xs font-medium ${d.available ? 'text-green-600' : 'text-gray-400'}`}>
                      {d.available ? 'Available' : 'Off'}
                    </span>
                  </label>
                </td>
                <td className="py-2.5 pr-6">
                  {d.available
                    ? <div className="flex items-center gap-1.5">
                        <input type="time" value={d.start} onChange={e => setStart(idx, e.target.value)} className={INPUT} />
                        <span className="text-gray-400">–</span>
                        <input type="time" value={d.end}   onChange={e => setEnd(idx, e.target.value)}   className={INPUT} />
                      </div>
                    : <span className="text-xs text-gray-300">—</span>
                  }
                </td>
                <td className="py-2.5">
                  {d.available
                    ? <div className="flex flex-wrap gap-1.5">
                        {CANONICAL_SESSION_TYPES.filter(t => !t.selfServe).map(t => {
                          const on = d.types.includes(t.id)
                          return (
                            <label key={t.id} className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition"
                              style={on ? { backgroundColor: '#EBF3FB', color: '#6BA3D6' } : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                              <input type="checkbox" checked={on} onChange={() => toggleType(idx, t.id)}
                                className="h-3 w-3 cursor-pointer accent-[#6BA3D6]" />
                              {t.label}
                            </label>
                          )
                        })}
                      </div>
                    : <span className="text-xs text-gray-300">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-600 font-medium">Schedule saved ✓</span>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#6BA3D6' }}>
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>
    </div>
  )
}

// ── Facility hours editor ──────────────────────────────────────────────────────

interface FacilitySlot { dow: number; label: string; open: boolean; start: string; end: string }

function FacilityScheduleEditor() {
  const blank = (): FacilitySlot[] =>
    DAYS_SHORT.map((label, i) => ({ dow: DOW_JS[i], label, open: false, start: '06:00', end: '21:00' }))

  const [days,    setDays]    = useState<FacilitySlot[]>(blank)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: err } = await supabase.from('facility_availability').select('*')
        if (err) throw err
        setDays(blank().map(slot => {
          const row = (data ?? []).find((r: Record<string, unknown>) => r.day_of_week === slot.dow)
          if (!row) return slot
          return {
            ...slot, open: true,
            start: timeStr(row.start_time as string) || '06:00',
            end:   timeStr(row.end_time   as string) || '21:00',
          }
        }))
      } catch (e) {
        setError('Failed to load facility hours.')
        console.error('[FacilityScheduleEditor]', e)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(idx: number) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, open: !d.open } : d))
  }
  function setStart(idx: number, v: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, start: v } : d))
  }
  function setEnd(idx: number, v: string) {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, end: v } : d))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const closedDows = days.filter(d => !d.open).map(d => d.dow)
      if (closedDows.length > 0) {
        const { error: de } = await supabase.from('facility_availability').delete().in('day_of_week', closedDows)
        if (de) throw de
      }
      for (const d of days.filter(d => d.open)) {
        const { error: ue } = await supabase.from('facility_availability').upsert({
          day_of_week: d.dow, start_time: d.start, end_time: d.end, disabled_session_types: [],
        }, { onConflict: 'day_of_week' })
        if (ue) throw ue
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError('Save failed — check console.')
      console.error('[FacilityScheduleEditor save]', e)
    } finally {
      setSaving(false)
    }
  }

  const INPUT = 'rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#6BA3D6] focus:outline-none focus:ring-1 focus:ring-[#6BA3D6]/20'

  if (loading) return <p className="py-4 text-sm text-gray-400">Loading facility hours…</p>

  return (
    <div>
      {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-4 w-12">Day</th>
              <th className="pb-2 pr-4 w-28">Open</th>
              <th className="pb-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, idx) => (
              <tr key={d.label} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 font-semibold text-gray-700">{d.label}</td>
                <td className="py-2.5 pr-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={d.open} onChange={() => toggle(idx)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#6BA3D6]" />
                    <span className={`text-xs font-medium ${d.open ? 'text-green-600' : 'text-gray-400'}`}>
                      {d.open ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </td>
                <td className="py-2.5">
                  {d.open
                    ? <div className="flex items-center gap-1.5">
                        <input type="time" value={d.start} onChange={e => setStart(idx, e.target.value)} className={INPUT} />
                        <span className="text-gray-400">–</span>
                        <input type="time" value={d.end}   onChange={e => setEnd(idx, e.target.value)}   className={INPUT} />
                      </div>
                    : <span className="text-xs text-gray-300">Closed</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-green-600 font-medium">Hours saved ✓</span>}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#6BA3D6' }}>
          {saving ? 'Saving…' : 'Save Hours'}
        </button>
      </div>
    </div>
  )
}

// ── Availability Tab ───────────────────────────────────────────────────────────

function AvailabilityTab({ staff }: { staff: StaffMember[] }) {
  const [sub, setSub] = useState<AvailSub>('overview')

  // Overview calendar state (loaded independently — coach editors own their own state)
  const [calMonth,  setCalMonth]  = useState(() => new Date())
  const [coachRows, setCoachRows] = useState<{ coachId: string; dayOfWeek: number }[]>([])
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([])

  // Exception form
  const [exForm,   setExForm]   = useState({ appliesTo: 'facility', exType: 'block', date: '', startTime: '', endTime: '', reason: '' })
  const [savingEx, setSavingEx] = useState(false)

  // Load overview data (coach availability + exceptions)
  useEffect(() => {
    void (async () => {
      try {
        const [{ data: cd }, { data: ex }] = await Promise.all([
          supabase.from('coach_availability').select('coach_id, day_of_week'),
          supabase.from('availability_exceptions').select('*').order('date'),
        ])
        setCoachRows((cd ?? []).map((r: Record<string, unknown>) => ({
          coachId:   r.coach_id  as string,
          dayOfWeek: r.day_of_week as number,
        })))
        setExceptions((ex ?? []).map((r: Record<string, unknown>) => ({
          id:            r.id            as string,
          appliesTo:     r.applies_to   as string,
          exceptionType: r.exception_type as 'block' | 'extra',
          date:          r.date          as string,
          startTime:     timeStr(r.start_time as string | null) || null,
          endTime:       timeStr(r.end_time   as string | null) || null,
          reason:        (r.reason        as string | null) ?? null,
        })))
      } catch (e) {
        console.error('[AvailabilityTab overview]', e)
      }
    })()
  }, [])

  const monthDates = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const firstDow = ((new Date(y, m, 1).getDay() + 6) % 7)
    const daysInMon = new Date(y, m + 1, 0).getDate()
    const cells = Math.ceil((firstDow + daysInMon) / 7) * 7
    return Array.from({ length: cells }, (_, i) => {
      const day = i - firstDow + 1
      if (day < 1 || day > daysInMon) return null
      return new Date(y, m, day).toISOString().slice(0, 10)
    })
  }, [calMonth])

  const coachColors: Record<string, string> = { s1: '#6BA3D6', s2: '#6BAD6B', s3: '#D4A520' }
  const INPUT_SM = 'rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/20'

  async function saveException(e: React.FormEvent) {
    e.preventDefault()
    if (!exForm.date) return
    setSavingEx(true)
    try {
      await supabase.from('availability_exceptions').insert({
        applies_to: exForm.appliesTo, exception_type: exForm.exType, date: exForm.date,
        start_time: exForm.startTime || null, end_time: exForm.endTime || null, reason: exForm.reason || null,
      })
      const { data } = await supabase.from('availability_exceptions').select('*').order('date')
      setExceptions((data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, appliesTo: r.applies_to as string, exceptionType: r.exception_type as 'block' | 'extra',
        date: r.date as string, startTime: timeStr(r.start_time as string | null) || null,
        endTime: timeStr(r.end_time as string | null) || null, reason: (r.reason as string | null) ?? null,
      })))
      setExForm({ appliesTo: 'facility', exType: 'block', date: '', startTime: '', endTime: '', reason: '' })
    } catch (err) { console.error('[saveException]', err) }
    finally { setSavingEx(false) }
  }

  async function deleteException(id: string) {
    await supabase.from('availability_exceptions').delete().eq('id', id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {/* Sub-tab nav */}
      <div className="mb-5 flex gap-1 self-start rounded-xl border border-gray-200 bg-white p-1">
        {(['overview', 'coach', 'facility'] as AvailSub[]).map(s => (
          <button key={s} type="button" onClick={() => setSub(s)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${sub === s ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={sub === s ? { backgroundColor: ACCENT } : undefined}>
            {s === 'overview' ? 'Overview' : s === 'coach' ? 'Coach Schedules' : 'Facility Settings'}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {sub === 'overview' && (
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d })}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconChevronLeft size={18} /></button>
            <h2 className="text-base font-bold text-gray-900">{AVAIL_MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h2>
            <button onClick={() => setCalMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d })}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconChevronRight size={18} /></button>
          </div>
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS_SHORT.map(d => <div key={d} className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((iso, i) => {
              if (!iso) return <div key={i} className="h-20 rounded-lg" />
              const jsDow   = new Date(iso + 'T12:00:00').getDay()
              const isToday = iso === TODAY_ISO
              const day     = parseInt(iso.slice(8), 10)
              const present = staff.filter(s => coachRows.some(r => r.coachId === s.id && r.dayOfWeek === jsDow))
              const blocked = exceptions.some(e => e.exceptionType === 'block' && e.date === iso)
              return (
                <div key={iso} className={`h-20 rounded-lg border p-1.5 ${blocked ? 'border-red-100 bg-red-50' : isToday ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-100 bg-white'}`}>
                  <p className={`mb-1 text-xs font-bold ${isToday ? 'text-[#6BA3D6]' : blocked ? 'text-red-400' : 'text-gray-600'}`}>{day}</p>
                  {blocked
                    ? <span className="text-[9px] text-red-400">Closed</span>
                    : <div className="flex flex-wrap gap-0.5">
                        {present.map(s => (
                          <div key={s.id} title={`${s.firstName} ${s.lastName}`}
                            className="h-2 w-2 rounded-full" style={{ backgroundColor: coachColors[s.id] ?? '#9ca3af' }} />
                        ))}
                      </div>
                  }
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coachColors[s.id] ?? '#9ca3af' }} />
                <span className="text-xs text-gray-500">{s.firstName} {s.lastName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Coach Schedules ── */}
      {sub === 'coach' && (
        <div className="flex-1 overflow-y-auto space-y-5">
          {staff.map(s => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Avatar firstName={s.firstName} lastName={s.lastName} size={36} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-500">{s.role} · {EMPLOYMENT_LABELS[s.employmentType]}</p>
                </div>
              </div>
              <CoachScheduleEditor coachId={s.id} coachName={`${s.firstName} ${s.lastName}`} />
            </div>
          ))}
        </div>
      )}

      {/* ── Facility Settings ── */}
      {sub === 'facility' && (
        <div className="flex-1 overflow-y-auto space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-5 text-sm font-bold text-gray-900">Facility Hours</h3>
            <FacilityScheduleEditor />
          </div>

          {/* Exceptions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Exceptions &amp; Closures</h3>
            {exceptions.length > 0 && (
              <div className="mb-4 space-y-2">
                {exceptions.map(ex => (
                  <div key={ex.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${ex.exceptionType === 'block' ? 'bg-red-400' : 'bg-green-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700">
                        {ex.date} — <span className="font-normal">{ex.appliesTo === 'facility' ? 'Facility' : `Coach: ${ex.appliesTo.replace('coach:', '')}`}</span>
                      </p>
                      {ex.reason    && <p className="text-xs text-gray-400">{ex.reason}</p>}
                      {ex.startTime && <p className="text-xs text-gray-400">{ex.startTime} – {ex.endTime}</p>}
                    </div>
                    <button type="button" onClick={() => void deleteException(ex.id)} className="shrink-0 rounded-lg p-1 text-gray-300 hover:text-red-400">
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={e => void saveException(e)} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add Exception</p>
              <div className="flex flex-wrap gap-2">
                <select value={exForm.appliesTo} onChange={e => setExForm(p => ({ ...p, appliesTo: e.target.value }))} className={INPUT_SM}>
                  <option value="facility">Facility</option>
                  {staff.map(s => <option key={s.id} value={`coach:${s.id}`}>{s.firstName} {s.lastName}</option>)}
                </select>
                <select value={exForm.exType} onChange={e => setExForm(p => ({ ...p, exType: e.target.value }))} className={INPUT_SM}>
                  <option value="block">Block (closure)</option>
                  <option value="extra">Extra hours</option>
                </select>
                <input type="date" required value={exForm.date} onChange={e => setExForm(p => ({ ...p, date: e.target.value }))} className={INPUT_SM} />
                <input type="time" value={exForm.startTime} onChange={e => setExForm(p => ({ ...p, startTime: e.target.value }))} className={INPUT_SM} />
                <input type="time" value={exForm.endTime}   onChange={e => setExForm(p => ({ ...p, endTime:   e.target.value }))} className={INPUT_SM} />
                <input type="text" placeholder="Reason (optional)" value={exForm.reason} onChange={e => setExForm(p => ({ ...p, reason: e.target.value }))} className={`${INPUT_SM} min-w-[140px] flex-1`} />
                <button type="submit" disabled={savingEx || !exForm.date}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: ACCENT }}>
                  {savingEx ? 'Saving…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onboarding Tab ────────────────────────────────────────────────────────────

function OnboardingTab({ staff }: { staff: StaffMember[] }) {
  const [onboarding, setOnboarding] = useState<Record<string, string[]>>(loadOnboarding)
  const [expandedStaff, setExpandedStaff] = useState<string | null>(staff[0]?.id ?? null)

  function toggle(staffId: string, taskId: string) {
    const completed = onboarding[staffId] ?? []
    const next = completed.includes(taskId)
      ? completed.filter(t => t !== taskId)
      : [...completed, taskId]
    const updated = { ...onboarding, [staffId]: next }
    setOnboarding(updated)
    saveOnboarding(updated)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {staff.map(s => {
        const completed = onboarding[s.id] ?? []
        const pct = Math.round((completed.length / ONBOARDING_TASKS.length) * 100)
        const isExpanded = expandedStaff === s.id
        const startDaysAgo = daysBetween(s.startDate, TODAY_ISO)

        return (
          <div key={s.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button type="button" onClick={() => setExpandedStaff(isExpanded ? null : s.id)}
              className="flex w-full items-center gap-4 p-5 text-left hover:bg-gray-50 transition">
              <Avatar firstName={s.firstName} lastName={s.lastName} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  {pct === 100 && <Badge label="Complete" color="#15803d" bg="#dcfce7" />}
                  {pct < 100 && startDaysAgo > 30 && <Badge label="Overdue" color="#b91c1c" bg="#fee2e2" />}
                </div>
                <p className="text-xs text-gray-500">{s.role} · Started {fmtDate(s.startDate)}</p>
                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : ACCENT }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{completed.length}/{ONBOARDING_TASKS.length}</span>
                </div>
              </div>
              <IconChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-5 pb-5">
                {['Tax & Banking', 'Compliance', 'Training', 'System Access', 'Orientation'].map(cat => {
                  const tasks = ONBOARDING_TASKS.filter(t => t.category === cat)
                  return (
                    <div key={cat} className="mt-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{cat}</p>
                      <div className="space-y-1.5">
                        {tasks.map(task => {
                          const done = completed.includes(task.id)
                          const overdue = !done && startDaysAgo > task.dueDays
                          return (
                            <button key={task.id} type="button" onClick={() => toggle(s.id, task.id)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-gray-50">
                              <div className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border-2 transition ${done ? 'border-[#6BA3D6] bg-[#6BA3D6]' : overdue ? 'border-red-400' : 'border-gray-300'}`}
                                style={{ width: 18, height: 18 }}>
                                {done && <IconCheck size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-sm ${done ? 'text-gray-400 line-through' : overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                {task.label}
                              </span>
                              {overdue && !done && <span className="ml-auto text-[10px] font-bold text-red-500">Overdue</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Leave Tab ─────────────────────────────────────────────────────────────────

function LeaveTab({ staff }: { staff: StaffMember[] }) {
  const [leave, setLeave] = useState<LeaveRequest[]>(loadLeave)
  const [view, setView] = useState<'requests' | 'balances'>('requests')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ staffId: staff[0]?.id ?? '', type: 'annual' as LeaveType, startDate: TODAY_ISO, endDate: TODAY_ISO, reason: '' })

  function approve(id: string) {
    const updated = leave.map(l => l.id === id ? { ...l, status: 'approved' as LeaveStatus } : l)
    setLeave(updated); saveLeave(updated)
  }
  function decline(id: string) {
    const updated = leave.map(l => l.id === id ? { ...l, status: 'declined' as LeaveStatus } : l)
    setLeave(updated); saveLeave(updated)
  }

  function handleSubmit() {
    const s = staff.find(st => st.id === form.staffId)
    if (!s) return
    const days = Math.max(1, daysBetween(form.startDate, form.endDate) + 1)
    const req: LeaveRequest = {
      id: uid(), staffId: s.id, staffName: `${s.firstName} ${s.lastName}`,
      type: form.type, startDate: form.startDate, endDate: form.endDate,
      days, reason: form.reason, status: 'pending', submittedDate: TODAY_ISO,
    }
    const updated = [...leave, req]
    setLeave(updated); saveLeave(updated)
    setShowAdd(false)
  }

  const STATUS_BADGE: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Pending',  color: '#854d0e', bg: '#fef9c3' },
    approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7' },
    declined: { label: 'Declined', color: '#b91c1c', bg: '#fee2e2' },
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {(['requests', 'balances'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${view === v ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              style={view === v ? { backgroundColor: ACCENT } : undefined}>
              {v === 'requests' ? 'Leave Requests' : 'Balances'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={16} /> Request Leave
        </button>
      </div>

      {view === 'requests' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {leave.length === 0 && (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-gray-400 text-sm">No leave requests.</div>
          )}
          {leave.map(l => {
            const badge = STATUS_BADGE[l.status]
            return (
              <div key={l.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: LEAVE_TYPE_COLORS[l.type] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{l.staffName}</p>
                  <p className="text-xs text-gray-500">
                    {LEAVE_TYPE_LABELS[l.type]} · {fmtDateShort(l.startDate)}{l.startDate !== l.endDate ? ` – ${fmtDateShort(l.endDate)}` : ''} ({l.days} day{l.days !== 1 ? 's' : ''})
                  </p>
                  {l.reason && <p className="mt-0.5 text-xs text-gray-400 italic">{l.reason}</p>}
                </div>
                <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                {l.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => approve(l.id)} className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"><IconCheck size={13} /> Approve</button>
                    <button onClick={() => decline(l.id)} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"><IconX size={13} /> Decline</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'balances' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {staff.map(s => (
            <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Avatar firstName={s.firstName} lastName={s.lastName} size={36} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-500">{EMPLOYMENT_LABELS[s.employmentType]}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['annual', 'sick', 'personal'] as LeaveType[]).map(type => {
                  const { total, used } = leaveBalance(s, leave, type)
                  if (total === 0) return null
                  const remaining = total - used
                  const pct = total > 0 ? (used / total) * 100 : 0
                  return (
                    <div key={type} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-bold uppercase text-gray-400">{LEAVE_TYPE_LABELS[type]}</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{remaining}<span className="text-xs font-normal text-gray-400">/{total} days</span></p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: LEAVE_TYPE_COLORS[type] }} />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">{used} used</p>
                    </div>
                  )
                })}
              </div>
              {s.employmentType === 'casual' && (
                <p className="mt-3 text-xs text-gray-400 italic">Casual employees receive leave loading in their hourly rate. No accrued leave balance applies.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add leave request modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Request Leave</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <ModalSelect label="Staff Member" value={form.staffId} onChange={v => setForm(f => ({...f, staffId: v}))}
                options={staff.map(s => [s.id, `${s.firstName} ${s.lastName}`])} />
              <ModalSelect label="Leave Type" value={form.type} onChange={v => setForm(f => ({...f, type: v as LeaveType}))}
                options={[['annual','Annual Leave'],['sick','Sick Leave'],['personal','Personal Leave'],['other','Other']]} />
              <div className="grid grid-cols-2 gap-4">
                <ModalField label="Start Date" value={form.startDate} onChange={v => setForm(f => ({...f, startDate: v}))} type="date" />
                <ModalField label="End Date"   value={form.endDate}   onChange={v => setForm(f => ({...f, endDate: v}))}   type="date" />
              </div>
              <ModalField label="Reason (optional)" value={form.reason} onChange={v => setForm(f => ({...f, reason: v}))} />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} className="rounded-xl px-5 py-2 text-sm font-bold text-white" style={{ backgroundColor: ACCENT }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ staff, setStaff }: { staff: StaffMember[]; setStaff: (s: StaffMember[]) => void }) {
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ staffId: staff[0]?.id ?? '', name: '', type: 'wwcc' as DocType, expiryDate: '', status: 'pending' as DocStatus })

  const today = new Date()
  const soon = new Date(today); soon.setDate(soon.getDate() + 30)
  const soonIso = soon.toISOString().slice(0, 10)

  const allDocs = useMemo(() => {
    const out: Array<{ staffId: string; staffName: string; doc: StaffDocument }> = []
    staff.forEach(s => {
      if (filterStaff !== 'all' && s.id !== filterStaff) return
      s.documents.forEach(doc => out.push({ staffId: s.id, staffName: `${s.firstName} ${s.lastName}`, doc }))
    })
    return out.sort((a, b) => {
      const ae = a.doc.expiryDate ?? '9999', be = b.doc.expiryDate ?? '9999'
      return ae.localeCompare(be)
    })
  }, [staff, filterStaff])

  const expiringSoon = allDocs.filter(({ doc }) => doc.expiryDate && doc.expiryDate <= soonIso && doc.expiryDate >= TODAY_ISO).length
  const expired = allDocs.filter(({ doc }) => doc.expiryDate && doc.expiryDate < TODAY_ISO).length

  function handleAddDoc() {
    const updated = staff.map(s => {
      if (s.id !== form.staffId) return s
      const newDoc: StaffDocument = {
        id: uid(), name: form.name, type: form.type,
        uploadedDate: TODAY_ISO,
        expiryDate: form.expiryDate || null,
        status: form.status,
      }
      return { ...s, documents: [...s.documents, newDoc] }
    })
    saveStaff(updated)
    setStaff(updated)
    setShowAdd(false)
    setForm({ staffId: staff[0]?.id ?? '', name: '', type: 'wwcc', expiryDate: '', status: 'pending' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      {/* Summary cards */}
      {(expiringSoon > 0 || expired > 0) && (
        <div className="mb-5 flex gap-3">
          {expired > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
              <IconAlertCircle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-700">{expired} expired document{expired !== 1 ? 's' : ''}</span>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <IconInfoCircle size={16} className="text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{expiringSoon} expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6]">
          <option value="all">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={16} /> Add Document
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {allDocs.length === 0 && (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-sm text-gray-400">No documents found.</div>
        )}
        {allDocs.map(({ staffId, staffName, doc }) => {
          const colors = DOC_STATUS_COLORS[doc.status]
          const isExpiringSoon = doc.expiryDate && doc.expiryDate <= soonIso && doc.expiryDate >= TODAY_ISO
          const isExpired = doc.expiryDate && doc.expiryDate < TODAY_ISO
          return (
            <div key={doc.id} className={`flex items-center gap-4 rounded-2xl border p-4 bg-white shadow-sm ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-amber-200' : 'border-gray-200'}`}>
              <IconFile size={20} className={`shrink-0 ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{doc.name}</p>
                <p className="text-xs text-gray-500">{staffName} · {DOC_TYPE_LABELS[doc.type]}</p>
                {doc.expiryDate && (
                  <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-400'}`}>
                    {isExpired ? 'Expired' : 'Expires'} {fmtDate(doc.expiryDate)}
                    {isExpiringSoon && !isExpired && ' — renew soon'}
                  </p>
                )}
              </div>
              <Badge label={doc.status} color={colors.text} bg={colors.bg} />
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconDownload size={15} /></button>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Upload Document</h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <ModalSelect label="Staff Member" value={form.staffId} onChange={v => setForm(f => ({...f, staffId: v}))}
                options={staff.map(s => [s.id, `${s.firstName} ${s.lastName}`])} />
              <ModalField label="Document Name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
              <ModalSelect label="Type" value={form.type} onChange={v => setForm(f => ({...f, type: v as DocType}))}
                options={[['wwcc','WWCC'],['qualification','Qualification'],['contract','Contract'],['other','Other']]} />
              <ModalField label="Expiry Date (leave blank if none)" value={form.expiryDate} onChange={v => setForm(f => ({...f, expiryDate: v}))} type="date" />
              <ModalSelect label="Status" value={form.status} onChange={v => setForm(f => ({...f, status: v as DocStatus}))}
                options={[['pending','Pending Verification'],['verified','Verified'],['expired','Expired']]} />
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                <div>
                  <IconUpload size={24} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-400">File upload available in production build</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button onClick={() => setShowAdd(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddDoc} disabled={!form.name}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ backgroundColor: ACCENT }}>Save Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab({ staff }: { staff: StaffMember[] }) {
  const [reviews, setReviews] = useState<PerformanceReview[]>(loadReviews)
  const [selected, setSelected] = useState<string | null>(reviews[0]?.id ?? null)

  const review = reviews.find(r => r.id === selected) ?? null

  function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <IconStar key={i} size={16} strokeWidth={1.5}
            className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 gap-5 p-6">
      {/* Left — review list */}
      <div className="w-72 shrink-0 overflow-y-auto space-y-2">
        {reviews.map(r => {
          const isSel = r.id === selected
          return (
            <button key={r.id} type="button" onClick={() => setSelected(r.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${isSel ? 'border-[#6BA3D6] bg-[#6BA3D6]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <Avatar firstName={r.staffName.split(' ')[0] ?? ''} lastName={r.staffName.split(' ')[1] ?? ''} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{r.staffName}</p>
                <p className="text-xs text-gray-500">{r.period}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <IconStar key={i} size={11} strokeWidth={1.5}
                        className={i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  {r.completedDate ? <Badge label="Complete" color="#15803d" bg="#dcfce7" /> : <Badge label="In Progress" color="#854d0e" bg="#fef9c3" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right — review detail */}
      <div className="flex-1 overflow-y-auto">
        {!review ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">Select a review</div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{review.staffName} — {review.period}</h2>
                {review.completedDate && <p className="text-xs text-gray-400">Completed {fmtDate(review.completedDate)}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <IconStar key={i} size={22} strokeWidth={1.5}
                      className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                  ))}
                </div>
                <p className="text-xs text-gray-400">{review.rating}/5</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Self Assessment</p>
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">{review.selfAssessment}</div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Manager Notes</p>
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">{review.managerNotes}</div>
            </div>

            {review.actionItems.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Action Items</p>
                <div className="space-y-2">
                  {review.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 bg-[#6BA3D6]" />
                      <p className="text-sm text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Payroll Tab ───────────────────────────────────────────────────────────────

function PayrollTab({ staff }: { staff: StaffMember[] }) {
  const [payRuns, setPayRuns] = useState<PayRun[]>(loadPayRuns)
  const [selected, setSelected] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)

  const totalYTD = payRuns.filter(r => r.status === 'processed').reduce((a, r) => a + r.totalAmount, 0)
  const pending = payRuns.filter(r => r.status === 'pending')
  const totalPending = pending.reduce((a, r) => a + r.totalAmount, 0)
  const totalSuper = Math.round(totalYTD * SUPER_RATE)

  function runPayroll(id: string) {
    setRunningId(id)
    setTimeout(() => {
      const updated = payRuns.map(r => r.id === id ? { ...r, status: 'processed' as const, processedDate: TODAY_ISO } : r)
      savePayRuns(updated)
      setPayRuns(updated)
      setRunningId(null)
      window.dispatchEvent(new Event('storage'))
    }, 1200)
  }

  const selectedRun = payRuns.find(r => r.id === selected) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 p-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">YTD Payroll</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalYTD)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{payRuns.filter(r => r.status === 'processed').length} pay runs processed</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Pending Payroll</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalPending)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{pending.length} run{pending.length !== 1 ? 's' : ''} awaiting processing</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-400">Super Payable (YTD)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtMoney(totalSuper)}</p>
          <p className="mt-0.5 text-xs text-gray-400">{(SUPER_RATE * 100).toFixed(1)}% of processed payroll</p>
        </div>
      </div>

      {/* Pay runs table */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Super</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...payRuns].reverse().map(run => {
              const STATUS_B: Record<string, { label: string; color: string; bg: string }> = {
                processed: { label: 'Processed', color: '#15803d', bg: '#dcfce7' },
                pending:   { label: 'Pending',   color: '#854d0e', bg: '#fef9c3' },
                failed:    { label: 'Failed',    color: '#b91c1c', bg: '#fee2e2' },
              }
              const badge = STATUS_B[run.status]
              const isRunning = runningId === run.id
              return (
                <>
                  <tr key={run.id} className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${selected === run.id ? 'bg-[#6BA3D6]/5' : ''}`}
                    onClick={() => setSelected(selected === run.id ? null : run.id)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{run.periodLabel}</td>
                    <td className="px-4 py-3 text-gray-600">{run.staffCount} staff</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmtMoney(run.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtMoney(Math.round(run.totalAmount * SUPER_RATE))}</td>
                    <td className="px-4 py-3"><Badge label={badge.label} color={badge.color} bg={badge.bg} /></td>
                    <td className="px-4 py-3 text-right">
                      {run.status === 'pending' && (
                        <button onClick={e => { e.stopPropagation(); runPayroll(run.id) }} disabled={isRunning}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                          style={{ backgroundColor: ACCENT }}>
                          {isRunning ? 'Running…' : 'Run Payroll'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {selected === run.id && (
                    <tr key={run.id + '_detail'}>
                      <td colSpan={6} className="bg-gray-50 px-4 pb-4 pt-0">
                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                          <p className="mb-3 text-xs font-bold uppercase text-gray-400">Pay Run Entries</p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400">
                                <th className="pb-2 text-left font-semibold">Staff</th>
                                <th className="pb-2 text-left font-semibold">Rate</th>
                                <th className="pb-2 text-right font-semibold">Hours/Sessions</th>
                                <th className="pb-2 text-right font-semibold">Gross</th>
                                <th className="pb-2 text-right font-semibold">Super</th>
                              </tr>
                            </thead>
                            <tbody>
                              {run.entries.map(e => (
                                <tr key={e.staffId} className="border-t border-gray-100">
                                  <td className="py-1.5 font-medium text-gray-800">{e.staffName}</td>
                                  <td className="py-1.5 text-gray-600">${e.rate}/{e.rateType === 'hourly' ? 'hr' : 'session'}</td>
                                  <td className="py-1.5 text-right text-gray-600">{e.rateType === 'hourly' ? `${e.hours}h` : `${e.sessions} sessions`}</td>
                                  <td className="py-1.5 text-right font-bold text-gray-900">{fmtMoney(e.adjustedAmount)}</td>
                                  <td className="py-1.5 text-right text-gray-600">{fmtMoney(Math.round(e.adjustedAmount * SUPER_RATE))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-200">
                                <td colSpan={3} className="pt-2 text-right text-xs font-bold uppercase text-gray-400">Total</td>
                                <td className="pt-2 text-right text-sm font-bold text-gray-900">{fmtMoney(run.totalAmount)}</td>
                                <td className="pt-2 text-right text-sm font-bold text-gray-600">{fmtMoney(Math.round(run.totalAmount * SUPER_RATE))}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Compliance Tab ────────────────────────────────────────────────────────────

type ComplianceStatus = 'ok' | 'expiring' | 'expired' | 'missing'

interface ComplianceItem {
  key: string
  label: string
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { key: 'wwcc',       label: 'Working With Children Check' },
  { key: 'first-aid',  label: 'First Aid Certificate' },
  { key: 'coaching',   label: 'Coaching Qualification' },
  { key: 'contract',   label: 'Signed Contract' },
]

function ComplianceTab({ staff }: { staff: StaffMember[] }) {
  const today = new Date()
  const soonDate = new Date(today); soonDate.setDate(today.getDate() + 30)
  const soonIso = soonDate.toISOString().slice(0, 10)

  function getStatus(s: StaffMember, key: string): { status: ComplianceStatus; expiry: string | null } {
    if (key === 'wwcc') {
      const doc = s.documents.find(d => d.type === 'wwcc')
      if (!doc) return { status: 'missing', expiry: null }
      if (doc.expiryDate && doc.expiryDate < TODAY_ISO) return { status: 'expired', expiry: doc.expiryDate }
      if (doc.expiryDate && doc.expiryDate <= soonIso) return { status: 'expiring', expiry: doc.expiryDate }
      return { status: 'ok', expiry: doc.expiryDate }
    }
    if (key === 'contract') {
      const doc = s.documents.find(d => d.type === 'contract' && d.status === 'verified')
      return doc ? { status: 'ok', expiry: null } : { status: 'missing', expiry: null }
    }
    if (key === 'coaching') {
      const doc = s.documents.find(d => d.type === 'qualification')
      if (!doc) return { status: 'missing', expiry: null }
      if (doc.expiryDate && doc.expiryDate < TODAY_ISO) return { status: 'expired', expiry: doc.expiryDate }
      if (doc.expiryDate && doc.expiryDate <= soonIso) return { status: 'expiring', expiry: doc.expiryDate }
      return { status: 'ok', expiry: doc.expiryDate }
    }
    if (key === 'first-aid') {
      // Sam has first aid mentioned in notes; others we mark as missing for demo
      const hasFirstAid = s.id === 's1'
      return hasFirstAid ? { status: 'ok', expiry: '2027-06-30' } : { status: 'missing', expiry: null }
    }
    return { status: 'missing', expiry: null }
  }

  const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string; dot: string }> = {
    ok:       { label: 'OK',       color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
    expiring: { label: 'Expiring', color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
    expired:  { label: 'Expired',  color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
    missing:  { label: 'Missing',  color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
  }

  const allStatuses = staff.flatMap(s => COMPLIANCE_ITEMS.map(item => getStatus(s, item.key).status))
  const issues = allStatuses.filter(s => s !== 'ok').length
  const critical = allStatuses.filter(s => s === 'expired' || s === 'missing').length

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Summary */}
      <div className="mb-5 flex gap-4">
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${critical > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {critical > 0 ? <IconAlertCircle size={16} className="text-red-500" /> : <IconCircleCheck size={16} className="text-green-500" />}
          <span className={`text-sm font-semibold ${critical > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''}` : 'All critical checks passed'}
          </span>
        </div>
        {issues > critical && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
            <IconInfoCircle size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{issues - critical} expiring soon</span>
          </div>
        )}
      </div>

      {/* Traffic light grid */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 w-48">Staff Member</th>
              {COMPLIANCE_ITEMS.map(item => (
                <th key={item.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Avatar firstName={s.firstName} lastName={s.lastName} size={28} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                      <p className="text-[10px] text-gray-400">{EMPLOYMENT_LABELS[s.employmentType]}</p>
                    </div>
                  </div>
                </td>
                {COMPLIANCE_ITEMS.map(item => {
                  const { status, expiry } = getStatus(s, item.key)
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <td key={item.key} className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        {expiry && <span className="text-[10px] text-gray-400">{status === 'expiring' ? 'Exp ' : ''}{fmtDateShort(expiry)}</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action items */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-bold text-gray-700">Actions Required</h3>
        <div className="space-y-2">
          {staff.flatMap(s =>
            COMPLIANCE_ITEMS.map(item => {
              const { status, expiry } = getStatus(s, item.key)
              if (status === 'ok') return null
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={`${s.id}-${item.key}`} className="flex items-center gap-3 rounded-xl border p-3 bg-white"
                  style={{ borderColor: status === 'expired' || status === 'missing' ? '#fecaca' : '#fde68a' }}>
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                  <p className="text-sm text-gray-800">
                    <strong>{s.firstName} {s.lastName}</strong> — {item.label}
                    {status === 'missing' ? ' is missing' : status === 'expired' ? ` expired ${expiry ? fmtDate(expiry) : ''}` : ` expires ${expiry ? fmtDate(expiry) : ''}`}
                  </p>
                  <Badge label={cfg.label} color={cfg.color} bg={cfg.bg} />
                </div>
              )
            })
          ).filter(Boolean)}
        </div>
      </div>
    </div>
  )
}

// ── Main HR Page ──────────────────────────────────────────────────────────────

const HR_TABS: { id: HRTab; label: string }[] = [
  { id: 'people',      label: 'People'      },
  { id: 'availability',label: 'Availability'},
  { id: 'onboarding', label: 'Onboarding'  },
  { id: 'leave',       label: 'Leave'       },
  { id: 'documents',   label: 'Documents'   },
  { id: 'performance', label: 'Performance' },
  { id: 'payroll',     label: 'Payroll'     },
  { id: 'compliance',  label: 'Compliance'  },
]

export default function HRPage() {
  const [tab, setTab]         = useState<HRTab>('people')
  const [staff, setStaff]     = useState<StaffMember[]>(loadStaff)
  const [appRoles, setAppRoles] = useState<AppRoleMap>(loadAppRoles)

  // Count pending documents expiring within 30 days for badge
  const today = new Date()
  const soonDate = new Date(today); soonDate.setDate(today.getDate() + 30)
  const soonIso = soonDate.toISOString().slice(0, 10)
  const docWarnings = staff.flatMap(s => s.documents)
    .filter(d => d.expiryDate && d.expiryDate <= soonIso).length

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
      {/* Page header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <IconBriefcase size={22} style={{ color: ACCENT }} />
          <h1 className="text-lg font-bold text-gray-900">HR</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6">
        <div className="flex gap-0">
          {HR_TABS.map(t => {
            const isActive = tab === t.id
            const showBadge = (t.id === 'documents' && docWarnings > 0)
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 border-b-2 px-4 py-3.5 text-sm font-semibold transition ${isActive ? 'border-[#6BA3D6] text-[#6BA3D6]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {t.label}
                {showBadge && (
                  <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white" style={{ width: 18, height: 18 }}>
                    {docWarnings}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {tab === 'people' && (
          <PeopleTab staff={staff} setStaff={setStaff} appRoles={appRoles} setAppRoles={setAppRoles} />
        )}
        {tab === 'availability' && <AvailabilityTab staff={staff} />}
        {tab === 'onboarding' && <OnboardingTab staff={staff} />}
        {tab === 'leave' && <LeaveTab staff={staff} />}
        {tab === 'documents' && <DocumentsTab staff={staff} setStaff={setStaff} />}
        {tab === 'performance' && <PerformanceTab staff={staff} />}
        {tab === 'payroll' && <PayrollTab staff={staff} />}
        {tab === 'compliance' && <ComplianceTab staff={staff} />}
      </div>
    </div>
  )
}
