# Instruções para Criar a Tabela Despesas Manualmente

## 1. Acesse o painel do Supabase
Acesse: https://supabase.com/dashboard

## 2. Selecione seu projeto
- Project ID: awojizpebwvbpqsvpvvc
- URL: https://awojizpebwvbpqsvpvvc.supabase.co

## 3. Vá para SQL Editor
No painel lateral, clique em "SQL Editor"

## 4. Execute o seguinte SQL (CORRIGIDO):

```sql
-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create despesas table
CREATE TABLE public.despesas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data DATE NOT NULL,
    origem VARCHAR(200) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own despesas"
ON public.despesas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas"
ON public.despesas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas"
ON public.despesas
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas"
ON public.despesas
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON public.despesas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_despesas_user_id ON public.despesas(user_id);
CREATE INDEX idx_despesas_data ON public.despesas(data);
CREATE INDEX idx_despesas_categoria ON public.despesas(categoria);
```

## 5. Execute o SQL
Clique em "Run" para executar o script

## 6. Verificar se a tabela foi criada
Vá para "Table Editor" no painel lateral e verifique se a tabela "despesas" aparece na lista.

## Observação
Enquanto a tabela não for criada, a aplicação funcionará usando localStorage para armazenar as despesas localmente. Após criar a tabela no banco, as funcionalidades migrarão automaticamente para usar o Supabase.