import { OutraDespesa } from '@/types';
import { supabase } from '@/integrations/supabase/client';

class OutrasDespesasService {
  static async salvarDespesa(despesa: OutraDespesa): Promise<OutraDespesa> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      // Store expenses as negative values
      const amountValue = Math.abs(despesa.amount) * -1;

      const { data, error } = await supabase
        .from('outras_despesas')
        .insert([{
          user_id: user.id,
          trip_id: despesa.tripId || null,
          description: despesa.description,
          amount: amountValue,
          date: despesa.date || new Date().toISOString().split('T')[0],
          category: despesa.category || null
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

  static async atualizarDespesa(id: string, despesa: Partial<OutraDespesa>): Promise<OutraDespesa> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const updateData: any = {
        description: despesa.description,
        date: despesa.date,
        category: despesa.category
      };

      // Store expenses as negative values
      if (despesa.amount !== undefined) {
        updateData.amount = Math.abs(despesa.amount) * -1;
      }

      if (despesa.tripId !== undefined) {
        updateData.trip_id = despesa.tripId || null;
      }

      const { data, error } = await supabase
        .from('outras_despesas')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return this.mapDespesaFromDB(data);
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      throw error;
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

  static async obterDespesasPorViagem(tripId: string): Promise<OutraDespesa[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('outras_despesas')
        .select('*')
        .eq('user_id', user.id)
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDespesaFromDB);
    } catch (error) {
      console.error('Erro ao obter despesas da viagem:', error);
      return [];
    }
  }

  private static mapDespesaFromDB(dbDespesa: any): OutraDespesa {
    return {
      id: dbDespesa.id,
      tripId: dbDespesa.trip_id,
      description: dbDespesa.description,
      amount: Math.abs(parseFloat(dbDespesa.amount)), // Return as positive for display
      date: dbDespesa.date,
      category: dbDespesa.category,
      created_at: dbDespesa.created_at
    };
  }
}

export default OutrasDespesasService;
