-- Verificar duplicatas no banco de dados
-- Execute este script no Supabase SQL Editor

-- 1. Verificar quantos usuários existem
SELECT 
    'Total de usuários' as tipo,
    COUNT(*) as quantidade
FROM auth.users;

-- 2. Verificar emails duplicados
SELECT 
    email,
    COUNT(*) as quantidade,
    array_agg(id) as user_ids,
    array_agg(created_at) as created_dates
FROM auth.users 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- 3. Verificar todos os usuários ordenados por email
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY email, created_at DESC;

-- 4. Verificar se há emails em branco ou NULL
SELECT 
    'Usuários com email NULL ou vazio' as tipo,
    COUNT(*) as quantidade
FROM auth.users 
WHERE email IS NULL OR email = '';

-- 5. Verificar configurações de autenticação do projeto
SELECT 
    setting_name,
    setting_value
FROM pg_settings 
WHERE setting_name LIKE '%auth%' OR setting_name LIKE '%signup%';