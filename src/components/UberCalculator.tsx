import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, RefreshCw, Fuel, BarChart3 } from 'lucide-react';

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
  // Estados para calculadora Uber
  const [uberData, setUberData] = useState({
    kmDriven: '',
    gasPrice: '',
    fuelConsumption: '',
    dailyIncome: ''
  });

  // Estados para comparação de combustíveis
  const [fuelData, setFuelData] = useState({
    ethanolPrice: '',
    ethanolConsumption: '',
    gasolinePrice: '',
    gasolineConsumption: '',
    distances: ''
  });

  const [uberResults, setUberResults] = useState<CalculationResult | null>(null);
  const [fuelComparisons, setFuelComparisons] = useState<FuelComparison[]>([]);

  const handleUberInputChange = (field: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setUberData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const handleFuelInputChange = (field: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9.,\s]/g, '').replace(',', '.');
    setFuelData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const calculateUberResults = () => {
    const km = parseFloat(uberData.kmDriven);
    const gasPrice = parseFloat(uberData.gasPrice);
    const consumption = parseFloat(uberData.fuelConsumption);
    const dailyIncome = parseFloat(uberData.dailyIncome);

    if (!km || !gasPrice || !consumption || !dailyIncome) {
      alert('Preencha todos os campos com valores válidos');
      return;
    }

    const fuelCost = (km / consumption) * gasPrice;
    const totalIncome = dailyIncome;
    const netProfit = totalIncome - fuelCost;
    const profitPerKm = netProfit / km;

    setUberResults({
      fuelCost,
      totalIncome,
      netProfit,
      profitPerKm
    });
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

    // Parse distances (pode ser separado por vírgula, espaço ou quebra de linha)
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-calculator-bg to-background p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">Calculadora Combustível</h1>
          <p className="text-muted-foreground">Gerencie seus custos e compare combustíveis</p>
        </div>

        <Tabs defaultValue="uber" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="uber" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculadora Uber
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Comparar Combustíveis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uber" className="space-y-6">
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

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={calculateUberResults}
                    className="flex-1 bg-gradient-to-r from-primary to-calculator-success text-primary-foreground font-semibold"
                  >
                    Calcular
                  </Button>
                  <Button 
                    onClick={clearUberFields}
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {uberResults && (
              <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)] animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-card-foreground">Resultados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                    <span className="text-muted-foreground">Gasto com combustível:</span>
                    <span className="font-semibold text-destructive">{formatCurrency(uberResults.fuelCost)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                    <span className="text-muted-foreground">Receita total:</span>
                    <span className="font-semibold text-card-foreground">{formatCurrency(uberResults.totalIncome)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg border border-primary/20">
                    <span className="text-muted-foreground">Lucro líquido:</span>
                    <span className={`font-bold text-lg ${uberResults.netProfit > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(uberResults.netProfit)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                    <span className="text-muted-foreground">Lucro por km:</span>
                    <span className={`font-semibold ${uberResults.profitPerKm > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(uberResults.profitPerKm)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
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

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={calculateFuelComparison}
                    className="flex-1 bg-gradient-to-r from-primary to-calculator-success text-primary-foreground font-semibold"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Comparar
                  </Button>
                  <Button 
                    onClick={clearFuelFields}
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {fuelComparisons.length > 0 && (
              <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)] animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-card-foreground">Comparação de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fuelComparisons.map((comparison, index) => (
                      <div key={index} className="bg-calculator-input rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-card-foreground">{comparison.distance} km</h4>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            comparison.bestOption === 'Etanol' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            Melhor: {comparison.bestOption}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">Etanol</p>
                            <p className="font-semibold text-primary">{formatCurrency(comparison.ethanolCost)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Gasolina</p>
                            <p className="font-semibold text-orange-400">{formatCurrency(comparison.gasolineCost)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Economia</p>
                            <p className="font-semibold text-card-foreground">{formatCurrency(comparison.savings)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <p className="text-muted-foreground text-sm">Offline • Mobile-first</p>
        </div>
      </div>
    </div>
  );
};

export default UberCalculator;