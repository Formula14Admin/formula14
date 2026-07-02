'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  IconBrandInstagram, IconBrandFacebook, IconBrandTiktok,
  IconPlus, IconChevronLeft, IconChevronRight,
  IconX, IconPencil, IconTrash, IconBulb,
  IconList, IconCalendar, IconCheck,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

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

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialMediaPage() {
  const [tab, setTab] = useState<'social' | 'advertising'>('social')

  // ── Social state ──────────────────────────────────────────────────────────
  const [posts,        setPosts]       = useState<SocialPost[]>(() => {
    if (typeof window === 'undefined') return []
    try { const r = localStorage.getItem('f14_social_posts'); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [viewMode,     setViewMode]    = useState<'calendar' | 'list'>('calendar')
  const [calYear,      setCalYear]     = useState(2026)
  const [calMonth,     setCalMonth]    = useState(5) // June 0-indexed
  const [postModal,    setPostModal]   = useState<{ post: SocialPost | null; date?: string } | null>(null)

  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('f14_social_posts', JSON.stringify(posts)) }, [posts])

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
        {(['social', 'advertising'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            style={tab === t ? { backgroundColor: ACCENT } : {}}>
            {t === 'social' ? 'Social Media' : 'Advertising'}
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
    </div>
  )
}
