CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    TEXT        NOT NULL,
  subscription JSONB      NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO anon, authenticated;
