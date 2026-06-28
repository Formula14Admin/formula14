import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SessionCharge {
  athleteId:   string
  amount:      number   // AUD, e.g. 85.00
  description: string
  bookingIds?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const { payments } = await req.json() as { payments: SessionCharge[] }

    if (!payments?.length) {
      return NextResponse.json({ error: 'payments array is required' }, { status: 400 })
    }

    const results: { athleteId: string; status: string; paymentIntentId?: string; error?: string }[] = []

    for (const charge of payments) {
      const { athleteId, amount, description, bookingIds = [] } = charge

      // Get athlete's Stripe customer + default payment method
      const { data: athlete } = await supabase
        .from('athletes')
        .select('stripe_customer_id, first_name, last_name, email')
        .eq('id', athleteId)
        .maybeSingle()

      if (!athlete?.stripe_customer_id) {
        results.push({ athleteId, status: 'skipped', error: 'No Stripe customer — athlete must set up a payment method via membership' })
        continue
      }

      // Get default payment method from customer's subscription
      const customer = await stripe.customers.retrieve(athlete.stripe_customer_id) as import('stripe').Stripe.Customer
      const paymentMethodId =
        customer.invoice_settings?.default_payment_method as string | null

      if (!paymentMethodId) {
        results.push({ athleteId, status: 'skipped', error: 'No saved payment method on file' })
        continue
      }

      const amountCents = Math.round(amount * 100)

      try {
        const intent = await stripe.paymentIntents.create({
          amount:         amountCents,
          currency:       'aud',
          customer:       athlete.stripe_customer_id,
          payment_method: paymentMethodId,
          confirm:        true,
          off_session:    true,
          description,
          metadata:       { athleteId, type: 'session', bookingIds: bookingIds.join(',') },
        })

        // Record in transactions
        await supabase.from('transactions').insert({
          athlete_id:     athleteId,
          amount,
          type:           'debit',
          category:       'casual',
          description,
          payment_method: 'stripe',
          reference:      intent.id,
          payment_status: intent.status === 'succeeded' ? 'paid' : 'pending',
        })

        results.push({ athleteId, status: intent.status, paymentIntentId: intent.id })
      } catch (err: unknown) {
        // Off-session payment failed (card declined, etc.)
        const stripeError = err as { type?: string; message?: string }
        results.push({ athleteId, status: 'failed', error: stripeError.message })

        // Record failed transaction
        await supabase.from('transactions').insert({
          athlete_id:     athleteId,
          amount,
          type:           'debit',
          category:       'casual',
          description,
          payment_method: 'stripe',
          payment_status: 'failed',
        })

        // Update outstanding balance
        const { data: existing } = await supabase
          .from('athletes')
          .select('outstanding_balance')
          .eq('id', athleteId)
          .maybeSingle()

        const newBalance = ((existing?.outstanding_balance ?? 0) as number) + amount
        await supabase.from('athletes').update({ outstanding_balance: newBalance }).eq('id', athleteId)
      }
    }

    const failed  = results.filter(r => r.status === 'failed').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const success = results.filter(r => r.status === 'succeeded').length

    return NextResponse.json({ results, summary: { success, failed, skipped } })
  } catch (err) {
    console.error('[stripe/session-payment]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
