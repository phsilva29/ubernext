/*
  # Add outras_despesas column to viagens table

  1. Changes
    - Add `outras_despesas` column to `viagens` table to store additional expenses
    - Set default value to 0
    - Column is nullable for backwards compatibility

  2. Notes
    - This column stores expenses like tolls, parking, maintenance, etc.
    - The value is included in the profit calculation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'viagens' AND column_name = 'outras_despesas'
  ) THEN
    ALTER TABLE public.viagens ADD COLUMN outras_despesas DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;
