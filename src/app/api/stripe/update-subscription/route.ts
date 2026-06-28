import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getPriceId, type MembershipPlan } from '@/lib/stripe-products'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Action = 'change-plan' | 'cancel' | 'reactivate'

export async function POST(req: NextRequest) {
  try {
    const { athleteId, action, newPlan } = await req.json() as {
      athleteId: string
      action:    Action
      newPlan?:  MembershipPlan
    }

    if (!athleteId || !action) {
      return NextResponse.json({ error: 'athleteId and action are required' }, { status: 400 })
    }

    const { data: member } = await supabase
      .from('members')
      .select('stripe_subscription_id, stripe_price_id, plan')
      .eq('athlete_id', athleteId)
      .maybeSingle()

    if (!member?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    const subId = member.stripe_subscription_id

    if (action === 'cancel') {
      // Cancel at period end (Stripe keeps billing until week is up)
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
        metadata: { cancelled_at: new Date().toISOString() },
      })

      await supabase.from('members').update({ status: 'cancelling' }).eq('athlete_id', athleteId)
      await supabase.from('athletes').update({ membership_status: 'cancelling' }).eq('id', athleteId)

      return NextResponse.json({ status: 'cancelling' })
    }

    if (action === 'reactivate') {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: false })
      await supabase.from('members').update({ status: 'active' }).eq('athlete_id', athleteId)
      await supabase.from('athletes').update({ membership_status: 'active' }).eq('id', athleteId)
      return NextResponse.json({ status: 'active' })
    }

    if (action === 'change-plan') {
      if (!newPlan) {
        return NextResponse.json({ error: 'newPlan is required for change-plan action' }, { status: 400 })
      }

      const newPriceId = getPriceId(newPlan)

      // Get current subscription items
      const sub = await stripe.subscriptions.retrieve(subId)
      const itemId = sub.items.data[0]?.id

      if (!itemId) {
        return NextResponse.json({ error: 'Subscription item not found' }, { status: 500 })
      }

      // Upgrade/downgrade — prorate at end of billing period
      await stripe.subscriptions.update(subId, {
        items:      [{ id: itemId, price: newPriceId }],
        proration_behavior: 'none',
        metadata:   { plan: newPlan },
      })

      await supabase.from('members').update({
        plan:            newPlan,
        stripe_price_id: newPriceId,
      }).eq('athlete_id', athleteId)

      await supabase.from('athletes').update({
        membership_tier: newPlan,
      }).eq('id', athleteId)

      return NextResponse.json({ status: 'updated', plan: newPlan })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    console.error('[stripe/update-subscription]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
