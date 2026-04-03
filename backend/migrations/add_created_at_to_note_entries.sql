-- ============================================================
-- Add created_at to note_entries (auto-captured timestamp)
-- Safe to run multiple times — uses IF NOT EXISTS
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Add the column (nullable first so we can backfill existing rows)
ALTER TABLE note_entries
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Step 2: Backfill existing rows from their parent monthly_notes.created_at
--         so old data shows a meaningful date instead of NULL
UPDATE note_entries ne
SET created_at = mn.created_at
FROM monthly_notes mn
WHERE ne.notes_id = mn.id
  AND ne.created_at IS NULL;

-- Step 3: Safety net — any remaining NULLs get current timestamp
UPDATE note_entries
SET created_at = NOW()
WHERE created_at IS NULL;

-- Step 4: Set DEFAULT NOW() so every new row auto-captures the insert time
ALTER TABLE note_entries
  ALTER COLUMN created_at SET DEFAULT NOW();
