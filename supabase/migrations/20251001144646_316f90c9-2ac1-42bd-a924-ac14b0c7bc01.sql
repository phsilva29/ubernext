-- Criar tabela de outras despesas
CREATE TABLE public.outras_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.outras_despesas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias despesas"
ON public.outras_despesas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias despesas"
ON public.outras_despesas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias despesas"
ON public.outras_despesas
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias despesas"
ON public.outras_despesas
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_outras_despesas_updated_at
BEFORE UPDATE ON public.outras_despesas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();