CREATE TABLE IF NOT EXISTS email_templates (
  id         TEXT        PRIMARY KEY,
  subject    TEXT        NOT NULL,
  body_html  TEXT        NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_allow_all" ON email_templates;
CREATE POLICY "dev_allow_all" ON email_templates
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
