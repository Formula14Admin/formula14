-- Stores Basiq bank feed connection state for the finance module

CREATE TABLE IF NOT EXISTS bank_connections (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  basiq_user_id       TEXT        UNIQUE,
  basiq_connection_id TEXT,
  account_name        TEXT,
  account_bsb         TEXT,
  account_number      TEXT,
  bank_name           TEXT,
  status              TEXT        NOT NULL DEFAULT 'disconnected',  -- 'disconnected' | 'pending' | 'connected' | 'error'
  last_synced_at      TIMESTAMPTZ,
  last_sync_cursor    TEXT,       -- ISO date to use as `from` on next sync
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton row approach — we only ever have one business bank connection
INSERT INTO bank_connections (id, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'disconnected')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_connections_anon_read"
  ON bank_connections FOR SELECT TO anon USING (true);

CREATE POLICY "bank_connections_anon_write"
  ON bank_connections FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "bank_connections_auth_all"
  ON bank_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);
