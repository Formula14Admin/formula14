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

type PricingRow = {
  id: string
  sessionType: string   // canonical key or 'custom'
  customLabel: string   // used when sessionType === 'custom'
  variant: string       // e.g. 'U8', 'Seniors', '' for default
  durationMins: number
  priceDisplay: string  // free text shown in the table
  priceValue: number    // numeric price for booking calculations
  notes: string
}

interface PricingSettings {
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

const DURATION_PICKER_OPTIONS = DURATION_OPTIONS.map(opt => ({ value: String(opt.value), label: opt.label }))

const SESSION_TYPE_PICKER_OPTIONS = [
  ...(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([k, v]) => ({ value: k, label: v })),
  { value: 'custom', label: 'Custom…' },
]

const INIT_SETTINGS: PricingSettings = {
  chargeNoShow: true,
  chargeExcusedAbsence: false,
}

const PRICING_CONFIGS_LS = 'f14_pricing_configs'
const PRICING_ROWS_LS    = 'f14_pricing_rows'

const INIT_ROWS: PricingRow[] = [
  { id: 'sg-1',  sessionType: 'small-group',              customLabel: '', variant: '',        durationMins: 60,  priceDisplay: '$40 / athlete', priceValue: 40, notes: 'Max 8 athletes' },
  { id: 'ind-1', sessionType: 'individual',               customLabel: '', variant: 'U8',      durationMins: 45,  priceDisplay: '$75',           priceValue: 75, notes: '' },
  { id: 'ind-2', sessionType: 'individual',               customLabel: '', variant: 'U10+',    durationMins: 60,  priceDisplay: '$75',           priceValue: 75, notes: '' },
  { id: 'tt-1',  sessionType: 'team-training',            customLabel: '', variant: '',        durationMins: 120, priceDisplay: '$80 / athlete', priceValue: 80, notes: '7–10 athletes' },
  { id: 'cs-1',  sessionType: 'casual-shooting',          customLabel: '', variant: '',        durationMins: 60,  priceDisplay: '$10 / athlete', priceValue: 10, notes: 'Max 6 athletes per ring' },
  { id: 'vs-1',  sessionType: 'volume-shooting',          customLabel: '', variant: '30 min',  durationMins: 30,  priceDisplay: '$30 flat',      priceValue: 30, notes: '' },
  { id: 'vs-2',  sessionType: 'volume-shooting',          customLabel: '', variant: '45 min',  durationMins: 45,  priceDisplay: '$40 flat',      priceValue: 40, notes: '' },
  { id: 'vs-3',  sessionType: 'volume-shooting',          customLabel: '', variant: '60 min',  durationMins: 60,  priceDisplay: '$50 flat',      priceValue: 50, notes: '' },
  { id: 'wr-1',  sessionType: 'weight-room-session',      customLabel: '', variant: '',        durationMins: 60,  priceDisplay: '$15 / session', priceValue: 15, notes: '' },
  { id: 'fr-1',  sessionType: 'film-room-session',        customLabel: '', variant: '',        durationMins: 60,  priceDisplay: '$20 / session', priceValue: 20, notes: '' },
  { id: 'sm-1',  sessionType: 'shooting-machine-session', customLabel: '', variant: '30 min',  durationMins: 30,  priceDisplay: '$30 flat',      priceValue: 30, notes: 'Max 4 athletes' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function blankRow(): PricingRow {
  return { id: uid(), sessionType: 'individual', customLabel: '', variant: '', durationMins: 60, priceDisplay: '', priceValue: 0, notes: '' }
}

function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h} hr ${m} min`
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`
  return `${m} min`
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

  // ── Pricing rows (new flexible table) ────────────────────────────────────────
  const [pricingRows,   setPricingRows]   = useState<PricingRow[]>(INIT_ROWS)
  const [editingRowId,  setEditingRowId]  = useState<string | null>(null)
  const [editRow,       setEditRow]       = useState<PricingRow | null>(null)
  const [addingRow,     setAddingRow]     = useState(false)
  const [newRow,        setNewRow]        = useState<PricingRow>(() => blankRow())
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

  // Load pricing rows from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(PRICING_ROWS_LS)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PricingRow[]
      if (Array.isArray(parsed) && parsed.length > 0) setPricingRows(parsed)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist pricing rows to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(PRICING_ROWS_LS, JSON.stringify(pricingRows))
  }, [pricingRows])

  function startEditRow(row: PricingRow) {
    setEditRow({ ...row })
    setEditingRowId(row.id)
    setAddingRow(false)
  }

  function saveEditRow() {
    if (!editRow) return
    setPricingRows(prev => prev.map(r => r.id === editRow.id ? editRow : r))
    setEditingRowId(null)
    setEditRow(null)
  }

  function cancelEditRow() {
    setEditingRowId(null)
    setEditRow(null)
  }

  function deleteRow(id: string) {
    setPricingRows(prev => prev.filter(r => r.id !== id))
    if (editingRowId === id) { setEditingRowId(null); setEditRow(null) }
  }

  function saveNewRow() {
    if (!newRow.priceDisplay.trim() && newRow.priceValue === 0) return
    setPricingRows(prev => [...prev, { ...newRow, id: uid() }])
    setAddingRow(false)
    setNewRow(blankRow())
  }

  function rowLabel(row: PricingRow): string {
    if (row.sessionType === 'custom') return row.customLabel || 'Custom'
    return (SESSION_TYPE_LABELS as Record<string, string>)[row.sessionType] ?? row.sessionType
  }

  function rowColor(row: PricingRow): { bg: string; color: string } {
    return (SESSION_TYPE_COLORS as Record<string, { bg: string; color: string }>)[row.sessionType] ?? { bg: '#f3f4f6', color: '#6b7280' }
  }

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
        <p className="text-sm text-gray-500 mt-0.5">Configure session pricing tiers and the programme catalogue</p>
      </div>

      <PricingConfigErrorBoundary>
      <div className="space-y-6">

        {/* Global settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <IconSettings size={17} style={{ color: ACCENT }} /> Global Settings
          </h2>
          <div className="grid grid-cols-2 gap-6">
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

        {/* ── Pricing Structure — editable table ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <IconChartBar size={17} style={{ color: ACCENT }} /> Pricing Structure
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Each row is a session variant. Edit inline — duration, price, and notes are fully customisable.
              </p>
            </div>
            <button
              onClick={() => { setAddingRow(true); setEditingRowId(null); setNewRow(blankRow()) }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              <IconPlus size={13} /> Add Row
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Session Type</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Variant / Age Group</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Duration</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Price</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">Notes</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pricingRows.map(row => {
                  const isEditing = editingRowId === row.id
                  const rc = rowColor(row)
                  if (isEditing && editRow) {
                    return (
                      <tr key={row.id} className="bg-[#6BA3D6]/5">
                        {/* Session Type */}
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-1">
                            <SelectPicker
                              value={editRow.sessionType}
                              onChange={v => setEditRow(r => r && ({ ...r, sessionType: v, customLabel: v === 'custom' ? r.customLabel : '' }))}
                              options={SESSION_TYPE_PICKER_OPTIONS}
                            />
                            {editRow.sessionType === 'custom' && (
                              <input
                                value={editRow.customLabel}
                                onChange={e => setEditRow(r => r && ({ ...r, customLabel: e.target.value }))}
                                placeholder="Custom label"
                                className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                              />
                            )}
                          </div>
                        </td>
                        {/* Variant */}
                        <td className="px-3 py-2">
                          <input
                            value={editRow.variant}
                            onChange={e => setEditRow(r => r && ({ ...r, variant: e.target.value }))}
                            placeholder="e.g. U8, Seniors, All Ages"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                          />
                        </td>
                        {/* Duration */}
                        <td className="px-3 py-2">
                          <SelectPicker
                            value={String(editRow.durationMins)}
                            onChange={v => setEditRow(r => r && ({ ...r, durationMins: parseInt(v) }))}
                            options={DURATION_PICKER_OPTIONS}
                          />
                        </td>
                        {/* Price display */}
                        <td className="px-3 py-2">
                          <input
                            value={editRow.priceDisplay}
                            onChange={e => setEditRow(r => r && ({ ...r, priceDisplay: e.target.value }))}
                            placeholder="e.g. $40 / athlete, $75 flat"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                          />
                        </td>
                        {/* Notes */}
                        <td className="px-3 py-2">
                          <input
                            value={editRow.notes}
                            onChange={e => setEditRow(r => r && ({ ...r, notes: e.target.value }))}
                            placeholder="e.g. Max 8 athletes"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                          />
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={cancelEditRow}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                              <IconX size={13} />
                            </button>
                            <button onClick={saveEditRow}
                              className="rounded p-1 text-[#6BA3D6] hover:bg-[#6BA3D6]/10">
                              <IconCheck size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={row.id} className="group hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: rc.bg, color: rc.color }}>
                          {rowLabel(row)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700">{row.variant || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDur(row.durationMins)}</td>
                      <td className="px-3 py-3">
                        {row.priceDisplay
                          ? <span className="font-semibold text-gray-900">{row.priceDisplay}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{row.notes || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditRow(row)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                            <IconPencil size={13} />
                          </button>
                          <button onClick={() => deleteRow(row.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* New row form */}
                {addingRow && (
                  <tr className="bg-[#6BA3D6]/5">
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <SelectPicker
                          value={newRow.sessionType}
                          onChange={v => setNewRow(r => ({ ...r, sessionType: v, customLabel: v === 'custom' ? r.customLabel : '' }))}
                          options={SESSION_TYPE_PICKER_OPTIONS}
                        />
                        {newRow.sessionType === 'custom' && (
                          <input
                            value={newRow.customLabel}
                            onChange={e => setNewRow(r => ({ ...r, customLabel: e.target.value }))}
                            placeholder="Custom label"
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newRow.variant}
                        onChange={e => setNewRow(r => ({ ...r, variant: e.target.value }))}
                        placeholder="e.g. U8, Seniors"
                        autoFocus
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SelectPicker
                        value={String(newRow.durationMins)}
                        onChange={v => setNewRow(r => ({ ...r, durationMins: parseInt(v) }))}
                        options={DURATION_PICKER_OPTIONS}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newRow.priceDisplay}
                        onChange={e => setNewRow(r => ({ ...r, priceDisplay: e.target.value }))}
                        placeholder="e.g. $40 / athlete"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newRow.notes}
                        onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))}
                        placeholder="e.g. Max 6 athletes"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#6BA3D6]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setAddingRow(false); setNewRow(blankRow()) }}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                          <IconX size={13} />
                        </button>
                        <button onClick={saveNewRow}
                          className="rounded p-1 text-[#6BA3D6] hover:bg-[#6BA3D6]/10">
                          <IconCheck size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {pricingRows.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                      No pricing rows yet — click Add Row to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


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
