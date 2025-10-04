export interface Viagem {
  id?: string;
  data: Date;
  kmRodados: number;
  precoGasolina: number;
  consumo: number;
  valorGanho: number;
  gastosCombustivel?: number;
  lucroLiquido?: number;
  lucroKm?: number;
}

export interface Despesa {
  id?: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: Date;
  origem: string;
  observacoes?: string;
  created_at?: string;
}

export interface DadosDashboard {
  viagens: Viagem[];
  totalViagens: number;
  totalKmRodados: number;
  totalGanhos: number;
  totalGastos: number;
  lucroTotal: number;
  mediaLucroPorKm: number;
  mediaConsumo: number;
  historicoMensal: {
    mes: string;
    ganhos: number;
    gastos: number;
    lucro: number;
    kmRodados: number;
  }[];
  comparativoCombustivel: {
    data: string;
    precoGasolina: number;
  }[];
}