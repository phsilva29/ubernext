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

export interface OutraDespesa {
  id?: string;
  tripId?: string;
  description: string;
  amount: number;
  date?: string;
  category?: string;
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