import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, Legend, PieChart, Pie, Cell } from "recharts";
import { DadosDashboard, Viagem } from "@/types";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, Calendar as CalendarIcon, Clock, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Car, Fuel, Route } from "lucide-react";
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
  dados?: DadosDashboard;
}

interface DadosGrafico {
  mes: string;
  ganhos: number;
  gastos: number;
  lucro: number;
  kmRodados: number;
}

type PeriodoVisualizacao = 'diario' | 'semanal' | 'mensal';

export function Dashboard({ dados: dadosProps }: DashboardProps) {
  // TODOS OS HOOKS DEVEM VIR PRIMEIRO - ANTES DE QUALQUER EARLY RETURN
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viagemParaEditar, setViagemParaEditar] = useState<Viagem | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodoVisualizacao, setPeriodoVisualizacao] = useState<PeriodoVisualizacao>('mensal');
  const [dadosFiltrados, setDadosFiltrados] = useState<DadosGrafico[]>([]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setIsLoading(true);
        const dadosDashboard = await ViagemService.obterDadosDashboard();
        setDados(dadosDashboard);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarDados();
  }, []);

  // AGORA PODEMOS TER EARLY RETURNS DEPOIS DE TODOS OS HOOKS
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  // Função para extrair a data do agrupamento
  function extrairData(dados: DadosGrafico, periodo: PeriodoVisualizacao): Date {
    function toBrasiliaDate(date: Date) {
      // Ajusta para UTC-3 (Brasília)
      return new Date(date.getTime() - 3 * 60 * 60 * 1000);
    }
    if (periodo === 'diario') {
      const partes = dados.mes.split('/');
      const dia = partes[0];
      const mes = partes[1];
      let ano = new Date().getFullYear();
      if (partes.length === 3) ano = parseInt(partes[2]);
      return toBrasiliaDate(new Date(ano, parseInt(mes) - 1, parseInt(dia)));
    } else if (periodo === 'semanal') {
      const [inicio] = dados.mes.split(' - ');
      const partes = inicio.split('/');
      const dia = partes[0];
      const mes = partes[1];
      let ano = new Date().getFullYear();
      if (partes.length === 3) ano = parseInt(partes[2]);
      return toBrasiliaDate(new Date(ano, parseInt(mes) - 1, parseInt(dia)));
    } else {
      let mesStr = '';
      let anoStr = '';
      if (dados.mes.includes('/')) {
        [mesStr, anoStr] = dados.mes.split('/');
      } else if (dados.mes.includes(' ')) {
        [mesStr, anoStr] = dados.mes.split(' ');
      }
      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const mesNum = meses.findIndex(m => mesStr.toLowerCase().startsWith(m));
      return toBrasiliaDate(new Date(parseInt(anoStr), mesNum, 1));
    }
  }

  function getPeriodoSelecionado(arr: DadosGrafico[], periodo: PeriodoVisualizacao): DadosGrafico | null {
    if (!arr.length) return null;
    let hoje = new Date();
    hoje = new Date(hoje.getTime() - 3 * 60 * 60 * 1000);
    const anoAtual = hoje.getFullYear();
    if (periodo === 'diario') {
      const dia = hoje.getDate().toString().padStart(2, '0');
      const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
      const chave = `${dia}/${mes}`;
      return arr.find(d => d.mes.startsWith(chave)) || null;
    } else if (periodo === 'semanal') {
      // Busca semana que contém hoje
      return arr.find(d => {
        try {
          const [inicio, fim] = d.mes.split(' - ');
          const partesIni = inicio.split('/');
          const partesFim = fim.split('/');
          
          // Se não tiver ano, usa o ano atual
          let anoIni = hoje.getFullYear();
          let anoFim = hoje.getFullYear();
          
          const diaIni = parseInt(partesIni[0]);
          const mesIni = parseInt(partesIni[1]);
          if (partesIni.length === 3) anoIni = parseInt(partesIni[2]);
          
          const diaFim = parseInt(partesFim[0]);
          const mesFim = parseInt(partesFim[1]);
          if (partesFim.length === 3) anoFim = parseInt(partesFim[2]);
          
          const dataIni = new Date(anoIni, mesIni - 1, diaIni);
          const dataFim = new Date(anoFim, mesFim - 1, diaFim);
          
          return hoje >= dataIni && hoje <= dataFim;
        } catch (error) {
          console.error('Erro ao processar data semanal:', error);
          return false;
        }
      }) || null;
    } else {
      // Mensal
      const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      const mesAtual = meses[hoje.getMonth()];
      return arr.find(d => d.mes.toLowerCase().includes(mesAtual) && d.mes.includes(anoAtual.toString())) || null;
    }
  }

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
          chave = `${format(inicioSemana, 'dd/MM/yyyy')} - ${format(fimSemana, 'dd/MM/yyyy')}`;
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ease-in-out">
      {/* Cards de Resumo dinâmicos */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ganhos</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {(() => {
            const periodo = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);
            if (!periodo) {
              return <div className="text-center text-muted-foreground">Nenhum dado para o período selecionado</div>;
            }
            return <>
              <div className="text-3xl font-bold text-green-600 mb-1 transition-all duration-300 ease-in-out transform">
                R$ {periodo.ganhos.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="h-3 w-3" />
                {periodo.kmRodados.toFixed(0)} km considerados
              </p>
            </>;
          })()}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total de Gastos</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Fuel className="h-4 w-4 text-red-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {(() => {
            const periodo = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);
            if (!periodo) {
              return <div className="text-center text-muted-foreground">Nenhum dado para o período selecionado</div>;
            }
            return <>
              <div className="text-3xl font-bold text-red-600 mb-1">
                R$ {periodo.gastos.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Combustível consumido
              </p>
            </>;
          })()}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {(() => {
            const periodo = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);
            if (!periodo) {
              return <div className="text-center text-muted-foreground">Nenhum dado para o período selecionado</div>;
            }
            return <>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                R$ {periodo.lucro.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">
                Média: R$ {periodo.lucro.toFixed(2)} por viagem
              </p>
            </>;
          })()}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">Lucro por KM</CardTitle>
          <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Route className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          {(() => {
            const periodo = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);
            if (!periodo) {
              return <div className="text-center text-muted-foreground">Nenhum dado para o período selecionado</div>;
            }
            return <>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                R$ {periodo.kmRodados > 0 ? (periodo.lucro / periodo.kmRodados).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Route className="h-3 w-3" />
                {periodo.kmRodados.toFixed(0)} km percorridos
              </p>
            </>;
          })()}
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Card className="col-span-full">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Análise de Resultados</CardTitle>
            <p className="text-muted-foreground">
              Visualize seus ganhos, gastos e lucros por período
            </p>
          </div>
          <ToggleGroup 
            type="single" 
            value={periodoVisualizacao} 
            onValueChange={(value: PeriodoVisualizacao) => setPeriodoVisualizacao(value)} 
            className="justify-start transition-all duration-300 ease-in-out"
          >
            <ToggleGroupItem value="diario" aria-label="Ver por dia" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Diário</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="semanal" aria-label="Ver por semana" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Semanal</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="mensal" aria-label="Ver por mês" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Mensal</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={(() => {
                  const periodo = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);
                  if (!periodo) {
                    return [
                      { name: 'Ganhos', value: 0, color: '#22c55e' },
                      { name: 'Gastos', value: 0, color: '#ef4444' },
                      { name: 'Lucro', value: 0, color: '#3b82f6' }
                    ];
                  }
                  return [
                    { name: 'Ganhos', value: periodo.ganhos, color: '#22c55e' },
                    { name: 'Gastos', value: periodo.gastos, color: '#ef4444' },
                    { name: 'Lucro', value: periodo.lucro, color: '#3b82f6' }
                  ];
                })()}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={140}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {[
                  { name: 'Ganhos', color: '#22c55e' },
                  { name: 'Gastos', color: '#ef4444' },
                  { name: 'Lucro', color: '#3b82f6' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                wrapperStyle={{ zIndex: 1000 }}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '8px 12px'
                }}
                formatter={(value: number, name: string) => [
                  <span style={{ color: '#ffffff' }}>{`R$ ${value.toFixed(2)}`}</span>,
                  <span style={{ color: '#ffffff' }}>{name}</span>
                ]}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend
                verticalAlign="bottom"
                height={50}
                iconType="circle"
                formatter={(value, entry) => (
                  <span className="text-sm font-medium ml-2" style={{ color: entry.color }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Histórico do Preço da Gasolina
          </CardTitle>
          <p className="text-muted-foreground">Acompanhe a variação dos preços ao longo do tempo</p>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dados.comparativoCombustivel}>
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Preço']}
                labelStyle={{ color: '#ffffff' }}
              />
              <Line type="monotone" dataKey="precoGasolina" stroke="#ef4444" name="Preço (R$)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Histórico Detalhado de Viagens
          </CardTitle>
          <p className="text-muted-foreground">Visualize e gerencie todas as suas viagens registradas</p>
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