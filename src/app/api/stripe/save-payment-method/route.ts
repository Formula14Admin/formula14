import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { athleteId, paymentMethodId } = await req.json() as {
      athleteId:       string
      paymentMethodId: string
    }

    if (!athleteId || !paymentMethodId) {
      return NextResponse.json({ error: 'athleteId and paymentMethodId are required' }, { status: 400 })
    }

    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_customer_id')
      .eq('id', athleteId)
      .maybeSingle()

    if (!athlete?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found for this athlete' }, { status: 404 })
    }

    const customerId = athlete.stripe_customer_id as string

    // Attach the PM to the customer (idempotent — already attached is fine)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Already attached to this customer is not an error
      if (!msg.includes('already been attached')) throw err
    }

    // Set as the customer's default invoice payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Store in Supabase
    await supabase
      .from('athletes')
      .update({ stripe_payment_method_id: paymentMethodId })
      .eq('id', athleteId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[stripe/save-payment-method]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
