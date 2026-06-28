'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  IconPlus, IconTrash, IconEdit, IconCheck, IconX, IconMail,
  IconSend, IconEye, IconBell, IconPlug, IconUser,
  IconToggleLeft, IconClock, IconRefresh, IconAlertTriangle,
  IconPlayerPause, IconPlayerPlay, IconFlask, IconChevronDown,
} from '@tabler/icons-react'
import {
  loadRecipients, saveRecipients, DEFAULT_RECIPIENTS,
  type Recipient,
} from '@/lib/finances-recipients'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_VISIBILITY,
  MODULE_VISIBILITY_KEY,
  MODULE_VISIBILITY_STORAGE_KEY,
  mergeWithDefaults,
  type ModuleVisibility,
  type AthleteModuleKey,
  type CoachModuleKey,
  type CoachMemberModuleKey,
} from '@/lib/module-visibility'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_KEY,
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  ADMIN_EMAILS,
  TEST_EMAIL_DATA,
  mergeNotifWithDefaults,
  type NotificationSettings,
  type AdminRecipient,
  type FinanceRecipient,
} from '@/lib/notification-settings'
import type { TemplateName } from '@/lib/email-templates'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const INPUT  = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const LABEL  = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const ROLE_OPTIONS = ['Accountant', 'Head Coach', 'Coach', 'Admin', 'Manager', 'Director', 'Other']

type TabId = 'app' | 'visibility' | 'notifications' | 'integrations' | 'account'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }[] = [
  { id: 'app',           label: 'App Settings',      icon: IconSend        },
  { id: 'visibility',    label: 'Module Visibility',  icon: IconEye         },
  { id: 'notifications', label: 'Notifications',      icon: IconBell        },
  { id: 'integrations',  label: 'Integrations',       icon: IconPlug        },
  { id: 'account',       label: 'Account',            icon: IconUser        },
]

// ─── Module definitions ────────────────────────────────────────────────────────

const ATHLETE_MODULES: { key: AthleteModuleKey; label: string; desc: string }[] = [
  { key: 'dashboard',    label: 'Dashboard',         desc: 'Athlete home page with schedule overview, upcoming sessions, and quick actions.' },
  { key: 'book',         label: 'Book a Session',    desc: 'Allow athletes to book sessions directly through the app.' },
  { key: 'bookings',     label: 'My Bookings',       desc: 'View upcoming and past session booking history.' },
  { key: 'membership',   label: 'My Membership',     desc: 'Membership plan details, weekly credits, and billing information.' },
  { key: 'journal',      label: 'Journal',           desc: 'Private athlete journal for notes and reflections.' },
  { key: 'goals',        label: 'Goals & Habits',    desc: 'Goal setting and daily habit tracking.' },
  { key: 'how-we-feel',  label: 'How We Feel',       desc: 'Daily wellbeing check-in and mood tracking.' },
  { key: 'leaderboards', label: 'Leaderboards',      desc: 'Shooting test leaderboards and athlete rankings.' },
  { key: 'programs',     label: 'Programs',          desc: 'Browse and enrol in development and social programs.' },
]

const COACH_MODULES: { key: CoachModuleKey; label: string; desc: string }[] = [
  { key: 'dashboard',    label: 'Coach Dashboard',   desc: 'Personal schedule, upcoming sessions, and task overview.' },
  { key: 'athletes',     label: 'Athlete Profiles',  desc: 'View and manage profiles of assigned athletes.' },
  { key: 'bookings',     label: 'Bookings Calendar', desc: 'View and manage their own sessions and bookings.' },
  { key: 'formula-draw', label: 'FormulaDraw',       desc: 'Interactive play drawing and diagramming tool.' },
  { key: 'formula-sub',  label: 'FormulaSub',        desc: 'In-game substitution and rotation manager.' },
  { key: 'formula-stat', label: 'FormulaStat',       desc: 'Statistics tracking and performance analysis.' },
  { key: 'learning-lab', label: 'Learning Lab',      desc: 'Access to coaching resources and training library.' },
  { key: 'journal',      label: 'Journal',           desc: 'View athlete journals shared with the coach.' },
  { key: 'goals',        label: 'Goal Setting',      desc: 'View athlete goals shared with the coach.' },
  { key: 'how-we-feel',  label: 'How We Feel',       desc: 'View athlete wellbeing check-ins shared with coach.' },
  { key: 'hr',           label: 'HR Profile',        desc: 'View and edit their own HR profile and payroll details.' },
]

const COACH_MEMBER_MODULES: { key: CoachMemberModuleKey; label: string; desc: string }[] = [
  { key: 'formula-draw',    label: 'FormulaDraw',                 desc: 'Access to play drawing and diagramming tool.' },
  { key: 'formula-sub',     label: 'FormulaSub',                  desc: 'Access to in-game substitution manager.' },
  { key: 'formula-stat',    label: 'FormulaStat',                 desc: 'Access to statistics tracker.' },
  { key: 'learning-lab',    label: 'Learning Lab (My Library)',   desc: 'Access to personal coaching library only.' },
  { key: 'formula-connect', label: 'FormulaConnect',              desc: 'Access to coach networking and community features.' },
]

// ─── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6BA3D6]/40 focus:ring-offset-1`}
      style={{ backgroundColor: enabled ? ACCENT : '#d1d5db' }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}

// ─── Module row ────────────────────────────────────────────────────────────────

function ModuleRow({
  label, desc, enabled, comingSoon, showComingSoon, onToggle, onComingSoonToggle,
}: {
  label: string
  desc: string
  enabled: boolean
  comingSoon?: boolean
  showComingSoon?: boolean
  onToggle: (v: boolean) => void
  onComingSoonToggle?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
          {enabled && comingSoon && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              <IconClock size={9} /> Coming Soon
            </span>
          )}
          {!enabled && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Hidden
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
        {showComingSoon && enabled && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={comingSoon ?? false}
              onChange={e => onComingSoonToggle?.(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300"
              style={{ accentColor: ACCENT }}
            />
            <span className="text-xs text-gray-500">
              Show as &ldquo;Coming Soon&rdquo; instead of hiding from nav
            </span>
          </label>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <span className={`w-6 text-right text-xs font-bold ${enabled ? '' : 'text-gray-400'}`}
          style={enabled ? { color: ACCENT } : {}}>
          {enabled ? 'ON' : 'OFF'}
        </span>
        <Toggle enabled={enabled} onChange={onToggle} />
      </div>
    </div>
  )
}

// ─── Visibility section card ───────────────────────────────────────────────────

function VisibilitySection({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50 px-6">
        {children}
      </div>
    </div>
  )
}

// ─── Save indicator ────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
      state === 'saving' ? 'bg-blue-50 text-blue-600' :
      state === 'saved'  ? 'bg-green-50 text-green-600' :
                           'bg-red-50 text-red-600'
    }`}>
      {state === 'saving' && <IconRefresh size={12} className="animate-spin" />}
      {state === 'saved'  && <IconCheck size={12} />}
      {state === 'error'  && <IconX size={12} />}
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Error saving'}
    </div>
  )
}

// ─── Financial Recipients (existing feature) ───────────────────────────────────

function RecipientRow({ recipient, onSave, onDelete }: {
  recipient: Recipient
  onSave: (updated: Recipient) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name,  setName]  = useState(recipient.name)
  const [email, setEmail] = useState(recipient.email)
  const [role,  setRole]  = useState(recipient.role)

  function handleSave() {
    if (!name.trim() || !email.trim()) return
    onSave({ ...recipient, name: name.trim(), email: email.trim(), role })
    setEditing(false)
  }
  function handleCancel() {
    setName(recipient.name); setEmail(recipient.email); setRole(recipient.role)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-blue-50/40">
        <td className="px-4 py-3"><input value={name}  onChange={e => setName(e.target.value)}  className={INPUT} placeholder="Name" /></td>
        <td className="px-4 py-3"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="email@example.com" /></td>
        <td className="px-4 py-3">
          <select value={role} onChange={e => setRole(e.target.value)} className={INPUT}>
            {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-1.5">
            <button onClick={handleSave} disabled={!name.trim() || !email.trim()}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}>
              <IconCheck size={13} /> Save
            </button>
            <button onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
              <IconX size={13} /> Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="group border-b border-gray-50 last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: ACCENT }}>
            {recipient.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium text-gray-900">{recipient.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{recipient.email}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{recipient.role}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <IconEdit size={13} /> Edit
          </button>
          <button onClick={() => onDelete(recipient.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600">
            <IconTrash size={13} /> Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddRecipientForm({ onAdd, onCancel }: { onAdd: (r: Recipient) => void; onCancel: () => void }) {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState(ROLE_OPTIONS[0])
  const canAdd = name.trim() && email.trim()

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">New Recipient</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@example.com" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className={INPUT}>
            {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => {
          if (!canAdd) return
          onAdd({ id: Math.random().toString(36).slice(2), name: name.trim(), email: email.trim(), role })
        }} disabled={!canAdd}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}>
          <IconPlus size={14} /> Add Recipient
        </button>
        <button onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Notifications tab ─────────────────────────────────────────────────────────

type SendToOption = AdminRecipient

const HOURS = Array.from({ length: 24 }, (_, i) => i)
function fmtHour(h: number) {
  if (h === 0)  return '12:00 AM'
  if (h === 12) return '12:00 PM'
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

// Small reusable toggle used inside notification rows (different from the module-visibility Toggle above)
function NotifToggle({ enabled, onChange, disabled }: { enabled: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange?.(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6BA3D6]/40 focus:ring-offset-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ backgroundColor: enabled ? ACCENT : '#d1d5db' }}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// Badge for "sent to" audience
function AudienceBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: color + '18', color }}>
      {label}
    </span>
  )
}

// SendTo selector (Matt / Jade / Both)
function SendToSelector({ value, onChange }: { value: SendToOption; onChange: (v: SendToOption) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as SendToOption)}
      className="rounded-lg border border-gray-200 py-1 pl-2 pr-6 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
    >
      <option value="matt">Matt only</option>
      <option value="jade">Jade only</option>
      <option value="both">Matt &amp; Jade</option>
    </select>
  )
}

// Finance recipient checkboxes
function FinanceRecipientPicker({ value, onChange }: {
  value: FinanceRecipient[]
  onChange: (v: FinanceRecipient[]) => void
}) {
  const OPTS: { id: FinanceRecipient; label: string }[] = [
    { id: 'matt', label: 'Matt' },
    { id: 'jade', label: 'Jade' },
    { id: 'accountant', label: 'Accountant' },
  ]
  function toggle(id: FinanceRecipient) {
    const next = value.includes(id) ? value.filter(v => v !== id) : [...value, id]
    onChange(next)
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500">Send to:</span>
      {OPTS.map(o => (
        <label key={o.id} className="flex cursor-pointer items-center gap-1.5">
          <span onClick={() => toggle(o.id)}
            className={`flex h-3.5 w-3.5 items-center justify-center rounded border-2 ${value.includes(o.id) ? 'border-[#6BA3D6] bg-[#6BA3D6]' : 'border-gray-300'}`}>
            {value.includes(o.id) && <IconCheck size={8} style={{ color: 'white' }} />}
          </span>
          <span className="text-xs font-medium text-gray-700">{o.label}</span>
        </label>
      ))}
    </div>
  )
}

// Inline test email form
function TestEmailForm({ template, sessionEmail, onClose }: {
  template: TemplateName
  sessionEmail: string
  onClose: () => void
}) {
  const [testTo, setTestTo]   = useState(sessionEmail)
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<'sent' | 'error' | null>(null)

  async function handleSend() {
    if (!testTo.trim()) return
    setSending(true)
    const sampleData = TEST_EMAIL_DATA[template] ?? {}
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, to: testTo.trim(), data: sampleData, test: true }),
      })
      const json = await res.json() as { success: boolean }
      setResult(json.success ? 'sent' : 'error')
    } catch {
      setResult('error')
    } finally {
      setSending(false)
    }
  }

  if (result === 'sent') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
        <IconCheck size={13} /> Test email sent to {testTo}
        <button onClick={onClose} className="ml-auto text-green-500 hover:text-green-700"><IconX size={13} /></button>
      </div>
    )
  }

  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
      <IconFlask size={14} className="shrink-0 text-gray-400" />
      <input
        type="email"
        value={testTo}
        onChange={e => setTestTo(e.target.value)}
        placeholder="Send test to..."
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
      />
      {result === 'error' && <span className="text-[11px] text-red-500">Failed</span>}
      <button
        onClick={handleSend}
        disabled={sending || !testTo.trim()}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        style={{ backgroundColor: ACCENT }}
      >
        {sending ? <IconRefresh size={11} className="animate-spin" /> : <IconSend size={11} />}
        {sending ? 'Sending…' : 'Send'}
      </button>
      <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600"><IconX size={14} /></button>
    </div>
  )
}

// Single notification row
function NotifRow({
  label, desc, audience, audienceColor,
  enabled, onToggle, alwaysOn,
  template, sessionEmail,
  children,
}: {
  label:         string
  desc:          string
  audience:      string
  audienceColor: string
  enabled:       boolean
  onToggle?:     (v: boolean) => void
  alwaysOn?:     boolean
  template:      TemplateName
  sessionEmail:  string
  children?:     React.ReactNode
}) {
  const [showTest, setShowTest] = useState(false)

  return (
    <div className={`py-4 ${!enabled && !alwaysOn ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <AudienceBadge label={audience} color={audienceColor} />
            {alwaysOn && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                Always on
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
          {enabled && children && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {children}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          <button
            onClick={() => setShowTest(v => !v)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100"
          >
            <IconFlask size={11} /> Test
          </button>
          <span className={`w-6 text-right text-xs font-bold ${alwaysOn || enabled ? '' : 'text-gray-400'}`}
            style={alwaysOn || enabled ? { color: ACCENT } : {}}>
            {alwaysOn ? 'ON' : enabled ? 'ON' : 'OFF'}
          </span>
          <NotifToggle enabled={alwaysOn ? true : enabled} onChange={onToggle} disabled={alwaysOn} />
        </div>
      </div>
      {showTest && (
        <TestEmailForm
          template={template}
          sessionEmail={sessionEmail}
          onClose={() => setShowTest(false)}
        />
      )}
    </div>
  )
}

// Section wrapper
function NotifSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-50 px-6">
        {children}
      </div>
    </div>
  )
}

// Full notifications tab
function NotificationsTab({
  settings, sessionEmail,
  onPause, onSendingHours, onPatch,
}: {
  settings:       NotificationSettings
  sessionEmail:   string
  onPause:        (v: boolean) => void
  onSendingHours: (start: number, end: number) => void
  onPatch:        <K extends keyof NotificationSettings>(key: K, patch: Partial<NotificationSettings[K] & object>) => void
}) {
  const s = settings

  return (
    <div className="space-y-6">

      {/* ── Global settings ─── */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-base font-bold text-gray-900">General Settings</h2>
          <p className="text-xs text-gray-400">Global controls that apply to all email notifications</p>
        </div>

        {/* Master pause */}
        <div className="px-6 py-5">
          <div className={`flex items-start justify-between gap-6 rounded-xl border-2 p-4 transition-colors ${s.paused ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.paused ? 'bg-amber-100' : 'bg-gray-100'}`}>
                {s.paused
                  ? <IconPlayerPause size={18} className="text-amber-600" />
                  : <IconPlayerPlay  size={18} className="text-gray-400" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${s.paused ? 'text-amber-800' : 'text-gray-900'}`}>
                  {s.paused ? 'Notifications are paused' : 'Pause All Notifications'}
                </p>
                <p className={`mt-0.5 text-xs ${s.paused ? 'text-amber-700' : 'text-gray-500'}`}>
                  {s.paused
                    ? 'No emails will be sent until you resume. Useful during development or testing.'
                    : 'Temporarily stop all outbound emails. Individual settings are preserved.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-xs font-bold ${s.paused ? 'text-amber-600' : 'text-gray-400'}`}>
                {s.paused ? 'PAUSED' : 'ACTIVE'}
              </span>
              <NotifToggle enabled={s.paused} onChange={onPause} />
            </div>
          </div>
        </div>

        {/* Sending hours */}
        <div className="border-t border-gray-50 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Email Sending Hours</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Emails are queued outside these hours and sent at the next available window (Australia/Sydney time)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">From</span>
              <select
                value={s.sendingHours.start}
                onChange={e => onSendingHours(Number(e.target.value), s.sendingHours.end)}
                className="rounded-lg border border-gray-200 py-1.5 pl-2 pr-6 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
              >
                {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
              </select>
              <span className="text-xs font-semibold text-gray-500">to</span>
              <select
                value={s.sendingHours.end}
                onChange={e => onSendingHours(s.sendingHours.start, Number(e.target.value))}
                className="rounded-lg border border-gray-200 py-1.5 pl-2 pr-6 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
              >
                {HOURS.map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Athlete Notifications ─── */}
      <NotifSection title="Athlete Notifications" subtitle="Emails sent directly to athletes about their bookings, membership, and account">
        <NotifRow label="Booking Confirmation" desc="Sent to athlete when a booking is confirmed (by them or by admin)"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.bookingConfirmation.enabled}
          onToggle={v => onPatch('bookingConfirmation', { enabled: v })}
          template="booking-confirmation" sessionEmail={sessionEmail} />

        <NotifRow label="Booking Cancellation" desc="Sent to athlete when their booking is cancelled"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.bookingCancellation.enabled}
          onToggle={v => onPatch('bookingCancellation', { enabled: v })}
          template="booking-cancellation" sessionEmail={sessionEmail} />

        <NotifRow label="Join Request Approved" desc="Sent when coach approves their request to join a Small Group Session"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.joinRequestApproved.enabled}
          onToggle={v => onPatch('joinRequestApproved', { enabled: v })}
          template="join-request-approved" sessionEmail={sessionEmail} />

        <NotifRow label="Join Request Declined" desc="Sent when coach declines their request to join a Small Group Session"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.joinRequestDeclined.enabled}
          onToggle={v => onPatch('joinRequestDeclined', { enabled: v })}
          template="join-request-declined" sessionEmail={sessionEmail} />

        <NotifRow label="Session Reminder" desc="Reminder sent before an upcoming session"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.sessionReminder.enabled}
          onToggle={v => onPatch('sessionReminder', { enabled: v })}
          template="booking-confirmation" sessionEmail={sessionEmail}>
          <select
            value={s.sessionReminder.timing}
            onChange={e => onPatch('sessionReminder', { timing: e.target.value as '24h' | '2h' | 'both' })}
            className="rounded-lg border border-gray-200 py-1 pl-2 pr-6 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
          >
            <option value="24h">24 hours before</option>
            <option value="2h">2 hours before</option>
            <option value="both">Both (24h and 2h)</option>
          </select>
        </NotifRow>

        <NotifRow label="Casual Shooting Bump" desc="Sent when their Casual Shooting booking is cancelled due to a higher-priority member"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.casualShootingBump.enabled}
          onToggle={v => onPatch('casualShootingBump', { enabled: v })}
          template="casual-shooting-bump" sessionEmail={sessionEmail} />

        <NotifRow label="Failed Payment" desc="Sent when their payment fails during batch processing"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.failedPaymentAthlete.enabled}
          onToggle={v => onPatch('failedPaymentAthlete', { enabled: v })}
          template="failed-payment" sessionEmail={sessionEmail} />

        <NotifRow label="Membership Renewal Reminder" desc="Reminder before their weekly membership renews"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.membershipRenewalReminder.enabled}
          onToggle={v => onPatch('membershipRenewalReminder', { enabled: v })}
          template="booking-confirmation" sessionEmail={sessionEmail}>
          <select
            value={s.membershipRenewalReminder.timing}
            onChange={e => onPatch('membershipRenewalReminder', { timing: e.target.value as '3days' | '1day' })}
            className="rounded-lg border border-gray-200 py-1 pl-2 pr-6 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
          >
            <option value="3days">3 days before renewal</option>
            <option value="1day">1 day before renewal</option>
          </select>
        </NotifRow>

        <NotifRow label="Program Enrolment Confirmation" desc="Sent when athlete is enrolled in a program"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.programEnrolmentConfirmation.enabled}
          onToggle={v => onPatch('programEnrolmentConfirmation', { enabled: v })}
          template="program-enrolment-confirmation" sessionEmail={sessionEmail} />

        <NotifRow label="Welcome / Invitation Email" desc="Sent when a new athlete account is created or they are invited by admin"
          audience="Athlete" audienceColor="#6BA3D6"
          enabled={s.athleteWelcome.enabled}
          onToggle={v => onPatch('athleteWelcome', { enabled: v })}
          template="athlete-invitation" sessionEmail={sessionEmail} />

        <NotifRow label="Password Reset" desc="Sent when an athlete requests a password reset"
          audience="Athlete" audienceColor="#6BA3D6"
          alwaysOn
          enabled
          template="password-reset" sessionEmail={sessionEmail} />
      </NotifSection>

      {/* ── Admin Notifications ─── */}
      <NotifSection title="Admin Notifications" subtitle="Emails sent to Matt and/or Jade when action is needed">
        {(
          [
            {
              key: 'newJoinRequest' as const,
              label: 'New Join Request',
              desc: 'Notify when an athlete requests to join a Small Group Session',
              template: 'join-request-approved' as TemplateName,
            },
            {
              key: 'newProgramEnrolmentRequest' as const,
              label: 'New Program Enrolment Request',
              desc: 'Notify when an athlete requests to join an approval-required program',
              template: 'program-enrolment-request' as TemplateName,
            },
            {
              key: 'newAthleteRegistration' as const,
              label: 'New Athlete Registration',
              desc: 'Notify when a new athlete signs up through the public registration page',
              template: 'athlete-invitation' as TemplateName,
            },
            {
              key: 'failedPaymentAdmin' as const,
              label: 'Failed Payment Alert',
              desc: 'Notify when any athlete\'s payment fails',
              template: 'failed-payment' as TemplateName,
            },
          ] as const
        ).map(row => (
          <NotifRow key={row.key} label={row.label} desc={row.desc}
            audience="Admin" audienceColor="#7C3AED"
            enabled={(s[row.key] as { enabled: boolean }).enabled}
            onToggle={v => onPatch(row.key, { enabled: v })}
            template={row.template} sessionEmail={sessionEmail}>
            <SendToSelector
              value={(s[row.key] as { sendTo: SendToOption }).sendTo}
              onChange={v => onPatch(row.key, { sendTo: v })}
            />
          </NotifRow>
        ))}

        {/* Low Capacity Alert — has extra threshold input */}
        <NotifRow label="Low Capacity Alert"
          desc="Notify when a session drops below a minimum number of athletes 24 hours before"
          audience="Admin" audienceColor="#7C3AED"
          enabled={s.lowCapacityAlert.enabled}
          onToggle={v => onPatch('lowCapacityAlert', { enabled: v })}
          template="booking-confirmation" sessionEmail={sessionEmail}>
          <SendToSelector value={s.lowCapacityAlert.sendTo} onChange={v => onPatch('lowCapacityAlert', { sendTo: v })} />
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Threshold:
            <input
              type="number"
              min={1}
              max={20}
              value={s.lowCapacityAlert.threshold}
              onChange={e => onPatch('lowCapacityAlert', { threshold: Number(e.target.value) || 1 })}
              className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#6BA3D6]"
            />
            athletes
          </label>
        </NotifRow>
      </NotifSection>

      {/* ── Finance Notifications ─── */}
      <NotifSection title="Finance Notifications" subtitle="Automated financial summaries sent on a schedule">
        <NotifRow label="Weekly Revenue Summary"
          desc="Automatic weekly summary of revenue, expenses, and outstanding payments — sent every Monday morning"
          audience="Finance" audienceColor="#D4A843"
          enabled={s.weeklyRevenueSummary.enabled}
          onToggle={v => onPatch('weeklyRevenueSummary', { enabled: v })}
          template="finance-summary" sessionEmail={sessionEmail}>
          <FinanceRecipientPicker
            value={s.weeklyRevenueSummary.sendTo}
            onChange={v => onPatch('weeklyRevenueSummary', { sendTo: v })}
          />
        </NotifRow>

        <NotifRow label="Monthly Financial Summary"
          desc="Automatic monthly P&amp;L summary — sent on the 1st of each month"
          audience="Finance" audienceColor="#D4A843"
          enabled={s.monthlyFinancialSummary.enabled}
          onToggle={v => onPatch('monthlyFinancialSummary', { enabled: v })}
          template="finance-summary" sessionEmail={sessionEmail}>
          <FinanceRecipientPicker
            value={s.monthlyFinancialSummary.sendTo}
            onChange={v => onPatch('monthlyFinancialSummary', { sendTo: v })}
          />
        </NotifRow>
      </NotifSection>

      {/* ── HR Notifications ─── */}
      <NotifSection title="HR Notifications" subtitle="Alerts for staff management and compliance">
        <NotifRow label="Document Expiry Warning"
          desc="Notify when a staff document (WWCC, First Aid, qualification) is expiring within 30 days"
          audience="HR" audienceColor="#059669"
          enabled={s.documentExpiryWarning.enabled}
          onToggle={v => onPatch('documentExpiryWarning', { enabled: v })}
          template="staff-invitation" sessionEmail={sessionEmail}>
          <SendToSelector value={s.documentExpiryWarning.sendTo} onChange={v => onPatch('documentExpiryWarning', { sendTo: v })} />
        </NotifRow>

        <NotifRow label="Leave Request Submitted"
          desc="Notify when a staff member submits a leave request"
          audience="HR" audienceColor="#059669"
          enabled={s.leaveRequestSubmitted.enabled}
          onToggle={v => onPatch('leaveRequestSubmitted', { enabled: v })}
          template="staff-invitation" sessionEmail={sessionEmail}>
          <SendToSelector value={s.leaveRequestSubmitted.sendTo} onChange={v => onPatch('leaveRequestSubmitted', { sendTo: v })} />
        </NotifRow>
      </NotifSection>

      <p className="text-xs text-gray-400">
        Changes are saved automatically. The &ldquo;Pause All&rdquo; toggle overrides all individual settings.
        Sending hours apply to all non-critical notifications (password reset emails always send immediately).
      </p>
    </div>
  )
}

// ─── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-white p-10 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${ACCENT}1a` }}>
        <IconToggleLeft size={28} style={{ color: ACCENT }} />
      </div>
      <h2 className="mb-1 text-base font-bold text-gray-900">{title}</h2>
      <p className="max-w-sm text-sm text-gray-500">{desc}</p>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('app')

  // App Settings — recipients
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Module Visibility
  const [visibility, setVisibility]   = useState<ModuleVisibility>(DEFAULT_VISIBILITY)
  const [loadingVis, setLoadingVis]   = useState(true)
  const [saveState,  setSaveState]    = useState<SaveState>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Notification Settings
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [loadingNotif,  setLoadingNotif]  = useState(true)
  const [notifSaveState, setNotifSaveState] = useState<SaveState>('idle')
  const notifSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Session (for test email prefill)
  const { data: session } = useSession()

  // Init
  useEffect(() => {
    setRecipients(loadRecipients())

    // Load cached visibility instantly
    try {
      const cached = localStorage.getItem(MODULE_VISIBILITY_STORAGE_KEY)
      if (cached) setVisibility(mergeWithDefaults(JSON.parse(cached)))
    } catch { /* ignore */ }

    // Load cached notification settings instantly
    try {
      const cachedNotif = localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY)
      if (cachedNotif) setNotifSettings(mergeNotifWithDefaults(JSON.parse(cachedNotif)))
    } catch { /* ignore */ }

    // Fetch module visibility from Supabase
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', MODULE_VISIBILITY_KEY)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          const merged = mergeWithDefaults(data.value as Partial<ModuleVisibility>)
          setVisibility(merged)
          try { localStorage.setItem(MODULE_VISIBILITY_STORAGE_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
        }
        setLoadingVis(false)
      })

    // Fetch notification settings from Supabase
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', NOTIFICATION_SETTINGS_KEY)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) {
          const merged = mergeNotifWithDefaults(data.value as Partial<NotificationSettings>)
          setNotifSettings(merged)
          try { localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
        }
        setLoadingNotif(false)
      })
  }, [])

  const saveVisibility = useCallback(async (next: ModuleVisibility) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    try {
      localStorage.setItem(MODULE_VISIBILITY_STORAGE_KEY, JSON.stringify(next))
    } catch { /* ignore */ }

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: MODULE_VISIBILITY_KEY, value: next, updated_at: new Date().toISOString() })

    if (error) {
      setSaveState('error')
    } else {
      setSaveState('saved')
      saveTimer.current = setTimeout(() => setSaveState('idle'), 2500)
    }
  }, [])

  function updateAthleteModule(key: AthleteModuleKey, field: 'enabled' | 'comingSoon', value: boolean) {
    const next: ModuleVisibility = {
      ...visibility,
      athlete: { ...visibility.athlete, [key]: { ...visibility.athlete[key], [field]: value } },
    }
    setVisibility(next)
    saveVisibility(next)
  }

  function updateCoachModule(key: CoachModuleKey, value: boolean) {
    const next: ModuleVisibility = {
      ...visibility,
      coach: { ...visibility.coach, [key]: { ...visibility.coach[key], enabled: value } },
    }
    setVisibility(next)
    saveVisibility(next)
  }

  function updateCoachMemberModule(key: CoachMemberModuleKey, value: boolean) {
    const next: ModuleVisibility = {
      ...visibility,
      coachMember: { ...visibility.coachMember, [key]: { ...visibility.coachMember[key], enabled: value } },
    }
    setVisibility(next)
    saveVisibility(next)
  }

  // Notification settings save + updater
  const saveNotifSettings = useCallback(async (next: NotificationSettings) => {
    if (notifSaveTimer.current) clearTimeout(notifSaveTimer.current)
    setNotifSaveState('saving')
    try { localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: NOTIFICATION_SETTINGS_KEY, value: next, updated_at: new Date().toISOString() })

    if (error) {
      setNotifSaveState('error')
    } else {
      setNotifSaveState('saved')
      notifSaveTimer.current = setTimeout(() => setNotifSaveState('idle'), 2500)
    }
  }, [])

  function updateNotif<K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) {
    const next = { ...notifSettings, [key]: value }
    setNotifSettings(next)
    saveNotifSettings(next)
  }

  function patchNotif<K extends keyof NotificationSettings>(key: K, patch: Partial<NotificationSettings[K] & object>) {
    const next = { ...notifSettings, [key]: { ...(notifSettings[key] as object), ...patch } }
    setNotifSettings(next)
    saveNotifSettings(next)
  }

  // Recipients helpers
  function handleRecipientSave(updated: Recipient) {
    const next = recipients.map(r => r.id === updated.id ? updated : r)
    setRecipients(next); saveRecipients(next)
  }
  function handleRecipientDelete(id: string) {
    const next = recipients.filter(r => r.id !== id)
    setRecipients(next); saveRecipients(next)
  }
  function handleRecipientAdd(r: Recipient) {
    const next = [...recipients, r]
    setRecipients(next); saveRecipients(next)
    setShowAddForm(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Manage operational preferences and configurations</p>
          </div>
          {activeTab === 'visibility'    && <SaveIndicator state={saveState} />}
          {activeTab === 'notifications' && <SaveIndicator state={notifSaveState} />}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  active ? 'text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
                style={active ? { backgroundColor: ACCENT } : {}}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── App Settings ─────────────────────────────────────────────────── */}
        {activeTab === 'app' && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ACCENT}1a` }}>
                    <IconSend size={18} style={{ color: ACCENT }} />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Financial Summary Recipients</h2>
                    <p className="text-xs text-gray-400">Preset email recipients shown in the &ldquo;Send Summary&rdquo; modal on the Finances page</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setRecipients(DEFAULT_RECIPIENTS); saveRecipients(DEFAULT_RECIPIENTS) }}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                    Reset to defaults
                  </button>
                  <button onClick={() => setShowAddForm(v => !v)}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}>
                    <IconPlus size={15} /> Add Recipient
                  </button>
                </div>
              </div>
            </div>

            {showAddForm && (
              <div className="border-b border-gray-100 px-6 py-4">
                <AddRecipientForm onAdd={handleRecipientAdd} onCancel={() => setShowAddForm(false)} />
              </div>
            )}

            {recipients.length === 0 ? (
              <div className="py-14 text-center">
                <IconMail size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No recipients yet — add one above or reset to defaults</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-sm">
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      {['Name', 'Email', 'Role', ''].map(h => (
                        <th key={h} className="border-b border-gray-100 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <RecipientRow key={r.id} recipient={r} onSave={handleRecipientSave} onDelete={handleRecipientDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-gray-50 px-6 py-3">
              <p className="text-xs text-gray-400">
                {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} · Changes saved automatically
              </p>
            </div>
          </div>
        )}

        {/* ── Module Visibility ─────────────────────────────────────────────── */}
        {activeTab === 'visibility' && (
          <>
            {loadingVis ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
              </div>
            ) : (
              <>
                {/* Athlete / Parent App */}
                <VisibilitySection
                  title="Athlete / Parent App"
                  subtitle="Control which modules are visible to athletes and parents in the athlete-facing app"
                >
                  {ATHLETE_MODULES.map(mod => (
                    <ModuleRow
                      key={mod.key}
                      label={mod.label}
                      desc={mod.desc}
                      enabled={visibility.athlete[mod.key]?.enabled ?? true}
                      comingSoon={visibility.athlete[mod.key]?.comingSoon ?? false}
                      showComingSoon
                      onToggle={v => updateAthleteModule(mod.key, 'enabled', v)}
                      onComingSoonToggle={v => updateAthleteModule(mod.key, 'comingSoon', v)}
                    />
                  ))}
                </VisibilitySection>

                {/* Coach App */}
                <VisibilitySection
                  title="Coach App (Employed Coaches)"
                  subtitle="Control which modules employed coaches can access in their coach dashboard"
                >
                  {COACH_MODULES.map(mod => (
                    <ModuleRow
                      key={mod.key}
                      label={mod.label}
                      desc={mod.desc}
                      enabled={visibility.coach[mod.key]?.enabled ?? true}
                      onToggle={v => updateCoachModule(mod.key, v)}
                    />
                  ))}
                </VisibilitySection>

                {/* Formula14 Coach Members */}
                <VisibilitySection
                  title="Formula14 Coach Members"
                  subtitle="Control which modules are available to external coach subscribers"
                >
                  {COACH_MEMBER_MODULES.map(mod => (
                    <ModuleRow
                      key={mod.key}
                      label={mod.label}
                      desc={mod.desc}
                      enabled={visibility.coachMember[mod.key]?.enabled ?? true}
                      onToggle={v => updateCoachMemberModule(mod.key, v)}
                    />
                  ))}
                </VisibilitySection>

                <p className="text-xs text-gray-400">
                  Changes take effect immediately and are synced across all devices. Disabled modules are hidden from navigation and redirect users to their dashboard. &ldquo;Coming Soon&rdquo; modules remain visible in navigation but show a placeholder page.
                </p>
              </>
            )}
          </>
        )}

        {/* ── Notifications ────────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <>
            {loadingNotif ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: ACCENT }} />
              </div>
            ) : (
              <NotificationsTab
                settings={notifSettings}
                sessionEmail={session?.user?.email ?? ''}
                onPause={v => updateNotif('paused', v)}
                onSendingHours={(start, end) => updateNotif('sendingHours', { start, end })}
                onPatch={patchNotif}
              />
            )}
          </>
        )}

        {/* ── Integrations (placeholder) ────────────────────────────────────── */}
        {activeTab === 'integrations' && (
          <PlaceholderTab
            title="Integrations"
            desc="Connect third-party services like Stripe for payments, Resend for email, and Basiq for bank feeds. Coming soon."
          />
        )}

        {/* ── Account (placeholder) ─────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <PlaceholderTab
            title="Account Settings"
            desc="Manage your admin profile, password, two-factor authentication, and session preferences. Coming soon."
          />
        )}

      </div>
    </div>
  )
}
