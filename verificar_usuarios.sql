-- Script para verificar se os dados dos usuários estão sendo salvos
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Verificar se as tabelas existem
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename IN ('profiles', 'viagens')
ORDER BY tablename;

-- 2. Verificar estrutura da tabela profiles
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se o trigger de criação de perfil existe
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Verificar função handle_new_user
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Verificar usuários na tabela auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Verificado'
    ELSE 'Não Verificado'
  END as status_verificacao
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- 6. Verificar perfis criados na tabela profiles
SELECT 
  p.id,
  p.user_id,
  p.nome,
  p.email,
  p.created_at,
  u.email as email_auth,
  u.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 7. Verificar se há usuários sem perfil (problema de sincronização)
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data,
  CASE 
    WHEN p.user_id IS NULL THEN 'SEM PERFIL'
    ELSE 'COM PERFIL'
  END as status_perfil
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;

-- 8. Verificar políticas RLS da tabela profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_condition,
  with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 9. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 10. Contar registros
SELECT 
  'auth.users' as tabela,
  COUNT(*) as total_registros
FROM auth.users
UNION ALL
SELECT 
  'public.profiles' as tabela,
  COUNT(*) as total_registros
FROM public.profiles
UNION ALL
SELECT 
  'usuarios_verificados' as tabela,
  COUNT(*) as total_registros
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;