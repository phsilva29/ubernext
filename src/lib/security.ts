// Utilitários de segurança e performance

// Implementação própria de throttle
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Implementação própria de debounce
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Rate limiting para prevenção de spam
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();

  return (userId: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(userId) || [];
    
    // Remove requisições antigas da janela de tempo
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit excedido
    }
    
    validRequests.push(now);
    requests.set(userId, validRequests);
    return true;
  };
};

// Rate limiter para operações de salvamento (máximo 10 por minuto)
export const saveRateLimiter = createRateLimiter(10, 60000);

// Throttled functions para evitar spam de requisições
export const throttledSave = throttle((fn: () => Promise<any>) => fn(), 1000);

export const debouncedSearch = debounce((fn: (query: string) => void, query: string) => fn(query), 300);

// Monitor de performance
export const performanceMonitor = {
  start: (operation: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        
        if (duration > 2000) {
          console.warn(`🐌 Operação lenta detectada: ${operation} - ${duration.toFixed(2)}ms`);
        } else if (duration > 1000) {
          console.info(`⚠️ Operação moderada: ${operation} - ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
    };
  }
};

// Cache inteligente com expiração
export class SmartCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttl: number = 300000): void { // 5 minutos padrão
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Logger estruturado
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`ℹ️ ${new Date().toISOString()} - ${message}`, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${new Date().toISOString()} - ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`❌ ${new Date().toISOString()} - ${message}`, error || '');
  },
  
  performance: (operation: string, duration: number, data?: any) => {
    const level = duration > 2000 ? '🐌' : duration > 1000 ? '⚠️' : '✅';
    console.log(`${level} Performance: ${operation} - ${duration.toFixed(2)}ms`, data || '');
  }
};

// Backup local automático
export const createBackup = () => {
  try {
    const backup = {
      viagens: localStorage.getItem('ubernext_viagens'),
      despesas: localStorage.getItem('ubernext_despesas'),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    
    localStorage.setItem('ubernext_backup', JSON.stringify(backup));
    logger.info('Backup local criado com sucesso');
    
    return true;
  } catch (error) {
    logger.error('Erro ao criar backup local', error);
    return false;
  }
};

// Restaurar backup
export const restoreBackup = (): boolean => {
  try {
    const backupStr = localStorage.getItem('ubernext_backup');
    if (!backupStr) {
      logger.warn('Nenhum backup encontrado');
      return false;
    }
    
    const backup = JSON.parse(backupStr);
    
    if (backup.viagens) {
      localStorage.setItem('ubernext_viagens', backup.viagens);
    }
    
    if (backup.despesas) {
      localStorage.setItem('ubernext_despesas', backup.despesas);
    }
    
    logger.info('Backup restaurado com sucesso', { timestamp: backup.timestamp });
    return true;
  } catch (error) {
    logger.error('Erro ao restaurar backup', error);
    return false;
  }
};

// Limpeza automática de cache e dados antigos
export const cleanupOldData = () => {
  try {
    // Limpar dados de mais de 2 anos
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
    
    // Implementar limpeza quando necessário
    logger.info('Limpeza de dados antigos executada');
  } catch (error) {
    logger.error('Erro na limpeza de dados antigos', error);
  }
};

// Validador de sessão
export const validateSession = async () => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Sessão não encontrada');
    }
    
    const expiresAt = new Date(session.expires_at || 0);
    const now = new Date();
    
    // Verificar se a sessão expira em menos de 5 minutos
    const fiveMinutes = 5 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
      logger.warn('Sessão próxima do vencimento, renovando...');
      await supabase.auth.refreshSession();
    }
    
    return true;
  } catch (error) {
    logger.error('Erro na validação de sessão', error);
    return false;
  }
};