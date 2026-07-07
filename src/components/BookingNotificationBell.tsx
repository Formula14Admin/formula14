'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CANONICAL_SESSION_TYPES } from '@/lib/sessionTypes'
import { IconBell, IconCheck, IconX, IconLoader2 } from '@tabler/icons-react'

interface NotifMeta {
  booking_id:  string
  session_type: string   // canonical ID e.g. 'individual'
  date:        string
  start_mins:  number
}

interface NotifItem {
  id:         string
  body:       string
  meta:       NotifMeta
  created_at: string
  busy?:      boolean
}

function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60), m = mins % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

async function resolvePrice(sessionTypeId: string): Promise<number> {
  // Try session_types table
  const { data: stRow } = await supabase
    .from('session_types')
    .select('tiers')
    .eq('session_type_id', sessionTypeId)
    .maybeSingle()
  const tiers = (stRow?.tiers ?? []) as { min: number; pricePerAthlete: number }[]
  if (tiers.length > 0 && tiers[0].pricePerAthlete > 0) return tiers[0].pricePerAthlete

  // Fallback: booking_session_settings.meta.priceDisplay (e.g. "$35" or "$35/session")
  const { data: bss } = await supabase
    .from('booking_session_settings')
    .select('meta')
    .eq('id', 'singleton')
    .maybeSingle()
  const meta = (bss?.meta ?? {}) as Record<string, { priceDisplay?: string }>
  const display = meta[sessionTypeId]?.priceDisplay ?? ''
  const match = display.match(/\d+(\.\d+)?/)
  return match ? parseFloat(match[0]) : 0
}

export default function BookingNotificationBell() {
  const [open,  setOpen]  = useState(false)
  const [items, setItems] = useState<NotifItem[]>([])
  const [flash, setFlash] = useState(false)

  const loadNotifs = useCallback(async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('id, body, meta, created_at')
      .eq('type', 'new_booking')
      .is('read_at', null)
      .order('created_at', { ascending: false })
    if (data) setItems(data as NotifItem[])
  }, [])

  // Sync count to localStorage so Sidebar badge can read it
  useEffect(() => {
    localStorage.setItem('f14_pendingJoinCount', String(items.length))
  }, [items])

  useEffect(() => {
    void loadNotifs()
    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        if ((payload.new as { type: string }).type === 'new_booking') {
          void loadNotifs()
          setFlash(true)
          setOpen(true)
          setTimeout(() => setFlash(false), 4000)
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [loadNotifs])

  async function approve(item: NotifItem) {
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, busy: true } : n))
    const bookingId = item.meta.booking_id

    // Get athlete IDs for this booking
    const { data: baRows } = await supabase
      .from('booking_athletes')
      .select('athlete_id')
      .eq('booking_id', bookingId)
    const athleteIds = ((baRows ?? []) as { athlete_id: string }[]).map(r => r.athlete_id)

    // Confirm booking
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)

    // Charge athletes if there's a price configured
    if (athleteIds.length > 0) {
      const price = await resolvePrice(item.meta.session_type)
      if (price > 0) {
        await fetch('/api/stripe/session-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payments: athleteIds.map((athleteId: string) => ({
              athleteId,
              amount:      price,
              description: `${CANONICAL_SESSION_TYPES.find(t => t.id === item.meta.session_type)?.label ?? item.meta.session_type} — ${item.meta.date}`,
              bookingIds:  [bookingId],
            })),
          }),
        })
      }
    }

    // Mark notification read + remove from list
    await supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id)
    setItems(prev => prev.filter(n => n.id !== item.id))
  }

  async function decline(item: NotifItem) {
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, busy: true } : n))
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', item.meta.booking_id)
    await supabase.from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id)
    setItems(prev => prev.filter(n => n.id !== item.id))
  }

  const count = items.length

  return (
    <div className="fixed right-5 top-5 z-50">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={[
          'relative flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          flash
            ? 'bg-red-500 scale-110'
            : count > 0
              ? 'bg-white hover:bg-gray-50'
              : 'bg-white hover:bg-gray-50',
        ].join(' ')}
        aria-label={`${count} booking request${count !== 1 ? 's' : ''}`}
      >
        <IconBell
          size={20}
          strokeWidth={1.75}
          className={flash ? 'text-white' : count > 0 ? 'text-red-500' : 'text-gray-400'}
        />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop – click outside to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">
                Booking Requests
                {count > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-600">
                    {count}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* List */}
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No pending requests
              </div>
            ) : (
              <div className="max-h-[400px] divide-y divide-gray-50 overflow-y-auto">
                {items.map(item => {
                  const typeLabel = CANONICAL_SESSION_TYPES.find(t => t.id === item.meta.session_type)?.label
                    ?? item.meta.session_type
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-800">{typeLabel}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.body}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {fmtDate(item.meta.date)} at {fmtTime(item.meta.start_mins)}
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => void approve(item)}
                          disabled={!!item.busy}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                        >
                          {item.busy
                            ? <IconLoader2 size={12} className="animate-spin" />
                            : <IconCheck size={12} strokeWidth={2.5} />}
                          Approve
                        </button>
                        <button
                          onClick={() => void decline(item)}
                          disabled={!!item.busy}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {item.busy
                            ? <IconLoader2 size={12} className="animate-spin" />
                            : <IconX size={12} strokeWidth={2.5} />}
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            {count > 0 && (
              <div className="border-t border-gray-100 px-4 py-2.5">
                <a
                  href="/bookings"
                  onClick={() => {
                    localStorage.setItem('f14_openTab', 'join-requests')
                    setOpen(false)
                  }}
                  className="text-xs font-medium text-[#6BA3D6] hover:underline"
                >
                  View all in Join Requests →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
