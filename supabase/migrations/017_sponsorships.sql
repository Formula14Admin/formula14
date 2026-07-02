-- 017_sponsorships.sql
-- Sponsorship tiers and sponsors tables

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sponsor_tiers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  color_id        TEXT        NOT NULL DEFAULT 'platinum',
  package_details TEXT        NOT NULL DEFAULT '',
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsors (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id         UUID        NOT NULL REFERENCES sponsor_tiers(id) ON DELETE CASCADE,
  business_name   TEXT        NOT NULL,
  contact_name    TEXT        NOT NULL DEFAULT '',
  contact_email   TEXT        NOT NULL DEFAULT '',
  contact_phone   TEXT        NOT NULL DEFAULT '',
  start_date      DATE,
  renewal_date    DATE,
  value           DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sponsors_tier_id_idx ON sponsors(tier_id);
CREATE INDEX IF NOT EXISTS sponsor_tiers_sort_order_idx ON sponsor_tiers(sort_order);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE sponsor_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsor_tiers' AND policyname = 'dev_allow_all') THEN
    CREATE POLICY dev_allow_all ON sponsor_tiers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsors' AND policyname = 'dev_allow_all') THEN
    CREATE POLICY dev_allow_all ON sponsors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON sponsor_tiers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sponsors      TO anon, authenticated;

-- ── Seed default tiers ────────────────────────────────────────────────────────

INSERT INTO sponsor_tiers (name, color_id, sort_order)
VALUES
  ('Platinum', 'platinum', 1),
  ('Gold',     'gold',     2),
  ('Silver',   'silver',   3),
  ('Bronze',   'bronze',   4)
ON CONFLICT DO NOTHING;
