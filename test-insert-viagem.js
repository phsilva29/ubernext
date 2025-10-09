// Teste direto de INSERT na tabela viagens
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sehskprarpdozzbsahdo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHNrcHJhcnBkb3p6YnNhaGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg5OTIsImV4cCI6MjA3NDg5NDk5Mn0.60xd1Nph2z_ACRWOG1e3sP2F1VYttGfDjmRkKSBB4J8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarInsertViagem() {
  try {
    console.log('🔐 Testando autenticação...')
    
    // Primeiro fazer login com um email de teste
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teste@exemplo.com',
      password: 'senha123'
    })
    
    if (authError) {
      console.log('❌ Erro de login (esperado se não existir usuário):', authError.message)
      
      // Tentar criar usuário de teste
      console.log('📝 Tentando criar usuário de teste...')
      const { error: signUpError } = await supabase.auth.signUp({
        email: 'teste@exemplo.com',
        password: 'senha123'
      })
      
      if (signUpError) {
        console.error('❌ Erro ao criar usuário:', signUpError.message)
        return
      }
      
      console.log('✅ Usuário criado! Verifique seu email e tente novamente.')
      return
    }
    
    console.log('✅ Login realizado com sucesso!')
    
    // Verificar dados do usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Erro ao obter usuário:', userError)
      return
    }
    
    console.log('👤 Usuário logado:', {
      id: user.id,
      email: user.email
    })
    
    // Tentar inserir viagem de teste
    console.log('💾 Tentando inserir viagem de teste...')
    
    const { data, error } = await supabase
      .from('viagens')
      .insert([{
        user_id: user.id,
        data: '2025-10-09',
        km_rodados: 100,
        preco_gasolina: 5.50,
        consumo: 12,
        valor_ganho: 200,
        gastos_combustivel: 45.83,
        lucro_liquido: 154.17,
        lucro_km: 1.54
      }])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Erro ao inserir viagem:', error)
    } else {
      console.log('✅ Viagem inserida com sucesso:', data)
    }
    
  } catch (err) {
    console.error('💥 Erro geral:', err)
  }
}

testarInsertViagem()