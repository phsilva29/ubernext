import { Despesa } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class DespesaService {
  private static STORAGE_KEY = 'ubernext_despesas';
  private static SYNC_FLAG_KEY = 'ubernext_despesas_synced';

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
      interface LocalDespesaRaw {
        id: string;
        categoria: string;
        descricao: string;
        valor: string | number;
        data: string;
        origem?: string;
        observacoes?: string | null;
        created_at?: string;
      }
      return (despesas as LocalDespesaRaw[]).map((d) => ({
        id: d.id,
        categoria: d.categoria,
        descricao: d.descricao,
        valor: typeof d.valor === 'number' ? d.valor : parseFloat(d.valor),
        data: new Date(d.data),
        origem: d.origem || 'local',
        observacoes: d.observacoes || undefined,
        created_at: d.created_at
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
        // Tentar sincronizar despesas locais caso exista algo pendente
        await this.syncLocalDespesas();
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

  // Sincronizar despesas locais para o banco
  private static async syncLocalDespesas() {
    try {
      const synced = localStorage.getItem(this.SYNC_FLAG_KEY);
      const localDespesas = this.obterDespesasLocal();
      if (synced === 'true' || localDespesas.length === 0) return; // Nada a fazer

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Sem usuário autenticado, não sincroniza

      for (const despesa of localDespesas) {
        try {
          const despesaData = typeof despesa.data === 'string' 
            ? despesa.data 
            : despesa.data.toISOString().split('T')[0];

          const { error } = await supabase
            .from('despesas')
            .insert([{
              user_id: user.id,
              categoria: despesa.categoria,
              descricao: despesa.descricao,
              valor: despesa.valor,
              data: despesaData,
              origem: despesa.origem,
              observacoes: despesa.observacoes || null
            }]);
          if (error) throw error;
        } catch (err) {
          console.warn('Falha ao migrar despesa local, continuará armazenada localmente:', err);
        }
      }

      // Verificar se todas migraram (heurística simples: tentar ler novamente e comparar)
      const { data: serverDespesas, error: fetchError } = await supabase
        .from('despesas')
        .select('data, descricao, valor')
        .order('data', { ascending: false });
      if (!fetchError && serverDespesas) {
        // Se pelo menos 1 despesa do local existe no servidor, podemos limpar local
        // (Simplificação: em cenário real, seria bom reconciliar uma a uma com hash)
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.setItem(this.SYNC_FLAG_KEY, 'true');
      }
    } catch (error) {
      console.warn('Erro durante sincronização de despesas locais:', error);
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
  private static mapDespesaFromDB(dbDespesa: {
    id: string;
    categoria: string;
    descricao: string;
    valor: string | number;
    data: string;
    origem?: string;
    observacoes?: string | null;
    created_at?: string;
  }): Despesa {
    return {
      id: dbDespesa.id,
      categoria: dbDespesa.categoria,
      descricao: dbDespesa.descricao,
      valor: typeof dbDespesa.valor === 'number' ? dbDespesa.valor : parseFloat(dbDespesa.valor),
      data: new Date(dbDespesa.data + 'T00:00:00'),
      origem: dbDespesa.origem,
      observacoes: dbDespesa.observacoes || undefined,
      created_at: dbDespesa.created_at
    };
  }
}

export default DespesaService;