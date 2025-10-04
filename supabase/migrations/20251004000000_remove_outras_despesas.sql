-- Remove outras_despesas table and related objects
-- This migration removes the entire outras_despesas functionality

-- Drop indexes first
DROP INDEX IF EXISTS idx_outras_despesas_trip_id;

-- Drop triggers
DROP TRIGGER IF EXISTS update_outras_despesas_updated_at ON public.outras_despesas;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.outras_despesas;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.outras_despesas;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.outras_despesas;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.outras_despesas;

-- Drop the table
DROP TABLE IF EXISTS public.outras_despesas;