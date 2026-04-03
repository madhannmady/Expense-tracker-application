-- ============================================================
-- Add ticket status tracking to note_entries
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- Status: 'open' (default), 'completed', 'partial'
ALTER TABLE note_entries
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'
    CHECK (status IN ('open', 'completed', 'partial'));

-- Remaining amount (used when status = 'partial')
ALTER TABLE note_entries
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

-- Backfill: all existing entries are open
UPDATE note_entries
SET status = 'open'
WHERE status IS NULL;
