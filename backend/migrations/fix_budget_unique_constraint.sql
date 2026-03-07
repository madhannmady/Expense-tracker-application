-- The existing unique constraint on (month, year, category) does NOT include
-- user_id, causing 23505 errors when any two users share the same category
-- for the same month. Drop it and replace with a per-user constraint.

ALTER TABLE budget_allocations
  DROP CONSTRAINT IF EXISTS budget_allocations_month_year_category_key;

ALTER TABLE budget_allocations
  ADD CONSTRAINT budget_allocations_user_month_year_category_key
  UNIQUE (user_id, month, year, category);
