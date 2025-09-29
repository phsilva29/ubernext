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
import { ArrowUp, Calculator, Car, CreditCard, DollarSign, Fuel, BarChart3, CalendarIcon, RefreshCw, TrendingUp, Route } from 'lucide-react';
import { cn } from "@/lib/utils";
import ViagemService from '@/services/ViagemService';

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
}

const UberCalculator = ({ onDataUpdate }: UberCalculatorProps) => {
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

  useEffect(() => {
  }, []);

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
        data: format(uberData.data, 'yyyy-MM-dd'),
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
    <div className="flex flex-col items-center p-4 bg-background">
      <Tabs defaultValue="uber" className="w-full max-w-4xl mx-auto">
        <TabsList className="flex gap-2 w-full rounded-lg p-1 bg-transparent border border-border/30 shadow-sm mb-6">
          <TabsTrigger value="uber" className="flex-1 flex items-center justify-center gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="fuel" className="flex-1 flex items-center justify-center gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
            <Fuel className="h-4 w-4" />
            Combustível
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uber">
          <Card className="border shadow-lg bg-card p-6 sm:p-8 rounded-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                Calculadora Uber
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed">
                Calcule gastos, receita e lucro das suas viagens de forma rápida e precisa
              </p>
            </CardHeader>
            <CardContent className="space-y-8 p-6 sm:p-8 pt-0">
              <form autoComplete="off" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                  {/* Seção 1: Informações Básicas */}
                  <div className="space-y-6 mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      Informações Básicas
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="data" className="text-sm font-medium">Data da Viagem</Label>
                        <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isFormDisabled}
                              className={cn(
                                "w-full justify-start text-left font-normal h-12 px-4 border-2 transition-all duration-200",
                                "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20",
                                !uberData.data && "text-muted-foreground",
                                isFormDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                              {uberData.data ? format(uberData.data, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="start">
                            <Calendar
                              mode="single"
                              selected={uberData.data}
                              onSelect={date => {
                                handleUberInputChange('data', date as Date);
                                setIsDatePopoverOpen(false);
                              }}
                              initialFocus
                              locale={ptBR}
                              className="rounded-lg border bg-card p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="kmDriven" className="text-sm font-medium">Quilômetros Rodados</Label>
                        <div className="relative">
                          <Input
                            id="kmDriven"
                            type="text"
                            placeholder="Ex: 120"
                            value={uberData.kmDriven}
                            disabled={isFormDisabled}
                            onChange={(e) => handleUberInputChange('kmDriven', e.target.value)}
                            className="h-12 px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km</span>
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
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/50">
                  <Button
                    className={cn(
                      "flex-1 h-14 text-base font-semibold rounded-xl transition-all duration-300",
                      "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "transform hover:scale-[1.02] active:scale-[0.98]",
                      isFormDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={calculateUberResults}
                    disabled={isFormDisabled}
                  >
                    <Calculator className="h-5 w-5 mr-3" />
                    {isFormDisabled ? 'Dados Calculados ✓' : 'Calcular Ganhos'}
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "sm:w-48 h-14 text-base font-medium rounded-xl border-2 transition-all duration-300",
                      "hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                    onClick={clearUberFields}
                  >
                    <RefreshCw className={cn("h-5 w-5 mr-3", isFormDisabled && "animate-spin")} />
                    {isFormDisabled ? 'Novo Cálculo' : 'Limpar Campos'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        {uberResults && (
          <CardContent className="space-y-6 p-6 sm:p-8 pt-8 border-t border-border/50 animate-in fade-in-0 duration-500 slide-in-from-bottom-4 rounded-xl">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Resumo da Viagem
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="bg-zinc-900 border-2 border-red-400/40 shadow-2xl rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Car className="h-8 w-8 text-red-400" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-full text-center">Custo Combustível</span>
                </div>
                <span className="text-3xl font-bold text-red-600 whitespace-nowrap w-full text-center">R$ {uberResults.fuelCost.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-900 border-2 border-primary/30 shadow-2xl rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <DollarSign className="h-7 w-7 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-full text-center">Renda Total</span>
                </div>
                <span className="text-3xl font-bold text-primary whitespace-nowrap w-full text-center">R$ {uberResults.totalIncome.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-900 border-2 border-emerald-400/40 shadow-2xl rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <TrendingUp className="h-7 w-7 text-emerald-600" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-full text-center">Lucro Líquido</span>
                </div>
                <span className="text-3xl font-bold text-emerald-600 whitespace-nowrap w-full text-center">R$ {uberResults.netProfit.toFixed(2)}</span>
              </div>
              <div className="bg-zinc-900 border-2 border-purple-400/40 shadow-2xl rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Route className="h-7 w-7 text-purple-600" />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap w-full text-center">Lucro por Km</span>
                </div>
                <span className="text-3xl font-bold text-purple-600 whitespace-nowrap w-full text-center">R$ {uberResults.profitPerKm.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        )}
        </TabsContent>

        <TabsContent value="fuel">
          <Card className="border shadow-lg bg-card p-6 sm:p-8 rounded-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Fuel className="h-6 w-6 text-primary" />
                </div>
                Comparação de Combustíveis
              </CardTitle>
              <p className="text-muted-foreground leading-relaxed">
                Compare custos entre etanol e gasolina para diferentes distâncias
              </p>
            </CardHeader>
            
            <CardContent className="space-y-8 p-6 sm:p-8 pt-0">
              <div className="grid gap-6">
                <div className="grid lg:grid-cols-2 gap-10">
                  <div className="space-y-6 mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Fuel className="h-4 w-4 text-primary" />
                      </div>
                      Informações do Etanol
                    </h4>
                    <div className="space-y-6">
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="ethanolPrice" className="text-sm font-medium">Preço do Etanol (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="ethanolPrice"
                            type="text"
                            placeholder="Ex: 4.09"
                            value={fuelData.ethanolPrice}
                            onChange={(e) => handleFuelInputChange('ethanolPrice', e.target.value)}
                            className="h-12 pl-10 pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                          />
                        </div>
                      </div>
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="ethanolConsumption" className="text-sm font-medium">Consumo Etanol (km/L)</Label>
                        <div className="relative">
                          <Input
                            id="ethanolConsumption"
                            type="text"
                            placeholder="Ex: 8.2"
                            value={fuelData.ethanolConsumption}
                            onChange={(e) => handleFuelInputChange('ethanolConsumption', e.target.value)}
                            className="h-12 px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km/L</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Fuel className="h-4 w-4 text-primary" />
                      </div>
                      Informações da Gasolina
                    </h4>
                    <div className="space-y-6">
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="gasolinePrice" className="text-sm font-medium">Preço da Gasolina (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                          <Input
                            id="gasolinePrice"
                            type="text"
                            placeholder="Ex: 5.80"
                            value={fuelData.gasolinePrice}
                            onChange={(e) => handleFuelInputChange('gasolinePrice', e.target.value)}
                            className="h-12 pl-10 pr-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                          />
                        </div>
                      </div>
                      <div className="space-y-3 flex flex-col">
                        <Label htmlFor="gasolineConsumption" className="text-sm font-medium">Consumo Gasolina (km/L)</Label>
                        <div className="relative">
                          <Input
                            id="gasolineConsumption"
                            type="text"
                            placeholder="Ex: 13.5"
                            value={fuelData.gasolineConsumption}
                            onChange={(e) => handleFuelInputChange('gasolineConsumption', e.target.value)}
                            className="h-12 px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km/L</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-8 border-t border-border/30 pt-6">
                  <h4 className="font-semibold text-foreground flex items-center gap-3 pb-4 border-b border-border/50 mb-4">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Calculator className="h-4 w-4 text-primary" />
                    </div>
                    Distâncias para Comparação
                  </h4>
                  <div className="space-y-3 flex flex-col">
                    <Label htmlFor="distances" className="text-sm font-medium">Distâncias (km)</Label>
                    <Input
                      id="distances"
                      type="text"
                      placeholder="Ex: 100, 150, 200 ou separe por espaços"
                      value={fuelData.distances}
                      onChange={(e) => handleFuelInputChange('distances', e.target.value)}
                      className="h-12 px-4 border-2 transition-all duration-200 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Separe as distâncias por vírgula ou espaços</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/50">
                <Button
                  className="flex-1 h-14 text-base font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-[1.02] active:scale-[0.98]"
                  onClick={calculateFuelComparison}
                >
                  <Fuel className="h-5 w-5 mr-3" />
                  Comparar Combustíveis
                </Button>
                <Button
                  variant="outline"
                  className="sm:w-48 h-14 text-base font-medium rounded-xl border-2 transition-all duration-300 hover:bg-muted/50 hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={clearFuelFields}
                >
                  <RefreshCw className="h-5 w-5 mr-3" />
                  Limpar
                </Button>
              </div>

              {fuelComparisons.length > 0 && (
                <div className="space-y-6 border-t border-border/30 p-6 sm:p-8 pt-6 rounded-xl">
                  <h3 className="font-semibold text-xl flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Comparação de Custos
                  </h3>
                  <div className="grid gap-4 mt-6">
                    {fuelComparisons.map((comparison, index) => (
                      <Card key={index} className="p-4 bg-accent/10 border border-border/50 shadow-sm rounded-lg">
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
                              : "bg-muted/20 text-foreground border border-border"
                          )}>
                            Melhor: {comparison.bestOption}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      </Tabs>
    </div>
  );
};

export default UberCalculator;