/**
 * Configuração de logging para produção
 * Centraliza e controla logs para evitar exposição em produção
 */

// Detectar se está em produção
const isProduction = import.meta.env.PROD;

export const logger = {
  /**
   * Log de informação (só em desenvolvimento)
   */
  info: (message: string, data?: unknown) => {
    if (!isProduction) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },

  /**
   * Log de aviso (sempre mostrar, mas sem dados sensíveis)
   */
  warn: (message: string, data?: unknown) => {
    if (!isProduction) {
      console.warn(`⚠️ ${message}`, data || '');
    } else {
      console.warn(`⚠️ ${message}`);
    }
  },

  /**
   * Log de erro (sempre mostrar, mas sem dados sensíveis em produção)
   */
  error: (message: string, error?: unknown) => {
    if (!isProduction) {
      console.error(`❌ ${message}`, error || '');
    } else {
      // Em produção, só mostra a mensagem sem dados sensíveis
      console.error(`❌ ${message}`);
    }
  },

  /**
   * Log de debug (nunca em produção)
   */
  debug: (message: string, data?: unknown) => {
    if (!isProduction) {
      console.log(`🔍 DEBUG: ${message}`, data || '');
    }
  },

  /**
   * Log de autenticação (cuidado com dados sensíveis)
   */
  auth: (message: string, safeData?: unknown) => {
    if (!isProduction) {
      console.log(`🔐 AUTH: ${message}`, safeData || '');
    }
  },

  /**
   * Log de performance (só em desenvolvimento)
   */
  performance: (operation: string, duration: number, data?: unknown) => {
    if (!isProduction) {
      const level = duration > 1000 ? '🐌' : duration > 500 ? '⚠️' : '✅';
      console.log(`${level} Performance: ${operation} - ${duration.toFixed(2)}ms`, data || '');
    }
  }
};

// Para compatibilidade com código existente
export const securityLogger = logger;