-- ============================================================
-- Update note_entries type constraint to support lent_to and borrowed_from
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Drop the old check constraint that only allowed 'lending' and 'general'
ALTER TABLE note_entries
  DROP CONSTRAINT IF EXISTS note_entries_type_check;

-- Step 2: Add updated constraint with all four valid type values
--   'general'       → personal note
--   'lending'       → legacy type (treated as lent_to on the frontend)
--   'lent_to'       → money you lent out (they owe you)
--   'borrowed_from' → money you borrowed (you owe them)
ALTER TABLE note_entries
  ADD CONSTRAINT note_entries_type_check
  CHECK (type IN ('general', 'lending', 'lent_to', 'borrowed_from'));
