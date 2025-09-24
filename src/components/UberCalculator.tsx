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
import { Calculator, RefreshCw, Fuel, BarChart3, CalendarIcon } from 'lucide-react';
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

    try {
      // Salvar a viagem
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

      // Atualizar dashboard
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
      .split(/[,\s\n]+/)
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
    <div className="container mx-auto p-4 max-w-[1200px]">
      <Tabs defaultValue="uber" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="uber" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Combustível
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uber">
          <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Calculadora Uber
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Calcule gastos, receita e lucro das suas viagens
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-card-foreground">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !uberData.data && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kmDriven" className="text-card-foreground">Km rodados</Label>
                  <Input
                    id="kmDriven"
                    type="text"
                    placeholder="Ex: 120"
                    value={uberData.kmDriven}
                    onChange={(e) => handleUberInputChange('kmDriven', e.target.value)}
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gasPrice" className="text-card-foreground">Preço da gasolina (R$)</Label>
                    <Input
                      id="gasPrice"
                      type="text"
                      placeholder="Ex: 5.89"
                      value={uberData.gasPrice}
                      onChange={(e) => handleUberInputChange('gasPrice', e.target.value)}
                      className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelConsumption" className="text-card-foreground">Consumo (km/L)</Label>
                    <Input
                      id="fuelConsumption"
                      type="text"
                      placeholder="Ex: 12"
                      value={uberData.fuelConsumption}
                      onChange={(e) => handleUberInputChange('fuelConsumption', e.target.value)}
                      className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyIncome" className="text-card-foreground">Valor feito no dia (R$)</Label>
                  <Input
                    id="dailyIncome"
                    type="text"
                    placeholder="Ex: 150.00"
                    value={uberData.dailyIncome}
                    onChange={(e) => handleUberInputChange('dailyIncome', e.target.value)}
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={calculateUberResults}
                  >
                    Adicionar Ganhos
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-transparent border-calculator-border text-card-foreground hover:bg-accent flex items-center gap-2"
                    onClick={clearUberFields}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>

                {uberResults && (
                  <div className="mt-6 space-y-6">
                    <h3 className="font-semibold text-xl text-card-foreground flex items-center gap-2">
                      <span className="h-8 w-1 bg-primary rounded-full"/>
                      Resultados da Viagem
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card de Gastos */}
                      <div className="bg-red-500/10 p-6 rounded-xl border border-red-200/20 flex flex-col">
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">Custos</span>
                        <div className="mt-2 flex items-baseline">
                          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                            R$ {uberResults.fuelCost.toFixed(2)}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">combustível</span>
                        </div>
                      </div>

                      {/* Card de Ganhos */}
                      <div className="bg-green-500/10 p-6 rounded-xl border border-green-200/20 flex flex-col">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Ganhos</span>
                        <div className="mt-2 flex items-baseline">
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            R$ {uberResults.totalIncome.toFixed(2)}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">total</span>
                        </div>
                      </div>

                      {/* Card de Lucro */}
                      <div className="bg-green-500/10 p-6 rounded-xl border border-green-200/20 flex flex-col">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Lucro Líquido</span>
                        <div className="mt-2 flex items-baseline">
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            R$ {uberResults.netProfit.toFixed(2)}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">total</span>
                        </div>
                      </div>

                      {/* Card de Lucro por KM */}
                      <div className="bg-green-500/10 p-6 rounded-xl border border-green-200/20 flex flex-col">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">Lucro por KM</span>
                        <div className="mt-2 flex items-baseline">
                          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            R$ {uberResults.profitPerKm.toFixed(2)}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">por quilômetro</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                Comparação de Combustíveis
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Compare custos entre etanol e gasolina para diferentes distâncias
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ethanolPrice" className="text-card-foreground">Preço do Etanol (R$)</Label>
                  <Input
                    id="ethanolPrice"
                    type="text"
                    placeholder="Ex: 4.09"
                    value={fuelData.ethanolPrice}
                    onChange={(e) => handleFuelInputChange('ethanolPrice', e.target.value)}
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
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
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gasolinePrice" className="text-card-foreground">Preço da Gasolina (R$)</Label>
                  <Input
                    id="gasolinePrice"
                    type="text"
                    placeholder="Ex: 5.80"
                    value={fuelData.gasolinePrice}
                    onChange={(e) => handleFuelInputChange('gasolinePrice', e.target.value)}
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
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
                    className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distances" className="text-card-foreground">Distâncias para comparar (km)</Label>
                <Input
                  id="distances"
                  type="text"
                  placeholder="Ex: 100, 150, 200 ou separe por espaços"
                  value={fuelData.distances}
                  onChange={(e) => handleFuelInputChange('distances', e.target.value)}
                  className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Separe as distâncias por vírgula ou espaços</p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={calculateFuelComparison}
                >
                  Comparar
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-calculator-border text-card-foreground hover:bg-accent flex items-center gap-2"
                  onClick={clearFuelFields}
                >
                  <RefreshCw className="h-4 w-4" />
                  Limpar
                </Button>
              </div>

              {fuelComparisons.length > 0 && (
                <div className="mt-6 space-y-6">
                  <h3 className="font-semibold text-xl text-card-foreground flex items-center gap-2">
                    <span className="h-8 w-1 bg-primary rounded-full"/>
                    Comparação de Custos
                  </h3>
                  <div className="grid gap-4">
                    {fuelComparisons.map((comparison, index) => (
                      <div key={index} className="p-6 bg-accent/50 rounded-xl border border-border">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="font-semibold text-primary">{comparison.distance}</span>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Distância</p>
                              <p className="font-medium text-card-foreground">quilômetros</p>
                            </div>
                          </div>
                          <div className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium",
                            comparison.bestOption === "Etanol" 
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>
                            Melhor opção: {comparison.bestOption}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="bg-red-500/10 p-4 rounded-lg border border-red-200/20">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Custo Etanol</p>
                            <p className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
                              R$ {comparison.ethanolCost.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-red-500/10 p-4 rounded-lg border border-red-200/20">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Custo Gasolina</p>
                            <p className="text-xl font-semibold text-red-600 dark:text-red-400 mt-1">
                              R$ {comparison.gasolineCost.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-500/10 p-4 rounded-lg border border-green-200/20">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Economia</p>
                            <p className="text-xl font-semibold text-green-600 dark:text-green-400 mt-1">
                              R$ {comparison.savings.toFixed(2)}
                            </p>
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

        <TabsContent value="dashboard">
          {dashboardData ? (
            <Dashboard dados={dashboardData} />
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Nenhum dado disponível ainda. Faça alguns cálculos primeiro!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UberCalculator;