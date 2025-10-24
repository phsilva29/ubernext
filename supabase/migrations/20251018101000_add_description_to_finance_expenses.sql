ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS description TEXT;
