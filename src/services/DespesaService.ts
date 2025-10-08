import { Despesa } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class DespesaService {
  private static STORAGE_KEY = 'ubernext_despesas';
  // Removido SYNC_FLAG_KEY: sincronização agora é incremental e contínua

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
      const origemSegura = despesa.origem || 'Não Informado';

      try {
        const { data, error } = await supabase
          .from('despesas')
          .insert([{
            user_id: user.id,
            categoria: despesa.categoria,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: despesaData,
            origem: origemSegura,
            observacoes: despesa.observacoes || null
          }])
          .select()
          .single();

        if (error) throw error;
        return this.mapDespesaFromDB(data);
      } catch (dbError) {
        console.warn('Erro ao salvar no banco, usando localStorage:', dbError);
        // Fallback para localStorage
        return this.salvarDespesaLocal({ ...despesa, origem: origemSegura });
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      // Fallback para localStorage
      return this.salvarDespesaLocal({ ...despesa, origem: despesa.origem || 'Não Informado' });
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
    // Marcar como pendente usando propriedade simbólica não tipada (mantida apenas em memória)
    Object.defineProperty(novaDespesa, '__pending', {
      value: true,
      enumerable: false,
      configurable: true
    });
    
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
        await this.syncLocalDespesas(); // sempre tentar sincronizar
        const { data, error } = await supabase
          .from('despesas')
          .select('*')
          .eq('user_id', user.id)
          .order('data', { ascending: false });
        if (error) throw error;
        const servidor = data.map(this.mapDespesaFromDB);
        const locaisRestantes = this.obterDespesasLocal(); // só restam as que falharam
        return [...servidor, ...locaisRestantes];
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
      const localDespesas = this.obterDespesasLocal();
      if (localDespesas.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar despesas existentes para deduplicação
      const { data: existing, error: existingError } = await supabase
        .from('despesas')
        .select('id, data, descricao, valor')
        .eq('user_id', user.id);
      if (existingError) throw existingError;
      const existingKey = new Set((existing || []).map(d => `${d.data}|${d.descricao}|${d.valor}`));

      const pendentes: Despesa[] = [];
      for (const despesa of localDespesas) {
        try {
          const despesaData = typeof despesa.data === 'string' ? despesa.data : despesa.data.toISOString().split('T')[0];
          const key = `${despesaData}|${despesa.descricao}|${despesa.valor}`;
            if (existingKey.has(key)) continue;
          const { error } = await supabase
            .from('despesas')
            .insert([{
              user_id: user.id,
              categoria: despesa.categoria,
              descricao: despesa.descricao,
              valor: despesa.valor,
              data: despesaData,
              origem: despesa.origem || 'local',
              observacoes: despesa.observacoes || null
            }]);
          if (error) throw error;
          existingKey.add(key);
        } catch (err) {
          console.warn('Falha ao migrar despesa local específica:', err);
          pendentes.push(despesa);
        }
      }

      if (pendentes.length === 0) {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pendentes));
      }
    } catch (error) {
      console.warn('Erro geral durante sincronização incremental de despesas locais:', error);
    }
  }

  static async forceSync() { await this.syncLocalDespesas(); }

  // Health check básico da tabela de despesas
  static async healthCheck(): Promise<{ ok: boolean; message: string; count?: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { ok: false, message: 'Usuário não autenticado' };

      const { count, error } = await supabase
        .from('despesas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return { ok: true, message: 'Conexão e permissão OK', count: count || 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message: 'Falha ao acessar despesas: ' + message };
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
      const origemSegura = despesaAtualizada.origem || 'Não Informado';
      
      try {
        const { data, error } = await supabase
          .from('despesas')
          .update({
            categoria: despesaAtualizada.categoria,
            descricao: despesaAtualizada.descricao,
            valor: despesaAtualizada.valor,
            data: despesaData,
            origem: origemSegura,
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