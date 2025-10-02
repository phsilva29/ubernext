import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, Legend, PieChart, Pie, Cell } from "recharts";
import { DadosDashboard, Viagem, OutraDespesa } from "@/types";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useState, useEffect, useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, Calendar as CalendarIcon, Clock, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Car, Fuel, Route, Receipt, Plus } from "lucide-react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import ViagemService from "@/services/ViagemService";
import OutrasDespesasService from "@/services/OutrasDespesasService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Hook para animar números
function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<number>(value);
  useEffect(() => {
    const start = ref.current;
    const change = value - start;
    if (change === 0) return;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      if (elapsed < duration) {
        setDisplay(start + (change * (elapsed / duration)));
        requestAnimationFrame(animate);
      } else {
        setDisplay(value);
        ref.current = value;
      }
    }
    requestAnimationFrame(animate);
    // eslint-disable-next-line
  }, [value]);
  return display;
}

export interface DashboardProps {
  dados?: DadosDashboard;
  onDataUpdate?: () => void;
}

interface DadosGrafico {
  mes: string;
  ganhos: number;
  gastos: number;
  lucro: number;
  kmRodados: number;
}

type PeriodoVisualizacao = 'diario' | 'semanal' | 'mensal';

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

export function Dashboard({ dados: dadosDashboard, onDataUpdate }: DashboardProps) {
  // FUNÇÃO HELPER DEVE VIR ANTES DOS HOOKS
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

  // TODOS OS HOOKS DEVEM VIR PRIMEIRO - ANTES DE QUALQUER EARLY RETURN
  const [isLoading, setIsLoading] = useState(true);
  const [viagemParaEditar, setViagemParaEditar] = useState<Viagem | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodoVisualizacao, setPeriodoVisualizacao] = useState<PeriodoVisualizacao>('mensal');
  const [dadosFiltrados, setDadosFiltrados] = useState<DadosGrafico[]>([]);
  const [despesas, setDespesas] = useState<OutraDespesa[]>([]);
  const [despesasDialogOpen, setDespesasDialogOpen] = useState(false);

  // Load expenses
  useEffect(() => {
    const carregarDespesas = async () => {
      const despesasCarregadas = await OutrasDespesasService.obterDespesas();
      setDespesas(despesasCarregadas);
    };
    carregarDespesas();
  }, []);

  useEffect(() => {
    setIsLoading(!dadosDashboard);
  }, [dadosDashboard, periodoVisualizacao]);

  // Segundo useEffect que foi movido para cá
  useEffect(() => {
    if (dadosDashboard?.viagens) {
      const dadosAgrupados = agruparDadosPorPeriodo(dadosDashboard.viagens, periodoVisualizacao);
      setDadosFiltrados(dadosAgrupados);
    }
  }, [dadosDashboard?.viagens, periodoVisualizacao]);

  // AGORA PODEMOS TER EARLY RETURNS DEPOIS DE TODOS OS HOOKS
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Nunca retorne antes dos cards de resumo. Se não houver dados, mostre zero animado.
  const periodoSelecionado = getPeriodoSelecionado(dadosFiltrados, periodoVisualizacao);

  // Calculate total expenses (non-trip specific)
  const totalDespesasGerais = despesas
    .filter(d => !d.tripId)
    .reduce((acc, d) => acc + d.amount, 0);

  // Calculate adjusted net profit (earnings - fuel costs - general expenses)
  const lucroAjustado = (periodoSelecionado ? periodoSelecionado.lucro : 0) - totalDespesasGerais;

  const handleRecarregarDespesas = async () => {
    const despesasAtualizadas = await OutrasDespesasService.obterDespesas();
    setDespesas(despesasAtualizadas);
    if (onDataUpdate) {
      onDataUpdate();
    }
  };


  const handleEditar = (viagem: Viagem) => {
    setViagemParaEditar(viagem);
    setDialogOpen(true);
  };

  const handleExcluir = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta viagem?')) {
      try {
        await ViagemService.excluirViagem(id);
        if (onDataUpdate) {
          onDataUpdate();
        }
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
        if (onDataUpdate) {
          onDataUpdate();
        }
      }
    } catch (error) {
      console.error('Erro ao editar viagem:', error);
      alert('Erro ao editar viagem');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cards de resumo responsivos */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-4 sm:grid-cols-2 grid-cols-1">
        {/* Cards de Resumo dinâmicos */}
        {/* Wrapper animado para cada card de resumo */}
        <div key={periodoSelecionado ? periodoSelecionado.mes + '-ganhos' : 'ganhos'} className="transition-all duration-500 ease-in-out opacity-100 translate-y-0">
          <Card className="relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-xl border-2 border-green-400/40">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Ganhos</CardTitle>
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-600 mb-1 transition-all duration-500 ease-in-out transform group-hover:scale-105">
                R$ {(periodoSelecionado ? periodoSelecionado.ganhos : 0).toFixed(2)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <Car className="h-3 w-3" />
                {periodoSelecionado ? periodoSelecionado.kmRodados.toFixed(0) : '0'} km considerados
              </p>
            </CardContent>
          </Card>
        </div>

        <div key={periodoSelecionado ? periodoSelecionado.mes + '-gastos' : 'gastos'} className="transition-all duration-500 ease-in-out opacity-100 translate-y-0">
        <Card className="relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-xl border-2 border-red-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Gastos</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-red-600 mb-1 transition-all duration-500 ease-in-out transform group-hover:scale-105">
              R$ {(periodoSelecionado ? periodoSelecionado.gastos : 0).toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Combustível consumido
            </p>
          </CardContent>
        </Card>
        </div>

        <div key={periodoSelecionado ? periodoSelecionado.mes + '-lucro' : 'lucro'} className="transition-all duration-500 ease-in-out opacity-100 translate-y-0">
        <Card className="transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-xl border-2 border-blue-400/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-muted/20 flex items-center justify-center">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-1 transition-all duration-500 ease-in-out transform group-hover:scale-105">
              R$ {lucroAjustado.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {totalDespesasGerais > 0 ? `Após R$ ${totalDespesasGerais.toFixed(2)} em despesas` : 'Sem despesas extras'}
            </p>
          </CardContent>
        </Card>
        </div>

        <div key={periodoSelecionado ? periodoSelecionado.mes + '-despesas' : 'despesas'} className="transition-all duration-500 ease-in-out opacity-100 translate-y-0">
        <Card className="relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105 hover:shadow-xl border-2 border-orange-400/40">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Outras Despesas</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-orange-600 mb-1 transition-all duration-500 ease-in-out transform group-hover:scale-105">
              R$ {totalDespesasGerais.toFixed(2)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDespesasDialogOpen(true)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-orange-600 p-0 h-auto"
            >
              <Plus className="h-3 w-3 mr-1" />
              Gerenciar despesas
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Expenses Dialog */}
      <Dialog open={despesasDialogOpen} onOpenChange={setDespesasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              Gerenciar Outras Despesas
            </DialogTitle>
          </DialogHeader>
          <ExpensesManager 
            despesas={despesas.filter(d => !d.tripId)} 
            onDespesasChange={handleRecarregarDespesas}
          />
        </DialogContent>
      </Dialog>

      {/* Gráficos */}
      <Card className="w-full transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4">
        <CardHeader className="flex flex-col space-y-3 sm:space-y-4 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold">Análise de Resultados</CardTitle>
              <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
                Visualize seus ganhos, gastos e lucros por período
              </p>
            </div>
            <ToggleGroup 
              type="single" 
              value={periodoVisualizacao} 
              onValueChange={(value: PeriodoVisualizacao) => setPeriodoVisualizacao(value)} 
              className="flex justify-start sm:justify-center transition-all duration-300 ease-in-out"
            >
              <ToggleGroupItem value="diario" aria-label="Ver por dia" className="gap-1 sm:gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105 text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Diário</span>
                <span className="sm:hidden">D</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="semanal" aria-label="Ver por semana" className="gap-1 sm:gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105 text-xs sm:text-sm">
                <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Semanal</span>
                <span className="sm:hidden">S</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="mensal" aria-label="Ver por mês" className="gap-1 sm:gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground transition-all duration-200 ease-in-out hover:scale-105 text-xs sm:text-sm">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Mensal</span>
                <span className="sm:hidden">M</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={(() => {
                  const periodo = getPeriodoSelecionado(dadosDashboard?.viagens ? agruparDadosPorPeriodo(dadosDashboard.viagens, periodoVisualizacao) : [], periodoVisualizacao);
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
                innerRadius={50}
                outerRadius={100}
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

      <Card className="col-span-full transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            Histórico do Preço da Gasolina
          </CardTitle>
          <p className="text-sm sm:text-base text-muted-foreground">Acompanhe a variação dos preços ao longo do tempo</p>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dadosDashboard?.comparativoCombustivel || []}>
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

      {/* Tabela de Viagens Responsiva */}
      <Card className="w-full transition-all duration-500 animate-in fade-in-0 slide-in-from-bottom-4">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Histórico Detalhado de Viagens
          </CardTitle>
          <p className="text-sm sm:text-base text-muted-foreground">Visualize e gerencie todas as suas viagens registradas</p>
        </CardHeader>
        <CardContent>
          {/* Cards para todas as telas */}
          <div className="space-y-4">
            {dadosDashboard?.viagens?.map((viagem) => (
              <Card key={viagem.id} className="p-3 sm:p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02] border-2 border-border/50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm sm:text-base">
                        {format(new Date(viagem.data), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {viagem.kmRodados} km • {viagem.consumo} km/L
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditar(viagem)}
                      className="hover:bg-primary/10 h-8 w-8 sm:h-9 sm:w-auto px-2 sm:px-3"
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluir(viagem.id!)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8 sm:h-9 sm:w-auto px-2 sm:px-3"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Excluir</span>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  <div className="bg-green-500/5 p-2 sm:p-3 rounded-lg border border-green-500/20">
                    <span className="text-xs text-green-600 font-medium">Ganhos</span>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 truncate">R$ {viagem.valorGanho.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-500/5 p-2 sm:p-3 rounded-lg border border-red-500/20">
                    <span className="text-xs text-red-600 font-medium">Gastos</span>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-red-600 truncate">R$ {viagem.gastosCombustivel?.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-500/5 p-2 sm:p-3 rounded-lg border border-blue-500/20">
                    <span className="text-xs text-blue-600 font-medium">Lucro</span>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-blue-600 truncate">R$ {viagem.lucroLiquido?.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-500/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                     <span className="text-xs text-purple-600 font-medium hidden sm:inline">Valor do Combustível</span>
                    <span className="text-xs text-purple-600 font-medium sm:hidden">Combustível</span>
                    <p className="text-sm sm:text-base md:text-lg font-bold text-purple-600 truncate">R$ {viagem.precoGasolina.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Trip Expenses */}
                <TripExpenses 
                  tripId={viagem.id!} 
                  despesas={despesas.filter(d => d.tripId === viagem.id)}
                  onDespesasChange={handleRecarregarDespesas}
                />
              </Card>
            ))}
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
        onDataUpdate={onDataUpdate}
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
  onDataUpdate?: () => void;
}

const EditarViagemDialog = ({ isOpen, onClose, onSave, viagem, onDataUpdate }: ViagemDialogProps) => {
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
    if (onDataUpdate) {
      onDataUpdate();
    }
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

// Expenses Manager Component
interface ExpensesManagerProps {
  despesas: OutraDespesa[];
  onDespesasChange: () => void;
}

const ExpensesManager = ({ despesas, onDespesasChange }: ExpensesManagerProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddExpense = async () => {
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

  const handleDeleteExpense = async (id: string) => {
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expense-description">Descrição</Label>
          <Input
            id="expense-description"
            type="text"
            placeholder="Ex: Pedágio, Estacionamento, Manutenção..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-amount">Valor (R$)</Label>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Data</Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-category">Categoria (opcional)</Label>
          <Input
            id="expense-category"
            type="text"
            placeholder="Ex: Transporte, Manutenção..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button
        onClick={handleAddExpense}
        disabled={isLoading}
        className="w-full bg-orange-500 hover:bg-orange-600"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Despesa
      </Button>

      {despesas.length > 0 && (
        <div className="space-y-3 mt-6">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Despesas Cadastradas
          </h4>
          <div className="space-y-2">
            {despesas.map((despesa) => (
              <div
                key={despesa.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Receipt className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">{despesa.description}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {despesa.date && <span>{new Date(despesa.date).toLocaleDateString('pt-BR')}</span>}
                      {despesa.category && <span>• {despesa.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-red-500 whitespace-nowrap">
                    - R$ {despesa.amount.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExpense(despesa.id!)}
                    disabled={isLoading}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg border-2 border-orange-500/30">
              <span className="font-semibold">Total de Despesas:</span>
              <span className="text-xl font-bold text-orange-500">
                R$ {totalDespesas.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {despesas.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma despesa registrada</p>
        </div>
      )}
    </div>
  );
};

// Trip Expenses Component
interface TripExpensesProps {
  tripId: string;
  despesas: OutraDespesa[];
  onDespesasChange: () => void;
}

const TripExpenses = ({ tripId, despesas, onDespesasChange }: TripExpensesProps) => {
  const [showExpenses, setShowExpenses] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (despesas.length === 0 && !showExpenses) {
    return (
      <div className="mt-3 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="text-xs text-muted-foreground hover:text-orange-600"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar despesa da viagem
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Despesas da Viagem</DialogTitle>
            </DialogHeader>
            <TripExpenseForm 
              tripId={tripId} 
              onSuccess={() => {
                onDespesasChange();
                setDialogOpen(false);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const totalDespesasViagem = despesas.reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Receipt className="h-3 w-3" />
          Despesas da Viagem
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExpenses(!showExpenses)}
          className="text-xs h-6"
        >
          {showExpenses ? 'Ocultar' : 'Ver'} ({despesas.length})
        </Button>
      </div>

      {showExpenses && (
        <div className="space-y-2">
          {despesas.map((despesa) => (
            <div
              key={despesa.id}
              className="flex items-center justify-between p-2 bg-red-500/5 rounded border border-red-500/20 text-xs"
            >
              <div className="flex-1">
                <p className="font-medium">{despesa.description}</p>
                {despesa.category && <p className="text-muted-foreground">{despesa.category}</p>}
              </div>
              <span className="font-bold text-red-500 whitespace-nowrap">
                - R$ {despesa.amount.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded border border-orange-500/30 font-semibold text-xs">
            <span>Total:</span>
            <span className="text-orange-600">R$ {totalDespesasViagem.toFixed(2)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="w-full text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar mais
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Despesas da Viagem</DialogTitle>
              </DialogHeader>
              <TripExpenseForm 
                tripId={tripId} 
                onSuccess={() => {
                  onDespesasChange();
                  setDialogOpen(false);
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

// Trip Expense Form Component
interface TripExpenseFormProps {
  tripId: string;
  onSuccess: () => void;
}

const TripExpenseForm = ({ tripId, onSuccess }: TripExpenseFormProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        category: category.trim() || undefined
      });

      setDescription('');
      setAmount('');
      setCategory('');
      onSuccess();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      alert('Erro ao adicionar despesa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trip-expense-description">Descrição</Label>
        <Input
          id="trip-expense-description"
          type="text"
          placeholder="Ex: Pedágio, Estacionamento..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trip-expense-amount">Valor (R$)</Label>
        <Input
          id="trip-expense-amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trip-expense-category">Categoria (opcional)</Label>
        <Input
          id="trip-expense-category"
          type="text"
          placeholder="Ex: Transporte, Alimentação..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-orange-500 hover:bg-orange-600">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Despesa
      </Button>
    </form>
  );
};