// Utilitário para verificar autenticação e permissões
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export class AuthValidator {
  
  /**
   * Verifica se o usuário está autenticado e tem permissões válidas
   */
  static async validateUserAuth(): Promise<{
    isValid: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // 1. Verificar sessão
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        return { isValid: false, error: 'Erro ao verificar sessão' };
      }
      
      if (!sessionData.session) {
        return { isValid: false, error: 'Nenhuma sessão ativa' };
      }
      
      const session = sessionData.session;
      
      // 2. Verificar se a sessão não expirou
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        return { isValid: false, error: 'Sessão expirada' };
      }
      
      // 3. Verificar usuário
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        return { isValid: false, error: 'Erro ao obter dados do usuário' };
      }
      
      if (!userData.user) {
        return { isValid: false, error: 'Usuário não encontrado' };
      }
      
      // 4. Verificar se o token JWT é válido
      const token = session.access_token;
      if (!token) {
        return { isValid: false, error: 'Token de acesso inválido' };
      }
      
      return { isValid: true, user: userData.user };
      
    } catch (error) {
      return { isValid: false, error: 'Erro inesperado na validação' };
    }
  }
  
  /**
   * Força logout e redirecionamento
   */
  static async forceLogout(reason: string = '') {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore logout errors
    }
    
    // Limpar localStorage
    localStorage.clear();
    
    // Redirecionar
    const message = reason ? `${reason}\n\nVocê será redirecionado para a página de login.` : 'Redirecionando para login...';
    alert(message);
    
    setTimeout(() => {
      window.location.href = '/auth';
    }, 1000);
  }
}