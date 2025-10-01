import { OutraDespesa } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class OutrasDespesasService {
  static async salvarDespesa(despesa: OutraDespesa): Promise<OutraDespesa> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('outras_despesas')
        .insert([{
          user_id: user.id,
          description: despesa.description,
          amount: despesa.amount
        }])
        .select()
        .single();

      if (error) throw error;

      return this.mapDespesaFromDB(data);
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      throw error;
    }
  }

  static async obterDespesas(): Promise<OutraDespesa[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('outras_despesas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDespesaFromDB);
    } catch (error) {
      console.error('Erro ao obter despesas:', error);
      return [];
    }
  }

  static async excluirDespesa(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('outras_despesas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      throw error;
    }
  }

  private static mapDespesaFromDB(dbDespesa: any): OutraDespesa {
    return {
      id: dbDespesa.id,
      description: dbDespesa.description,
      amount: parseFloat(dbDespesa.amount),
      created_at: dbDespesa.created_at
    };
  }
}

export default OutrasDespesasService;
