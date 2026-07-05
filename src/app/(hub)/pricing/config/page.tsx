'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SelectPicker } from '@/components/ui/Pickers'
import {
  IconX,
  IconPlus,
  IconSettings,
  IconChevronDown,
  IconChevronUp,
  IconUsers,
  IconPencil,
  IconTrash,
  IconChartBar,
  IconCheck,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionType = 'small-group' | 'individual' | 'team-training' | 'casual-shooting' | 'volume-shooting' | 'development-programs' | 'social-programs' | 'weight-room-session' | 'film-room-session' | 'shooting-machine-session'

interface PricingTier {
  id: string
  min: number
  max: number | null
  pricePerAthlete: number
}

interface SessionPricingConfig {
  sessionType: string  // SessionType for built-in types; custom uid string for user-added cards
  label?: string       // display label for custom cards
  tiers: PricingTier[]
  durationMins?: number
}

interface PricingSettings {
  lockoutMinutes: number
  chargeNoShow: boolean
  chargeExcusedAbsence: boolean
}

export interface ProgramCatalogueItem {
  id: string
  name: string
  category: 'development' | 'social'
  pricePerSession: number
  numSessions: number
  maxCapacity: number
  enrolmentType: 'instant' | 'approval'
  description: string
  colourTag: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  'small-group':            'Small Group Session',
  'individual':             'Individual Work Out',
  'team-training':          'Team Training',
  'casual-shooting':        'Casual Shooting',
  'volume-shooting':        'Volume Shooting',
  'development-programs':   'Development Programs',
  'social-programs':        'Social Programs',
  'weight-room-session':    'Weight Room Session',
  'film-room-session':      'Film Room Session',
  'shooting-machine-session': 'Shooting Machine Session',
}

const SESSION_TYPE_COLORS: Record<SessionType, { bg: string; color: string }> = {
  'small-group':            { bg: '#dbeafe', color: '#1d4ed8' },
  'individual':             { bg: '#dcfce7', color: '#15803d' },
  'team-training':          { bg: '#ede9fe', color: '#6d28d9' },
  'casual-shooting':        { bg: '#fef3c7', color: '#b45309' },
  'volume-shooting':        { bg: '#fee2e2', color: '#b91c1c' },
  'development-programs':   { bg: '#ccfbf1', color: '#0f766e' },
  'social-programs':        { bg: '#fce7f3', color: '#be185d' },
  'weight-room-session':    { bg: '#fce8eb', color: '#9B2335' },
  'film-room-session':      { bg: '#f0ebfb', color: '#A06BD6' },
  'shooting-machine-session': { bg: '#fdf5e0', color: '#D4A520' },
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

const CATALOGUE_COLOURS = ['#6BA3D6','#6BAD6B','#D4A520','#A06BD6','#E57373','#4DB6AC','#F97316','#0EA5E9']

const INIT_CATALOGUE: ProgramCatalogueItem[] = [
  { id:'cat-perf-lab',      name:'Performance Lab',       category:'development', pricePerSession:20, numSessions:12, maxCapacity:15, enrolmentType:'approval', description:'Elite performance training focused on skill development, conditioning, and game IQ.', colourTag:'#6BA3D6' },
  { id:'cat-dom-academy',   name:'Domestic Academy',      category:'development', pricePerSession:20, numSessions:12, maxCapacity:15, enrolmentType:'approval', description:'Structured academy program for athletes chasing domestic competition pathways.', colourTag:'#A06BD6' },
  { id:'cat-snipers',       name:'Snipers Club',          category:'development', pricePerSession:20, numSessions:12, maxCapacity:15, enrolmentType:'approval', description:'Shooting-specific program to level up range and accuracy from all areas.', colourTag:'#D4A520' },
  { id:'cat-shooters-lab',  name:'Shooters Lab',          category:'development', pricePerSession:20, numSessions:12, maxCapacity:15, enrolmentType:'approval', description:'Volume shooting and form correction for developing consistent shooters.', colourTag:'#0EA5E9' },
  { id:'cat-walking-bball', name:'Walking Basketball',    category:'social',      pricePerSession:15, numSessions: 8, maxCapacity:20, enrolmentType:'instant',  description:'Low-impact basketball for all ages and abilities. Great social activity for the community.', colourTag:'#6BAD6B' },
  { id:'cat-midday-ladies', name:'Mid Day Ladies Comp',   category:'social',      pricePerSession:15, numSessions: 8, maxCapacity:20, enrolmentType:'instant',  description:'Midday competition for women of all abilities. Inclusive, welcoming, and fun.', colourTag:'#E57373' },
  { id:'cat-adult-beginner',name:'Adult Beginner School', category:'social',      pricePerSession:15, numSessions: 8, maxCapacity:20, enrolmentType:'instant',  description:'Introduction to basketball for adults new to the game. Relaxed and welcoming environment.', colourTag:'#4DB6AC' },
]

const INIT_PRICING: SessionPricingConfig[] = [
  {
    sessionType: 'small-group',
    durationMins: 90,
    tiers: [
      { id: 't1', min: 1, max: 6, pricePerAthlete: 40 },
    ],
  },
  {
    sessionType: 'individual',
    durationMins: 60,
    tiers: [
      { id: 't5', min: 1, max: 1, pricePerAthlete: 75 },
    ],
  },
  {
    sessionType: 'team-training',
    durationMins: 120,
    tiers: [
      { id: 't7', min: 7, max: 10, pricePerAthlete: 80 },
    ],
  },
  {
    sessionType: 'casual-shooting',
    durationMins: 60,
    tiers: [
      { id: 't10', min: 1, max: null, pricePerAthlete: 10 },
    ],
  },
  {
    sessionType: 'volume-shooting',
    durationMins: 60,
    tiers: [], // duration-based pricing — see DEFAULT_VOLUME_PRICES below
  },
  {
    sessionType: 'development-programs',
    tiers: [], // program-based pricing — see PROGRAM_PRICING below
  },
  {
    sessionType: 'social-programs',
    tiers: [], // program-based pricing — see PROGRAM_PRICING below
  },
  {
    sessionType: 'weight-room-session',
    durationMins: 60,
    tiers: [
      { id: 'tw1', min: 1, max: null, pricePerAthlete: 15 },
    ],
  },
  {
    sessionType: 'film-room-session',
    durationMins: 60,
    tiers: [
      { id: 'tf1', min: 1, max: null, pricePerAthlete: 20 },
    ],
  },
  {
    sessionType: 'shooting-machine-session',
    durationMins: 60,
    tiers: [
      { id: 'tsm1', min: 1, max: null, pricePerAthlete: 15 },
    ],
  },
]

// Volume Shooting = Shooting Machine — priced by duration, not athlete count
const DEFAULT_VOLUME_PRICES = [
  { duration: 30, label: '30 minutes', price: 30 },
  { duration: 45, label: '45 minutes', price: 40 },
  { duration: 60, label: '60 minutes', price: 50 },
]

const DEFAULT_DURATIONS: Record<string, number> = {
  'individual': 60,
  'small-group': 90,
  'team-training': 120,
  'casual-shooting': 60,
  'volume-shooting': 60,
  'weight-room-session': 60,
  'film-room-session': 60,
  'shooting-machine-session': 60,
}

const DURATION_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const mins = (i + 1) * 15
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const label = h > 0
    ? (m > 0 ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`)
    : `${m} min`
  return { value: mins, label }
})

const INIT_SETTINGS: PricingSettings = {
  lockoutMinutes: 120,
  chargeNoShow: true,
  chargeExcusedAbsence: false,
}

const PRICING_CONFIGS_LS = 'f14_pricing_configs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function getPriceForCount(tiers: PricingTier[], count: number): number | null {
  if (!Array.isArray(tiers)) return null
  const tier = tiers.find(t => count >= t.min && (t.max === null || count <= t.max))
  return tier?.pricePerAthlete ?? null
}

// ─── Toggle Component ─────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${on ? 'bg-[#6BA3D6]' : 'bg-gray-200'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

class PricingConfigErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 text-center">
          <p className="text-base font-semibold text-red-700">Something went wrong loading Pricing Config</p>
          <p className="mt-2 text-sm text-gray-500">Cached pricing data may be corrupt. Use the button below to reset and reload.</p>
          <button
            onClick={() => {
              localStorage.removeItem('f14_pricing_configs')
              localStorage.removeItem('f14_program_catalogue')
              window.location.reload()
            }}
            className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Reset &amp; Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingConfigPage() {
  const [pricingConfigs, setPricingConfigs] = useState<SessionPricingConfig[]>(INIT_PRICING)
  const [editingPricing, setEditingPricing] = useState<string | null>(null)
  const [editTiers, setEditTiers] = useState<PricingTier[]>([])
  const [editDurationMins, setEditDurationMins] = useState<number>(60)
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [newCardLabel, setNewCardLabel] = useState('')
  const [settings, setSettings] = useState<PricingSettings>(INIT_SETTINGS)
  const [catalogue, setCatalogue] = useState<ProgramCatalogueItem[]>(INIT_CATALOGUE)
  const [progModalOpen, setProgModalOpen] = useState(false)
  const [editingProg, setEditingProg] = useState<ProgramCatalogueItem | null>(null)
  const [devCatOpen, setDevCatOpen] = useState(true)
  const [socialCatOpen, setSocialCatOpen] = useState(true)

  // Load pricing configs from Supabase on mount
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('session_types').select('*')
        if (data && data.length > 0) {
          const loaded = data.map(r => {
            let tiers: PricingTier[] = []
            try {
              const raw = Array.isArray(r.tiers) ? r.tiers : JSON.parse(r.tiers as string ?? '[]')
              tiers = (raw as Record<string, unknown>[]).map(t => ({
                id:             (t.id as string) ?? '',
                min:            (t.min as number) ?? 1,
                max:            (t.max as number | null) ?? null,
                pricePerAthlete:(t.pricePerAthlete as number) ?? 0,
              }))
            } catch {}
            return {
              sessionType:  r.session_type_id as string,
              tiers,
              durationMins: (r.duration_minutes as number) ?? 60,
            } as SessionPricingConfig
          })
          setPricingConfigs(loaded)
        }
      } catch (e) { console.error('[pricing/config] session_types load failed:', e) }
    })()
  }, [])

  // Load programme catalogue from Supabase on mount
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.from('programs').select('*').order('name')
        if (data && data.length > 0) {
          setCatalogue(data.map(p => ({
            id:             p.id as string,
            name:           p.name as string,
            category:       (p.category ?? 'development') as 'development' | 'social',
            pricePerSession:(p.price_per_session as number) ?? 20,
            numSessions:    (p.num_sessions as number) ?? 8,
            maxCapacity:    (p.max_capacity as number) ?? 15,
            enrolmentType:  (p.enrolment_type ?? 'approval') as 'instant' | 'approval',
            description:    (p.description ?? '') as string,
            colourTag:      (p.colour_tag ?? '#6BA3D6') as string,
          })))
        }
      } catch (e) { console.error('[pricing/config] programs load failed:', e) }
    })()
  }, [])

  // Persist catalogue to localStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('f14_program_catalogue', JSON.stringify(catalogue))
  }, [catalogue])

  // Persist pricing configs to localStorage on every change
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(PRICING_CONFIGS_LS, JSON.stringify(pricingConfigs))
  }, [pricingConfigs])

  // One-time mount: deep-sanitise tier field types so numeric fields are always numbers
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(PRICING_CONFIGS_LS)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as SessionPricingConfig[]
      if (!Array.isArray(parsed)) return
      let changed = false
      const cleaned = parsed.map(c => {
        if (!Array.isArray(c.tiers)) return c
        const cleanedTiers = c.tiers.map(t => {
          const id             = t.id ?? uid()
          const min            = (typeof t.min === 'number' && !isNaN(t.min)) ? t.min : 1
          const max            = (t.max === null) ? null : (typeof t.max === 'number' && !isNaN(t.max)) ? t.max : null
          const pricePerAthlete = (typeof t.pricePerAthlete === 'number' && !isNaN(t.pricePerAthlete)) ? t.pricePerAthlete : 0
          if (id !== t.id || min !== t.min || max !== t.max || pricePerAthlete !== t.pricePerAthlete) changed = true
          return { ...t, id, min, max, pricePerAthlete }
        })
        return { ...c, tiers: cleanedTiers }
      })
      if (changed) {
        localStorage.setItem(PRICING_CONFIGS_LS, JSON.stringify(cleaned))
        setPricingConfigs(cleaned)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Pricing config helpers ────────────────────────────────────────────────

  function configLabel(c: SessionPricingConfig): string {
    return c.label ?? (SESSION_TYPE_LABELS as Record<string, string>)[c.sessionType] ?? c.sessionType
  }
  function configColor(c: SessionPricingConfig): { bg: string; color: string } {
    return (SESSION_TYPE_COLORS as Record<string, { bg: string; color: string }>)[c.sessionType] ?? { bg: '#f3f4f6', color: '#6b7280' }
  }

  function startEditPricing(sessionType: string) {
    const config = pricingConfigs.find(c => c.sessionType === sessionType)
    if (!config) return
    let initialTiers = config.tiers.map(t => ({ ...t }))
    if (sessionType === 'volume-shooting' && initialTiers.length === 0) {
      initialTiers = DEFAULT_VOLUME_PRICES.map((row, i) => ({
        id: `vs${i}`, min: row.duration, max: row.duration, pricePerAthlete: row.price,
      }))
    }
    setEditTiers(initialTiers)
    setEditDurationMins(config.durationMins ?? DEFAULT_DURATIONS[sessionType] ?? 60)
    setEditingPricing(sessionType)
  }
  function saveEditPricing() {
    setPricingConfigs(prev => prev.map(c =>
      c.sessionType === editingPricing ? { ...c, tiers: editTiers, durationMins: editDurationMins } : c
    ))
    setEditingPricing(null)
    setEditTiers([])
  }
  function cancelEditPricing() {
    setEditingPricing(null)
    setEditTiers([])
  }
  function deleteCard(sessionType: string) {
    if (editingPricing === sessionType) { setEditingPricing(null); setEditTiers([]) }
    setPricingConfigs(prev => prev.filter(c => c.sessionType !== sessionType))
  }
  function addTierRow() {
    const last = editTiers[editTiers.length - 1]
    const newMin = last ? (last.max !== null ? last.max + 1 : last.min + 1) : 1
    setEditTiers(prev => [...prev, { id: uid(), min: newMin, max: null, pricePerAthlete: 0 }])
  }
  function removeTierRow(tierId: string) {
    setEditTiers(prev => prev.filter(t => t.id !== tierId))
  }
  function updateTierField(tierId: string, patch: Partial<Omit<PricingTier, 'id'>>) {
    setEditTiers(prev => prev.map(t => t.id === tierId ? { ...t, ...patch } : t))
  }
  function addCard() {
    const label = newCardLabel.trim()
    if (!label) return
    const id = 'custom_' + uid()
    setPricingConfigs(prev => [...prev, { sessionType: id, label, tiers: [] }])
    setNewCardLabel('')
    setAddCardOpen(false)
    setEditTiers([])
    setEditingPricing(id)
  }

  // ── Programme Catalogue ──────────────────────────────────────────────────

  function saveProg(item: ProgramCatalogueItem) {
    setCatalogue(prev => {
      const exists = prev.some(p => p.id === item.id)
      return exists ? prev.map(p => p.id === item.id ? item : p) : [...prev, item]
    })
    setProgModalOpen(false)
    setEditingProg(null)
  }

  function deleteProg(id: string) {
    setCatalogue(prev => prev.filter(p => p.id !== id))
  }

  function openAddProg(category: 'development' | 'social') {
    setEditingProg({
      id: 'cat-' + uid(),
      name: '',
      category,
      pricePerSession: category === 'development' ? 20 : 15,
      numSessions: category === 'development' ? 12 : 8,
      maxCapacity: category === 'development' ? 15 : 20,
      enrolmentType: category === 'development' ? 'approval' : 'instant',
      description: '',
      colourTag: CATALOGUE_COLOURS[0],
    })
    setProgModalOpen(true)
  }

  function openEditProg(item: ProgramCatalogueItem) {
    setEditingProg({ ...item })
    setProgModalOpen(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Config</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure session pricing tiers, lockout rules, and the programme catalogue</p>
      </div>

      <PricingConfigErrorBoundary>
      <div className="space-y-6">

        {/* Global settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <IconSettings size={17} style={{ color: ACCENT }} /> Global Settings
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className={LABEL}>Lockout Period</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={settings.lockoutMinutes}
                  onChange={e => setSettings(s => ({ ...s, lockoutMinutes: parseInt(e.target.value) || 120 }))}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10"
                />
                <span className="text-sm text-gray-500">minutes before session</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">Default: 120 min (2 hours)</p>
            </div>

            <div>
              <label className={LABEL}>No Show Charge</label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle on={settings.chargeNoShow} onToggle={() => setSettings(s => ({ ...s, chargeNoShow: !s.chargeNoShow }))} />
                <span className="text-sm text-gray-700">
                  {settings.chargeNoShow ? 'No Shows are charged' : 'No Shows are not charged'}
                </span>
              </div>
            </div>

            <div>
              <label className={LABEL}>Excused Absence Charge</label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle on={settings.chargeExcusedAbsence} onToggle={() => setSettings(s => ({ ...s, chargeExcusedAbsence: !s.chargeExcusedAbsence }))} />
                <span className="text-sm text-gray-700">
                  {settings.chargeExcusedAbsence ? 'Excused Absences are charged' : 'Excused Absences are not charged'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Structure — all session types × 1–20 athletes, read-only */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <IconChartBar size={17} style={{ color: ACCENT }} /> Pricing Structure
            </h2>
            {editingPricing === 'small-group' && (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: ACCENT }}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: ACCENT }} />
                Live preview
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-gray-400">
            Edit pricing in the session cards below — this table updates automatically.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="text-sm" style={{ minWidth: 'max-content' }}>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                    Session Type
                  </th>
                  {Array.from({ length: 20 }, (_, i) => (
                    <th key={i + 1} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricingConfigs.map(config => {
                  const typeColor = configColor(config)
                  const isVolume   = config.sessionType === 'volume-shooting'
                  const isDevProg  = config.sessionType === 'development-programs'
                  const isSocProg  = config.sessionType === 'social-programs'
                  // Use live editTiers for small-group while editing, otherwise saved tiers
                  const tiers = config.sessionType === 'small-group' && editingPricing === 'small-group'
                    ? editTiers
                    : config.tiers
                  const catalogueSummary = isDevProg
                    ? catalogue.filter(p => p.category === 'development')
                    : isSocProg
                    ? catalogue.filter(p => p.category === 'social')
                    : null
                  return (
                    <tr key={config.sessionType} className="border-b border-gray-100 last:border-0">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: typeColor.bg, color: typeColor.color }}>
                          {configLabel(config)}
                        </span>
                      </td>
                      {isVolume ? (
                        <td colSpan={20} className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                          Duration-based flat fee — 30 min $30 · 45 min $40 · 60 min $50
                        </td>
                      ) : catalogueSummary ? (
                        <td colSpan={20} className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                          {catalogueSummary.length > 0
                            ? catalogueSummary.map(p => `${p.name} $${p.pricePerSession}`).join(' · ') + ` — max ${catalogueSummary[0].maxCapacity} per session`
                            : 'No programs configured — add via Programme Catalogue below'}
                        </td>
                      ) : (
                        Array.from({ length: 20 }, (_, i) => {
                          const count = i + 1
                          const price = getPriceForCount(tiers, count)
                          return (
                            <td key={count} className="px-3 py-2.5 text-center">
                              {price != null
                                ? <span className="font-semibold text-gray-900">${price.toFixed(0)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                          )
                        })
                      )}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={21} className="px-4 pt-2.5 pb-1 text-xs text-gray-400">
                    Values show price per athlete. Column numbers are athlete counts 1–20.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Per-type pricing cards */}
        <div className="grid grid-cols-2 gap-4">
          {pricingConfigs.filter(c => c.sessionType !== 'development-programs' && c.sessionType !== 'social-programs').map(config => {
            const label = configLabel(config)
            const color = configColor(config)
            const isEditing = editingPricing === config.sessionType
            const isSpecial = config.sessionType === 'volume-shooting'

            return (
              <div key={config.sessionType}
                id={`pricing-card-${config.sessionType}`}
                className={`rounded-xl border bg-white p-5 transition ${isEditing ? 'border-[#6BA3D6] shadow-[0_0_0_3px_rgba(107,163,214,0.10)]' : 'border-gray-200'}`}>

                {/* Card header */}
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: color.bg, color: color.color }}>
                    {label}
                  </span>
                  {isEditing ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={cancelEditPricing}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="button" onClick={saveEditPricing}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => startEditPricing(config.sessionType)}
                        title="Edit pricing"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                        <IconPencil size={13} />
                      </button>
                      <button type="button" onClick={() => deleteCard(config.sessionType)}
                        title="Delete card"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                        <IconTrash size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit mode */}
                {isEditing ? (
                  isSpecial ? (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                              <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Flat Price</th>
                              <th className="w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {editTiers.map(tier => (
                              <tr key={tier.id} className="border-b border-gray-100 last:border-0">
                                <td className="px-3 py-1.5">
                                  <SelectPicker
                                    value={String(tier.min)}
                                    onChange={v => updateTierField(tier.id, { min: parseInt(v), max: parseInt(v) })}
                                    options={[15,30,45,60,75,90,105,120].map(m => ({ value: String(m), label: `${m} min` }))}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-400">$</span>
                                    <input type="number" min={0} step={1} value={tier.pricePerAthlete}
                                      onChange={e => updateTierField(tier.id, { pricePerAthlete: parseFloat(e.target.value) || 0 })}
                                      className="w-16 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30" />
                                  </div>
                                </td>
                                <td className="pr-2">
                                  <button type="button" onClick={() => removeTierRow(tier.id)}
                                    className="rounded p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400">
                                    <IconX size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {editTiers.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No duration tiers yet — add one below.</p>
                      )}
                      <button type="button" onClick={addTierRow}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 transition hover:border-gray-400 hover:text-gray-700">
                        <IconPlus size={13} /> Add Duration
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="shrink-0 text-xs font-semibold text-gray-600">Duration</label>
                        <SelectPicker
                          value={String(editDurationMins)}
                          onChange={v => setEditDurationMins(parseInt(v))}
                          options={DURATION_OPTIONS.map(opt => ({ value: String(opt.value), label: opt.label }))}
                        />
                      </div>
                      {editTiers.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Min</th>
                                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Max</th>
                                <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">$/athlete</th>
                                <th className="w-8" />
                              </tr>
                            </thead>
                            <tbody>
                              {editTiers.map(tier => (
                                <tr key={tier.id} className="border-b border-gray-100 last:border-0">
                                  <td className="px-3 py-1.5">
                                    <input type="number" min={1} value={tier.min}
                                      onChange={e => updateTierField(tier.id, { min: parseInt(e.target.value) || 1 })}
                                      className="w-14 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30" />
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <input type="number" min={tier.min} value={tier.max ?? ''}
                                      placeholder="∞"
                                      onChange={e => updateTierField(tier.id, { max: e.target.value === '' ? null : parseInt(e.target.value) || tier.min })}
                                      className="w-14 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30 placeholder:text-gray-300" />
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-400">$</span>
                                      <input type="number" min={0} step={1} value={tier.pricePerAthlete}
                                        onChange={e => updateTierField(tier.id, { pricePerAthlete: parseFloat(e.target.value) || 0 })}
                                        className="w-16 rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30" />
                                    </div>
                                  </td>
                                  <td className="pr-2">
                                    <button type="button" onClick={() => removeTierRow(tier.id)}
                                      className="rounded p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400">
                                      <IconX size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {editTiers.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No tiers yet — add one below.</p>
                      )}
                      <button type="button" onClick={addTierRow}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 transition hover:border-gray-400 hover:text-gray-700">
                        <IconPlus size={13} /> Add Tier
                      </button>
                    </div>
                  )
                ) : (
                  /* View mode */
                  config.sessionType === 'volume-shooting' ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                          <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Flat Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.tiers.length > 0
                          ? config.tiers.map(t => ({ duration: t.min, label: `${t.min} minutes`, price: t.pricePerAthlete }))
                          : DEFAULT_VOLUME_PRICES
                        ).map(row => (
                          <tr key={row.duration} className="border-b border-gray-100">
                            <td className="py-2 text-gray-700">{row.label}</td>
                            <td className="py-2 font-semibold text-gray-900">${row.price ?? 0}.00</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td colSpan={2} className="pt-2 text-xs text-gray-400">Flat booking fee — not per athlete</td></tr>
                      </tfoot>
                    </table>
                  ) : (
                    <>
                      {/* Duration badge */}
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Duration:</span>
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                          {(() => {
                            const d = config.durationMins ?? DEFAULT_DURATIONS[config.sessionType] ?? 60
                            const h = Math.floor(d / 60)
                            const m = d % 60
                            return h > 0 ? (m > 0 ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`) : `${m} min`
                          })()}
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Athletes</th>
                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Price / Athlete</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.tiers.map(tier => (
                            <tr key={tier.id} className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">
                                {tier.max === null
                                  ? `${tier.min}+ athletes`
                                  : tier.min === tier.max
                                  ? `${tier.min} athlete`
                                  : `${tier.min}–${tier.max} athletes`}
                              </td>
                              <td className="py-2 font-semibold text-gray-900">${(tier.pricePerAthlete ?? 0).toFixed(0)} / each</td>
                            </tr>
                          ))}
                          {config.tiers.length === 0 && (
                            <tr>
                              <td colSpan={2} className="py-4 text-center text-xs text-gray-400">No tiers — click edit to add pricing</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </>
                  )
                )}
              </div>
            )
          })}
        </div>

        {/* Add new session type card */}
        {addCardOpen ? (
          <div className="rounded-xl border border-dashed border-[#6BA3D6]/50 bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">New Session Type</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newCardLabel}
                onChange={e => setNewCardLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCard(); if (e.key === 'Escape') { setAddCardOpen(false); setNewCardLabel('') } }}
                placeholder="e.g. Skills Clinic, Private Lesson…"
                autoFocus
                className={INPUT + ' flex-1'}
              />
              <button type="button" onClick={addCard}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                Add
              </button>
              <button type="button" onClick={() => { setAddCardOpen(false); setNewCardLabel('') }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAddCardOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-4 text-sm font-semibold text-gray-400 transition hover:border-gray-400 hover:text-gray-600">
            <IconPlus size={16} /> Add Session Type
          </button>
        )}


        {/* ── Programme Catalogue ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <IconUsers size={17} style={{ color: '#D4A520' }} /> Programme Catalogue
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">Programs defined here are the source of truth for bookings and the athlete portal.</p>
            </div>
          </div>

          {(['development', 'social'] as const).map(cat => {
            const items = catalogue.filter(p => p.category === cat)
            const isOpen = cat === 'development' ? devCatOpen : socialCatOpen
            const toggle = cat === 'development' ? () => setDevCatOpen(v => !v) : () => setSocialCatOpen(v => !v)
            const catLabel = cat === 'development' ? 'Development Programs' : 'Social Programs'
            const catColor = cat === 'development' ? '#6BA3D6' : '#6BAD6B'
            const catBg    = cat === 'development' ? '#eff6ff' : '#f0fdf4'

            return (
              <div key={cat} className="mb-4 last:mb-0 rounded-xl border border-gray-100 overflow-hidden">
                {/* Category header */}
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3"
                  style={{ backgroundColor: catBg }}
                  onClick={toggle}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <IconChevronUp size={15} style={{ color: catColor }} /> : <IconChevronDown size={15} style={{ color: catColor }} />}
                    <span className="text-sm font-bold" style={{ color: catColor }}>{catLabel}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: catColor + '22', color: catColor }}>
                      {items.length}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); openAddProg(cat) }}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: catColor }}
                  >
                    <IconPlus size={12} /> Add Program
                  </button>
                </div>

                {/* Programme cards */}
                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    {items.length === 0 && (
                      <p className="px-4 py-6 text-center text-xs text-gray-400">No programs yet — click Add Program to create one.</p>
                    )}
                    {items.map(prog => (
                      <div key={prog.id} className="flex items-start gap-4 px-4 py-4">
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: prog.colourTag }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{prog.name}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: prog.enrolmentType === 'approval' ? '#fef3c7' : '#dcfce7', color: prog.enrolmentType === 'approval' ? '#92400e' : '#15803d' }}>
                              {prog.enrolmentType === 'approval' ? 'Approval Required' : 'Instant Enrolment'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{prog.description}</p>
                          <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-400">
                            <span>${prog.pricePerSession ?? 0}/session · {prog.numSessions ?? '—'} sessions → <strong className="text-gray-600">${((prog.pricePerSession ?? 0) * (prog.numSessions ?? 0)).toFixed(0)} term fee</strong></span>
                            <span>Max {prog.maxCapacity} athletes</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            onClick={() => openEditProg(prog)}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <IconPencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteProg(prog.id)}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Programme Form Modal */}
        {progModalOpen && editingProg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-bold text-gray-900">
                  {catalogue.some(p => p.id === editingProg.id) ? 'Edit Program' : 'Add Program'}
                </h3>
                <button onClick={() => { setProgModalOpen(false); setEditingProg(null) }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <IconX size={16} />
                </button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className={LABEL}>Program Name</label>
                  <input
                    className={INPUT}
                    value={editingProg.name}
                    onChange={e => setEditingProg(p => p && ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Performance Lab"
                  />
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <textarea
                    className={INPUT + ' resize-none'}
                    rows={2}
                    value={editingProg.description}
                    onChange={e => setEditingProg(p => p && ({ ...p, description: e.target.value }))}
                    placeholder="Brief description shown in athlete portal…"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={LABEL}>Price / Session</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-400">$</span>
                      <input
                        type="number" min={0} step={1}
                        className={INPUT}
                        value={editingProg.pricePerSession}
                        onChange={e => setEditingProg(p => p && ({ ...p, pricePerSession: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Sessions / Term</label>
                    <input
                      type="number" min={1} max={52}
                      className={INPUT}
                      value={editingProg.numSessions}
                      onChange={e => setEditingProg(p => p && ({ ...p, numSessions: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Max Capacity</label>
                    <input
                      type="number" min={1}
                      className={INPUT}
                      value={editingProg.maxCapacity}
                      onChange={e => setEditingProg(p => p && ({ ...p, maxCapacity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                {editingProg.numSessions > 0 && (
                  <p className="text-xs text-gray-400">
                    Term fee: <strong className="text-gray-700">${((editingProg.pricePerSession ?? 0) * (editingProg.numSessions ?? 0)).toFixed(0)}</strong> ({editingProg.numSessions} sessions × ${editingProg.pricePerSession ?? 0})
                  </p>
                )}
                <div>
                  <label className={LABEL}>Enrolment Type</label>
                  <div className="flex gap-2">
                    {(['instant', 'approval'] as const).map(et => (
                      <button
                        key={et}
                        onClick={() => setEditingProg(p => p && ({ ...p, enrolmentType: et }))}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${editingProg.enrolmentType === et ? 'border-[#6BA3D6] bg-[#6BA3D6] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                      >
                        {et === 'instant' ? 'Instant Enrolment' : 'Approval Required'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Colour Tag</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CATALOGUE_COLOURS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditingProg(p => p && ({ ...p, colourTag: c }))}
                        className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: c, outline: editingProg.colourTag === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Category</label>
                  <div className="flex gap-2">
                    {(['development', 'social'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setEditingProg(p => p && ({ ...p, category: cat }))}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition ${editingProg.category === cat ? 'border-[#6BA3D6] bg-[#6BA3D6] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  onClick={() => { setProgModalOpen(false); setEditingProg(null) }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingProg.name.trim() && saveProg(editingProg)}
                  disabled={!editingProg.name.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: ACCENT }}
                >
                  <IconCheck size={14} /> Save Program
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      </PricingConfigErrorBoundary>
    </div>
  )
}
