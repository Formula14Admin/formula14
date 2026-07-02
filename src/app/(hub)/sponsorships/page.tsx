'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  IconPlus, IconPencil, IconTrash, IconCheck, IconX,
  IconBuilding, IconUser, IconPhone, IconMail,
  IconCurrencyDollar, IconFileUpload, IconAlertTriangle,
  IconTrophy,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SponsorTier {
  id: string
  name: string
  color_id: string
  package_details: string
  sort_order: number
}

interface Sponsor {
  id: string
  tier_id: string
  business_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  start_date: string
  renewal_date: string
  value: number
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })

const TIER_COLORS: Record<string, { bg: string; color: string; ring: string }> = {
  platinum: { bg: '#f1f5f9', color: '#475569', ring: '#94a3b8' },
  gold:     { bg: '#fef9c3', color: '#854d0e', ring: '#f59e0b' },
  silver:   { bg: '#f3f4f6', color: '#374151', ring: '#9ca3af' },
  bronze:   { bg: '#fff7ed', color: '#9a3412', ring: '#fb923c' },
}

const COLOR_OPTIONS = [
  { id: 'platinum', label: 'Platinum' },
  { id: 'gold',     label: 'Gold' },
  { id: 'silver',   label: 'Silver' },
  { id: 'bronze',   label: 'Bronze' },
]

function tierColor(colorId: string) {
  return TIER_COLORS[colorId] ?? { bg: '#f0f9ff', color: '#0369a1', ring: '#38bdf8' }
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const LABEL = 'mb-1 block text-xs font-semibold text-gray-600'
const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30'

// ─── Sponsor Modal ────────────────────────────────────────────────────────────

function SponsorModal({
  sponsor, tiers, onSave, onClose,
}: {
  sponsor: Sponsor | null
  tiers: SponsorTier[]
  onSave: (s: Omit<Sponsor, 'id'> & { id?: string }) => void
  onClose: () => void
}) {
  const [tierId,        setTierId]        = useState(sponsor?.tier_id ?? tiers[0]?.id ?? '')
  const [businessName,  setBusinessName]  = useState(sponsor?.business_name ?? '')
  const [contactName,   setContactName]   = useState(sponsor?.contact_name ?? '')
  const [contactEmail,  setContactEmail]  = useState(sponsor?.contact_email ?? '')
  const [contactPhone,  setContactPhone]  = useState(sponsor?.contact_phone ?? '')
  const [startDate,     setStartDate]     = useState(sponsor?.start_date ?? '')
  const [renewalDate,   setRenewalDate]   = useState(sponsor?.renewal_date ?? '')
  const [value,         setValue]         = useState(String(sponsor?.value ?? ''))
  const [notes,         setNotes]         = useState(sponsor?.notes ?? '')

  function handleSave() {
    if (!businessName.trim()) return
    onSave({
      id: sponsor?.id,
      tier_id: tierId,
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(),
      start_date: startDate,
      renewal_date: renewalDate,
      value: parseFloat(value) || 0,
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">{sponsor ? 'Edit Sponsor' : 'Add Sponsor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Sponsorship Tier</label>
            <select value={tierId} onChange={e => setTierId(e.target.value)} className={INPUT + ' cursor-pointer'}>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Business Name <span className="text-red-400">*</span></label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={INPUT} placeholder="e.g. Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contact Name</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} className={INPUT} placeholder="Full name" />
            </div>
            <div>
              <label className={LABEL}>Contact Phone</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={INPUT} placeholder="04xx xxx xxx" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Contact Email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={INPUT} placeholder="contact@business.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Renewal Date</label>
              <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Value ($/year)</label>
            <input type="number" min="0" value={value} onChange={e => setValue(e.target.value)} className={INPUT} placeholder="0" />
          </div>
          <div>
            <label className={LABEL}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={INPUT + ' resize-none'} placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!businessName.trim()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {sponsor ? 'Save Changes' : 'Add Sponsor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Tier Modal ───────────────────────────────────────────────────────────

function AddTierModal({
  onSave, onClose,
}: {
  onSave: (name: string, colorId: string) => void
  onClose: () => void
}) {
  const [name,    setName]    = useState('')
  const [colorId, setColorId] = useState('platinum')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">New Tier</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Tier Name <span className="text-red-400">*</span></label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), colorId) }}
              className={INPUT}
              placeholder="e.g. Diamond"
            />
          </div>
          <div>
            <label className={LABEL}>Colour Style</label>
            <select value={colorId} onChange={e => setColorId(e.target.value)} className={INPUT + ' cursor-pointer'}>
              {COLOR_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim()) onSave(name.trim(), colorId) }}
            disabled={!name.trim()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            Create Tier
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SponsorshipsPage() {
  const [tiers,        setTiers]        = useState<SponsorTier[]>([])
  const [sponsors,     setSponsors]     = useState<Sponsor[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeTier,   setActiveTier]   = useState<string>('')

  const [editingPkg,          setEditingPkg]          = useState<string | null>(null)
  const [pkgDraft,             setPkgDraft]             = useState('')
  const [editingTierId,        setEditingTierId]        = useState<string | null>(null)
  const [tierNameDraft,        setTierNameDraft]        = useState('')
  const [sponsorModal,         setSponsorModal]         = useState<{ sponsor: Sponsor | null } | null>(null)
  const [addTierModal,         setAddTierModal]         = useState(false)
  const [confirmDeleteTier,    setConfirmDeleteTier]    = useState<string | null>(null)
  const [uploadNotice,         setUploadNotice]         = useState(false)
  const [saving,               setSaving]               = useState(false)

  // ── Load from Supabase ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [{ data: tierRows }, { data: sponsorRows }] = await Promise.all([
      supabase.from('sponsor_tiers').select('*').order('sort_order').order('created_at'),
      supabase.from('sponsors').select('*').order('business_name'),
    ])
    const loadedTiers = (tierRows as SponsorTier[] | null) ?? []
    setTiers(loadedTiers)
    setSponsors((sponsorRows as Sponsor[] | null) ?? [])
    setLoading(false)
    setActiveTier(prev => {
      if (prev && loadedTiers.find(t => t.id === prev)) return prev
      return loadedTiers[0]?.id ?? ''
    })
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  // ── Derived ────────────────────────────────────────────────────────────────

  const currentTier  = tiers.find(t => t.id === activeTier)
  const tierSponsors = sponsors.filter(s => s.tier_id === activeTier)
  const tc           = tierColor(currentTier?.color_id ?? '')

  const totalValue = sponsors.reduce((sum, s) => sum + s.value, 0)

  // ── Sponsor CRUD ──────────────────────────────────────────────────────────

  async function saveSponsor(s: Omit<Sponsor, 'id'> & { id?: string }) {
    setSaving(true)
    if (s.id) {
      const { data } = await supabase
        .from('sponsors')
        .update({ ...s, updated_at: new Date().toISOString() })
        .eq('id', s.id)
        .select()
        .single()
      if (data) setSponsors(prev => prev.map(x => x.id === s.id ? data as Sponsor : x))
    } else {
      const { data } = await supabase
        .from('sponsors')
        .insert({
          tier_id:       s.tier_id,
          business_name: s.business_name,
          contact_name:  s.contact_name,
          contact_email: s.contact_email,
          contact_phone: s.contact_phone,
          start_date:    s.start_date   || null,
          renewal_date:  s.renewal_date || null,
          value:         s.value,
          notes:         s.notes,
        })
        .select()
        .single()
      if (data) setSponsors(prev => [...prev, data as Sponsor])
    }
    setSponsorModal(null)
    setSaving(false)
  }

  async function deleteSponsor(id: string) {
    await supabase.from('sponsors').delete().eq('id', id)
    setSponsors(prev => prev.filter(s => s.id !== id))
  }

  async function moveSponsor(id: string, newTierId: string) {
    await supabase.from('sponsors').update({ tier_id: newTierId, updated_at: new Date().toISOString() }).eq('id', id)
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, tier_id: newTierId } : s))
  }

  // ── Tier CRUD ─────────────────────────────────────────────────────────────

  async function addTier(name: string, colorId: string) {
    const nextOrder = (tiers[tiers.length - 1]?.sort_order ?? 0) + 1
    const { data } = await supabase
      .from('sponsor_tiers')
      .insert({ name, color_id: colorId, sort_order: nextOrder, package_details: '' })
      .select()
      .single()
    if (data) {
      setTiers(prev => [...prev, data as SponsorTier])
      setActiveTier((data as SponsorTier).id)
    }
    setAddTierModal(false)
  }

  async function saveTierName() {
    if (!editingTierId || !tierNameDraft.trim()) { setEditingTierId(null); return }
    await supabase.from('sponsor_tiers').update({ name: tierNameDraft.trim(), updated_at: new Date().toISOString() }).eq('id', editingTierId)
    setTiers(prev => prev.map(t => t.id === editingTierId ? { ...t, name: tierNameDraft.trim() } : t))
    setEditingTierId(null)
  }

  async function savePkg(tierId: string) {
    await supabase.from('sponsor_tiers').update({ package_details: pkgDraft, updated_at: new Date().toISOString() }).eq('id', tierId)
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, package_details: pkgDraft } : t))
    setEditingPkg(null)
  }

  async function deleteTier(id: string) {
    await supabase.from('sponsors').delete().eq('tier_id', id)
    await supabase.from('sponsor_tiers').delete().eq('id', id)
    setSponsors(prev => prev.filter(s => s.tier_id !== id))
    setTiers(prev => {
      const next = prev.filter(t => t.id !== id)
      if (activeTier === id) setActiveTier(next[0]?.id ?? '')
      return next
    })
    setConfirmDeleteTier(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#f4f6f9' }}>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#f4f6f9' }}>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsorships</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage sponsorship tiers, packages, and sponsor contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sponsors.length > 0 && (
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Value</p>
              <p className="text-lg font-bold text-gray-900">${fmtMoney(totalValue)}<span className="text-xs font-normal text-gray-400">/yr</span></p>
            </div>
          )}
          <button
            onClick={() => setAddTierModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <IconPlus size={15} /> Add Tier
          </button>
          {currentTier && (
            <button
              onClick={() => setSponsorModal({ sponsor: null })}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <IconPlus size={15} /> Add Sponsor
            </button>
          )}
        </div>
      </div>

      {tiers.length === 0 ? (
        /* Empty state — no tiers yet */
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-24 shadow-sm text-center">
          <IconTrophy size={40} className="mb-4 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-gray-400">No sponsorship tiers yet</p>
          <p className="mt-1 text-xs text-gray-400">Click <strong>Add Tier</strong> to create your first tier</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Tier sub-tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tiers.map(t => {
              const c = tierColor(t.color_id)
              const isActive = activeTier === t.id
              return (
                <div key={t.id} className="group relative flex items-center">
                  {editingTierId === t.id ? (
                    <div className="flex items-center gap-1 rounded-lg border border-[#6BA3D6] bg-white px-2 py-1.5 shadow-sm">
                      <input
                        autoFocus
                        value={tierNameDraft}
                        onChange={e => setTierNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void saveTierName(); if (e.key === 'Escape') setEditingTierId(null) }}
                        className="w-24 text-sm font-semibold text-gray-800 outline-none"
                      />
                      <button onClick={() => void saveTierName()} className="text-green-500 hover:text-green-700"><IconCheck size={14} /></button>
                      <button onClick={() => setEditingTierId(null)} className="text-gray-400 hover:text-gray-600"><IconX size={14} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTier(t.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition"
                      style={isActive
                        ? { backgroundColor: c.bg, color: c.color, boxShadow: `0 0 0 2px ${c.ring}` }
                        : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}
                    >
                      {t.name}
                      <span className="ml-0.5 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold">
                        {sponsors.filter(s => s.tier_id === t.id).length}
                      </span>
                    </button>
                  )}
                  {/* Rename on hover */}
                  {editingTierId !== t.id && (
                    <button
                      onClick={() => { setEditingTierId(t.id); setTierNameDraft(t.name) }}
                      className="absolute -right-1 -top-1 hidden rounded-full border border-gray-200 bg-white p-0.5 text-gray-400 shadow-sm hover:text-gray-700 group-hover:flex"
                    >
                      <IconPencil size={10} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {currentTier && (
            <div className="space-y-4">

              {/* Tier header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-800">{currentTier.name} Sponsorship</h2>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: tc.bg, color: tc.color }}>
                    {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? 's' : ''}
                  </span>
                  {tierSponsors.length > 0 && (
                    <span className="text-xs text-gray-400">
                      ${fmtMoney(tierSponsors.reduce((s, sp) => s + sp.value, 0))}/yr
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDeleteTier(activeTier)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <IconTrash size={13} /> Delete Tier
                </button>
              </div>

              {/* Confirm delete tier */}
              {confirmDeleteTier === activeTier && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-red-700">
                    <IconAlertTriangle size={16} />
                    <span>Delete <strong>{currentTier.name}</strong> tier? All {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? 's' : ''} in this tier will also be removed.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDeleteTier(null)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-white">
                      Cancel
                    </button>
                    <button onClick={() => void deleteTier(activeTier)}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Package Overview */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Package Overview</h3>
                  {editingPkg === activeTier ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPkg(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={() => void savePkg(activeTier)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}>
                        <IconCheck size={12} /> Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUploadNotice(v => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
                      >
                        <IconFileUpload size={13} /> Upload PDF
                      </button>
                      <button
                        onClick={() => { setEditingPkg(activeTier); setPkgDraft(currentTier.package_details) }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                      >
                        <IconPencil size={13} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {editingPkg === activeTier ? (
                  <textarea
                    value={pkgDraft}
                    onChange={e => setPkgDraft(e.target.value)}
                    rows={12}
                    className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30"
                    placeholder={`What's included in the ${currentTier.name} package?\n\nE.g.\n• Logo on team jersey\n• 2× courtside seats per home game\n• Social media mentions (4/month)\n• Newsletter feature`}
                  />
                ) : currentTier.package_details ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                    {currentTier.package_details}
                  </pre>
                ) : (
                  <p className="text-sm italic text-gray-400">
                    No package details yet — click <strong>Edit</strong> to describe what&apos;s included in this tier.
                  </p>
                )}

                {uploadNotice && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <IconAlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-800">PDF upload coming soon</p>
                      <p className="mt-0.5 text-xs text-amber-700">Sponsorship package document upload will be available once Supabase Storage is configured.</p>
                    </div>
                    <button onClick={() => setUploadNotice(false)} className="text-amber-500 hover:text-amber-700">
                      <IconX size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Sponsors list */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Current Sponsors</h3>
                  <button
                    onClick={() => setSponsorModal({ sponsor: null })}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <IconPlus size={13} /> Add Sponsor
                  </button>
                </div>

                {tierSponsors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center">
                    <IconBuilding size={32} className="mb-2 text-gray-200" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-gray-400">No sponsors yet</p>
                    <p className="mt-0.5 text-xs text-gray-400">Click <strong>Add Sponsor</strong> to add your first sponsor</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 860 }}>
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Business</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Contact</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Email</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Start</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Renewal</th>
                          <th className="pb-2.5 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Value/yr</th>
                          <th className="pb-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tierSponsors.map(sp => (
                          <tr key={sp.id} className="group">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <IconBuilding size={13} className="shrink-0 text-gray-400" />
                                <div>
                                  <p className="font-semibold text-gray-800">{sp.business_name}</p>
                                  {sp.notes && <p className="max-w-[160px] truncate text-[10px] text-gray-400">{sp.notes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <IconUser size={12} className="shrink-0 text-gray-400" />
                                {sp.contact_name || '—'}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5">
                                <IconMail size={12} className="shrink-0 text-gray-400" />
                                <span className="text-xs text-gray-600">{sp.contact_email || '—'}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <IconPhone size={12} className="shrink-0 text-gray-400" />
                                {sp.contact_phone || '—'}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-xs text-gray-600">{fmtDate(sp.start_date)}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs ${sp.renewal_date && sp.renewal_date <= TODAY ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                                {fmtDate(sp.renewal_date)}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-0.5 text-sm font-semibold text-gray-800">
                                <IconCurrencyDollar size={13} className="text-gray-400" />
                                {sp.value > 0 ? fmtMoney(sp.value) : '—'}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSponsorModal({ sponsor: sp })}
                                  className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                >
                                  <IconPencil size={13} />
                                </button>
                                {tiers.length > 1 && (
                                  <select
                                    value={sp.tier_id}
                                    onChange={e => void moveSponsor(sp.id, e.target.value)}
                                    title="Move to tier"
                                    className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-gray-500 outline-none hover:border-gray-300 cursor-pointer"
                                  >
                                    {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                )}
                                <button
                                  onClick={() => void deleteSponsor(sp.id)}
                                  className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <IconTrash size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-100">
                          <td colSpan={6} className="pt-3 text-xs text-gray-400">
                            {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? 's' : ''} · Renewal dates in red are overdue
                          </td>
                          <td className="pt-3">
                            <div className="flex items-center gap-0.5 text-sm font-bold text-gray-800">
                              <IconCurrencyDollar size={13} className="text-gray-400" />
                              {fmtMoney(tierSponsors.reduce((sum, s) => sum + s.value, 0))}/yr
                            </div>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {sponsorModal && (
        <SponsorModal
          sponsor={sponsorModal.sponsor}
          tiers={tiers}
          onSave={s => void saveSponsor(s)}
          onClose={() => setSponsorModal(null)}
        />
      )}
      {addTierModal && (
        <AddTierModal
          onSave={(name, colorId) => void addTier(name, colorId)}
          onClose={() => setAddTierModal(false)}
        />
      )}
      {saving && (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded-xl bg-gray-900/80 px-4 py-2 text-xs text-white">
          Saving…
        </div>
      )}
    </div>
  )
}
