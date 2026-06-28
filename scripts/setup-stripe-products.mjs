/**
 * One-time setup: creates Formula14 products + weekly AUD prices in Stripe.
 * Run with: node scripts/setup-stripe-products.mjs
 * Requires STRIPE_SECRET_KEY in .env.local (loaded via --env-file flag or dotenv).
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !k.startsWith('#')) {
      process.env[k.trim()] = rest.join('=').trim()
    }
  }
} catch { /* .env.local not found — expect env vars to already be set */ }

const { default: Stripe } = await import('stripe')

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
  console.error('Error: STRIPE_SECRET_KEY not set or invalid in .env.local')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)
const isTest = STRIPE_SECRET_KEY.startsWith('sk_test_')
console.log(`\nConnected to Stripe (${isTest ? 'TEST' : 'LIVE'} mode)\n`)

const PLANS = [
  { envKey: 'STRIPE_PRICE_BRONZE',   productId: 'formula14-bronze',   name: 'Bronze Membership',   amountCents: 3500  },
  { envKey: 'STRIPE_PRICE_SILVER',   productId: 'formula14-silver',   name: 'Silver Membership',   amountCents: 5000  },
  { envKey: 'STRIPE_PRICE_GOLD',     productId: 'formula14-gold',     name: 'Gold Membership',     amountCents: 7500  },
  { envKey: 'STRIPE_PRICE_PLATINUM', productId: 'formula14-platinum', name: 'Platinum Membership', amountCents: 10000 },
  { envKey: 'STRIPE_PRICE_FAMILY',   productId: 'formula14-family',   name: 'Family Account',      amountCents: 10000 },
]

const results = []

for (const plan of PLANS) {
  // Upsert product
  let product
  try {
    product = await stripe.products.retrieve(plan.productId)
    console.log(`✓ Product exists: ${plan.name} (${product.id})`)
  } catch {
    product = await stripe.products.create({
      id:   plan.productId,
      name: plan.name,
      metadata: { formula14_plan: plan.productId.replace('formula14-', '') },
    })
    console.log(`+ Created product: ${plan.name} (${product.id})`)
  }

  // Check if an active weekly AUD price already exists for this product
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
  const existing = prices.data.find(
    p => p.currency === 'aud' && p.recurring?.interval === 'week' && p.unit_amount === plan.amountCents
  )

  let price
  if (existing) {
    price = existing
    console.log(`✓ Price exists:   $${(plan.amountCents / 100).toFixed(0)}/week AUD (${price.id})`)
  } else {
    price = await stripe.prices.create({
      product:    product.id,
      unit_amount: plan.amountCents,
      currency:   'aud',
      recurring:  { interval: 'week' },
      metadata:   { formula14_plan: plan.productId.replace('formula14-', '') },
    })
    console.log(`+ Created price:  $${(plan.amountCents / 100).toFixed(0)}/week AUD (${price.id})`)
  }

  results.push({ envKey: plan.envKey, priceId: price.id })
}

console.log('\n─────────────────────────────────────────────────────────')
console.log('Add these lines to your .env.local and Vercel env vars:\n')
for (const r of results) {
  console.log(`${r.envKey}=${r.priceId}`)
}
console.log('─────────────────────────────────────────────────────────\n')
