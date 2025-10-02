import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { OutraDespesa } from '@/types';
import OutrasDespesasService from '@/services/OutrasDespesasService';

interface OutrasDespesasProps {
  despesas: OutraDespesa[];
  onDespesasChange: () => void;
  isFormDisabled: boolean;
  tripId?: string;
  showDateAndCategory?: boolean;
}

const OutrasDespesas = ({ despesas, onDespesasChange, isFormDisabled, tripId, showDateAndCategory = false }: OutrasDespesasProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAmountChange = (value: string) => {
    const sanitizedValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setAmount(sanitizedValue);
  };

  const handleAddDespesa = async () => {
    if (!description.trim() || !amount) {
      alert('Preencha a descrição e o valor da despesa');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('Insira um valor válido para a despesa');
      return;
    }

    setIsLoading(true);
    try {
      await OutrasDespesasService.salvarDespesa({
        description: description.trim(),
        amount: amountValue,
        tripId: tripId,
        date: date,
        category: category.trim() || undefined
      });

      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('');
      onDespesasChange();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      alert('Erro ao adicionar despesa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDespesa = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;

    setIsLoading(true);
    try {
      await OutrasDespesasService.excluirDespesa(id);
      onDespesasChange();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      alert('Erro ao excluir despesa');
    } finally {
      setIsLoading(false);
    }
  };

  const totalDespesas = despesas.reduce((acc, despesa) => acc + despesa.amount, 0);

  return (
    <Card className="border shadow-lg bg-card p-3 sm:p-6 rounded-xl mt-6">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10">
            <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
          </div>
          <span className="leading-tight">Outras Despesas</span>
        </CardTitle>
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          Adicione despesas extras como pedágio, estacionamento, manutenção, etc.
        </p>
      </CardHeader>

      <CardContent className="space-y-6 p-3 sm:p-6 pt-0">
        {!isFormDisabled && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-4">
            <div className="space-y-2">
              <Label htmlFor="despesa-description" className="text-sm font-medium">
                Descrição
              </Label>
              <Input
                id="despesa-description"
                data-testid="input-despesa-description"
                type="text"
                placeholder="Ex: Pedágio, Estacionamento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-12 px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="despesa-amount" className="text-sm font-medium">
                Valor
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  R$
                </span>
                <Input
                  id="despesa-amount"
                  data-testid="input-despesa-amount"
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="h-12 pl-10 pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                data-testid="button-add-despesa"
                onClick={handleAddDespesa}
                disabled={isLoading}
                className="h-12 w-full md:w-auto px-6 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        )}

        {despesas.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Despesas Cadastradas
            </h4>
            <div className="space-y-2">
              {despesas.map((despesa) => (
                <div
                  key={despesa.id}
                  data-testid={`despesa-item-${despesa.id}`}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-orange-500/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{despesa.description}</p>
                      {showDateAndCategory && (
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          {despesa.date && <span>{new Date(despesa.date).toLocaleDateString('pt-BR')}</span>}
                          {despesa.category && <span>• {despesa.category}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-red-500 whitespace-nowrap">
                      - R$ {despesa.amount.toFixed(2)}
                    </span>
                    {!isFormDisabled && (
                      <Button
                        data-testid={`button-delete-despesa-${despesa.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDespesa(despesa.id!)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border-2 border-orange-500/30">
                <span className="font-semibold text-foreground">Total de Outras Despesas:</span>
                <span
                  data-testid="text-total-despesas"
                  className="text-xl font-bold text-orange-500"
                >
                  R$ {totalDespesas.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {despesas.length === 0 && isFormDisabled && (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma despesa adicional registrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutrasDespesas;
