import { z } from 'zod';

// Schemas de validação para maior segurança
export const viagemSchema = z.object({
  data: z.date(),
  kmRodados: z.number().min(0.1).max(9999).refine(val => !isNaN(val), {
    message: "Quilometragem deve ser um número válido"
  }),
  precoGasolina: z.number().min(0.01).max(50).refine(val => !isNaN(val), {
    message: "Preço da gasolina deve ser um número válido"
  }),
  consumo: z.number().min(1).max(50).refine(val => !isNaN(val), {
    message: "Consumo deve ser um número válido"
  }),
  valorGanho: z.number().min(0.01).max(999999.99).refine(val => !isNaN(val), {
    message: "Valor ganho deve ser um número válido"
  })
});

export const despesaSchema = z.object({
  categoria: z.string().min(1, "Categoria é obrigatória").max(100),
  descricao: z.string().min(1, "Descrição é obrigatória").max(500),
  valor: z.number().min(0.01, "Valor deve ser maior que zero").max(999999.99),
  data: z.date(),
  origem: z.string().min(1, "Origem é obrigatória").max(200),
  observacoes: z.string().max(1000).optional()
});

export const userSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).optional()
});

// Função para sanitizar strings
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres potencialmente perigosos
    .substring(0, 1000); // Limita tamanho
};

// Função para validar e sanitizar dados de viagem
export const validateAndSanitizeViagem = (data: any) => {
  const sanitizedData = {
    ...data,
    // Sanitização não necessária para números, mas garantindo que são números
    kmRodados: Number(data.kmRodados),
    precoGasolina: Number(data.precoGasolina),
    consumo: Number(data.consumo),
    valorGanho: Number(data.valorGanho)
  };

  return viagemSchema.parse(sanitizedData);
};

// Função para validar e sanitizar dados de despesa
export const validateAndSanitizeDespesa = (data: any) => {
  const sanitizedData = {
    ...data,
    categoria: sanitizeString(data.categoria),
    descricao: sanitizeString(data.descricao),
    origem: sanitizeString(data.origem),
    observacoes: data.observacoes ? sanitizeString(data.observacoes) : undefined,
    valor: Number(data.valor)
  };

  return despesaSchema.parse(sanitizedData);
};

// Função para validar dados de usuário
export const validateUser = (data: any) => {
  const sanitizedData = {
    ...data,
    email: sanitizeString(data.email).toLowerCase(),
    nome: data.nome ? sanitizeString(data.nome) : undefined
  };

  return userSchema.parse(sanitizedData);
};

export type ValidatedViagem = z.infer<typeof viagemSchema>;
export type ValidatedDespesa = z.infer<typeof despesaSchema>;
export type ValidatedUser = z.infer<typeof userSchema>;