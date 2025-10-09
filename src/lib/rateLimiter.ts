/**
 * Sistema de Rate Limiting avançado para segurança
 * Previne ataques de força bruta e spam
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Verifica se uma ação é permitida para um identificador
   */
  isAllowed(identifier: string): { allowed: boolean; timeUntilReset?: number } {
    const now = Date.now();
    const record = this.records.get(identifier);

    // Se não há registro, permitir
    if (!record) {
      this.records.set(identifier, {
        attempts: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Se está bloqueado, verificar se o bloqueio expirou
    if (record.blockedUntil && now < record.blockedUntil) {
      return { 
        allowed: false, 
        timeUntilReset: record.blockedUntil - now 
      };
    }

    // Se a janela de tempo expirou, resetar contador
    if (now - record.firstAttempt > this.config.windowMs) {
      this.records.set(identifier, {
        attempts: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Incrementar tentativas
    record.attempts++;

    // Se excedeu o limite, bloquear
    if (record.attempts > this.config.maxAttempts) {
      record.blockedUntil = now + this.config.blockDurationMs;
      return { 
        allowed: false, 
        timeUntilReset: this.config.blockDurationMs 
      };
    }

    this.records.set(identifier, record);
    return { allowed: true };
  }

  /**
   * Reset manual de um identificador (para admin)
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Limpeza automática de registros expirados
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records) {
      // Remove registros antigos (mais de 24h)
      if (now - record.firstAttempt > 24 * 60 * 60 * 1000) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Obter estatísticas do rate limiter
   */
  getStats(): { totalRecords: number; blockedRecords: number } {
    const now = Date.now();
    let blockedRecords = 0;
    
    for (const record of this.records.values()) {
      if (record.blockedUntil && now < record.blockedUntil) {
        blockedRecords++;
      }
    }

    return {
      totalRecords: this.records.size,
      blockedRecords
    };
  }
}

// Rate limiters específicos para diferentes operações
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,           // 5 tentativas
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 30 * 60 * 1000 // Bloqueia por 30 minutos
});

export const signupRateLimiter = new RateLimiter({
  maxAttempts: 3,           // 3 tentativas
  windowMs: 60 * 60 * 1000, // 1 hora
  blockDurationMs: 2 * 60 * 60 * 1000 // Bloqueia por 2 horas
});

export const saveRateLimiter = new RateLimiter({
  maxAttempts: 20,          // 20 salvamentos
  windowMs: 60 * 1000,      // 1 minuto
  blockDurationMs: 5 * 60 * 1000 // Bloqueia por 5 minutos
});

export const otpRateLimiter = new RateLimiter({
  maxAttempts: 5,           // 5 tentativas de código
  windowMs: 10 * 60 * 1000, // 10 minutos
  blockDurationMs: 15 * 60 * 1000 // Bloqueia por 15 minutos
});

/**
 * Obter identificador único para rate limiting
 * Combina IP (simulado via localStorage) + user agent
 */
export const getRateLimitId = (userId?: string): string => {
  const fingerprint = localStorage.getItem('device_fingerprint') || 
                     Math.random().toString(36).substring(2);
  
  if (!localStorage.getItem('device_fingerprint')) {
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  
  const userAgent = navigator.userAgent.substring(0, 50);
  return `${fingerprint}_${userAgent}_${userId || 'anonymous'}`;
};

/**
 * Middleware para verificar rate limit antes de operações sensíveis
 */
export const checkRateLimit = (
  limiter: RateLimiter, 
  identifier: string,
  operation: string
): { allowed: boolean; message?: string } => {
  const result = limiter.isAllowed(identifier);
  
  if (!result.allowed) {
    const minutes = Math.ceil((result.timeUntilReset || 0) / (60 * 1000));
    return {
      allowed: false,
      message: `Muitas tentativas de ${operation}. Tente novamente em ${minutes} minuto(s).`
    };
  }
  
  return { allowed: true };
};

/**
 * Limpeza automática periódica (executar no startup da app)
 */
export const startRateLimitCleanup = (): void => {
  const cleanup = () => {
    loginRateLimiter.cleanup();
    signupRateLimiter.cleanup();
    saveRateLimiter.cleanup();
    otpRateLimiter.cleanup();
  };
  
  // Limpeza a cada hora
  setInterval(cleanup, 60 * 60 * 1000);
  
  // Limpeza inicial
  cleanup();
};

/**
 * Obter estatísticas de todos os rate limiters
 */
export const getRateLimitStats = () => {
  return {
    login: loginRateLimiter.getStats(),
    signup: signupRateLimiter.getStats(),
    save: saveRateLimiter.getStats(),
    otp: otpRateLimiter.getStats()
  };
};