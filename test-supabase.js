// Teste rápido da conectividade com Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sehskprarpdozzbsahdo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlaHNrcHJhcnBkb3p6YnNhaGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg5OTIsImV4cCI6MjA3NDg5NDk5Mn0.60xd1Nph2z_ACRWOG1e3sP2F1VYttGfDjmRkKSBB4J8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarConexao() {
  try {
    console.log('Testando conexão com Supabase...')
    
    // Teste 1: Verificar se conseguimos conectar
    const { data, error } = await supabase
      .from('viagens')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Erro ao conectar:', error)
      return
    }
    
    console.log('✅ Conexão OK!')
    
    // Teste 2: Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('❌ Usuário não autenticado:', authError.message)
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.email)
    } else {
      console.log('⚠️ Nenhum usuário logado')
    }
    
  } catch (err) {
    console.error('Erro geral:', err)
  }
}

testarConexao()