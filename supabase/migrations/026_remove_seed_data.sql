-- Migration 026: Remove all placeholder/seed athlete and member data.
-- These rows were inserted by 004_seed.sql for development testing only.
-- Real athlete accounts created via signup are unaffected (they have a user_id).

DELETE FROM athletes WHERE email IN (
  'liam.carter@gmail.com',
  'jordan.williams@outlook.com',
  'aisha.thompson@icloud.com',
  'marcus.davies@gmail.com',
  'devon.knox@hotmail.com',
  'kai.okafor@gmail.com',
  'tyler.ross@outlook.com',
  'priya.mehta@gmail.com',
  'sam.liu@gmail.com',
  'zara.obi@icloud.com'
);

DELETE FROM members WHERE email IN (
  'jordan.mitchell@gmail.com',
  'mia.chen@outlook.com',
  'tyler.brooks@gmail.com',
  'emma.walsh@icloud.com',
  'liam.nguyen@gmail.com',
  'sophie.davis@hotmail.com'
);
