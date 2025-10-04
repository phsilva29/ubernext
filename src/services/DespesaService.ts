import { Despesa } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class DespesaService {
  private static STORAGE_KEY = 'ubernext_despesas';

  // Método para gerar ID único
  private static generateId(): string {
    return 'despesa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Salvar uma nova despesa (usando localStorage temporariamente)
  static async salvarDespesa(despesa: Despesa): Promise<Despesa> {
    try {
      // Tentar salvar no Supabase primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const despesaData = typeof despesa.data === 'string' 
        ? despesa.data 
        : despesa.data.toISOString().split('T')[0];

      try {
        const { data, error } = await supabase
          .from('despesas')
          .insert([{
            user_id: user.id,
            categoria: despesa.categoria,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: despesaData,
            origem: despesa.origem,
            observacoes: despesa.observacoes || null
          }])
          .select()
          .single();

        if (error) throw error;
        return this.mapDespesaFromDB(data);
      } catch (dbError) {
        console.warn('Erro ao salvar no banco, usando localStorage:', dbError);
        // Fallback para localStorage
        return this.salvarDespesaLocal(despesa);
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      // Fallback para localStorage
      return this.salvarDespesaLocal(despesa);
    }
  }

  // Salvar no localStorage
  private static salvarDespesaLocal(despesa: Despesa): Despesa {
    const despesasExistentes = this.obterDespesasLocal();
    const novaDespesa: Despesa = {
      ...despesa,
      id: this.generateId(),
      created_at: new Date().toISOString()
    };
    
    despesasExistentes.push(novaDespesa);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(despesasExistentes));
    return novaDespesa;
  }

  // Obter despesas do localStorage
  private static obterDespesasLocal(): Despesa[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const despesas = JSON.parse(stored);
      return despesas.map((d: any) => ({
        ...d,
        data: new Date(d.data),
        valor: parseFloat(d.valor)
      }));
    } catch (error) {
      console.error('Erro ao obter despesas do localStorage:', error);
      return [];
    }
  }

  // Obter todas as despesas
  static async obterDespesas(): Promise<Despesa[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.obterDespesasLocal();

      try {
        const { data, error } = await supabase
          .from('despesas')
          .select('*')
          .eq('user_id', user.id)
          .order('data', { ascending: false });

        if (error) throw error;
        return data.map(this.mapDespesaFromDB);
      } catch (dbError) {
        console.warn('Erro ao obter do banco, usando localStorage:', dbError);
        return this.obterDespesasLocal();
      }
    } catch (error) {
      console.error('Erro ao obter despesas:', error);
      return this.obterDespesasLocal();
    }
  }

  // Editar uma despesa
  static async editarDespesa(id: string, despesaAtualizada: Despesa): Promise<Despesa> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const despesaData = typeof despesaAtualizada.data === 'string' 
        ? despesaAtualizada.data 
        : despesaAtualizada.data.toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('despesas')
          .update({
            categoria: despesaAtualizada.categoria,
            descricao: despesaAtualizada.descricao,
            valor: despesaAtualizada.valor,
            data: despesaData,
            origem: despesaAtualizada.origem,
            observacoes: despesaAtualizada.observacoes || null
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return this.mapDespesaFromDB(data);
      } catch (dbError) {
        console.warn('Erro ao editar no banco, usando localStorage:', dbError);
        return this.editarDespesaLocal(id, despesaAtualizada);
      }
    } catch (error) {
      console.error('Erro ao editar despesa:', error);
      return this.editarDespesaLocal(id, despesaAtualizada);
    }
  }

  // Editar no localStorage
  private static editarDespesaLocal(id: string, despesaAtualizada: Despesa): Despesa {
    const despesas = this.obterDespesasLocal();
    const index = despesas.findIndex(d => d.id === id);
    
    if (index === -1) throw new Error('Despesa não encontrada');
    
    despesas[index] = { ...despesas[index], ...despesaAtualizada };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(despesas));
    return despesas[index];
  }

  // Excluir uma despesa
  static async excluirDespesa(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      try {
        const { error } = await supabase
          .from('despesas')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Erro ao excluir do banco, usando localStorage:', dbError);
        this.excluirDespesaLocal(id);
      }
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      this.excluirDespesaLocal(id);
    }
  }

  // Excluir do localStorage
  private static excluirDespesaLocal(id: string): void {
    const despesas = this.obterDespesasLocal();
    const despesasFiltradas = despesas.filter(d => d.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(despesasFiltradas));
  }

  // Mapear dados do banco para interface Despesa
  private static mapDespesaFromDB(dbDespesa: any): Despesa {
    return {
      id: dbDespesa.id,
      categoria: dbDespesa.categoria,
      descricao: dbDespesa.descricao,
      valor: parseFloat(dbDespesa.valor),
      data: new Date(dbDespesa.data + 'T00:00:00'),
      origem: dbDespesa.origem,
      observacoes: dbDespesa.observacoes,
      created_at: dbDespesa.created_at
    };
  }
}

export default DespesaService;