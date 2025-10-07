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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Container principal com padding responsivo */}
      <div className="flex-1 px-2 xs:px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-2 xs:py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Header responsivo */}
          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 xs:gap-4 sm:gap-6 mb-4 xs:mb-6 sm:mb-8 lg:mb-10">
            <div className="text-center xs:text-left flex-1 w-full xs:w-auto">
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-green-600 rounded-xl p-3 flex items-center justify-center">
                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7c0-1.1-.9-2-2-2h-3c-.55 0-1 .45-1 1s.45 1 1 1h3v2.65L16.83 14H7.17L6 9.65V7h7c.55 0 1-.45 1-1s-.45-1-1-1H6c-1.1 0-2 .9-2 2v8c0 .55.45 1 1 1h1c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-2.35c0-.8-.4-1.55-1.08-2l-2.6-1.73C19.32 8.16 19 7.59 19 7zM9 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-green-600">DriveControl</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} width="18" height="18" viewBox="0 0 20 20" fill="#FFD700" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 15.27L16.18 18l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 3.73L3.82 18z"/>
                        </svg>
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">5.0 • Profissional</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-base text-left mb-2">
                <span className="inline-block mr-2">🚗</span>Controle total dos seus ganhos como motorista de aplicativo
              </p>
              <div className="flex gap-2 mt-2">
                <span className="bg-green-700/80 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="#fff" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Cálculo Rápido
                </span>
                <span className="bg-green-900/80 text-green-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="#34D399" strokeWidth="2"/>
                    <path stroke="#34D399" strokeWidth="2" d="M8 12l2 2 4-4"/>
                  </svg>
                  Dados Seguros
                </span>
                <span className="bg-blue-900/80 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="#3B82F6" strokeWidth="2" d="M4 17l6-6 4 4 6-6"/>
                  </svg>
                  Analytics
                </span>
              </div>
            </div>
            
            <div className="flex flex-col xs:flex-row items-center gap-2 xs:gap-3 sm:gap-4 w-full xs:w-auto">
              <div className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm sm:text-base text-muted-foreground">
                <User className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
                <span className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[250px]">{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-1.5 xs:gap-2 w-full xs:w-auto h-8 xs:h-9 sm:h-10 text-xs xs:text-sm sm:text-base px-3 xs:px-4 sm:px-6"
              >
                <LogOut className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
                <span className="xs:inline">Sair</span>
              </Button>
            </div>
          </div>
          
          {/* Calculadora com espaçamento responsivo */}
          <div className="w-full mb-4 xs:mb-6 sm:mb-8 lg:mb-10">
            <UberCalculator onDataUpdate={carregarDadosDashboard} />
          </div>
          
          {/* Dashboard */}
          <div className="w-full">
            <Dashboard dados={dashboardData || undefined} onDataUpdate={carregarDadosDashboard} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;