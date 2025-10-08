import { Viagem, DadosDashboard } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import DespesaService from './DespesaService';

class ViagemService {
  // Validação de campos de viagem
  private static validateViagemInput(viagem: Viagem) {
    if (!viagem.data) throw new Error('Data da viagem é obrigatória');
    if (isNaN(viagem.kmRodados) || viagem.kmRodados <= 0) throw new Error('Quilometragem inválida');
    if (isNaN(viagem.precoGasolina) || viagem.precoGasolina <= 0) throw new Error('Preço da gasolina inválido');
    if (isNaN(viagem.consumo) || viagem.consumo <= 0) throw new Error('Consumo inválido');
    if (isNaN(viagem.valorGanho) || viagem.valorGanho < 0) throw new Error('Valor ganho inválido');
    if (viagem.kmRodados > 2000) throw new Error('KM rodados muito alto para um único dia');
    if (viagem.consumo > 40) throw new Error('Consumo informado parece incorreto');
  }
  // Salvar uma nova viagem
  static async salvarViagem(viagem: Viagem): Promise<Viagem> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      this.validateViagemInput(viagem);

      const gastosCombustivel = (viagem.kmRodados / viagem.consumo) * viagem.precoGasolina;
      const lucroLiquido = viagem.valorGanho - gastosCombustivel;
      const lucroKm = lucroLiquido / viagem.kmRodados;

      const viagemData = typeof viagem.data === 'string' 
        ? viagem.data 
        : viagem.data.toISOString().split('T')[0];

      // Verificar se já existe viagem para o mesmo dia (evita duplicidade)
      const { data: existing, error: existingError } = await supabase
        .from('viagens')
        .select('*')
        .eq('user_id', user.id)
        .eq('data', viagemData)
        .maybeSingle();
      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      let data;
      let error;
      if (existing) {
        // Atualiza registro existente
        ({ data, error } = await supabase
          .from('viagens')
          .update({
            km_rodados: viagem.kmRodados,
            preco_gasolina: viagem.precoGasolina,
            consumo: viagem.consumo,
            valor_ganho: viagem.valorGanho,
            gastos_combustivel: gastosCombustivel,
            lucro_liquido: lucroLiquido,
            lucro_km: lucroKm
          })
          .eq('id', existing.id)
          .eq('user_id', user.id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('viagens')
          .insert([{
            user_id: user.id,
            data: viagemData,
            km_rodados: viagem.kmRodados,
            preco_gasolina: viagem.precoGasolina,
            consumo: viagem.consumo,
            valor_ganho: viagem.valorGanho,
            gastos_combustivel: gastosCombustivel,
            lucro_liquido: lucroLiquido,
            lucro_km: lucroKm
          }])
          .select()
          .single());
      }

      if (error) throw error;

      return this.mapViagemFromDB(data);
    } catch (error) {
      console.error('Erro ao salvar viagem:', error);
      throw error;
    }
  }

  // Obter todas as viagens
  static async obterViagens(): Promise<Viagem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('viagens')
        .select('*')
        .eq('user_id', user.id)
        .order('data', { ascending: false });

      if (error) throw error;

      return data.map(this.mapViagemFromDB);
    } catch (error) {
      console.error('Erro ao obter viagens:', error);
      return [];
    }
  }

  // Editar uma viagem
  static async editarViagem(id: string, viagemAtualizada: Viagem): Promise<Viagem> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      this.validateViagemInput(viagemAtualizada);

      const gastosCombustivel = (viagemAtualizada.kmRodados / viagemAtualizada.consumo) * viagemAtualizada.precoGasolina;
      const lucroLiquido = viagemAtualizada.valorGanho - gastosCombustivel;
      const lucroKm = lucroLiquido / viagemAtualizada.kmRodados;

      const viagemData = typeof viagemAtualizada.data === 'string' 
        ? viagemAtualizada.data 
        : viagemAtualizada.data.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('viagens')
        .update({
          data: viagemData,
          km_rodados: viagemAtualizada.kmRodados,
          preco_gasolina: viagemAtualizada.precoGasolina,
          consumo: viagemAtualizada.consumo,
          valor_ganho: viagemAtualizada.valorGanho,
          gastos_combustivel: gastosCombustivel,
          lucro_liquido: lucroLiquido,
          lucro_km: lucroKm
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return this.mapViagemFromDB(data);
    } catch (error) {
      console.error('Erro ao editar viagem:', error);
      throw error;
    }
  }

  // Excluir uma viagem
  static async excluirViagem(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('viagens')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir viagem:', error);
      throw error;
    }
  }

  // Obter dados para o dashboard
  static async obterDadosDashboard(): Promise<DadosDashboard> {
    try {
      const viagens = await this.obterViagens();
      const despesas = await DespesaService.obterDespesas();
      
      const totalGastosCombustivel = viagens.reduce((acc, v) => acc + (v.gastosCombustivel || 0), 0);
      const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
      const totalGastos = totalGastosCombustivel + totalDespesas;
      const totalGanhos = viagens.reduce((acc, v) => acc + v.valorGanho, 0);
      const lucroTotal = totalGanhos - totalGastos;
      
      const dadosDashboard: DadosDashboard = {
        viagens,
        totalViagens: viagens.length,
        totalKmRodados: viagens.reduce((acc, v) => acc + v.kmRodados, 0),
        totalGanhos,
        totalGastos,
        lucroTotal,
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

  // Mapear dados do banco para interface Viagem
  private static mapViagemFromDB(dbViagem: {
    id: string;
    data: string;
    km_rodados: string | number;
    preco_gasolina: string | number;
    consumo: string | number;
    valor_ganho: string | number;
    gastos_combustivel?: string | number | null;
    lucro_liquido?: string | number | null;
    lucro_km?: string | number | null;
  }): Viagem {
    const v = dbViagem;
    return {
      id: v.id,
      data: new Date(v.data + 'T00:00:00'),
      kmRodados: typeof v.km_rodados === 'number' ? v.km_rodados : parseFloat(v.km_rodados),
      precoGasolina: typeof v.preco_gasolina === 'number' ? v.preco_gasolina : parseFloat(v.preco_gasolina),
      consumo: typeof v.consumo === 'number' ? v.consumo : parseFloat(v.consumo),
      valorGanho: typeof v.valor_ganho === 'number' ? v.valor_ganho : parseFloat(v.valor_ganho),
      gastosCombustivel: v.gastos_combustivel != null ? (typeof v.gastos_combustivel === 'number' ? v.gastos_combustivel : parseFloat(v.gastos_combustivel)) : undefined,
      lucroLiquido: v.lucro_liquido != null ? (typeof v.lucro_liquido === 'number' ? v.lucro_liquido : parseFloat(v.lucro_liquido)) : undefined,
      lucroKm: v.lucro_km != null ? (typeof v.lucro_km === 'number' ? v.lucro_km : parseFloat(v.lucro_km)) : undefined
    };
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