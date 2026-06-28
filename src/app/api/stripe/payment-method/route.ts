import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const athleteId = req.nextUrl.searchParams.get('athleteId')
    if (!athleteId) return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })

    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_payment_method_id')
      .eq('id', athleteId)
      .maybeSingle()

    const pmId = (athlete?.stripe_payment_method_id ?? null) as string | null
    if (!pmId) return NextResponse.json({ paymentMethod: null })

    const pm = await stripe.paymentMethods.retrieve(pmId)
    if (pm.type !== 'card' || !pm.card) return NextResponse.json({ paymentMethod: null })

    return NextResponse.json({
      paymentMethod: {
        id:       pm.id,
        brand:    pm.card.brand,
        last4:    pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear:  pm.card.exp_year,
      },
    })
  } catch (err) {
    console.error('[stripe/payment-method GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { athleteId } = await req.json() as { athleteId: string }
    if (!athleteId) return NextResponse.json({ error: 'athleteId is required' }, { status: 400 })

    const { data: athlete } = await supabase
      .from('athletes')
      .select('stripe_payment_method_id, stripe_customer_id')
      .eq('id', athleteId)
      .maybeSingle()

    const pmId       = (athlete?.stripe_payment_method_id ?? null) as string | null
    const customerId = (athlete?.stripe_customer_id       ?? null) as string | null

    if (pmId) {
      try { await stripe.paymentMethods.detach(pmId) } catch { /* already detached */ }
    }

    if (customerId) {
      try {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: '' },
        })
      } catch { /* ignore */ }
    }

    await supabase
      .from('athletes')
      .update({ stripe_payment_method_id: null })
      .eq('id', athleteId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[stripe/payment-method DELETE]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
