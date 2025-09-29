import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import UberCalculator from "@/components/UberCalculator";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import ViagemService from '@/services/ViagemService';
import { DadosDashboard } from '@/types';

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DadosDashboard | null>(null);

  const carregarDadosDashboard = useCallback(async () => {
    try {
      const dados = await ViagemService.obterDadosDashboard();
      setDashboardData(dados);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (user) {
      carregarDadosDashboard();
    }
  }, [user, isLoading, navigate, carregarDadosDashboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-4 sm:py-6 lg:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 md:py-6 lg:py-8 w-full">
        {/* Header responsivo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="text-center sm:text-left flex-1 w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">
              Calculadora Uber
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
              Calcule seus ganhos e gastos com combustível de forma prática
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-[250px]">{user.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
        
        {/* Calculadora */}
        <div className="w-full max-w-5xl mx-auto mb-4 sm:mb-6 lg:mb-8">
          <UberCalculator onDataUpdate={carregarDadosDashboard} />
        </div>
        
        {/* Dashboard */}
        <div className="w-full">
          <Dashboard dados={dashboardData || undefined} onDataUpdate={carregarDadosDashboard} />
        </div>
      </div>
    </div>
  );
};

export default Index;