import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { athleteId, email, name } = await req.json() as {
      athleteId: string
      email:     string
      name:      string
    }

    if (!athleteId || !email) {
      return NextResponse.json({ error: 'athleteId and email are required' }, { status: 400 })
    }

    // Check if customer already exists
    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_customer_id')
      .eq('id', athleteId)
      .maybeSingle()

    if (athlete?.stripe_customer_id) {
      return NextResponse.json({ customerId: athlete.stripe_customer_id, existing: true })
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { athleteId, source: 'formula14' },
    })

    // Store customer ID in Supabase
    await supabase
      .from('athletes')
      .update({ stripe_customer_id: customer.id })
      .eq('id', athleteId)

    return NextResponse.json({ customerId: customer.id, existing: false })
  } catch (err) {
    console.error('[stripe/create-customer]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
