-- ─── Receipts table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS receipts (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by      TEXT        NOT NULL DEFAULT 'matt',
  merchant_name    TEXT,
  purchase_date    DATE,
  amount           NUMERIC(10,2),
  gst_amount       NUMERIC(10,2),
  category         TEXT,
  description      TEXT,
  payment_method   TEXT,
  is_reimbursable  BOOLEAN     NOT NULL DEFAULT false,
  status           TEXT        NOT NULL DEFAULT 'unreviewed'
                               CHECK (status IN ('unreviewed','reviewed','exported')),
  image_url        TEXT,
  thumbnail_url    TEXT,
  file_type        TEXT        NOT NULL DEFAULT 'image'
                               CHECK (file_type IN ('image','pdf','manual')),
  transaction_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_allow_all" ON receipts;
CREATE POLICY "dev_allow_all" ON receipts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS receipts_purchase_date_idx ON receipts (purchase_date DESC);
CREATE INDEX IF NOT EXISTS receipts_status_idx        ON receipts (status);
CREATE INDEX IF NOT EXISTS receipts_uploaded_by_idx   ON receipts (uploaded_by);

-- ─── Supabase Storage — receipts bucket ──────────────────────────────────────
-- Run this block in the SQL editor to create the storage bucket.
-- If the bucket already exists (e.g., created via the dashboard), this is a no-op.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts', 'receipts', true,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (permissive for dev — tighten in production)
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete" ON storage.objects;

CREATE POLICY "receipts_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts');

CREATE POLICY "receipts_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'receipts');
