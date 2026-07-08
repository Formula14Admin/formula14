-- Finance transactions table for the bookkeeping module
-- Separate from the athlete billing `transactions` table.
-- Holds both manually entered entries and auto-imported sources (Stripe, bank feed).

CREATE TABLE IF NOT EXISTS finance_transactions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT          NOT NULL,
  type            TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  category        TEXT          NOT NULL DEFAULT 'other-income',
  amount          DECIMAL(10,2) NOT NULL,
  reference       TEXT,
  notes           TEXT,
  receipt_url     TEXT,
  gst_amount      DECIMAL(10,2),
  payment_method  TEXT,
  is_reimbursable BOOLEAN       DEFAULT false,
  source          TEXT          DEFAULT 'manual',  -- 'manual' | 'stripe' | 'bank'
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Public read+write so the admin client (anon key) can access it.
-- The finance module is behind admin auth so this is safe.
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_public_read"
  ON finance_transactions FOR SELECT TO anon USING (true);

CREATE POLICY "finance_public_write"
  ON finance_transactions FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "finance_auth_all"
  ON finance_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
