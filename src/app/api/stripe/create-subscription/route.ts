import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getPriceId, type MembershipPlan } from '@/lib/stripe-products'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { athleteId, plan } = await req.json() as {
      athleteId: string
      plan:      MembershipPlan
    }

    if (!athleteId || !plan) {
      return NextResponse.json({ error: 'athleteId and plan are required' }, { status: 400 })
    }

    // Get Stripe customer ID
    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', athleteId)
      .maybeSingle()

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Auto-create Stripe customer if missing
    let customerId = athlete.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: athlete.email,
        name:  `${athlete.first_name} ${athlete.last_name}`,
        metadata: { athleteId, source: 'formula14' },
      })
      customerId = customer.id
      await supabase.from('athletes').update({ stripe_customer_id: customerId }).eq('id', athleteId)
    }

    // Cancel any existing active subscription first
    const { data: member } = await supabase
      .from('members')
      .select('stripe_subscription_id')
      .eq('athlete_id', athleteId)
      .maybeSingle()

    if (member?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(member.stripe_subscription_id, {
          prorate: false,
        })
      } catch { /* already cancelled — continue */ }
    }

    const priceId = getPriceId(plan)

    // Create subscription — billing starts immediately, first invoice due now
    const subscription = await stripe.subscriptions.create({
      customer:    customerId,
      items:       [{ price: priceId }],
      currency:    'aud',
      metadata:    { athleteId, plan, source: 'formula14' },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand:      ['latest_invoice'],
    })

    // Extract hosted invoice URL so the admin can send it to the athlete for payment
    const invoice = subscription.latest_invoice
    const hostedInvoiceUrl =
      invoice && typeof invoice !== 'string'
        ? (invoice.hosted_invoice_url ?? null)
        : null

    // Update members table
    const today = new Date()
    const nextCharge = new Date(today)
    nextCharge.setDate(today.getDate() + 7)

    await supabase.from('members').upsert({
      athlete_id:            athleteId,
      first_name:            athlete.first_name,
      last_name:             athlete.last_name,
      email:                 athlete.email,
      plan:                  plan as string,
      status:                'active',
      stripe_subscription_id: subscription.id,
      stripe_price_id:       priceId,
      started_date:          today.toISOString().slice(0, 10),
      next_charge_date:      nextCharge.toISOString().slice(0, 10),
    }, { onConflict: 'athlete_id' })

    // Update athletes membership columns
    await supabase.from('athletes').update({
      membership_tier:   plan,
      membership_status: 'active',
      membership_started_date: today.toISOString().slice(0, 10),
      next_billing_date: nextCharge.toISOString().slice(0, 10),
    }).eq('id', athleteId)

    return NextResponse.json({
      subscriptionId:   subscription.id,
      status:           subscription.status,
      hostedInvoiceUrl, // admin copies this link and sends to athlete to complete payment
    })
  } catch (err) {
    console.error('[stripe/create-subscription]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
