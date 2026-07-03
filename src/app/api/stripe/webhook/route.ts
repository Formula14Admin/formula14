import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

// ── helpers ───────────────────────────────────────────────────────────────────

async function getAthleteByCustomer(customerId: string) {
  const { data } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, outstanding_balance, billing_records')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data
}

async function getAthleteBySubscription(subscriptionId: string) {
  const { data } = await supabase
    .from('members')
    .select('athlete_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  if (!data?.athlete_id) return null
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, email, outstanding_balance, billing_records')
    .eq('id', data.athlete_id)
    .maybeSingle()
  return athlete
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function plusDays(n: number) { return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10) }

const MAX_OUTSTANDING_BEFORE_BLOCK = 3

// Get subscription ID from the new Invoice.parent structure (API 2026+)
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent
  if (!parent) return null
  const sub = parent.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

// ── event handlers ────────────────────────────────────────────────────────────

async function onPaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer : (invoice.customer as Stripe.Customer | null)?.id
  if (!customerId) return

  const athlete = await getAthleteByCustomer(customerId)
  if (!athlete) return

  const amount    = (invoice.amount_paid ?? 0) / 100
  const billingId = `stripe-${invoice.id}`

  const records: { id: string; date: string; amount: number; status: string }[] =
    Array.isArray(athlete.billing_records) ? athlete.billing_records : []

  const existingIdx = records.findIndex(r => r.id === billingId)
  const newRecord   = { id: billingId, date: todayStr(), amount, status: 'paid' }
  if (existingIdx >= 0) records[existingIdx] = newRecord
  else records.unshift(newRecord)

  const outstanding = Math.max(0, ((athlete.outstanding_balance as number) ?? 0) - amount)

  await supabase.from('athletes').update({
    billing_records:     records,
    outstanding_balance: outstanding,
    membership_status:   'active',
  }).eq('id', athlete.id)

  // Add to finance transactions
  await supabase.from('transactions').insert({
    athlete_id:     athlete.id,
    amount,
    type:           'credit',
    category:       'membership',
    description:    `Membership payment — ${invoice.id}`,
    payment_method: 'stripe',
    reference:      invoice.id,
    payment_status: 'paid',
  })

  // Update next charge date (+7 days from now)
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (subscriptionId) {
    const nextDate = plusDays(7)
    await supabase.from('members').update({ next_charge_date: nextDate }).eq('stripe_subscription_id', subscriptionId)
    await supabase.from('athletes').update({ next_billing_date: nextDate }).eq('id', athlete.id)
  }
}

async function onPaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer : (invoice.customer as Stripe.Customer | null)?.id
  if (!customerId) return

  const athlete = await getAthleteByCustomer(customerId)
  if (!athlete) return

  const amount    = (invoice.amount_due ?? 0) / 100
  const billingId = `stripe-${invoice.id}`

  const records: { id: string; date: string; amount: number; status: string }[] =
    Array.isArray(athlete.billing_records) ? athlete.billing_records : []

  const existingIdx = records.findIndex(r => r.id === billingId)
  const newRecord   = { id: billingId, date: todayStr(), amount, status: 'failed' }
  if (existingIdx >= 0) records[existingIdx] = newRecord
  else records.unshift(newRecord)

  const outstanding = ((athlete.outstanding_balance as number) ?? 0) + amount
  const failedCount = records.filter(r => r.status === 'failed').length
  const newStatus   = failedCount >= MAX_OUTSTANDING_BEFORE_BLOCK ? 'overdue' : 'active'

  await supabase.from('athletes').update({
    billing_records:     records,
    outstanding_balance: outstanding,
    membership_status:   newStatus,
  }).eq('id', athlete.id)

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  // Failed payment email → athlete
  fetch(`${baseUrl}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template: 'failed-payment',
      to:       athlete.email,
      data: {
        athleteName:        `${athlete.first_name} ${athlete.last_name}`,
        firstName:          athlete.first_name,
        amount:             amount.toFixed(2),
        outstandingCount:   failedCount,
        outstandingBalance: outstanding.toFixed(2),
        date:               todayStr(),
        loginUrl:           `${baseUrl}/athlete`,
        isBlocked:          failedCount >= MAX_OUTSTANDING_BEFORE_BLOCK,
      },
    }),
  }).catch(console.error)

  // Admin alert
  fetch(`${baseUrl}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template: 'failed-payment-admin',
      to:       'matt@formula14.com.au',
      data: {
        athleteName:        `${athlete.first_name} ${athlete.last_name}`,
        athleteEmail:       athlete.email,
        amount:             amount.toFixed(2),
        outstandingCount:   failedCount,
        outstandingBalance: outstanding.toFixed(2),
        date:               todayStr(),
        isBlocked:          failedCount >= MAX_OUTSTANDING_BEFORE_BLOCK,
      },
    }),
  }).catch(console.error)
}

async function onSubscriptionUpdated(subscription: Stripe.Subscription) {
  const athlete = await getAthleteBySubscription(subscription.id)
  if (!athlete) return

  const plan = subscription.metadata?.plan as string | undefined

  const status = subscription.cancel_at_period_end
    ? 'cancelling'
    : subscription.status === 'active'
      ? 'active'
      : subscription.status === 'past_due'
        ? 'overdue'
        : 'inactive'

  await supabase.from('athletes').update({ membership_status: status }).eq('id', athlete.id)
  await supabase.from('members').update({
    status,
    ...(plan ? { plan } : {}),
  }).eq('stripe_subscription_id', subscription.id)
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const athlete = await getAthleteBySubscription(subscription.id)
  if (!athlete) return
  await supabase.from('athletes').update({ membership_status: 'inactive' }).eq('id', athlete.id)
  await supabase.from('members').update({ status: 'inactive' }).eq('stripe_subscription_id', subscription.id)
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''
  const secret    = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (secret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret)
    } catch (err) {
      console.error('[stripe/webhook] signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    // No webhook secret set — skip verification (dev only)
    console.warn('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — skipping verification')
    event = JSON.parse(body) as Stripe.Event
  }

  console.log(`[stripe/webhook] ${event.type}`)

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await onPaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await onPaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
