'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import {
  IconCreditCard, IconX, IconAlertTriangle, IconCheck, IconShieldCheck,
  IconReceipt, IconChevronRight,
} from '@tabler/icons-react'
import { StripeCardModal } from '@/components/StripeCardModal'

const ACCENT = '#6BA3D6'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

interface BillingRecord {
  id: string
  date: string
  amount: number
  status: 'paid' | 'failed' | 'upcoming'
}

interface AthleteData {
  id: string
  firstName: string
  lastName: string
  membershipTier: string | null
  membershipStatus: string | null
  nextBillingDate: string | null
  outstandingBalance: number
  billingRecords: BillingRecord[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
}
const PLAN_COLOR: Record<string, string> = {
  bronze: '#b45309', silver: '#64748b', gold: '#ca8a04', platinum: '#7c3aed',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:     { bg: '#dcfce7', color: '#15803d', label: 'Active' },
  cancelling: { bg: '#fef9c3', color: '#92400e', label: 'Cancelling' },
  overdue:    { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
  inactive:   { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
}
const BRAND_COLOR: Record<string, string> = {
  visa: '#1a1f71', mastercard: '#eb001b', amex: '#016fd0', discover: '#f76f20',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function BillingStatusBadge({ status }: { status: BillingRecord['status'] }) {
  const map = {
    paid:     { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
    failed:   { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
    upcoming: { bg: '#f0f9ff', color: '#0369a1', label: 'Upcoming' },
  }
  const s = map[status]
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AthleteMembershipPage() {
  const { data: session } = useSession()
  const email = session?.user?.email ?? null

  const [athlete, setAthlete] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)

  const [pm, setPm] = useState<PaymentMethod | null>(null)
  const [pmLoading, setPmLoading] = useState(false)

  // Card modal
  const [cardSetupSecret, setCardSetupSecret] = useState<string | null>(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)

  // Remove card confirm
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load athlete data
  useEffect(() => {
    if (!email) return
    void (async () => {
      const { data } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, membership_tier, membership_status, next_billing_date, outstanding_balance, billing_records')
        .eq('email', email)
        .maybeSingle()
      if (data) {
        const athleteData: AthleteData = {
          id:                 data.id as string,
          firstName:          (data.first_name as string) ?? '',
          lastName:           (data.last_name as string) ?? '',
          membershipTier:     (data.membership_tier as string | null) ?? null,
          membershipStatus:   (data.membership_status as string | null) ?? null,
          nextBillingDate:    (data.next_billing_date as string | null) ?? null,
          outstandingBalance: Number(data.outstanding_balance ?? 0),
          billingRecords:     Array.isArray(data.billing_records) ? data.billing_records as BillingRecord[] : [],
        }
        setAthlete(athleteData)
        void fetchPm(data.id as string)
      }
      setLoading(false)
    })()
  }, [email])

  async function fetchPm(athleteId: string) {
    setPmLoading(true)
    try {
      const res = await fetch(`/api/stripe/payment-method?athleteId=${athleteId}`)
      const d = await res.json() as { paymentMethod?: PaymentMethod }
      setPm(d.paymentMethod ?? null)
    } catch { setPm(null) }
    setPmLoading(false)
  }

  async function handleOpenCardModal() {
    if (!athlete) return
    setPmLoading(true)
    try {
      const res = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: athlete.id }),
      })
      const d = await res.json() as { clientSecret?: string; error?: string }
      if (d.error) throw new Error(d.error)
      setCardSetupSecret(d.clientSecret ?? null)
      setCardModalOpen(true)
    } catch (err) {
      showToast('Failed to open card form — please try again.')
      console.error(err)
    }
    setPmLoading(false)
  }

  async function handleCardSaved(paymentMethodId: string) {
    if (!athlete) return
    await fetch('/api/stripe/save-payment-method', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: athlete.id, paymentMethodId }),
    })
    setCardModalOpen(false)
    setCardSetupSecret(null)
    await fetchPm(athlete.id)
    showToast('Card saved successfully!')
  }

  async function handleRemoveCard() {
    if (!athlete) return
    setRemoving(true)
    await fetch('/api/stripe/payment-method', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: athlete.id }),
    })
    setPm(null)
    setConfirmRemove(false)
    setRemoving(false)
    showToast('Card removed.')
  }

  const sortedBilling = [...(athlete?.billingRecords ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-sm text-gray-400">Loading membership…</div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-500">No membership profile found for this account.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Membership</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your plan, billing, and payment method</p>
      </div>

      {/* Membership Status */}
      {athlete.membershipTier ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Membership Plan</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ backgroundColor: PLAN_COLOR[athlete.membershipTier] ?? ACCENT }}>
              {PLAN_LABEL[athlete.membershipTier] ?? athlete.membershipTier} Membership
            </span>
            {athlete.membershipStatus && STATUS_STYLE[athlete.membershipStatus] && (
              <span className="rounded-full px-3 py-1 text-sm font-semibold"
                style={{
                  backgroundColor: STATUS_STYLE[athlete.membershipStatus].bg,
                  color: STATUS_STYLE[athlete.membershipStatus].color,
                }}>
                {STATUS_STYLE[athlete.membershipStatus].label}
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {athlete.nextBillingDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Next billing</span>
                <span className="font-medium text-gray-800">{fmtDate(athlete.nextBillingDate)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Outstanding balance</span>
              <span className={`font-bold ${athlete.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${athlete.outstandingBalance.toFixed(2)}
              </span>
            </div>
          </div>
          {athlete.outstandingBalance > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <IconAlertTriangle size={14} />
              You have an outstanding balance. Please contact your coach.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">You don&apos;t have an active membership plan. Contact your coach to get started.</p>
        </div>
      )}

      {/* Payment Method */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">Payment Method</h2>
          <IconShieldCheck size={16} className="text-gray-300" />
        </div>

        {pmLoading ? (
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          </div>
        ) : pm ? (
          <>
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold uppercase tracking-wide"
                style={{ color: BRAND_COLOR[pm.brand] ?? '#374151' }}>
                {pm.brand}
              </div>
              <div>
                <p className="font-semibold text-gray-800">•••• •••• •••• {pm.last4}</p>
                <p className="text-xs text-gray-400">Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}</p>
              </div>
            </div>

            {!confirmRemove ? (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={handleOpenCardModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                  Update Card
                </button>
                <button type="button" onClick={() => setConfirmRemove(true)}
                  className="flex-1 rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50">
                  Remove Card
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="mb-2.5 text-sm font-semibold text-red-700">Remove your saved card?</p>
                <p className="mb-3 text-xs text-red-500">Membership payments will fail until you add a new card.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmRemove(false)} disabled={removing}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleRemoveCard} disabled={removing}
                    className="flex-1 rounded-xl py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626' }}>
                    {removing ? 'Removing…' : 'Yes, Remove'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <IconCreditCard size={22} className="text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">No payment method saved</p>
                <p className="text-xs text-gray-400 mt-0.5">Add a card to enable automatic membership billing</p>
              </div>
              <button type="button" onClick={handleOpenCardModal}
                className="mt-1 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}>
                Add Card
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <IconShieldCheck size={12} />
              Secured by Stripe — Formula14 never sees your card number
            </div>
          </>
        )}
      </div>

      {/* Billing History */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <IconReceipt size={16} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700">Billing History</h2>
        </div>
        {sortedBilling.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No billing history yet.</div>
        ) : (
          <div>
            {sortedBilling.slice(0, 12).map((b, i) => (
              <div key={b.id}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: i < Math.min(sortedBilling.length, 12) - 1 ? '1px solid #f3f4f6' : undefined }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: b.status === 'paid' ? '#dcfce7' : b.status === 'failed' ? '#fee2e2' : '#f0f9ff' }}>
                    {b.status === 'paid'
                      ? <IconCheck size={13} style={{ color: '#15803d' }} />
                      : b.status === 'failed'
                        ? <IconX size={13} style={{ color: '#dc2626' }} />
                        : <IconChevronRight size={13} style={{ color: '#0369a1' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{fmtDate(b.date)}</p>
                    <p className="text-xs text-gray-400">Weekly membership</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">${b.amount.toFixed(2)}</span>
                  <BillingStatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card modal */}
      {cardModalOpen && cardSetupSecret && (
        <StripeCardModal
          clientSecret={cardSetupSecret}
          onSuccess={handleCardSaved}
          onCancel={() => { setCardModalOpen(false); setCardSetupSecret(null) }}
          title={pm ? 'Update Payment Card' : 'Add Payment Card'}
          submitLabel={pm ? 'Update Card' : 'Save Card'}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
