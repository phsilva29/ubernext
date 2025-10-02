-- Add trip_id, category, and date columns to outras_despesas table
ALTER TABLE public.outras_despesas 
ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.viagens(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE;

-- Create index for better query performance on trip_id
CREATE INDEX IF NOT EXISTS idx_outras_despesas_trip_id ON public.outras_despesas(trip_id);

-- Add comment to clarify that expenses should be stored as negative values
COMMENT ON COLUMN public.outras_despesas.amount IS 'Expense amount - should be stored as negative value for deductions';