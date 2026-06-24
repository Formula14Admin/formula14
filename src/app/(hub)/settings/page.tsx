'use client'

import { useState, useEffect } from 'react'
import {
  IconPlus, IconTrash, IconEdit, IconCheck, IconX, IconMail,
  IconUserCircle, IconSend,
} from '@tabler/icons-react'
import {
  loadRecipients, saveRecipients, DEFAULT_RECIPIENTS,
  type Recipient,
} from '@/lib/finances-recipients'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const LABEL  = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'
const INPUT  = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'

const ROLE_OPTIONS = ['Accountant', 'Head Coach', 'Coach', 'Admin', 'Manager', 'Director', 'Other']

// ─── Recipient Row ────────────────────────────────────────────────────────────

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
        <td className="px-4 py-3">
          <input value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="Name" />
        </td>
        <td className="px-4 py-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="email@example.com" />
        </td>
        <td className="px-4 py-3">
          <select value={role} onChange={e => setRole(e.target.value)} className={INPUT}>
            {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-1.5">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !email.trim()}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              <IconCheck size={13} /> Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
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
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: ACCENT }}
          >
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
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <IconEdit size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(recipient.id)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <IconTrash size={13} /> Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add Recipient Form ───────────────────────────────────────────────────────

function AddRecipientForm({ onAdd, onCancel }: {
  onAdd: (r: Recipient) => void
  onCancel: () => void
}) {
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [role,  setRole]  = useState(ROLE_OPTIONS[0])
  const canAdd = name.trim() && email.trim()

  function handleAdd() {
    if (!canAdd) return
    onAdd({ id: Math.random().toString(36).slice(2), name: name.trim(), email: email.trim(), role })
  }

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
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          <IconPlus size={14} /> Add Recipient
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => { setRecipients(loadRecipients()) }, [])

  function handleSave(updated: Recipient) {
    const next = recipients.map(r => r.id === updated.id ? updated : r)
    setRecipients(next)
    saveRecipients(next)
  }

  function handleDelete(id: string) {
    const next = recipients.filter(r => r.id !== id)
    setRecipients(next)
    saveRecipients(next)
  }

  function handleAdd(r: Recipient) {
    const next = [...recipients, r]
    setRecipients(next)
    saveRecipients(next)
    setShowAddForm(false)
  }

  function handleReset() {
    setRecipients(DEFAULT_RECIPIENTS)
    saveRecipients(DEFAULT_RECIPIENTS)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage operational preferences and configurations</p>
      </div>

      <div className="space-y-6 p-6">

        {/* Financial Summary Recipients */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          {/* Section header */}
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: ACCENT + '1a' }}
                >
                  <IconSend size={18} style={{ color: ACCENT }} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Financial Summary Recipients</h2>
                  <p className="text-xs text-gray-400">
                    Preset email recipients shown in the "Send Summary" modal on the Finances page
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Reset to defaults
                </button>
                <button
                  onClick={() => setShowAddForm(v => !v)}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  <IconPlus size={15} />
                  Add Recipient
                </button>
              </div>
            </div>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="border-b border-gray-100 px-6 py-4">
              <AddRecipientForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
            </div>
          )}

          {/* Table */}
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
                    <RecipientRow
                      key={r.id}
                      recipient={r}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-50 px-6 py-3">
            <p className="text-xs text-gray-400">
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} · Changes are saved automatically to your browser
            </p>
          </div>
        </div>

        {/* Placeholder for future settings sections */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3 px-6 py-5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100"
            >
              <IconUserCircle size={18} className="text-gray-400" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Profile & Notifications</h2>
              <p className="text-xs text-gray-400">Coming soon — user profile settings and notification preferences</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
