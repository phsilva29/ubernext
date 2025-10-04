import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Pencil, Trash2, Receipt, Car, Home, Utensils, Wrench, CreditCard, Fuel } from 'lucide-react';
import { cn } from "@/lib/utils";
import DespesaService from '@/services/DespesaService';
import { Despesa } from '@/types';

interface DespesasProps {
  onDataUpdate?: () => void;
}

const categorias = [
  { value: 'veiculo', label: 'Veículo', icon: Car },
  { value: 'moradia', label: 'Moradia', icon: Home },
  { value: 'alimentacao', label: 'Alimentação', icon: Utensils },
  { value: 'manutencao', label: 'Manutenção', icon: Wrench },
  { value: 'financeiro', label: 'Financeiro', icon: CreditCard },
  { value: 'combustivel', label: 'Combustível', icon: Fuel },
  { value: 'outros', label: 'Outros', icon: Receipt }
];

const origens = [
  'Aluguel/Financiamento',
  'Lavagem do Veículo',
  'Alimentação',
  'Manutenção do Veículo',
  'Seguro do Veículo',
  'IPVA',
  'Licenciamento',
  'Combustível Extra',
  'Pedágio',
  'Estacionamento',
  'Outros'
];

const Despesas = ({ onDataUpdate }: DespesasProps) => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | undefined>(undefined);
  
  // Form state
  const [categoria, setCategoria] = useState('');
  const [origem, setOrigem] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState<Date | undefined>(new Date());
  const [observacoes, setObservacoes] = useState('');
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  useEffect(() => {
    loadDespesas();
  }, []);

  const loadDespesas = async () => {
    setIsLoading(true);
    try {
      const despesasCarregadas = await DespesaService.obterDespesas();
      setDespesas(despesasCarregadas);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setEditingDespesa(undefined);
    clearForm();
    setDialogOpen(true);
  };

  const handleEditDespesa = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setCategoria(despesa.categoria);
    setOrigem(despesa.origem);
    setDescricao(despesa.descricao);
    setValor(despesa.valor.toString());
    setData(new Date(despesa.data));
    setObservacoes(despesa.observacoes || '');
    setDialogOpen(true);
  };

  const handleDeleteDespesa = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await DespesaService.excluirDespesa(id);
        await loadDespesas();
        if (onDataUpdate) {
          // Aguardar um pouco para garantir que os dados foram excluídos
          setTimeout(() => {
            onDataUpdate();
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        alert('Erro ao excluir despesa');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoria || !origem || !descricao || !valor || !data) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      alert('Valor deve ser um número positivo');
      return;
    }

    const despesaData: Despesa = {
      categoria,
      origem,
      descricao,
      valor: valorNumerico,
      data,
      observacoes: observacoes || undefined
    };

    try {
      if (editingDespesa) {
        await DespesaService.editarDespesa(editingDespesa.id!, despesaData);
      } else {
        await DespesaService.salvarDespesa(despesaData);
      }
      
      await loadDespesas();
      setDialogOpen(false);
      clearForm();
      
      if (onDataUpdate) {
        // Aguardar um pouco para garantir que os dados foram salvos
        setTimeout(() => {
          onDataUpdate();
        }, 100);
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      alert('Erro ao salvar despesa');
    }
  };

  const clearForm = () => {
    setCategoria('');
    setOrigem('');
    setDescricao('');
    setValor('');
    setData(new Date());
    setObservacoes('');
  };

  const getCategoriaIcon = (categoria: string) => {
    const categoriaInfo = categorias.find(c => c.value === categoria);
    return categoriaInfo ? categoriaInfo.icon : Receipt;
  };

  const getCategoriaLabel = (categoria: string) => {
    const categoriaInfo = categorias.find(c => c.value === categoria);
    return categoriaInfo ? categoriaInfo.label : categoria;
  };

  const totalDespesas = despesas.reduce((acc, despesa) => acc + despesa.valor, 0);

  return (
    <div className="space-y-4 xs:space-y-6">
      {/* Header e botão de adicionar */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 xs:gap-4">
        <div>
          <h2 className="text-lg xs:text-xl sm:text-2xl font-bold">Despesas</h2>
          <p className="text-muted-foreground text-xs xs:text-sm sm:text-base">Gerencie todas as suas despesas</p>
        </div>
        <Button 
          onClick={handleOpenDialog} 
          className="w-full xs:w-auto bg-blue-600 hover:bg-blue-700 h-9 xs:h-10 text-xs xs:text-sm px-4 xs:px-6"
        >
          <Plus className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Card de resumo */}
      <Card className="border-2 border-red-400/40">
        <CardContent className="p-4 xs:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 xs:gap-3">
              <div className="p-2 xs:p-3 rounded-lg bg-red-500/10">
                <Receipt className="h-5 w-5 xs:h-6 xs:w-6 text-red-500" />
              </div>
              <div>
                <p className="text-xs xs:text-sm text-muted-foreground">Total de Despesas</p>
                <p className="text-lg xs:text-xl sm:text-2xl font-bold text-red-600">R$ {totalDespesas.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs xs:text-sm text-muted-foreground">{despesas.length} despesas</p>
              <p className="text-xs xs:text-sm text-muted-foreground">registradas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de despesas */}
      <div className="space-y-3 xs:space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 xs:py-8">
            <div className="animate-spin rounded-full h-6 w-6 xs:h-8 xs:w-8 border-b-2 border-primary"></div>
          </div>
        ) : despesas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 xs:py-12">
              <Receipt className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 mx-auto mb-3 xs:mb-4 text-muted-foreground/50" />
              <h3 className="text-base xs:text-lg font-semibold mb-1 xs:mb-2">Nenhuma despesa registrada</h3>
              <p className="text-muted-foreground mb-3 xs:mb-4 text-xs xs:text-sm">Comece adicionando sua primeira despesa</p>
              <Button onClick={handleOpenDialog} className="h-8 xs:h-9 text-xs xs:text-sm px-3 xs:px-4">
                <Plus className="h-3 w-3 xs:h-4 xs:w-4 mr-1.5 xs:mr-2" />
                Adicionar Despesa
              </Button>
            </CardContent>
          </Card>
        ) : (
          despesas.map((despesa) => {
            const IconComponent = getCategoriaIcon(despesa.categoria);
            return (
              <Card key={despesa.id} className="transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-2 border-border/50">
                <CardContent className="p-3 xs:p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
                        <div className="p-1.5 xs:p-2 rounded-lg bg-primary/10 shrink-0">
                          <IconComponent className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm xs:text-base truncate">{despesa.descricao}</h3>
                          <p className="text-xs xs:text-sm text-muted-foreground">
                            {getCategoriaLabel(despesa.categoria)} • {despesa.origem}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg xs:text-xl font-bold text-red-600 shrink-0">
                        R$ {despesa.valor.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
                        <p className="text-xs xs:text-sm text-muted-foreground">
                          {format(new Date(despesa.data), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        {despesa.observacoes && (
                          <p className="text-xs xs:text-sm text-muted-foreground italic truncate">
                            "{despesa.observacoes}"
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 xs:gap-2 self-end xs:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDespesa(despesa)}
                          className="hover:bg-primary/10 h-7 w-7 xs:h-8 xs:w-8 p-0 xs:w-auto xs:px-2"
                        >
                          <Pencil className="h-3 w-3 xs:h-4 xs:w-4" />
                          <span className="hidden xs:inline ml-1">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDespesa(despesa.id!)}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 w-7 xs:h-8 xs:w-8 p-0 xs:w-auto xs:px-2"
                        >
                          <Trash2 className="h-3 w-3 xs:h-4 xs:w-4" />
                          <span className="hidden xs:inline ml-1">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog para criar/editar despesa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg xs:max-w-xl sm:max-w-2xl mx-2 xs:mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg xs:text-xl">
              {editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-6">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 xs:gap-6">
              <div className="space-y-2">
                <Label className="text-xs xs:text-sm">Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-9 xs:h-10 text-xs xs:text-sm">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => {
                      const IconComponent = cat.icon;
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-3 w-3 xs:h-4 xs:w-4" />
                            <span className="text-xs xs:text-sm">{cat.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs xs:text-sm">Origem</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger className="h-9 xs:h-10 text-xs xs:text-sm">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {origens.map((orig) => (
                      <SelectItem key={orig} value={orig}>
                        <span className="text-xs xs:text-sm">{orig}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs xs:text-sm">Descrição</Label>
              <Input
                type="text"
                placeholder="Ex: Lavagem do carro"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="h-9 xs:h-10 text-xs xs:text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 xs:gap-6">
              <div className="space-y-2">
                <Label className="text-xs xs:text-sm">Valor (R$)</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,]/g, '');
                    setValor(value);
                  }}
                  className="h-9 xs:h-10 text-xs xs:text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs xs:text-sm">Data</Label>
                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 xs:h-10 px-3 xs:px-4 text-xs xs:text-sm",
                        !data && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                      {data ? format(data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data}
                      onSelect={(date) => {
                        setData(date);
                        setIsDatePopoverOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs xs:text-sm">Observações (opcional)</Label>
              <Textarea
                placeholder="Adicione observações se necessário..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[60px] xs:min-h-[80px] text-xs xs:text-sm"
              />
            </div>

            <div className="flex flex-col xs:flex-row gap-2 xs:gap-4 pt-4">
              <Button
                type="submit"
                className="flex-1 h-9 xs:h-10 text-xs xs:text-sm bg-blue-600 hover:bg-blue-700"
              >
                {editingDespesa ? 'Atualizar' : 'Salvar'} Despesa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="xs:w-auto h-9 xs:h-10 text-xs xs:text-sm"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Despesas;