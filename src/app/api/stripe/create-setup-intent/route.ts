import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { athleteId } = await req.json() as { athleteId: string }
    if (!athleteId) return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })

    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', athleteId)
      .maybeSingle()

    if (!athlete) return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })

    let customerId = athlete.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    athlete.email,
        name:     `${athlete.first_name} ${athlete.last_name}`,
        metadata: { athleteId, source: 'formula14' },
      })
      customerId = customer.id
      await supabase.from('athletes').update({ stripe_customer_id: customerId }).eq('id', athleteId)
    }

    const setupIntent = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ['card'],
      usage:                'off_session',
      metadata:             { athleteId },
    })

    return NextResponse.json({ clientSecret: setupIntent.client_secret, customerId })
  } catch (err) {
    console.error('[stripe/create-setup-intent]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
