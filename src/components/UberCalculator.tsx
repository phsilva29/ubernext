import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUp, Calculator, Car, CreditCard, DollarSign, Fuel, BarChart3, CalendarIcon, RefreshCw } from 'lucide-react';
import { cn } from "@/lib/utils";
import ViagemService from '@/services/ViagemService';
import { Dashboard } from './dashboard/Dashboard';
import type { DadosDashboard } from '@/types';

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

const UberCalculator = () => {
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
  const [dashboardData, setDashboardData] = useState<DadosDashboard | null>(null);
  const [fuelComparisons, setFuelComparisons] = useState<FuelComparison[]>([]);

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  const carregarDadosDashboard = async () => {
    try {
      const dados = await ViagemService.obterDadosDashboard();
      setDashboardData(dados);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

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
      await carregarDadosDashboard();
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
    <div className="flex flex-col items-center min-h-screen p-4 bg-background">
      <Tabs defaultValue="uber" className="w-full max-w-2xl">
        <TabsList className="flex gap-2 w-full rounded-lg p-1 bg-card/60 border border-border/30 shadow-sm mb-6">
          <TabsTrigger value="uber" className="flex-1 flex items-center justify-center gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex-1 flex items-center justify-center gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
            <Fuel className="h-4 w-4" />
            Combustível
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex-1 flex items-center justify-center gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uber">
          <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Calculadora Uber
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Calcule gastos, receita e lucro das suas viagens
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <form autoComplete="off">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Coluna 1: Básico */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80 border-b border-border/30 pb-2">
                      <CalendarIcon className="h-4 w-4" /> 
                      Informações Básicas
                    </h4>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="data">Data da Viagem</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isFormDisabled}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-calculator-input border-calculator-border",
                              !uberData.data && "text-muted-foreground",
                              isFormDisabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {uberData.data ? format(uberData.data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={uberData.data}
                            onSelect={date => handleUberInputChange('data', date as Date)}
                            initialFocus
                            locale={ptBR}
                            className="rounded-lg border border-border/50 bg-card"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="kmDriven">Quilômetros Rodados</Label>
                      <Input
                        id="kmDriven"
                        type="text"
                        placeholder="Ex: 120"
                        value={uberData.kmDriven}
                        disabled={isFormDisabled}
                        onChange={(e) => handleUberInputChange('kmDriven', e.target.value)}
                        className="bg-calculator-input border-calculator-border"
                      />
                    </div>
                  </div>
                  {/* Coluna 2: Combustível */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80 border-b border-border/30 pb-2">
                      <Fuel className="h-4 w-4" /> 
                      Combustível
                    </h4>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="gasPrice">Preço da Gasolina</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          id="gasPrice"
                          type="text"
                          placeholder="Ex: 5.89"
                          value={uberData.gasPrice}
                          disabled={isFormDisabled}
                          onChange={(e) => handleUberInputChange('gasPrice', e.target.value)}
                          className="pl-8 bg-calculator-input border-calculator-border"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="fuelConsumption">Consumo Médio</Label>
                      <div className="relative">
                        <Input
                          id="fuelConsumption"
                          type="text"
                          placeholder="Ex: 12"
                          value={uberData.fuelConsumption}
                          disabled={isFormDisabled}
                          onChange={(e) => handleUberInputChange('fuelConsumption', e.target.value)}
                          className="pr-12 bg-calculator-input border-calculator-border"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">km/L</span>
                      </div>
                    </div>
                  </div>
                  {/* Coluna 3: Ganhos */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80 border-b border-border/30 pb-2">
                      <DollarSign className="h-4 w-4" /> 
                      Ganhos
                    </h4>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="dailyIncome">Valor Total no Dia</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          id="dailyIncome"
                          type="text"
                          placeholder="Ex: 150.00"
                          value={uberData.dailyIncome}
                          disabled={isFormDisabled}
                          onChange={(e) => handleUberInputChange('dailyIncome', e.target.value)}
                          className="pl-8 bg-calculator-input border-calculator-border"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Valor total recebido durante o dia</p>
                    </div>
                  </div>
                </div>
                {/* Botões */}
                <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t border-border/30 mt-6">
                  <Button
                    className={cn(
                      "flex-1 h-11",
                      isFormDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={calculateUberResults}
                    disabled={isFormDisabled}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isFormDisabled ? 'Dados Adicionados' : 'Calcular Ganhos'}
                  </Button>
                  <Button
                    variant="outline"
                    className="sm:w-44 h-11"
                    onClick={clearUberFields}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isFormDisabled && "animate-spin")} />
                    {isFormDisabled ? 'Novo Cálculo' : 'Limpar'}
                  </Button>
                </div>
                {/* Resultados */}
                {uberResults && (
                  <div className="pt-6 space-y-6 border-t border-border/30 mt-6">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Resultados da Viagem
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="bg-red-500/5 border-red-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-red-500/90 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Custos com Combustível
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-red-500/90">
                              R$ {uberResults.fuelCost.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/5 border-blue-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-blue-500/90 flex items-center gap-2">
                            <ArrowUp className="h-4 w-4" />
                            Ganhos Totais
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-blue-500/90">
                              R$ {uberResults.totalIncome.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/5 border-green-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Lucro Líquido
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-green-600">
                              R$ {uberResults.netProfit.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/5 border-green-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            Lucro por KM
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold text-green-600">
                              R$ {uberResults.profitPerKm.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Card className="border shadow-sm bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                Comparação de Combustíveis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare custos entre etanol e gasolina para diferentes distâncias
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80 border-b border-border/30 pb-2">
                      <Fuel className="h-4 w-4" />
                      Informações do Etanol
                    </h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="ethanolPrice" className="text-card-foreground">Preço do Etanol (R$)</Label>
                        <Input
                          id="ethanolPrice"
                          type="text"
                          placeholder="Ex: 4.09"
                          value={fuelData.ethanolPrice}
                          onChange={(e) => handleFuelInputChange('ethanolPrice', e.target.value)}
                          className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ethanolConsumption" className="text-card-foreground">Consumo Etanol (km/L)</Label>
                        <Input
                          id="ethanolConsumption"
                          type="text"
                          placeholder="Ex: 8.2"
                          value={fuelData.ethanolConsumption}
                          onChange={(e) => handleFuelInputChange('ethanolConsumption', e.target.value)}
                          className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80 border-b border-border/30 pb-2">
                      <Fuel className="h-4 w-4" />
                      Informações da Gasolina
                    </h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="gasolinePrice" className="text-card-foreground">Preço da Gasolina (R$)</Label>
                        <Input
                          id="gasolinePrice"
                          type="text"
                          placeholder="Ex: 5.80"
                          value={fuelData.gasolinePrice}
                          onChange={(e) => handleFuelInputChange('gasolinePrice', e.target.value)}
                          className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gasolineConsumption" className="text-card-foreground">Consumo Gasolina (km/L)</Label>
                        <Input
                          id="gasolineConsumption"
                          type="text"
                          placeholder="Ex: 13.5"
                          value={fuelData.gasolineConsumption}
                          onChange={(e) => handleFuelInputChange('gasolineConsumption', e.target.value)}
                          className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border/30 pt-6">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-primary/80">
                    <Calculator className="h-4 w-4" />
                    Distâncias para Comparação
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="distances">Distâncias (km)</Label>
                    <Input
                      id="distances"
                      type="text"
                      placeholder="Ex: 100, 150, 200 ou separe por espaços"
                      value={fuelData.distances}
                      onChange={(e) => handleFuelInputChange('distances', e.target.value)}
                      className="bg-calculator-input border-calculator-border"
                    />
                    <p className="text-xs text-muted-foreground">Separe as distâncias por vírgula ou espaços</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/30">
                <Button
                  className="flex-1 h-11"
                  onClick={calculateFuelComparison}
                >
                  <Fuel className="h-4 w-4 mr-2" />
                  Comparar Combustíveis
                </Button>
                <Button
                  variant="outline"
                  className="sm:w-44 h-11"
                  onClick={clearFuelFields}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>

              {fuelComparisons.length > 0 && (
                <div className="space-y-6 border-t border-border/30 pt-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Comparação de Custos
                  </h3>
                  <div className="grid gap-4">
                    {fuelComparisons.map((comparison, index) => (
                      <Card key={index} className="p-4 bg-card/50 border-border/30">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
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
                              : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          )}>
                            Melhor: {comparison.bestOption}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                            <p className="text-sm font-medium text-red-600">Custo com Etanol</p>
                            <p className="text-lg font-semibold text-red-600 mt-1">
                              R$ {comparison.ethanolCost.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                            <p className="text-sm font-medium text-red-600">Custo com Gasolina</p>
                            <p className="text-lg font-semibold text-red-600 mt-1">
                              R$ {comparison.gasolineCost.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-500/5 p-4 rounded-lg border border-green-500/10">
                            <p className="text-sm font-medium text-green-600">Economia</p>
                            <p className="text-lg font-semibold text-green-600 mt-1">
                              R$ {comparison.savings.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          {dashboardData ? (
            <div className="animate-in fade-in-0 duration-500 slide-in-from-bottom-4">
              <Dashboard dados={dashboardData} />
            </div>
          ) : (
            <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)]">
              <div className="flex flex-col items-center justify-center p-12 gap-4">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground text-center">
                  Nenhum dado disponível ainda.<br/>
                  Faça alguns cálculos primeiro para visualizar o dashboard!
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UberCalculator;