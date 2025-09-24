import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, Legend } from "recharts";
import { DadosDashboard, Viagem } from "@/types";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, Calendar as CalendarIcon, Clock, Pencil, Trash2 } from "lucide-react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import ViagemService from "@/services/ViagemService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DashboardProps {
  dados: DadosDashboard;
}

interface DadosGrafico {
  mes: string;
  ganhos: number;
  gastos: number;
  lucro: number;
  kmRodados: number;
}

type PeriodoVisualizacao = 'diario' | 'semanal' | 'mensal';

export function Dashboard({ dados }: DashboardProps) {
  const [viagemParaEditar, setViagemParaEditar] = useState<Viagem | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodoVisualizacao, setPeriodoVisualizacao] = useState<PeriodoVisualizacao>('mensal');
  const [dadosFiltrados, setDadosFiltrados] = useState<DadosGrafico[]>([]);

  const agruparDadosPorPeriodo = (viagens: Viagem[], periodo: PeriodoVisualizacao): DadosGrafico[] => {
    const dadosAgrupados = new Map<string, DadosGrafico>();

    viagens.forEach((viagem) => {
      let chave: string;
      const data = new Date(viagem.data);

      switch (periodo) {
        case 'diario': {
          chave = format(data, 'dd/MM', { locale: ptBR });
          break;
        }
        case 'semanal': {
          const inicioSemana = startOfWeek(data, { locale: ptBR });
          const fimSemana = addDays(inicioSemana, 6);
          chave = `${format(inicioSemana, 'dd/MM')} - ${format(fimSemana, 'dd/MM')}`;
          break;
        }
        case 'mensal':
        default: {
          chave = format(data, 'MMMM/yyyy', { locale: ptBR });
          break;
        }
      }

      const dadosAtuais = dadosAgrupados.get(chave) || {
        mes: chave,
        ganhos: 0,
        gastos: 0,
        lucro: 0,
        kmRodados: 0
      };

      dadosAgrupados.set(chave, {
        ...dadosAtuais,
        ganhos: dadosAtuais.ganhos + viagem.valorGanho,
        gastos: dadosAtuais.gastos + (viagem.gastosCombustivel || 0),
        lucro: dadosAtuais.lucro + (viagem.lucroLiquido || 0),
        kmRodados: dadosAtuais.kmRodados + viagem.kmRodados
      });
    });

    return Array.from(dadosAgrupados.values());
  };

  useEffect(() => {
    if (dados.viagens) {
      const dadosAgrupados = agruparDadosPorPeriodo(dados.viagens, periodoVisualizacao);
      setDadosFiltrados(dadosAgrupados);
    }
  }, [dados.viagens, periodoVisualizacao]);

  const handleEditar = (viagem: Viagem) => {
    setViagemParaEditar(viagem);
    setDialogOpen(true);
  };

  const handleExcluir = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viagem?')) {
      try {
        await ViagemService.excluirViagem(id);
        window.location.reload();
      } catch (error) {
        console.error('Erro ao excluir viagem:', error);
        alert('Erro ao excluir viagem');
      }
    }
  };

  const handleSalvarEdicao = async (viagemAtualizada: Viagem) => {
    try {
      if (viagemParaEditar?.id) {
        await ViagemService.editarViagem(viagemParaEditar.id, viagemAtualizada);
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao editar viagem:', error);
      alert('Erro ao editar viagem');
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cards de Resumo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ganhos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {dados.totalGanhos.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Em {dados.totalViagens} viagens
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {dados.totalGastos.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Com combustível
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {dados.lucroTotal.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Média: R$ {(dados.lucroTotal / dados.totalViagens).toFixed(2)}/viagem
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média por KM</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {dados.mediaLucroPorKm.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Total: {dados.totalKmRodados.toFixed(0)} km
          </p>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Card className="col-span-full">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div className="space-y-1">
            <CardTitle>Histórico de Resultados</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visualize seus ganhos, gastos e lucros por período
            </p>
          </div>
          <ToggleGroup 
            type="single" 
            value={periodoVisualizacao} 
            onValueChange={(value: PeriodoVisualizacao) => setPeriodoVisualizacao(value)} 
            className="justify-start"
          >
            <ToggleGroupItem value="diario" aria-label="Ver por dia" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Diário</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="semanal" aria-label="Ver por semana" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Semanal</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="mensal" aria-label="Ver por mês" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Mensal</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={dadosFiltrados} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="mes" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                width={80}
                tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm font-medium" style={{ 
                    color: value === "Ganhos" ? '#22c55e' : 
                           value === "Gastos" ? '#ef4444' : 
                           '#3b82f6'
                  }}>
                    {value}
                  </span>
                )}
              />
              <Bar 
                dataKey="ganhos" 
                name="Ganhos" 
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="gastos" 
                name="Gastos" 
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="lucro" 
                name="Lucro" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Preço da Gasolina</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dados.comparativoCombustivel}>
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="precoGasolina" stroke="#ef4444" name="Preço (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Histórico de Viagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Km Rodados</TableHead>
                  <TableHead>Preço Gasolina</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Ganhos</TableHead>
                  <TableHead>Gastos</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.viagens?.map((viagem) => (
                  <TableRow key={viagem.id}>
                    <TableCell>{format(new Date(viagem.data), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{viagem.kmRodados} km</TableCell>
                    <TableCell>R$ {viagem.precoGasolina.toFixed(2)}</TableCell>
                    <TableCell>{viagem.consumo} km/L</TableCell>
                    <TableCell>R$ {viagem.valorGanho.toFixed(2)}</TableCell>
                    <TableCell>R$ {viagem.gastosCombustivel.toFixed(2)}</TableCell>
                    <TableCell>R$ {viagem.lucroLiquido.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditar(viagem)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleExcluir(viagem.id)}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EditarViagemDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setViagemParaEditar(undefined);
        }}
        onSave={handleSalvarEdicao}
        viagem={viagemParaEditar}
      />
    </div>
  );
}

interface ViagemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viagem: Viagem) => Promise<void>;
  viagem?: Viagem;
}

const EditarViagemDialog = ({ isOpen, onClose, onSave, viagem }: ViagemDialogProps) => {
  const [formData, setFormData] = useState<Partial<Viagem>>(
    viagem ? {
      ...viagem,
      data: new Date(viagem.data)
    } : {
      data: new Date(),
      kmRodados: 0,
      precoGasolina: 0,
      consumo: 0,
      valorGanho: 0
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data || !formData.kmRodados || !formData.precoGasolina || !formData.consumo || !formData.valorGanho) {
      alert('Preencha todos os campos');
      return;
    }
    
    await onSave(formData as Viagem);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{viagem ? 'Editar Viagem' : 'Nova Viagem'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.data && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data ? format(formData.data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.data}
                  onSelect={(date) => setFormData({ ...formData, data: date })}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kmRodados">Km Rodados</Label>
            <Input
              id="kmRodados"
              type="number"
              value={formData.kmRodados || ''}
              onChange={(e) => setFormData({ ...formData, kmRodados: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precoGasolina">Preço da Gasolina (R$)</Label>
            <Input
              id="precoGasolina"
              type="number"
              step="0.01"
              value={formData.precoGasolina || ''}
              onChange={(e) => setFormData({ ...formData, precoGasolina: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumo">Consumo (km/L)</Label>
            <Input
              id="consumo"
              type="number"
              step="0.1"
              value={formData.consumo || ''}
              onChange={(e) => setFormData({ ...formData, consumo: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valorGanho">Valor Ganho (R$)</Label>
            <Input
              id="valorGanho"
              type="number"
              step="0.01"
              value={formData.valorGanho || ''}
              onChange={(e) => setFormData({ ...formData, valorGanho: parseFloat(e.target.value) })}
            />
          </div>

          <Button type="submit" className="w-full">
            {viagem ? 'Salvar Alterações' : 'Adicionar Viagem'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};