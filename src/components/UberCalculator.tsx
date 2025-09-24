import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, RefreshCw } from 'lucide-react';

interface CalculationResult {
  fuelCost: number;
  totalIncome: number;
  netProfit: number;
  profitPerKm: number;
}

const UberCalculator = () => {
  const [formData, setFormData] = useState({
    kmDriven: '',
    gasPrice: '',
    fuelConsumption: '',
    pricePerKm: ''
  });

  const [results, setResults] = useState<CalculationResult | null>(null);

  const handleInputChange = (field: string, value: string) => {
    // Allow only numbers and decimal point
    const sanitizedValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const calculateResults = () => {
    const km = parseFloat(formData.kmDriven);
    const gasPrice = parseFloat(formData.gasPrice);
    const consumption = parseFloat(formData.fuelConsumption);
    const pricePerKm = parseFloat(formData.pricePerKm);

    if (!km || !gasPrice || !consumption || !pricePerKm) {
      alert('Preencha todos os campos com valores válidos');
      return;
    }

    const fuelCost = (km / consumption) * gasPrice;
    const totalIncome = km * pricePerKm;
    const netProfit = totalIncome - fuelCost;
    const profitPerKm = netProfit / km;

    setResults({
      fuelCost,
      totalIncome,
      netProfit,
      profitPerKm
    });
  };

  const clearFields = () => {
    setFormData({
      kmDriven: '',
      gasPrice: '',
      fuelConsumption: '',
      pricePerKm: ''
    });
    setResults(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-calculator-bg to-background p-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-card-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Calculadora Uber
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Preencha os campos para estimar combustível, receita e lucro.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kmDriven" className="text-card-foreground">Km rodados</Label>
              <Input
                id="kmDriven"
                type="text"
                placeholder="Ex: 120"
                value={formData.kmDriven}
                onChange={(e) => handleInputChange('kmDriven', e.target.value)}
                className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_3px_hsl(220_50%_4%/0.3)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gasPrice" className="text-card-foreground">Preço da gasolina (R$)</Label>
                <Input
                  id="gasPrice"
                  type="text"
                  placeholder="Ex: 5.89"
                  value={formData.gasPrice}
                  onChange={(e) => handleInputChange('gasPrice', e.target.value)}
                  className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_3px_hsl(220_50%_4%/0.3)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuelConsumption" className="text-card-foreground">Consumo (km/L)</Label>
                <Input
                  id="fuelConsumption"
                  type="text"
                  placeholder="Ex: 12"
                  value={formData.fuelConsumption}
                  onChange={(e) => handleInputChange('fuelConsumption', e.target.value)}
                  className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_3px_hsl(220_50%_4%/0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerKm" className="text-card-foreground">Valor pago por km (R$)</Label>
              <Input
                id="pricePerKm"
                type="text"
                placeholder="Ex: 1.25"
                value={formData.pricePerKm}
                onChange={(e) => handleInputChange('pricePerKm', e.target.value)}
                className="bg-calculator-input border-calculator-border text-card-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_3px_hsl(220_50%_4%/0.3)]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={calculateResults}
                className="flex-1 bg-gradient-to-r from-primary to-calculator-success text-primary-foreground font-semibold shadow-[0_2px_8px_hsl(145_63%_42%/0.3)] hover:shadow-[0_4px_12px_hsl(145_63%_42%/0.4)] transition-all duration-200"
              >
                Calcular
              </Button>
              <Button 
                onClick={clearFields}
                variant="secondary"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <RefreshCw className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="bg-card border-calculator-border shadow-[0_4px_12px_hsl(220_50%_4%/0.4)] animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-card-foreground">Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                <span className="text-muted-foreground">Gasto com combustível:</span>
                <span className="font-semibold text-destructive">{formatCurrency(results.fuelCost)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                <span className="text-muted-foreground">Receita total:</span>
                <span className="font-semibold text-card-foreground">{formatCurrency(results.totalIncome)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg border border-primary/20">
                <span className="text-muted-foreground">Lucro líquido:</span>
                <span className={`font-bold text-lg ${results.netProfit > 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(results.netProfit)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-calculator-input rounded-lg">
                <span className="text-muted-foreground">Lucro por km:</span>
                <span className={`font-semibold ${results.profitPerKm > 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(results.profitPerKm)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-muted-foreground text-sm">Offline • Mobile-first</p>
        </div>
      </div>
    </div>
  );
};

export default UberCalculator;