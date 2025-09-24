import { Viagem, DadosDashboard } from '@/types';

class ViagemService {
  private static readonly STORAGE_KEY = '@UberNext:viagens';

  // Excluir uma viagem
  static async excluirViagem(id: string): Promise<void> {
    try {
      const viagens = await this.obterViagens();
      const index = viagens.findIndex(v => v.id === id);
      if (index !== -1) {
        viagens.splice(index, 1);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(viagens));
      }
    } catch (error) {
      console.error('Erro ao excluir viagem:', error);
      throw error;
    }
  }

  // Editar uma viagem
  static async editarViagem(id: string, viagemAtualizada: Viagem): Promise<Viagem> {
    try {
      const viagens = await this.obterViagens();
      const index = viagens.findIndex(v => v.id === id);
      if (index !== -1) {
        const viagemEditada = {
          ...viagemAtualizada,
          id,
          gastosCombustivel: (viagemAtualizada.kmRodados / viagemAtualizada.consumo) * viagemAtualizada.precoGasolina,
          lucroLiquido: viagemAtualizada.valorGanho - ((viagemAtualizada.kmRodados / viagemAtualizada.consumo) * viagemAtualizada.precoGasolina),
          lucroKm: (viagemAtualizada.valorGanho - ((viagemAtualizada.kmRodados / viagemAtualizada.consumo) * viagemAtualizada.precoGasolina)) / viagemAtualizada.kmRodados
        };
        viagens[index] = viagemEditada;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(viagens));
        return viagemEditada;
      }
      throw new Error('Viagem não encontrada');
    } catch (error) {
      console.error('Erro ao editar viagem:', error);
      throw error;
    }
  }

  // Salvar uma nova viagem
  static async salvarViagem(viagem: Viagem): Promise<Viagem> {
    try {
      const viagens = await this.obterViagens();
      const novaViagem = {
        ...viagem,
        id: crypto.randomUUID(),
        gastosCombustivel: (viagem.kmRodados / viagem.consumo) * viagem.precoGasolina,
        lucroLiquido: viagem.valorGanho - ((viagem.kmRodados / viagem.consumo) * viagem.precoGasolina),
        lucroKm: (viagem.valorGanho - ((viagem.kmRodados / viagem.consumo) * viagem.precoGasolina)) / viagem.kmRodados
      };
      
      viagens.push(novaViagem);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(viagens));
      return novaViagem;
    } catch (error) {
      console.error('Erro ao salvar viagem:', error);
      throw error;
    }
  }

  // Obter todas as viagens
  static async obterViagens(): Promise<Viagem[]> {
    try {
      const dados = localStorage.getItem(this.STORAGE_KEY);
      if (!dados) return [];
      
      const viagens = JSON.parse(dados);
      return viagens.map((v: any) => ({
        ...v,
        data: new Date(v.data)
      }));
    } catch (error) {
      console.error('Erro ao obter viagens:', error);
      return [];
    }
  }

  // Obter dados para o dashboard
  static async obterDadosDashboard(): Promise<DadosDashboard> {
    try {
      const viagens = await this.obterViagens();
      
      const dadosDashboard: DadosDashboard = {
        viagens,
        totalViagens: viagens.length,
        totalKmRodados: viagens.reduce((acc, v) => acc + v.kmRodados, 0),
        totalGanhos: viagens.reduce((acc, v) => acc + v.valorGanho, 0),
        totalGastos: viagens.reduce((acc, v) => acc + (v.gastosCombustivel || 0), 0),
        lucroTotal: viagens.reduce((acc, v) => acc + (v.lucroLiquido || 0), 0),
        mediaLucroPorKm: viagens.length > 0 ? viagens.reduce((acc, v) => acc + (v.lucroKm || 0), 0) / viagens.length : 0,
        mediaConsumo: viagens.length > 0 ? viagens.reduce((acc, v) => acc + v.consumo, 0) / viagens.length : 0,
        historicoMensal: this.calcularHistoricoMensal(viagens),
        comparativoCombustivel: this.obterComparativoCombustivel(viagens)
      };

      return dadosDashboard;
    } catch (error) {
      console.error('Erro ao obter dados do dashboard:', error);
      throw error;
    }
  }

  // Calcular histórico mensal
  private static calcularHistoricoMensal(viagens: Viagem[]) {
    const historicoMap = new Map();

    viagens.forEach(viagem => {
      const mes = viagem.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const dadosMes = historicoMap.get(mes) || {
        mes,
        ganhos: 0,
        gastos: 0,
        lucro: 0,
        kmRodados: 0
      };

      dadosMes.ganhos += viagem.valorGanho;
      dadosMes.gastos += viagem.gastosCombustivel || 0;
      dadosMes.lucro += viagem.lucroLiquido || 0;
      dadosMes.kmRodados += viagem.kmRodados;

      historicoMap.set(mes, dadosMes);
    });

    return Array.from(historicoMap.values());
  }

  // Obter comparativo de preços de combustível
  private static obterComparativoCombustivel(viagens: Viagem[]) {
    return viagens
      .map(v => ({
        data: v.data.toLocaleDateString('pt-BR'),
        precoGasolina: v.precoGasolina
      }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }
}

export default ViagemService;