import { supabase } from '@/integrations/supabase/client';

export class SessionManager {
  private static refreshInProgress = false;
  
  /**
   * Verifica se a sessão está válida e a renova se necessário
   */
  static async ensureValidSession(): Promise<boolean> {
    try {
      console.log('🔍 Verificando sessão...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao verificar sessão:', error);
        return false;
      }
      
      if (!session) {
        console.log('❌ Nenhuma sessão encontrada');
        return false;
      }
      
      // Verificar se a sessão está próxima do vencimento (menos de 5 minutos)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;
      
      console.log('⏰ Tempo até expirar:', Math.floor(timeUntilExpiry / 60), 'minutos');
      
      // Se falta menos de 5 minutos, renovar
      if (timeUntilExpiry < 300) { // 300 segundos = 5 minutos
        console.log('🔄 Sessão próxima do vencimento, renovando...');
        return await this.refreshSession();
      }
      
      console.log('✅ Sessão válida');
      return true;
      
    } catch (error) {
      console.error('💥 Erro ao verificar sessão:', error);
      return false;
    }
  }
  
  /**
   * Renova a sessão atual
   */
  static async refreshSession(): Promise<boolean> {
    if (this.refreshInProgress) {
      console.log('⏳ Renovação já em andamento...');
      return false;
    }
    
    try {
      this.refreshInProgress = true;
      console.log('🔄 Renovando sessão...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Erro ao renovar sessão:', error);
        return false;
      }
      
      if (data.session) {
        console.log('✅ Sessão renovada com sucesso');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('💥 Erro na renovação:', error);
      return false;
    } finally {
      this.refreshInProgress = false;
    }
  }
  
  /**
   * Verifica se o usuário está autenticado
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log('❌ Usuário não autenticado');
        return false;
      }
      
      console.log('✅ Usuário autenticado:', user.email);
      return true;
      
    } catch (error) {
      console.error('💥 Erro ao verificar autenticação:', error);
      return false;
    }
  }
  
  /**
   * Força logout e redirecionamento
   */
  static async forceLogout(): Promise<void> {
    try {
      console.log('🚪 Fazendo logout...');
      await supabase.auth.signOut();
      
      // Redirecionar para página de login
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('💥 Erro no logout:', error);
      // Mesmo com erro, redirecionar
      window.location.href = '/auth';
    }
  }
  
  /**
   * Configura renovação automática da sessão
   */
  static setupAutoRefresh(): void {
    // Verificar sessão a cada 4 minutos
    setInterval(async () => {
      const isValid = await this.ensureValidSession();
      if (!isValid) {
        console.log('⚠️ Sessão inválida detectada, forçando logout...');
        await this.forceLogout();
      }
    }, 4 * 60 * 1000); // 4 minutos
    
    console.log('🔄 Auto-renovação de sessão configurada');
  }
}