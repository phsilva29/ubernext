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
  outrasDespesas?: number;
}

export interface OutraDespesa {
  id?: string;
  description: string;
  amount: number;
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
  totalOutrasDespesas: number;
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