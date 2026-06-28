-- 010 · Email logs table for tracking all outbound emails via Resend
-- Run in Supabase SQL editor after 009_app_settings.sql

CREATE TABLE IF NOT EXISTS email_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  template       TEXT        NOT NULL,
  recipient      TEXT        NOT NULL,
  subject        TEXT,
  status         TEXT        NOT NULL DEFAULT 'sent',
  resend_id      TEXT,
  error          TEXT,
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_allow_all" ON email_logs;
CREATE POLICY "dev_allow_all" ON email_logs
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS email_logs_template_idx    ON email_logs (template);
CREATE INDEX IF NOT EXISTS email_logs_recipient_idx   ON email_logs (recipient);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx  ON email_logs (created_at DESC);
