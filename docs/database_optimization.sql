-- Script de otimização de performance para PostgreSQL/Supabase
-- Execute no Supabase SQL Editor
-- NOTA: Alguns indexes podem já existir das migrações, IF NOT EXISTS evita erros

-- 1. Indexes para consultas frequentes (novos)
CREATE INDEX IF NOT EXISTS idx_viagens_user_data_optimized 
  ON viagens(user_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_viagens_user_mes 
  ON viagens(user_id, date_part('year', data), date_part('month', data));

CREATE INDEX IF NOT EXISTS idx_despesas_user_data_optimized 
  ON despesas(user_id, data DESC);

-- 2. Index composto para dashboard queries
CREATE INDEX IF NOT EXISTS idx_viagens_dashboard 
  ON viagens(user_id, data DESC, valor_ganho, lucro_liquido);

-- 3. Index para relatórios mensais
CREATE INDEX IF NOT EXISTS idx_viagens_relatorio_mensal 
  ON viagens(user_id, date_trunc('month', data));

-- 4. Index para busca por período
CREATE INDEX IF NOT EXISTS idx_despesas_periodo 
  ON despesas(user_id, data) WHERE data >= CURRENT_DATE - INTERVAL '1 year';

-- 5. Verificar estatísticas das tabelas
ANALYZE viagens;
ANALYZE despesas;
ANALYZE profiles;

-- 6. Query para verificar performance dos indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 7. Query para verificar queries lentas (se habilitado)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time
FROM pg_stat_statements 
WHERE query LIKE '%viagens%' OR query LIKE '%despesas%'
ORDER BY mean_time DESC
LIMIT 10;