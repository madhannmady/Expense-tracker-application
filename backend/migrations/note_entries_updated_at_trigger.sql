-- ============================================================
-- Fix note_entries updated_at to track per-entry last edit date
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Drop the auto-trigger (it overrides our selective updates)
DROP TRIGGER IF EXISTS trg_note_entries_updated_at ON note_entries;

-- Step 2: Ensure updated_at column exists
ALTER TABLE note_entries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 3: Backfill all existing rows (set updated_at = created_at)
-- No trigger exists now, so this actually sets the correct value
UPDATE note_entries SET updated_at = created_at;
