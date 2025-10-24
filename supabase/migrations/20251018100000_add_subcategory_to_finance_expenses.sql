ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_expenses_category
  ON public.finance_expenses (user_id, category, subcategory);
