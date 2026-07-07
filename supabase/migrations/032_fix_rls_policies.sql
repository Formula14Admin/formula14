-- Add RLS policies for tables created with GRANT-only access.
-- Without explicit policies, RLS blocks all queries even with GRANTs.

-- admin_notifications: anyone can insert (athletes notify admin),
-- authenticated users can read/update (admin reads + dismisses)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_notifications"
  ON admin_notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "authenticated_can_read_notifications"
  ON admin_notifications FOR SELECT USING (true);

CREATE POLICY "authenticated_can_update_notifications"
  ON admin_notifications FOR UPDATE USING (true) WITH CHECK (true);

-- push_subscriptions: coaches register/manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_access_push_subscriptions"
  ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
