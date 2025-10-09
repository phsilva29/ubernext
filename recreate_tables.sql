-- Script para recriar as tabelas com todas as configurações corretas
-- ATENÇÃO: Este script irá APAGAR todos os dados existentes!
-- Faça backup antes de executar se tiver dados importantes

-- 1. Remover tabelas existentes (na ordem correta devido às foreign keys)
DROP TABLE IF EXISTS public.viagens CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Remover funções relacionadas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- 3. Recriar função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Recriar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Habilitar RLS na tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para perfis
CREATE POLICY "Usuários podem ver seus próprios perfis" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios perfis" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 7. Trigger para atualizar updated_at na tabela profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Recriar tabela de viagens
CREATE TABLE public.viagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  km_rodados DECIMAL(10,2) NOT NULL CHECK (km_rodados > 0),
  preco_gasolina DECIMAL(10,2) NOT NULL CHECK (preco_gasolina > 0),
  consumo DECIMAL(10,2) NOT NULL CHECK (consumo > 0),
  valor_ganho DECIMAL(10,2) NOT NULL CHECK (valor_ganho >= 0),
  gastos_combustivel DECIMAL(10,2),
  lucro_liquido DECIMAL(10,2),
  lucro_km DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Constraint para evitar viagens duplicadas no mesmo dia para o mesmo usuário
  UNIQUE(user_id, data)
);

-- 9. Habilitar RLS na tabela viagens
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas RLS para viagens com verificação robusta
CREATE POLICY "Usuários podem ver suas próprias viagens" 
ON public.viagens 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "Usuários podem criar suas próprias viagens" 
ON public.viagens 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "Usuários podem atualizar suas próprias viagens" 
ON public.viagens 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "Usuários podem deletar suas próprias viagens" 
ON public.viagens 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- 11. Trigger para atualizar updated_at na tabela viagens
CREATE TRIGGER update_viagens_updated_at
BEFORE UPDATE ON public.viagens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se falhar, não interrompe o processo de criação do usuário
    RETURN NEW;
END;
$$;

-- 13. Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 14. Criar índices para melhor performance
CREATE INDEX idx_viagens_user_id ON public.viagens(user_id);
CREATE INDEX idx_viagens_data ON public.viagens(data);
CREATE INDEX idx_viagens_user_data ON public.viagens(user_id, data);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- 15. Garantir permissões corretas para a role authenticated
GRANT ALL ON public.viagens TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 16. Verificar se tudo foi criado corretamente
DO $$
BEGIN
  -- Verificar se as tabelas existem
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'viagens') THEN
    RAISE EXCEPTION 'Tabela viagens não foi criada';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Tabela profiles não foi criada';
  END IF;
  
  -- Verificar se RLS está habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'viagens' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está habilitado na tabela viagens';
  END IF;
  
  RAISE NOTICE 'Tabelas recriadas com sucesso!';
END $$;