// Stripe price IDs for each membership tier (weekly recurring, AUD)
// Populated by running: node scripts/setup-stripe-products.mjs

export type MembershipPlan = 'bronze' | 'silver' | 'gold' | 'platinum' | 'family'

export interface PlanMeta {
  label:       string
  priceAud:    number   // weekly AUD
  stripePriceId: string // from env
}

export const PLAN_META: Record<MembershipPlan, PlanMeta> = {
  bronze:   { label: 'Bronze Membership',  priceAud: 35,  stripePriceId: process.env.STRIPE_PRICE_BRONZE   ?? '' },
  silver:   { label: 'Silver Membership',  priceAud: 50,  stripePriceId: process.env.STRIPE_PRICE_SILVER   ?? '' },
  gold:     { label: 'Gold Membership',    priceAud: 75,  stripePriceId: process.env.STRIPE_PRICE_GOLD     ?? '' },
  platinum: { label: 'Platinum Membership',priceAud: 100, stripePriceId: process.env.STRIPE_PRICE_PLATINUM ?? '' },
  family:   { label: 'Family Account',     priceAud: 100, stripePriceId: process.env.STRIPE_PRICE_FAMILY   ?? '' },
}

export function getPriceId(plan: MembershipPlan): string {
  const id = PLAN_META[plan].stripePriceId
  if (!id) throw new Error(`Stripe price ID not configured for plan: ${plan}. Run scripts/setup-stripe-products.mjs`)
  return id
}
