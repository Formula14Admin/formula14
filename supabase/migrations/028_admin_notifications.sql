-- Migration 028: Admin notifications table
-- Stores alerts for admin when athletes book sessions.

CREATE TABLE IF NOT EXISTS admin_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,           -- e.g. 'new_booking'
  title      TEXT        NOT NULL,
  body       TEXT,
  meta       JSONB       DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON admin_notifications TO anon, authenticated;
