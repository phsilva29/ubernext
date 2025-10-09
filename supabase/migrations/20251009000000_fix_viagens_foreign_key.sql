-- Adicionar constraint de foreign key na tabela viagens se não existir
DO $$
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'viagens_user_id_fkey'
    AND table_name = 'viagens'
  ) THEN
    -- Adicionar a foreign key constraint
    ALTER TABLE public.viagens 
    ADD CONSTRAINT viagens_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice na coluna user_id se não existir para melhor performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_viagens_user_id'
  ) THEN
    CREATE INDEX idx_viagens_user_id ON public.viagens(user_id);
  END IF;
END $$;

-- Garantir que as políticas RLS estão corretas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias viagens" ON public.viagens;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias viagens" ON public.viagens;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias viagens" ON public.viagens;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias viagens" ON public.viagens;

-- Recriar as políticas RLS
CREATE POLICY "Usuários podem ver suas próprias viagens" 
ON public.viagens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias viagens" 
ON public.viagens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias viagens" 
ON public.viagens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias viagens" 
ON public.viagens 
FOR DELETE 
USING (auth.uid() = user_id);