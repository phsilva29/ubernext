-- Script para criar perfis para usuários existentes
-- Execute APÓS o recreate_tables.sql

-- Criar perfis para todos os usuários verificados que não têm perfil
INSERT INTO public.profiles (user_id, nome, email)
SELECT 
  u.id as user_id,
  COALESCE(
    u.raw_user_meta_data ->> 'nome', 
    u.raw_user_meta_data ->> 'name', 
    'Usuário'
  ) as nome,
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email_confirmed_at IS NOT NULL  -- Só usuários verificados
  AND p.user_id IS NULL;                -- Que não têm perfil

-- Verificar resultado
SELECT 
  'Usuários verificados' as tipo, 
  COUNT(*) as total 
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL
UNION ALL
SELECT 
  'Perfis criados' as tipo, 
  COUNT(*) as total 
FROM public.profiles;

-- Listar usuários e seus perfis
SELECT 
  u.email,
  u.email_confirmed_at,
  p.nome,
  p.created_at as perfil_criado_em,
  CASE 
    WHEN p.user_id IS NOT NULL THEN 'COM PERFIL'
    ELSE 'SEM PERFIL'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;