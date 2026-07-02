'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconBrandInstagram, IconBrandFacebook, IconBrandTiktok,
  IconPlus, IconChevronLeft, IconChevronRight,
  IconX, IconPencil, IconTrash, IconBulb,
  IconList, IconCalendar, IconCheck,
  IconBuilding, IconUser, IconPhone, IconMail,
  IconCurrencyDollar, IconFileUpload, IconAlertTriangle,
  IconArrowRight, IconSpeakerphone,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'facebook' | 'tiktok'
type PostStatus = 'idea' | 'scheduled' | 'posted'
type PostType = 'reel' | 'story' | 'feed' | 'carousel'

interface SocialPost {
  id: string
  platforms: Platform[]
  date: string | null
  time: string | null
  title: string
  caption: string
  postType: PostType
  status: PostStatus
  notes: string
}

interface Sponsor {
  id: string
  businessName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  startDate: string
  renewalDate: string
  value: number
  notes: string
  tierId: string
}

interface SponsorTier {
  id: string
  label: string
  packageDetails: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'
const TODAY = '2026-06-23'

const PLATFORMS: Record<Platform, { label: string; color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#fce7f3', Icon: IconBrandInstagram },
  facebook:  { label: 'Facebook',  color: '#1877F2', bg: '#dbeafe', Icon: IconBrandFacebook },
  tiktok:    { label: 'TikTok',    color: '#111111', bg: '#f3f4f6', Icon: IconBrandTiktok },
}

const STATUS_CONFIG: Record<PostStatus, { label: string; bg: string; color: string }> = {
  idea:      { label: 'Idea',      bg: '#ede9fe', color: '#7c3aed' },
  scheduled: { label: 'Scheduled', bg: '#dbeafe', color: '#1d4ed8' },
  posted:    { label: 'Posted',    bg: '#dcfce7', color: '#15803d' },
}

const POST_TYPES: PostType[] = ['feed', 'reel', 'story', 'carousel']

const TIER_COLORS: Record<string, { bg: string; color: string; ring: string }> = {
  platinum: { bg: '#f1f5f9', color: '#475569', ring: '#94a3b8' },
  gold:     { bg: '#fef9c3', color: '#854d0e', ring: '#f59e0b' },
  silver:   { bg: '#f3f4f6', color: '#374151', ring: '#9ca3af' },
  bronze:   { bg: '#fff7ed', color: '#9a3412', ring: '#fb923c' },
}

function tierColor(id: string) {
  return TIER_COLORS[id] ?? { bg: '#f0f9ff', color: '#0369a1', ring: '#38bdf8' }
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  const h12 = h % 12 || 12
  const ampm = h < 12 ? 'am' : 'pm'
  return { value: `${String(h).padStart(2, '0')}:${m}`, label: `${h12}:${m}${ampm}` }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return TIME_OPTIONS.find(o => o.value === t)?.label ?? t
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }  // 0=Sun

function padDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

function PostModal({
  post, initialDate, onSave, onClose, onDelete,
}: {
  post: SocialPost | null
  initialDate?: string
  onSave: (p: Omit<SocialPost, 'id'> & { id?: string }) => void
  onClose: () => void
  onDelete?: () => void
}) {
  const [platforms, setPlatforms] = useState<Platform[]>(post?.platforms ?? ['instagram'])
  const [date,      setDate]      = useState(post?.date ?? initialDate ?? '')
  const [time,      setTime]      = useState(post?.time ?? '09:00')
  const [title,     setTitle]     = useState(post?.title ?? '')
  const [caption,   setCaption]   = useState(post?.caption ?? '')
  const [postType,  setPostType]  = useState<PostType>(post?.postType ?? 'feed')
  const [status,    setStatus]    = useState<PostStatus>(post?.status ?? 'idea')
  const [notes,     setNotes]     = useState(post?.notes ?? '')

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function save() {
    if (!title.trim() || platforms.length === 0) return
    onSave({ id: post?.id, platforms, date: date || null, time: date ? time : null, title: title.trim(), caption, postType, status, notes })
  }

  const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{post ? 'Edit Post' : 'New Post'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Platforms */}
          <div>
            <label className={LABEL}>Platform</label>
            <div className="flex gap-2">
              {(Object.entries(PLATFORMS) as [Platform, typeof PLATFORMS[Platform]][]).map(([key, cfg]) => {
                const selected = platforms.includes(key)
                return (
                  <button key={key} type="button" onClick={() => togglePlatform(key)}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition"
                    style={selected ? { backgroundColor: cfg.bg, borderColor: cfg.color, color: cfg.color } : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#6b7280' }}>
                    <cfg.Icon size={15} />{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date (optional)</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Time</label>
              <select value={time} onChange={e => setTime(e.target.value)} disabled={!date}
                className={INPUT + ' cursor-pointer disabled:opacity-40'}>
                {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={LABEL}>Post Title <span className="text-red-400 normal-case font-normal">(internal label)</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Tuesday Highlights Reel" className={INPUT} />
          </div>

          {/* Caption */}
          <div>
            <label className={LABEL}>Caption / Content</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
              placeholder="Write your post caption here..." className={INPUT + ' resize-none'} />
          </div>

          {/* Post Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Post Type</label>
              <select value={postType} onChange={e => setPostType(e.target.value as PostType)} className={INPUT + ' cursor-pointer'}>
                {POST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as PostStatus)} className={INPUT + ' cursor-pointer'}>
                <option value="idea">Idea</option>
                <option value="scheduled">Scheduled</option>
                <option value="posted">Posted</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any additional notes about this post..." className={INPUT + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {onDelete && (
                <button type="button" onClick={onDelete}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">
                  <IconTrash size={14} /> Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={save}
                disabled={!title.trim() || platforms.length === 0}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}>
                {post ? 'Save Changes' : 'Add Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sponsor Modal ────────────────────────────────────────────────────────────

function emptySponsor(tierId: string): Omit<Sponsor, 'id'> {
  return { tierId, businessName: '', contactName: '', contactEmail: '', contactPhone: '', startDate: '', renewalDate: '', value: 0, notes: '' }
}

function SponsorModal({
  sponsor, tiers, onSave, onClose,
}: {
  sponsor: Sponsor | null
  tiers: SponsorTier[]
  onSave: (s: Omit<Sponsor, 'id'> & { id?: string }) => void
  onClose: () => void
}) {
  const [tierId,       setTierId]       = useState(sponsor?.tierId ?? tiers[0]?.id ?? '')
  const [businessName, setBusinessName] = useState(sponsor?.businessName ?? '')
  const [contactName,  setContactName]  = useState(sponsor?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(sponsor?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(sponsor?.contactPhone ?? '')
  const [startDate,    setStartDate]    = useState(sponsor?.startDate ?? '')
  const [renewalDate,  setRenewalDate]  = useState(sponsor?.renewalDate ?? '')
  const [value,        setValue]        = useState(String(sponsor?.value ?? ''))
  const [notes,        setNotes]        = useState(sponsor?.notes ?? '')

  function save() {
    if (!businessName.trim()) return
    onSave({ id: sponsor?.id, tierId, businessName: businessName.trim(), contactName: contactName.trim(), contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim(), startDate, renewalDate, value: parseFloat(value) || 0, notes: notes.trim() })
  }

  const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{sponsor ? 'Edit Sponsor' : 'Add Sponsor'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Tier */}
          <div>
            <label className={LABEL}>Sponsorship Tier</label>
            <select value={tierId} onChange={e => setTierId(e.target.value)} className={INPUT + ' cursor-pointer'}>
              {tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* Business + Contact */}
          <div>
            <label className={LABEL}>Business Name <span className="text-red-400">*</span></label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Elite Sports Medicine" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contact Name</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contact Phone</label>
              <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="04XX XXX XXX" className={INPUT} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Contact Email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@business.com.au" className={INPUT} />
          </div>

          {/* Dates + Value */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Renewal Date</label>
              <input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Value ($/yr)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input type="number" min={0} value={value} onChange={e => setValue(e.target.value)}
                  placeholder="0" className={INPUT + ' pl-6'} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any notes about this sponsor or agreement..." className={INPUT + ' resize-none'} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={!businessName.trim()}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}>
              {sponsor ? 'Save Changes' : 'Add Sponsor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialMediaPage() {
  const [tab, setTab] = useState<'social' | 'advertising' | 'sponsorships'>('social')

  // ── Social state ──────────────────────────────────────────────────────────
  const [posts,        setPosts]       = useState<SocialPost[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_social_posts'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [viewMode,     setViewMode]    = useState<'calendar' | 'list'>('calendar')
  const [calYear,      setCalYear]     = useState(2026)
  const [calMonth,     setCalMonth]    = useState(5) // June 0-indexed
  const [postModal,    setPostModal]   = useState<{ post: SocialPost | null; date?: string } | null>(null)

  // ── Sponsorship state ─────────────────────────────────────────────────────
  const [tiers,          setTiers]         = useState<SponsorTier[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_sponsor_tiers'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [sponsors,       setSponsors]      = useState<Sponsor[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_sponsors'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [activeTier,     setActiveTier]    = useState('platinum')
  const [editingPkg,     setEditingPkg]    = useState<string | null>(null)
  const [pkgDraft,       setPkgDraft]      = useState('')
  const [sponsorModal,   setSponsorModal]  = useState<{ sponsor: Sponsor | null; tierId: string } | null>(null)
  const [editingTierId,  setEditingTierId] = useState<string | null>(null)
  const [tierLabelDraft, setTierLabelDraft] = useState('')
  const [addingTier,     setAddingTier]    = useState(false)
  const [newTierLabel,   setNewTierLabel]  = useState('')
  const [confirmDeleteTier, setConfirmDeleteTier] = useState<string | null>(null)
  const [uploadNotice,   setUploadNotice]  = useState(false)

  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('f14_social_posts', JSON.stringify(posts)) }, [posts])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('f14_sponsor_tiers', JSON.stringify(tiers)) }, [tiers])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('f14_sponsors', JSON.stringify(sponsors)) }, [sponsors])

  // ── Calendar derived state ─────────────────────────────────────────────────
  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {}
    posts.forEach(p => {
      if (p.date) {
        if (!map[p.date]) map[p.date] = []
        map[p.date].push(p)
      }
    })
    return map
  }, [posts])

  const postIdeas = useMemo(() => posts.filter(p => p.date === null), [posts])

  const scheduledPosts = useMemo(() =>
    posts.filter(p => p.date !== null).sort((a, b) => (a.date! > b.date! ? 1 : -1))
  , [posts])

  // ── Calendar navigation ───────────────────────────────────────────────────
  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }
  function goToToday() { setCalYear(2026); setCalMonth(5) }

  // ── Post handlers ─────────────────────────────────────────────────────────
  function savePost(p: Omit<SocialPost, 'id'> & { id?: string }) {
    if (p.id) {
      setPosts(prev => prev.map(x => x.id === p.id ? { ...x, ...p, id: x.id } : x))
    } else {
      setPosts(prev => [...prev, { ...p, id: uid() }])
    }
    setPostModal(null)
  }

  function deletePost(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id))
    setPostModal(null)
  }

  // ── Sponsor handlers ──────────────────────────────────────────────────────
  function saveSponsor(s: Omit<Sponsor, 'id'> & { id?: string }) {
    if (s.id) {
      setSponsors(prev => prev.map(x => x.id === s.id ? { ...x, ...s, id: x.id } : x))
    } else {
      setSponsors(prev => [...prev, { ...s, id: uid() }])
    }
    setSponsorModal(null)
  }

  function deleteSponsor(id: string) {
    setSponsors(prev => prev.filter(s => s.id !== id))
  }

  function moveSponsor(id: string, newTierId: string) {
    setSponsors(prev => prev.map(s => s.id === id ? { ...s, tierId: newTierId } : s))
  }

  // ── Tier handlers ─────────────────────────────────────────────────────────
  function savePkg(tierId: string) {
    setTiers(prev => prev.map(t => t.id === tierId ? { ...t, packageDetails: pkgDraft } : t))
    setEditingPkg(null)
  }

  function startEditTierLabel(t: SponsorTier) {
    setEditingTierId(t.id)
    setTierLabelDraft(t.label)
  }

  function saveTierLabel() {
    if (tierLabelDraft.trim()) {
      setTiers(prev => prev.map(t => t.id === editingTierId ? { ...t, label: tierLabelDraft.trim() } : t))
    }
    setEditingTierId(null)
  }

  function addTier() {
    const label = newTierLabel.trim()
    if (!label) return
    const id = uid()
    setTiers(prev => [...prev, { id, label, packageDetails: '' }])
    setActiveTier(id)
    setNewTierLabel('')
    setAddingTier(false)
  }

  function deleteTier(id: string) {
    setTiers(prev => prev.filter(t => t.id !== id))
    setSponsors(prev => prev.filter(s => s.tierId !== id))
    if (activeTier === id) setActiveTier(tiers.find(t => t.id !== id)?.id ?? '')
    setConfirmDeleteTier(null)
  }

  // ─── Current tier ─────────────────────────────────────────────────────────
  const currentTier  = tiers.find(t => t.id === activeTier)
  const tierSponsors = sponsors.filter(s => s.tierId === activeTier)
  const tc = tierColor(activeTier)

  // ─── Calendar grid ─────────────────────────────────────────────────────────
  const daysInMonth  = getDaysInMonth(calYear, calMonth)
  const firstDaySun  = getFirstDay(calYear, calMonth)
  const offset       = (firstDaySun + 6) % 7 // Mon=0…Sun=6
  const totalCells   = Math.ceil((offset + daysInMonth) / 7) * 7

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Social Media &amp; Advertising</h1>
        <p className="mt-0.5 text-sm text-gray-500">Content planning, advertising campaigns and sponsorship management</p>
      </div>

      {/* Main tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {(['social', 'advertising', 'sponsorships'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={tab === t ? { backgroundColor: ACCENT } : {}}>
            {t === 'social' ? 'Social Media' : t === 'advertising' ? 'Advertising' : 'Sponsorships'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SOCIAL MEDIA TAB
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'social' && (
        <div className="space-y-6">

          {/* Controls bar */}
          <div className="flex items-center justify-between">
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button onClick={prevMonth}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-800">
                <IconChevronLeft size={16} />
              </button>
              <span className="w-36 text-center text-sm font-semibold text-gray-800">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-800">
                <IconChevronRight size={16} />
              </button>
              <button onClick={goToToday}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-300 hover:text-gray-800">
                Today
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white">
                <button onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${viewMode === 'calendar' ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  style={viewMode === 'calendar' ? { backgroundColor: ACCENT } : {}}>
                  <IconCalendar size={14} /> Calendar
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 border-l border-gray-200 px-3 py-2 text-sm font-medium transition ${viewMode === 'list' ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                  style={viewMode === 'list' ? { backgroundColor: ACCENT } : {}}>
                  <IconList size={14} /> List
                </button>
              </div>
              <button onClick={() => setPostModal({ post: null })}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                <IconPlus size={15} /> New Post
              </button>
            </div>
          </div>

          {/* ── Empty state ── */}
          {posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              <p className="text-sm font-semibold text-gray-400">No posts yet</p>
              <p className="mt-1 text-xs text-gray-400">Create your first post idea or draft</p>
            </div>
          )}

          {/* ── Calendar view ── */}
          {posts.length > 0 && viewMode === 'calendar' && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {DAY_HEADERS.map(d => (
                  <div key={d} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - offset + 1
                  const isInMonth = dayNum >= 1 && dayNum <= daysInMonth
                  if (!isInMonth) {
                    return <div key={i} className="min-h-[90px] border-b border-r border-gray-100 bg-gray-50/50 last:border-r-0" />
                  }
                  const dateStr = padDate(calYear, calMonth, dayNum)
                  const dayPosts = postsByDate[dateStr] ?? []
                  const isToday = dateStr === TODAY
                  const isLastRow = Math.floor(i / 7) === Math.floor(totalCells / 7) - 1

                  return (
                    <div key={i}
                      className={`min-h-[90px] cursor-pointer border-b border-r border-gray-100 p-1.5 transition hover:bg-blue-50/30 ${isLastRow ? 'border-b-0' : ''} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}
                      onClick={() => setPostModal({ post: null, date: dateStr })}>
                      {/* Day number */}
                      <div className="mb-1 flex justify-end">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-500'}`}
                          style={isToday ? { backgroundColor: ACCENT } : {}}>
                          {dayNum}
                        </span>
                      </div>

                      {/* Posts */}
                      <div className="space-y-0.5">
                        {dayPosts.slice(0, 2).map(post => {
                          const sc = STATUS_CONFIG[post.status]
                          return (
                            <div key={post.id}
                              className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium hover:opacity-80"
                              style={{ backgroundColor: sc.bg, color: sc.color }}
                              onClick={e => { e.stopPropagation(); setPostModal({ post }) }}>
                              <div className="flex shrink-0 items-center gap-0.5">
                                {post.platforms.map(pl => {
                                  const cfg = PLATFORMS[pl]
                                  return <cfg.Icon key={pl} size={9} />
                                })}
                              </div>
                              <span className="truncate">{post.title}</span>
                            </div>
                          )
                        })}
                        {dayPosts.length > 2 && (
                          <span className="block pl-1 text-[10px] font-medium text-gray-400">
                            +{dayPosts.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── List view ── */}
          {posts.length > 0 && viewMode === 'list' && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {scheduledPosts.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-400">No scheduled posts yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {scheduledPosts.map(post => {
                    const sc = STATUS_CONFIG[post.status]
                    return (
                      <div key={post.id}
                        className="flex cursor-pointer items-start gap-4 px-5 py-3.5 transition hover:bg-gray-50"
                        onClick={() => setPostModal({ post })}>
                        {/* Date */}
                        <div className="w-24 shrink-0 text-right">
                          <p className="text-xs font-semibold text-gray-700">{fmtDate(post.date!)}</p>
                          <p className="text-xs text-gray-400">{fmtTime(post.time)}</p>
                        </div>
                        {/* Platform icons */}
                        <div className="flex shrink-0 items-center gap-1 pt-0.5">
                          {post.platforms.map(pl => {
                            const cfg = PLATFORMS[pl]
                            return (
                              <span key={pl} className="flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                <cfg.Icon size={11} />
                              </span>
                            )
                          })}
                        </div>
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{post.title}</p>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: sc.bg, color: sc.color }}>
                              {sc.label}
                            </span>
                            <span className="text-[10px] text-gray-400 capitalize">{post.postType}</span>
                          </div>
                          {post.caption && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">{post.caption}</p>
                          )}
                        </div>
                        <IconChevronRight size={14} className="shrink-0 text-gray-300 mt-1" />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Post Ideas ── */}
          {posts.length > 0 && <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconBulb size={16} className="text-amber-500" />
                <h2 className="text-base font-semibold text-gray-800">Post Ideas</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                  {postIdeas.length}
                </span>
              </div>
              <button onClick={() => setPostModal({ post: null })}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                <IconPlus size={13} /> Add Idea
              </button>
            </div>

            {postIdeas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white py-8 text-center text-sm text-gray-400">
                No post ideas yet. Click <strong>+ Add Idea</strong> to capture inspiration.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {postIdeas.map(post => {
                  const sc = STATUS_CONFIG[post.status]
                  return (
                    <div key={post.id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#6BA3D6]/40 hover:shadow-sm"
                      onClick={() => setPostModal({ post })}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {post.platforms.map(pl => {
                            const cfg = PLATFORMS[pl]
                            return (
                              <span key={pl} className="flex h-5 w-5 items-center justify-center rounded-full"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                <cfg.Icon size={11} />
                              </span>
                            )
                          })}
                        </div>
                        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{post.title}</p>
                      {post.caption && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{post.caption}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] capitalize text-gray-400">{post.postType}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setPostModal({ post }) }}
                          className="flex items-center gap-1 text-[10px] font-semibold transition"
                          style={{ color: ACCENT }}>
                          Schedule <IconArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADVERTISING TAB
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'advertising' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <IconSpeakerphone size={18} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>Advertising integrations and campaign management will be configured here</p>
              <p className="mt-0.5 text-xs text-blue-600">Connect your Meta Ads, Google Ads and TikTok Ads accounts to manage campaigns directly from this dashboard.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Active Campaigns */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <IconSpeakerphone size={26} style={{ color: ACCENT }} />
              </div>
              <p className="text-base font-bold text-gray-800">Active Campaigns</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                View and manage your live advertising campaigns across Meta, Google and TikTok in one place.
              </p>
              <span className="mt-4 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-400">
                Coming Soon
              </span>
            </div>

            {/* Ad Performance */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <IconSpeakerphone size={26} style={{ color: ACCENT }} />
              </div>
              <p className="text-base font-bold text-gray-800">Ad Performance</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Track impressions, clicks, conversions and spend across all your advertising campaigns with unified analytics.
              </p>
              <span className="mt-4 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-400">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SPONSORSHIPS TAB
          ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'sponsorships' && (
        <div className="space-y-5">

          {/* Tier sub-tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {tiers.map(t => {
              const c = tierColor(t.id)
              const isActive = activeTier === t.id
              return (
                <div key={t.id} className="group relative flex items-center">
                  {editingTierId === t.id ? (
                    <div className="flex items-center gap-1 rounded-lg border border-[#6BA3D6] bg-white px-2 py-1.5 shadow-sm">
                      <input
                        autoFocus
                        value={tierLabelDraft}
                        onChange={e => setTierLabelDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTierLabel(); if (e.key === 'Escape') setEditingTierId(null) }}
                        className="w-24 text-sm font-semibold text-gray-800 outline-none"
                      />
                      <button onClick={saveTierLabel} className="text-green-500 hover:text-green-700"><IconCheck size={14} /></button>
                      <button onClick={() => setEditingTierId(null)} className="text-gray-400 hover:text-gray-600"><IconX size={14} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTier(t.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition"
                      style={isActive
                        ? { backgroundColor: c.bg, color: c.color, boxShadow: `0 0 0 2px ${c.ring}` }
                        : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                      {t.label}
                      <span className="ml-0.5 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold">
                        {sponsors.filter(s => s.tierId === t.id).length}
                      </span>
                    </button>
                  )}
                  {/* Rename button (hover) */}
                  {editingTierId !== t.id && (
                    <button
                      onClick={() => startEditTierLabel(t)}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-white p-0.5 text-gray-400 shadow-sm hover:text-gray-700 group-hover:flex border border-gray-200">
                      <IconPencil size={10} />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Add Tier */}
            {addingTier ? (
              <div className="flex items-center gap-1 rounded-lg border border-[#6BA3D6] bg-white px-2 py-1.5 shadow-sm">
                <input autoFocus value={newTierLabel} onChange={e => setNewTierLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTier(); if (e.key === 'Escape') { setAddingTier(false); setNewTierLabel('') } }}
                  placeholder="Tier name..." className="w-24 text-sm font-semibold text-gray-800 outline-none placeholder:font-normal placeholder:text-gray-400" />
                <button onClick={addTier} className="text-green-500 hover:text-green-700"><IconCheck size={14} /></button>
                <button onClick={() => { setAddingTier(false); setNewTierLabel('') }} className="text-gray-400 hover:text-gray-600"><IconX size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setAddingTier(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-400 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                <IconPlus size={13} /> Add Tier
              </button>
            )}
          </div>

          {currentTier ? (
            <div className="space-y-4">

              {/* Tier header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-800">{currentTier.label} Sponsorship</h2>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: tc.bg, color: tc.color }}>
                    {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => { setConfirmDeleteTier(activeTier) }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50">
                  <IconTrash size={13} /> Delete Tier
                </button>
              </div>

              {/* Confirm delete tier */}
              {confirmDeleteTier === activeTier && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm text-red-700">
                    <IconAlertTriangle size={16} />
                    <span>Delete <strong>{currentTier.label}</strong> tier? All {tierSponsors.length} sponsor{tierSponsors.length !== 1 ? 's' : ''} in this tier will also be removed.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDeleteTier(null)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-white">
                      Cancel
                    </button>
                    <button onClick={() => deleteTier(activeTier)}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Package Overview */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Sponsorship Package Overview</h3>
                  {editingPkg === activeTier ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingPkg(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={() => savePkg(activeTier)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        style={{ backgroundColor: ACCENT }}>
                        <IconCheck size={12} /> Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUploadNotice(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
                        <IconFileUpload size={13} /> Upload PDF
                      </button>
                      <button
                        onClick={() => { setEditingPkg(activeTier); setPkgDraft(currentTier.packageDetails) }}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                        <IconPencil size={13} /> Edit Package Details
                      </button>
                    </div>
                  )}
                </div>

                {editingPkg === activeTier ? (
                  <textarea
                    value={pkgDraft}
                    onChange={e => setPkgDraft(e.target.value)}
                    rows={12}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#6BA3D6] focus:ring-1 focus:ring-[#6BA3D6]/30 resize-y font-mono"
                  />
                ) : currentTier.packageDetails ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                    {currentTier.packageDetails}
                  </pre>
                ) : (
                  <p className="text-sm italic text-gray-400">No package details yet. Click <strong>Edit Package Details</strong> to add what this tier includes.</p>
                )}

                {/* Upload notice */}
                {uploadNotice && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <IconAlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-800">File uploads require backend storage</p>
                      <p className="mt-0.5 text-xs text-amber-700">PDF sponsorship package document upload will be available once connected to cloud storage (e.g. AWS S3 or Supabase Storage).</p>
                    </div>
                    <button onClick={() => setUploadNotice(false)} className="text-amber-500 hover:text-amber-700">
                      <IconX size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Sponsors List */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Current Sponsors</h3>
                  <button
                    onClick={() => setSponsorModal({ sponsor: null, tierId: activeTier })}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}>
                    <IconPlus size={13} /> Add Sponsor
                  </button>
                </div>

                {tierSponsors.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                    No sponsors in this tier yet. Click <strong>Add Sponsor</strong> to add one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 900 }}>
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
                                  <p className="font-semibold text-gray-800">{sp.businessName}</p>
                                  {sp.notes && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{sp.notes}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <IconUser size={12} className="shrink-0 text-gray-400" />
                                {sp.contactName || '—'}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <IconMail size={12} className="shrink-0 text-gray-400" />
                                <span className="text-xs">{sp.contactEmail || '—'}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <IconPhone size={12} className="shrink-0 text-gray-400" />
                                {sp.contactPhone || '—'}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-xs text-gray-600">{sp.startDate ? fmtDate(sp.startDate) : '—'}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs ${sp.renewalDate && sp.renewalDate <= TODAY ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                                {sp.renewalDate ? fmtDate(sp.renewalDate) : '—'}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                                <IconCurrencyDollar size={13} className="text-gray-400" />
                                {sp.value > 0 ? sp.value.toLocaleString() : '—'}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSponsorModal({ sponsor: sp, tierId: sp.tierId })}
                                  className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                                  <IconPencil size={13} />
                                </button>
                                {/* Move to tier */}
                                {tiers.length > 1 && (
                                  <select
                                    value={sp.tierId}
                                    onChange={e => moveSponsor(sp.id, e.target.value)}
                                    title="Move to tier"
                                    className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-gray-500 outline-none hover:border-gray-300">
                                    {tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                  </select>
                                )}
                                <button
                                  onClick={() => deleteSponsor(sp.id)}
                                  className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500">
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
                            <div className="flex items-center gap-1 text-sm font-bold text-gray-800">
                              <IconCurrencyDollar size={13} className="text-gray-400" />
                              {tierSponsors.reduce((sum, s) => sum + s.value, 0).toLocaleString()}/yr
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
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
              No tiers yet. Click <strong>+ Add Tier</strong> above to create your first sponsorship tier.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {postModal && (
        <PostModal
          post={postModal.post}
          initialDate={postModal.date}
          onSave={savePost}
          onClose={() => setPostModal(null)}
          onDelete={postModal.post ? () => deletePost(postModal.post!.id) : undefined}
        />
      )}
      {sponsorModal && (
        <SponsorModal
          sponsor={sponsorModal.sponsor}
          tiers={tiers}
          onSave={saveSponsor}
          onClose={() => setSponsorModal(null)}
        />
      )}
    </div>
  )
}
