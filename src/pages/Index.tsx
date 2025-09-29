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
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Header responsivo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Calculadora Uber
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg">
              Calcule seus ganhos e gastos com combustível de forma prática
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{user.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        
        {/* Calculadora */}
        <div className="w-full max-w-4xl mx-auto mb-6 sm:mb-8">
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