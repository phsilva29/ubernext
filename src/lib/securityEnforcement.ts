/**
 * Utilities de segurança para enforcement de HTTPS e CSP
 */

/**
 * Força redirecionamento para HTTPS em produção
 */
export const enforceHTTPS = (): void => {
  // Só em produção e se não estiver usando HTTPS
  if (import.meta.env.PROD && window.location.protocol !== 'https:') {
    // Evita redirect em localhost para desenvolvimento
    if (!window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
      window.location.replace(window.location.href.replace('http:', 'https:'));
    }
  }
};

/**
 * Configura Content Security Policy via meta tag
 */
export const setupCSP = (): void => {
  // Só adiciona se não existir
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    cspMeta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    document.head.appendChild(cspMeta);
  }
};

/**
 * Configura headers de segurança adicionais
 */
export const setupSecurityHeaders = (): void => {
  // X-Frame-Options
  const frameOptions = document.createElement('meta');
  frameOptions.name = 'X-Frame-Options';
  frameOptions.content = 'DENY';
  document.head.appendChild(frameOptions);

  // X-Content-Type-Options
  const contentTypeOptions = document.createElement('meta');
  contentTypeOptions.name = 'X-Content-Type-Options';
  contentTypeOptions.content = 'nosniff';
  document.head.appendChild(contentTypeOptions);

  // Referrer Policy
  const referrerPolicy = document.createElement('meta');
  referrerPolicy.name = 'referrer';
  referrerPolicy.content = 'strict-origin-when-cross-origin';
  document.head.appendChild(referrerPolicy);
};

/**
 * Detecta e bloqueia tentativas de XSS simples
 */
export const detectXSSAttempt = (input: string): boolean => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Monitora tentativas de acesso não autorizado
 */
export const monitorSecurityEvents = (): void => {
  // Monitor para tentativas de acesso a localStorage de outros domínios
  window.addEventListener('storage', (event) => {
    if (event.storageArea === localStorage) {
      console.warn('🔐 Tentativa de acesso ao localStorage detectada', {
        key: event.key,
        oldValue: event.oldValue ? '[REDACTED]' : null,
        newValue: event.newValue ? '[REDACTED]' : null,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Monitor para mudanças de visibilidade (possível tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // App ficou em background - pode implementar lógica de timeout
      sessionStorage.setItem('last_activity', Date.now().toString());
    }
  });

  // Monitor para tentativas de debug
  let devToolsOpen = false;
  setInterval(() => {
    const threshold = 160;
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        console.warn('🔐 DevTools detectado - dados sensíveis podem estar expostos');
      }
    } else {
      devToolsOpen = false;
    }
  }, 1000);
};

/**
 * Limpa dados sensíveis da memória
 */
export const cleanupSensitiveData = (): void => {
  // Remove dados temporários
  const keysToRemove = Object.keys(sessionStorage).filter(key => 
    key.startsWith('temp_') || key.startsWith('cache_')
  );
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Force garbage collection (se disponível)
  if (window.gc) {
    window.gc();
  }
};

/**
 * Verifica integridade do DOM para detectar tampering
 */
export const checkDOMIntegrity = (): boolean => {
  // Verifica se há scripts injetados não autorizados
  const scripts = document.querySelectorAll('script');
  const unauthorizedScripts = Array.from(scripts).filter(script => {
    const src = script.src;
    if (!src) return false; // Scripts inline são OK se foram adicionados pelo app
    
    // Lista de domínios autorizados
    const allowedDomains = [
      window.location.hostname,
      'cdn.jsdelivr.net',
      'unpkg.com'
    ];
    
    return !allowedDomains.some(domain => src.includes(domain));
  });

  if (unauthorizedScripts.length > 0) {
    console.error('🚨 Scripts não autorizados detectados:', unauthorizedScripts);
    return false;
  }

  return true;
};

/**
 * Configuração completa de segurança - chamar no startup
 */
export const initializeSecurity = (): void => {
  enforceHTTPS();
  setupCSP();
  setupSecurityHeaders();
  monitorSecurityEvents();
  
  // Verificação periódica da integridade
  setInterval(checkDOMIntegrity, 30000); // A cada 30 segundos
  
  // Limpeza periódica
  setInterval(cleanupSensitiveData, 5 * 60 * 1000); // A cada 5 minutos
  
  console.log('🔐 Sistema de segurança inicializado');
};

/**
 * Utilidade para mascarar dados sensíveis em logs
 */
export const maskSensitiveData = (data: unknown): unknown => {
  if (typeof data === 'string') {
    // Mascarar email
    if (data.includes('@')) {
      const [user, domain] = data.split('@');
      return `${user.substring(0, 2)}***@${domain}`;
    }
    
    // Mascarar tokens/senhas
    if (data.length > 10) {
      return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    const masked = { ...data as Record<string, unknown> };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'email'];
    
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        masked[key] = '[REDACTED]';
      }
    }
    
    return masked;
  }
  
  return data;
};