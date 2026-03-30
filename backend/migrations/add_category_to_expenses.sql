-- ============================================================
-- Add category column to expenses table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Add category column with default 'other' (auto-migrates all existing rows)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
