-- VERSÃO ALTERNATIVA: Execute um comando por vez se necessário
-- Copie e cole cada comando individualmente no Supabase SQL Editor

-- Comando 1: Index principal de viagens por usuário e data
CREATE INDEX IF NOT EXISTS idx_viagens_user_data ON viagens(user_id, data DESC);

-- Comando 2: Index para consultas mensais
CREATE INDEX IF NOT EXISTS idx_viagens_user_mes ON viagens(user_id, date_part('year', data), date_part('month', data));

-- Comando 3: Index principal de despesas por usuário e data  
CREATE INDEX IF NOT EXISTS idx_despesas_user_data ON despesas(user_id, data DESC);

-- Comando 4: Index de despesas por categoria
CREATE INDEX IF NOT EXISTS idx_despesas_user_categoria ON despesas(user_id, categoria);

-- Comando 5: Index de email nos perfis
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Comando 6: Index composto para dashboard (mais pesado - execute por último)
CREATE INDEX IF NOT EXISTS idx_viagens_dashboard ON viagens(user_id, data DESC, valor_ganho, lucro_liquido);

-- Comando 7: Index para relatórios mensais
CREATE INDEX IF NOT EXISTS idx_viagens_relatorio_mensal ON viagens(user_id, date_trunc('month', data));

-- Comando 8: Index parcial para consultas recentes (último ano)
CREATE INDEX IF NOT EXISTS idx_despesas_periodo ON despesas(user_id, data) WHERE data >= CURRENT_DATE - INTERVAL '1 year';

-- Comando 9: Atualizar estatísticas das tabelas
ANALYZE viagens;

-- Comando 10: Atualizar estatísticas das despesas
ANALYZE despesas;

-- Comando 11: Atualizar estatísticas dos perfis
ANALYZE profiles;