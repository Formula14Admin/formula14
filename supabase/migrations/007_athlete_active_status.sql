-- Add is_active flag to athletes (true = active, false = deactivated)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Remove placeholder seed athletes (names only — safe to run multiple times)
DELETE FROM athletes
WHERE (first_name, last_name) IN (
  ('Liam',   'Carter'),
  ('Jordan', 'Williams'),
  ('Aisha',  'Thompson'),
  ('Marcus', 'Davies'),
  ('Devon',  'Knox'),
  ('Kai',    'Okafor'),
  ('Tyler',  'Ross'),
  ('Priya',  'Mehta'),
  ('Sam',    'Liu'),
  ('Zara',   'Obi')
);
