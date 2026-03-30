-- ============================================================
-- Add created_at to expenses table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Add nullable column (no DEFAULT so existing March rows stay NULL)
-- NULL will display as '-' in the UI for pre-existing expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
