-- Migration 025: Remove the Jordan test login account.
-- Deletes the users row for jordan@formula14.com.au (a placeholder test account).
-- The separate Jordan Williams athlete record (jordan.williams@outlook.com) is unaffected.

DELETE FROM users WHERE email = 'jordan@formula14.com.au';
