'use client'

import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { IconX, IconLock, IconShieldCheck } from '@tabler/icons-react'

const ACCENT = '#6BA3D6'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#1f2937',
      fontFamily: 'inherit',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
  },
}

// ── Inner form (must live inside <Elements>) ───────────────────────────────────

function CardForm({
  clientSecret,
  onSuccess,
  onCancel,
  submitLabel = 'Save Card',
}: {
  clientSecret: string
  onSuccess:   (paymentMethodId: string) => void
  onCancel:    () => void
  submitLabel?: string
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [focused, setFocused]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const card = elements.getElement(CardElement)
    if (!card) return

    setLoading(true)
    setCardError(null)

    const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    })

    if (error) {
      setCardError(error.message ?? 'Card error — please try again.')
      setLoading(false)
      return
    }

    if (setupIntent?.payment_method && typeof setupIntent.payment_method === 'string') {
      onSuccess(setupIntent.payment_method)
    } else {
      setCardError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }, [stripe, elements, clientSecret, onSuccess])

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Card input */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Card Details
        </label>
        <div
          style={{
            border: `1px solid ${focused ? ACCENT : '#d1d5db'}`,
            borderRadius: 10,
            padding: '12px 14px',
            backgroundColor: 'white',
            boxShadow: focused ? `0 0 0 3px rgba(107,163,214,0.15)` : undefined,
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={e => { if (e.error) setCardError(e.error.message ?? null); else setCardError(null) }}
          />
        </div>
        {cardError && (
          <p className="mt-1.5 text-xs text-red-500">{cardError}</p>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <IconLock size={14} className="mt-0.5 shrink-0 text-gray-400" />
        <p className="text-xs text-gray-500">
          Your card details are encrypted and stored securely by Stripe. Formula14 never sees your full card number.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>

      {/* Stripe badge */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        <IconShieldCheck size={12} />
        Secured by Stripe
      </div>
    </form>
  )
}

// ── Exported modal ─────────────────────────────────────────────────────────────

export interface StripeCardModalProps {
  clientSecret: string
  onSuccess:    (paymentMethodId: string) => void
  onCancel:     () => void
  title?:       string
  submitLabel?: string
}

export function StripeCardModal({
  clientSecret,
  onSuccess,
  onCancel,
  title = 'Add Payment Method',
  submitLabel,
}: StripeCardModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="px-6 py-5">
          <Elements stripe={stripePromise}>
            <CardForm
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onCancel={onCancel}
              submitLabel={submitLabel}
            />
          </Elements>
        </div>
      </div>
    </div>
  )
}

// ── Inline card step (used inside Add Member modal, no overlay) ────────────────

export function StripeCardStep({
  clientSecret,
  onSuccess,
  onBack,
  submitLabel = 'Activate Membership',
}: {
  clientSecret: string
  onSuccess:   (paymentMethodId: string) => void
  onBack:      () => void
  submitLabel?: string
}) {
  return (
    <Elements stripe={stripePromise}>
      <CardForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onCancel={onBack}
        submitLabel={submitLabel}
      />
    </Elements>
  )
}
