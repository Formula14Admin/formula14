'use client'

import { DatePicker, SelectPicker } from '@/components/ui/Pickers'
import { avatarColor, initials } from '../team/_shared'

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export function Avatar({
  firstName,
  lastName,
  size = 36,
}: {
  firstName: string
  lastName: string
  size?: number
}) {
  const bg = avatarColor(`${firstName} ${lastName}`)
  const font = Math.round(size * 0.36)
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: font }}
    >
      {initials(firstName, lastName)}
    </div>
  )
}

// ── ModalField ────────────────────────────────────────────────────────────────

export function ModalField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {type === 'date' ? (
        <DatePicker value={value} onChange={onChange} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
        />
      )}
    </div>
  )
}

// ── ModalSelect ───────────────────────────────────────────────────────────────

export function ModalSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <SelectPicker
        value={value}
        onChange={onChange}
        options={options.map(([v, l]) => ({ value: v, label: l }))}
      />
    </div>
  )
}
