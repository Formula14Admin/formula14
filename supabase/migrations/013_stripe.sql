-- ─── Stripe integration columns ──────────────────────────────────────────────

-- Store Stripe customer ID on athletes table
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS athletes_stripe_customer_id_idx
  ON athletes (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Store Stripe subscription + price IDs on members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id        TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS members_stripe_subscription_id_idx
  ON members (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS members_stripe_customer_id_idx
  ON members (stripe_customer_id);
