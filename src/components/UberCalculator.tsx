import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUp, Calculator, Car, CreditCard, DollarSign, Fuel, BarChart3, CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Route, Receipt, History, FileText, Clock, Filter } from 'lucide-react';
import { cn } from "@/lib/utils";
import ViagemService from '@/services/ViagemService';
import DespesaService from '@/services/DespesaService';
import Despesas from '@/components/Despesas';
import { Viagem, Despesa, DadosDashboard } from '@/types';
import { Dashboard } from '@/components/dashboard/Dashboard';

interface CalculationResult {
  fuelCost: number;
  totalIncome: number;
  netProfit: number;
  profitPerKm: number;
}

interface FuelComparison {
  distance: number;
  ethanolCost: number;
  gasolineCost: number;
  savings: number;
  bestOption: string;
}

export interface UberCalculatorProps {
  onDataUpdate?: () => void;
  dashboardData?: DadosDashboard | null;
}

interface HistoricoComponentProps {
  onDataUpdate: () => void;
}

const HistoricoComponent: React.FC<HistoricoComponentProps> = ({ onDataUpdate }) => {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [filtroViagem, setFiltroViagem] = useState({
    dataInicio: undefined as Date | undefined,
    dataFim: undefined as Date | undefined,
    periodo: 'ultimo-mes' // 'personalizado', 'ultimo-mes', 'ultimos-3-meses', 'ultimo-ano'
  });
  const [isDateInicioOpen, setIsDateInicioOpen] = useState(false);
  const [isDateFimOpen, setIsDateFimOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      let dataInicio = new Date();
      let dataFim = new Date();

      // Calcular datas baseado no período selecionado
      switch (filtroViagem.periodo) {
        case 'ultimo-mes':
          dataInicio.setMonth(dataInicio.getMonth() - 1);
          break;
        case 'ultimos-3-meses':
          dataInicio.setMonth(dataInicio.getMonth() - 3);
          break;
        case 'ultimo-ano':
          dataInicio.setFullYear(dataInicio.getFullYear() - 1);
          break;
        case 'personalizado':
          if (filtroViagem.dataInicio && filtroViagem.dataFim) {
            dataInicio = filtroViagem.dataInicio;
            dataFim = filtroViagem.dataFim;
          }
          break;
      }

      // Buscar viagens no período
      const todasViagens = await ViagemService.obterViagens();
      const viagensFiltradas = todasViagens.filter(viagem => {
        const dataViagem = new Date(viagem.data);
        return dataViagem >= dataInicio && dataViagem <= dataFim;
      });

      // Buscar despesas no período
      const todasDespesas = await DespesaService.obterDespesas();
      const despesasFiltradas = todasDespesas.filter(despesa => {
        const dataDespesa = new Date(despesa.data);
        return dataDespesa >= dataInicio && dataDespesa <= dataFim;
      });

      setViagens(viagensFiltradas);
      setDespesas(despesasFiltradas);
    } catch (error) {
      console.error('Erro ao carregar dados do histórico:', error);
    } finally {
      setLoading(false);
    }
  }, [filtroViagem.periodo, filtroViagem.dataInicio, filtroViagem.dataFim]);

  React.useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const calcularResumo = () => {
    const totalGanhos = viagens.reduce((total, viagem) => total + viagem.valorGanho, 0);
    const totalCombustivel = viagens.reduce((total, viagem) => total + (viagem.gastosCombustivel || 0), 0);
    const totalDespesas = despesas.reduce((total, despesa) => total + despesa.valor, 0);
    const lucroLiquido = totalGanhos - totalCombustivel - totalDespesas;

    return {
      totalGanhos,
      totalCombustivel,
      totalDespesas,
      lucroLiquido,
      totalViagens: viagens.length,
      totalKm: viagens.reduce((total, viagem) => total + viagem.kmRodados, 0)
    };
  };

  const resumo = calcularResumo();

  return (
    <Card className="border shadow-lg bg-card p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 rounded-xl">
      <CardHeader className="pb-3 xs:pb-4 sm:pb-6">
        <CardTitle className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 xs:gap-2.5 sm:gap-3">
          <div className="p-1 xs:p-1.5 sm:p-2 rounded-lg bg-primary/10">
            <History className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <span className="leading-tight">Histórico Detalhado</span>
        </CardTitle>
        <p className="text-muted-foreground leading-relaxed text-xs xs:text-sm sm:text-base md:text-lg">
          Analise suas viagens e despesas por período personalizado
        </p>
      </CardHeader>

      <CardContent className="space-y-4 xs:space-y-6 sm:space-y-8 p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 pt-0">
        {/* Filtros de Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xs:gap-6 sm:gap-8 md:gap-10 p-4 xs:p-6 bg-muted/20 rounded-lg border">
          <div className="space-y-2 xs:space-y-3">
            <Label className="text-xs xs:text-sm font-medium">Período</Label>
            <Select value={filtroViagem.periodo} onValueChange={(value) => setFiltroViagem({...filtroViagem, periodo: value})}>
              <SelectTrigger className="h-10 xs:h-12">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultimo-mes">Último mês</SelectItem>
                <SelectItem value="ultimos-3-meses">Últimos 3 meses</SelectItem>
                <SelectItem value="ultimo-ano">Último ano</SelectItem>
                <SelectItem value="personalizado">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtroViagem.periodo === 'personalizado' && (
            <>
              <div className="space-y-2 xs:space-y-3">
                <Label className="text-xs xs:text-sm font-medium">Data Início</Label>
                <Popover open={isDateInicioOpen} onOpenChange={setIsDateInicioOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-10 xs:h-12">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filtroViagem.dataInicio ? format(filtroViagem.dataInicio, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filtroViagem.dataInicio}
                      onSelect={(date) => {
                        setFiltroViagem({...filtroViagem, dataInicio: date});
                        setIsDateInicioOpen(false);
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 xs:space-y-3">
                <Label className="text-xs xs:text-sm font-medium">Data Fim</Label>
                <Popover open={isDateFimOpen} onOpenChange={setIsDateFimOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-10 xs:h-12">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filtroViagem.dataFim ? format(filtroViagem.dataFim, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filtroViagem.dataFim}
                      onSelect={(date) => {
                        setFiltroViagem({...filtroViagem, dataFim: date});
                        setIsDateFimOpen(false);
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="flex items-end">
            <Button 
              onClick={carregarDados}
              disabled={loading}
              className="w-full h-10 xs:h-12"
            >
              <Filter className="mr-2 h-4 w-4" />
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 xs:gap-6 sm:gap-8">
          <Card className="border-2 border-blue-400/40 bg-blue-500/5">
            <CardContent className="p-4 xs:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs xs:text-sm font-medium text-muted-foreground">Total Ganhos</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-lg xs:text-xl sm:text-2xl font-bold text-blue-600">
                R$ {resumo.totalGanhos.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{resumo.totalViagens} viagens</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-400/40 bg-red-500/5">
            <CardContent className="p-4 xs:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs xs:text-sm font-medium text-muted-foreground">Combustível</span>
                <Fuel className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-lg xs:text-xl sm:text-2xl font-bold text-red-600">
                R$ {resumo.totalCombustivel.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{resumo.totalKm.toFixed(0)} km rodados</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-400/40 bg-orange-500/5">
            <CardContent className="p-4 xs:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs xs:text-sm font-medium text-muted-foreground">Despesas</span>
                <Receipt className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-lg xs:text-xl sm:text-2xl font-bold text-orange-600">
                R$ {resumo.totalDespesas.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{despesas.length} despesas</p>
            </CardContent>
          </Card>

          <Card className={`border-2 ${resumo.lucroLiquido >= 0 ? 'border-green-400/40 bg-green-500/5' : 'border-red-400/40 bg-red-500/5'}`}>
            <CardContent className="p-4 xs:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs xs:text-sm font-medium text-muted-foreground">Lucro Líquido</span>
                <DollarSign className={`h-4 w-4 ${resumo.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className={`text-lg xs:text-xl sm:text-2xl font-bold ${resumo.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {resumo.lucroLiquido.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumo.lucroLiquido >= 0 ? 'Lucro' : 'Prejuízo'} no período
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Viagens */}
        {viagens.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Viagens do Período</h3>
            </div>
            <div className="grid gap-4">
              {viagens.map((viagem) => (
                <Card key={viagem.id} className="border border-border/50 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-medium">{format(new Date(viagem.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Distância</p>
                        <p className="font-medium">{viagem.kmRodados} km</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Ganhos</p>
                        <p className="font-medium text-blue-600">R$ {viagem.valorGanho.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Lucro</p>
                        <p className={`font-medium ${(viagem.lucroLiquido || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {(viagem.lucroLiquido || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Despesas */}
        {despesas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Despesas do Período</h3>
            </div>
            <div className="grid gap-4">
              {despesas.map((despesa) => (
                <Card key={despesa.id} className="border border-border/50 hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Data</p>
                        <p className="font-medium">{format(new Date(despesa.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Categoria</p>
                        <p className="font-medium">{despesa.categoria}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Descrição</p>
                        <p className="font-medium">{despesa.descricao}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Valor</p>
                        <p className="font-medium text-red-600">R$ {despesa.valor.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Mensagem quando não há dados */}
        {viagens.length === 0 && despesas.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum dado encontrado
            </h3>
            <p className="text-sm text-muted-foreground">
              Não há viagens ou despesas registradas no período selecionado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UberCalculator = ({ onDataUpdate, dashboardData }: UberCalculatorProps) => {
  const [showDashboard, setShowDashboard] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('drivercontrol.showDashboard');
    return stored === null ? true : stored === 'true';
  });
  const [isFormDisabled, setIsFormDisabled] = useState(false);
  const [uberData, setUberData] = useState({
    data: undefined as Date | undefined,
    kmDriven: '',
    gasPrice: '',
    fuelConsumption: '',
    dailyIncome: ''
  });

  const [fuelData, setFuelData] = useState({
    ethanolPrice: '',
    ethanolConsumption: '',
    gasolinePrice: '',
    gasolineConsumption: '',
    distances: ''
  });

  const [uberResults, setUberResults] = useState<CalculationResult | null>(null);
  const [fuelComparisons, setFuelComparisons] = useState<FuelComparison[]>([]);

  // Estado para controlar o popover do calendário
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

  const handleUberInputChange = (field: keyof typeof uberData, value: Date | string) => {
    if (field === 'data') {
      setUberData(prev => ({
        ...prev,
        data: value as Date
      }));
    } else {
      const sanitizedValue = (value as string).replace(/[^0-9.,]/g, '').replace(',', '.');
      setUberData(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
    }
  };

  const handleFuelInputChange = (field: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9.,\s]/g, '').replace(',', '.');
    setFuelData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const calculateUberResults = async () => {
    const km = parseFloat(uberData.kmDriven);
    const gasPrice = parseFloat(uberData.gasPrice);
    const consumption = parseFloat(uberData.fuelConsumption);
    const dailyIncome = parseFloat(uberData.dailyIncome);

    if (!uberData.data || isNaN(km) || isNaN(gasPrice) || isNaN(consumption) || isNaN(dailyIncome)) {
      alert('Preencha todos os campos com valores válidos, incluindo a data');
      return;
    }

    const fuelCost = (km / consumption) * gasPrice;
    const totalIncome = dailyIncome;
    const netProfit = totalIncome - fuelCost;
    const profitPerKm = netProfit / km;

    const results: CalculationResult = {
      fuelCost,
      totalIncome,
      netProfit,
      profitPerKm
    };
    setUberResults(results);
    setIsFormDisabled(true);

    try {
      await ViagemService.salvarViagem({
        data: uberData.data,
        kmRodados: km,
        precoGasolina: gasPrice,
        consumo: consumption,
        valorGanho: dailyIncome,
        gastosCombustivel: fuelCost,
        lucroLiquido: netProfit,
        lucroKm: profitPerKm
      });
      // Chamar a função de atualização de dados do dashboard, se fornecida
      if (onDataUpdate) {
        onDataUpdate();
      }
    } catch (error) {
      console.error('Erro ao salvar viagem:', error);
      alert('Erro ao salvar os dados da viagem');
    }
  };

  const calculateFuelComparison = () => {
    const ethanolPrice = parseFloat(fuelData.ethanolPrice);
    const ethanolConsumption = parseFloat(fuelData.ethanolConsumption);
    const gasolinePrice = parseFloat(fuelData.gasolinePrice);
    const gasolineConsumption = parseFloat(fuelData.gasolineConsumption);
    if (!ethanolPrice || !ethanolConsumption || !gasolinePrice || !gasolineConsumption || !fuelData.distances) {
      alert('Preencha todos os campos com valores válidos');
      return;
    }
    const distances = fuelData.distances
      .split(/[\s,\n]+/)
      .map(d => parseFloat(d.trim()))
      .filter(d => !isNaN(d) && d > 0);
    if (distances.length === 0) {
      alert('Insira pelo menos uma distância válida');
      return;
    }
    const comparisons: FuelComparison[] = distances.map(distance => {
      const ethanolCost = (distance / ethanolConsumption) * ethanolPrice;
      const gasolineCost = (distance / gasolineConsumption) * gasolinePrice;
      const savings = Math.abs(gasolineCost - ethanolCost);
      const bestOption = ethanolCost < gasolineCost ? 'Etanol' : 'Gasolina';
      return {
        distance,
        ethanolCost,
        gasolineCost,
        savings,
        bestOption
      };
    });
    setFuelComparisons(comparisons);
  };

  const clearUberFields = () => {
    setUberData({
      data: undefined,
      kmDriven: '',
      gasPrice: '',
      fuelConsumption: '',
      dailyIncome: ''
    });
    setUberResults(null);
    setIsFormDisabled(false);
  };

  const clearFuelFields = () => {
    setFuelData({
      ethanolPrice: '',
      ethanolConsumption: '',
      gasolinePrice: '',
      gasolineConsumption: '',
      distances: ''
    });
    setFuelComparisons([]);
  };

  return (
    <div className="flex flex-col items-center p-1 xs:p-2 sm:p-4 md:p-6 bg-background">
      <Tabs defaultValue="uber" className="w-full max-w-7xl mx-auto">
        <TabsList className="flex gap-0.5 xs:gap-1 sm:gap-2 w-full rounded-lg p-0.5 xs:p-1 bg-transparent border border-border/30 shadow-sm mb-3 xs:mb-4 sm:mb-6">
          <TabsTrigger value="uber" className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-1.5 xs:py-2 px-1 xs:px-2 sm:px-4 text-xs xs:text-sm">
            <Calculator className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Calculadora</span>
            <span className="xs:hidden sm:hidden">Calc</span>
          </TabsTrigger>
          <TabsTrigger value="despesas" className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-1.5 xs:py-2 px-1 xs:px-2 sm:px-4 text-xs xs:text-sm">
            <Receipt className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Despesas</span>
            <span className="xs:hidden sm:hidden">Desp</span>
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-1.5 xs:py-2 px-1 xs:px-2 sm:px-4 text-xs xs:text-sm">
            <Fuel className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Combustível</span>
            <span className="xs:hidden sm:hidden">Comb</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-1.5 xs:py-2 px-1 xs:px-2 sm:px-4 text-xs xs:text-sm">
            <History className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">Histórico</span>
            <span className="xs:hidden sm:hidden">Hist</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uber">
          <Card className="border shadow-lg bg-card p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 rounded-xl">
            <CardHeader className="pb-3 xs:pb-4 sm:pb-6">
              <div className="mb-2">
                <h1 className="text-4xl font-bold text-foreground text-left">Calculadora Uber</h1>
                <p className="text-lg text-muted-foreground text-left mt-1">Calcule seus ganhos e gastos com combustível de forma prática</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 xs:space-y-6 sm:space-y-8 p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 pt-0">
              <form autoComplete="off" className="space-y-4 xs:space-y-6 sm:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-6 sm:gap-8 md:gap-10">
                  {/* Seção 1: Informações Básicas */}
                  <div className="space-y-4 xs:space-y-6 mb-6 xs:mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 xs:gap-3 pb-3 xs:pb-4 border-b border-border/50 mb-3 xs:mb-4 text-sm xs:text-base">
                      <div className="p-1 xs:p-1.5 rounded-md bg-primary/10">
                        <CalendarIcon className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                      </div>
                      Informações Básicas
                    </h4>
                    
                    <div className="space-y-3 xs:space-y-4">
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="data" className="text-xs xs:text-sm font-medium">Data da Viagem</Label>
                        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isFormDisabled}
                              className={cn(
                                "w-full justify-start text-left font-normal h-10 xs:h-12 px-3 xs:px-4 border-2 transition-all duration-200 text-xs xs:text-sm",
                                "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20",
                                !uberData.data && "text-muted-foreground",
                                isFormDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <CalendarIcon className="mr-2 xs:mr-3 h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                              {uberData.data ? format(uberData.data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 xs:p-3" align="start">
                            <Calendar
                              mode="single"
                              selected={uberData.data}
                              onSelect={date => {
                                handleUberInputChange('data', date as Date);
                                setIsDatePopoverOpen(false);
                              }}
                              initialFocus
                              locale={ptBR}
                              className="rounded-lg border bg-card p-2 xs:p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="kmDriven" className="text-xs xs:text-sm font-medium">Quilômetros Rodados</Label>
                        <div className="relative">
                          <Input
                            id="kmDriven"
                            type="text"
                            placeholder="Ex: 120"
                            value={uberData.kmDriven}
                            disabled={isFormDisabled}
                            onChange={(e) => handleUberInputChange('kmDriven', e.target.value)}
                            className="h-10 xs:h-12 px-3 xs:px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                          />
                          <span className="absolute right-2 xs:right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs xs:text-sm">km</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Combustível */}
                  <div className="space-y-6 mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Fuel className="h-4 w-4 text-primary" />
                      </div>
                      Combustível
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="gasPrice" className="text-sm font-medium">Preço da Gasolina</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="gasPrice"
                            type="text"
                            placeholder="5.89"
                            value={uberData.gasPrice}
                            disabled={isFormDisabled}
                            onChange={(e) => handleUberInputChange('gasPrice', e.target.value)}
                            className="h-12 pl-10 pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="fuelConsumption" className="text-sm font-medium">Consumo Médio</Label>
                        <div className="relative">
                          <Input
                            id="fuelConsumption"
                            type="text"
                            placeholder="12"
                            value={uberData.fuelConsumption}
                            disabled={isFormDisabled}
                            onChange={(e) => handleUberInputChange('fuelConsumption', e.target.value)}
                            className="h-12 px-4 pr-16 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">km/L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Ganhos */}
                  <div className="space-y-6 md:col-span-2 xl:col-span-1 mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      Ganhos
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="dailyIncome" className="text-sm font-medium">Valor Total no Dia</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="dailyIncome"
                            type="text"
                            placeholder="150.00"
                            value={uberData.dailyIncome}
                            disabled={isFormDisabled}
                            onChange={(e) => handleUberInputChange('dailyIncome', e.target.value)}
                            className="h-12 pl-10 pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground/80 bg-muted/30 p-3 rounded-md">
                          💡 Valor total recebido durante o dia de trabalho
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Botões de Ação */}
                <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 sm:gap-4 pt-4 xs:pt-6 sm:pt-8 border-t border-border/50">
                  <Button
                    className={cn(
                      "flex-1 h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-semibold rounded-xl transition-all duration-300",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "transform hover:scale-[1.02] active:scale-[0.98]",
                      isFormDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={calculateUberResults}
                    disabled={isFormDisabled}
                  >
                    <Calculator className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1.5 xs:mr-2 sm:mr-3" />
                    <span className="xs:inline">
                      {isFormDisabled ? 'Dados Calculados ✓' : 'Calcular Ganhos'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "xs:w-auto sm:w-48 h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-medium rounded-xl border-2 transition-all duration-300",
                      "hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                    onClick={clearUberFields}
                  >
                    <RefreshCw className={cn("h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1.5 xs:mr-2 sm:mr-3", isFormDisabled && "animate-spin")} />
                    <span className="xs:inline">
                      {isFormDisabled ? 'Novo Cálculo' : 'Limpar Campos'}
                    </span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        {uberResults && (
          <CardContent className="space-y-3 xs:space-y-4 sm:space-y-6 p-3 xs:p-4 sm:p-6 md:p-8 pt-3 xs:pt-4 sm:pt-6 md:pt-8 border-t border-border/50 animate-in fade-in-0 duration-500 slide-in-from-bottom-4 rounded-xl">
            <h3 className="font-semibold text-sm xs:text-base sm:text-lg flex items-center gap-1.5 xs:gap-2">
              <BarChart3 className="h-5 w-5 xs:h-6 xs:w-6 sm:h-7 sm:w-7 text-primary" />
              Resumo da Viagem
            </h3>
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-6 mt-3 xs:mt-4 sm:mt-6">
              {/* CUSTO COMBUSTÍVEL EM VERMELHO - USANDO PALETA DO SITE */}
              <div className="bg-zinc-900 border-2 border-destructive/40 shadow-2xl rounded-xl p-3 xs:p-4 sm:p-6 flex flex-col items-center justify-center gap-1.5 xs:gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 mb-1 xs:mb-1.5 sm:mb-2 w-full justify-center">
                  <TrendingDown className="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8 text-destructive" />
                  <span className="text-xs xs:text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Custo Combustível</span>
                </div>
                <span className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-destructive whitespace-nowrap w-full text-center">R$ {uberResults.fuelCost.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-900 border-2 border-blue-400/40 shadow-2xl rounded-xl p-3 xs:p-4 sm:p-6 flex flex-col items-center justify-center gap-1.5 xs:gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 mb-1 xs:mb-1.5 sm:mb-2 w-full justify-center">
                  <DollarSign className="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8 text-blue-600" />
                  <span className="text-xs xs:text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Renda Total</span>
                </div>
                <span className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 whitespace-nowrap w-full text-center">R$ {uberResults.totalIncome.toFixed(2)}</span>
              </div>
              {/* LUCRO LÍQUIDO EM VERDE - USANDO PALETA DO SITE */}
              <div className="bg-zinc-900 border-2 border-success/40 shadow-2xl rounded-xl p-3 xs:p-4 sm:p-6 flex flex-col items-center justify-center gap-1.5 xs:gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 mb-1 xs:mb-1.5 sm:mb-2 w-full justify-center">
                  <TrendingUp className="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8 text-success" />
                  <span className="text-xs xs:text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Lucro Líquido</span>
                </div>
                <span className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-success whitespace-nowrap w-full text-center">R$ {uberResults.netProfit.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-900 border-2 border-purple-400/40 shadow-2xl rounded-xl p-3 xs:p-4 sm:p-6 flex flex-col items-center justify-center gap-1.5 xs:gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 mb-1 xs:mb-1.5 sm:mb-2 w-full justify-center">
                  <Route className="h-5 w-5 xs:h-6 xs:w-6 sm:h-8 sm:w-8 text-purple-600" />
                  <span className="text-xs xs:text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Lucro por Km</span>
                </div>
                <span className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 whitespace-nowrap w-full text-center">R$ {uberResults.profitPerKm.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        )}
        {/* Botão Toggle do Dashboard */}
        <div className="mt-8 xs:mt-10 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDashboard(v => {
                  const next = !v;
                  try { localStorage.setItem('drivercontrol.showDashboard', String(next)); } catch { /* ignore storage errors */ }
                  return next;
                });
              }}
              className="border-2 hover:border-primary/60 transition-all text-xs xs:text-sm"
            >
              {showDashboard ? 'Ocultar Analytics' : 'Mostrar Analytics'}
            </Button>
          </div>
          {showDashboard && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <Dashboard dados={dashboardData || undefined} onDataUpdate={onDataUpdate} />
            </div>
          )}
        </div>
        </TabsContent>

        <TabsContent value="despesas">
          <Despesas onDataUpdate={onDataUpdate} />
        </TabsContent>

        <TabsContent value="fuel">
          <Card className="border shadow-lg bg-card p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 rounded-xl">
            <CardHeader className="pb-3 xs:pb-4 sm:pb-6">
              <CardTitle className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 xs:gap-2.5 sm:gap-3">
                <div className="p-1 xs:p-1.5 sm:p-2 rounded-lg bg-primary/10">
                  <Fuel className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <span className="leading-tight">Comparação de Combustíveis</span>
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed text-xs xs:text-sm sm:text-base md:text-lg">
                Compare custos entre etanol e gasolina para diferentes distâncias
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4 xs:space-y-6 sm:space-y-8 p-2 xs:p-3 sm:p-6 md:p-8 lg:p-10 pt-0">
              <div className="grid gap-4 xs:gap-6 sm:gap-8 md:gap-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-6 sm:gap-8 md:gap-10">
                  <div className="space-y-4 xs:space-y-6 mb-6 xs:mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 xs:gap-3 pb-3 xs:pb-4 border-b border-border/50 mb-3 xs:mb-4 text-sm xs:text-base">
                      <div className="p-1 xs:p-1.5 rounded-md bg-primary/10">
                        <Fuel className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                      </div>
                      Informações do Etanol
                    </h4>
                    <div className="space-y-3 xs:space-y-4">
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="ethanolPrice" className="text-xs xs:text-sm font-medium">Preço do Etanol (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 xs:left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="ethanolPrice"
                            type="text"
                            placeholder="Ex: 4.09"
                            value={fuelData.ethanolPrice}
                            onChange={(e) => handleFuelInputChange('ethanolPrice', e.target.value)}
                            className="h-10 xs:h-12 pl-8 xs:pl-10 pr-3 xs:pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="ethanolConsumption" className="text-xs xs:text-sm font-medium">Consumo Etanol (km/L)</Label>
                        <div className="relative">
                          <Input
                            id="ethanolConsumption"
                            type="text"
                            placeholder="Ex: 8.2"
                            value={fuelData.ethanolConsumption}
                            onChange={(e) => handleFuelInputChange('ethanolConsumption', e.target.value)}
                            className="h-10 xs:h-12 px-3 xs:px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                          />
                          <span className="absolute right-2 xs:right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs xs:text-sm">km/L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 xs:space-y-6 mb-6 xs:mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 xs:gap-3 pb-3 xs:pb-4 border-b border-border/50 mb-3 xs:mb-4 text-sm xs:text-base">
                      <div className="p-1 xs:p-1.5 rounded-md bg-primary/10">
                        <Fuel className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                      </div>
                      Informações da Gasolina
                    </h4>
                    <div className="space-y-3 xs:space-y-4">
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="gasolinePrice" className="text-xs xs:text-sm font-medium">Preço da Gasolina (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-3 xs:left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="gasolinePrice"
                            type="text"
                            placeholder="Ex: 5.80"
                            value={fuelData.gasolinePrice}
                            onChange={(e) => handleFuelInputChange('gasolinePrice', e.target.value)}
                            className="h-10 xs:h-12 pl-8 xs:pl-10 pr-3 xs:pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="gasolineConsumption" className="text-xs xs:text-sm font-medium">Consumo Gasolina (km/L)</Label>
                        <div className="relative">
                          <Input
                            id="gasolineConsumption"
                            type="text"
                            placeholder="Ex: 13.5"
                            value={fuelData.gasolineConsumption}
                            onChange={(e) => handleFuelInputChange('gasolineConsumption', e.target.value)}
                            className="h-10 xs:h-12 px-3 xs:px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                          />
                          <span className="absolute right-2 xs:right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs xs:text-sm">km/L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 xs:space-y-6 mb-6 xs:mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 xs:gap-3 pb-3 xs:pb-4 border-b border-border/50 mb-3 xs:mb-4 text-sm xs:text-base">
                      <div className="p-1 xs:p-1.5 rounded-md bg-primary/10">
                        <Calculator className="h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                      </div>
                      Distâncias para Comparação
                    </h4>
                    <div className="space-y-3 xs:space-y-4">
                      <div className="space-y-2 xs:space-y-3 flex flex-col">
                        <Label htmlFor="distances" className="text-xs xs:text-sm font-medium">Distâncias (km)</Label>
                        <Input
                          id="distances"
                          type="text"
                          placeholder="Ex: 100, 150, 200 ou separe por espaços"
                          value={fuelData.distances}
                          onChange={(e) => handleFuelInputChange('distances', e.target.value)}
                          className="h-10 xs:h-12 px-3 xs:px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs xs:text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Separe as distâncias por vírgula ou espaços</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row gap-3 xs:gap-4 pt-4 xs:pt-6 sm:pt-8 border-t border-border/50">
                <Button
                  className="flex-1 h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={calculateFuelComparison}
                >
                  <Fuel className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1.5 xs:mr-2 sm:mr-3" />
                  <span className="hidden sm:inline">Comparar Combustíveis</span>
                  <span className="sm:hidden">Comparar</span>
                </Button>
                <Button
                  variant="outline"
                  className="xs:w-32 sm:w-48 h-10 xs:h-12 sm:h-14 text-xs xs:text-sm sm:text-base font-medium rounded-xl border-2 transition-all duration-300 hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={clearFuelFields}
                >
                  <RefreshCw className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1.5 xs:mr-2 sm:mr-3" />
                  Limpar
                </Button>
              </div>

              {fuelComparisons.length > 0 && (
                <div className="space-y-4 sm:space-y-6 border-t border-border/30 p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 rounded-xl">
                  <h3 className="font-semibold text-lg sm:text-xl flex items-center gap-2 sm:gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Comparação de Custos
                  </h3>
                  <div className="grid gap-3 sm:gap-4 mt-4 sm:mt-6">
                     {fuelComparisons.map((comparison, index) => (
                      <div key={index} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">{comparison.distance}</span>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Distância</p>
                              <p className="font-medium">km</p>
                            </div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium",
                            comparison.bestOption === "Etanol" 
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                              : "bg-muted/20 text-foreground border border-border"
                          )}>
                            Melhor: {comparison.bestOption}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div className="bg-zinc-900 border-2 border-red-400/40 shadow-2xl rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 w-full justify-center">
                              <Fuel className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Custo Etanol</span>
                            </div>
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 whitespace-nowrap w-full text-center">
                              R$ {comparison.ethanolCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-zinc-900 border-2 border-red-400/40 shadow-2xl rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 w-full justify-center">
                              <Fuel className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Custo Gasolina</span>
                            </div>
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 whitespace-nowrap w-full text-center">
                              R$ {comparison.gasolineCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="bg-zinc-900 border-2 border-green-400/40 shadow-2xl rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 w-full justify-center">
                              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Economia</span>
                            </div>
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 whitespace-nowrap w-full text-center">
                              R$ {comparison.savings.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <div className="space-y-4 xs:space-y-6 sm:space-y-8">
            {/* Importar o componente Dashboard aqui */}
            {onDataUpdate && (
              <div className="w-full">
                <HistoricoComponent onDataUpdate={onDataUpdate} />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UberCalculator;