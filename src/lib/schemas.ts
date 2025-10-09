import { z } from 'zod';

/**
 * Schemas de validação para inputs do usuário
 * Previne injection attacks e garante dados válidos
 */

// Schema para dados de cadastro
export const signupSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase(),
  
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Senha deve conter: letra minúscula, maiúscula, número e símbolo'),
           
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema para dados de login
export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .toLowerCase(),
  
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .max(128, 'Senha muito longa')
});

// Schema para dados de viagem
export const viagemSchema = z.object({
  data: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  
  km_rodados: z.number()
    .min(0, 'KM não pode ser negativo')
    .max(2000, 'KM muito alto para um dia')
    .multipleOf(0.1, 'KM deve ter no máximo 1 casa decimal'),
  
  preco_gasolina: z.number()
    .min(0, 'Preço não pode ser negativo')
    .max(20, 'Preço muito alto')
    .multipleOf(0.01, 'Preço deve ter no máximo 2 casas decimais'),
  
  consumo: z.number()
    .min(1, 'Consumo deve ser maior que 1')
    .max(50, 'Consumo muito alto')
    .multipleOf(0.1, 'Consumo deve ter no máximo 1 casa decimal'),
  
  valor_ganho: z.number()
    .min(0, 'Valor ganho não pode ser negativo')
    .max(10000, 'Valor muito alto para um dia')
    .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais')
});

// Schema para dados de despesa
export const despesaSchema = z.object({
  data: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  
  tipo: z.enum(['combustivel', 'manutencao', 'multa', 'lavagem', 'outros'], {
    errorMap: () => ({ message: 'Tipo de despesa inválido' })
  }),
  
  valor: z.number()
    .min(0.01, 'Valor deve ser maior que zero')
    .max(10000, 'Valor muito alto')
    .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais'),
  
  descricao: z.string()
    .min(1, 'Descrição é obrigatória')
    .max(255, 'Descrição muito longa')
    .regex(/^[a-zA-Z0-9À-ÿ\s\-.,!?()]+$/, 'Descrição contém caracteres inválidos')
});

// Schema para código OTP
export const otpSchema = z.object({
  code: z.string()
    .length(6, 'Código deve ter exatamente 6 dígitos')
    .regex(/^\d{6}$/, 'Código deve conter apenas números')
});

/**
 * Sanitização de strings para prevenir XSS
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/data:/gi, '') // Remove data:
    .replace(/vbscript:/gi, '') // Remove vbscript:
    .trim();
};

/**
 * Validação de URL para redirecionamentos seguros
 */
export const isValidRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Só permite URLs do mesmo domínio ou localhost
    return parsed.hostname === window.location.hostname || 
           parsed.hostname === 'localhost' ||
           parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

/**
 * Validação de arquivo para uploads (se implementado no futuro)
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande (máximo 5MB)' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }
  
  return { valid: true };
};

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ViagemData = z.infer<typeof viagemSchema>;
export type DespesaData = z.infer<typeof despesaSchema>;
export type OTPData = z.infer<typeof otpSchema>;