// Componente para verificar dados de usuários no frontend
// Adicione temporariamente ao Dashboard ou Index para testar

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Perfil {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  created_at: string;
}

interface Viagem {
  id: string;
  user_id: string;
  data: string;
  created_at: string;
}

export const VerificarUsuarios: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dadosUsuario, setDadosUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [viagens, setViagens] = useState<Viagem[]>([]);

  const verificarDados = async () => {
    setLoading(true);
    
    try {
      console.log('🔍 Verificando dados do usuário...');
      
      // 1. Verificar dados de autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Erro de auth:', authError);
        return;
      }
      
      if (!user) {
        console.log('❌ Usuário não autenticado');
        return;
      }
      
      console.log('✅ Usuário auth:', {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        user_metadata: user.user_metadata,
        created_at: user.created_at
      });
      
      setDadosUsuario(user);
      
      // 2. Verificar perfil na tabela profiles
      const { data: perfilData, error: perfilError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (perfilError) {
        console.error('❌ Erro ao buscar perfil:', perfilError);
        console.log('⚠️ Usuário sem perfil na tabela profiles');
      } else {
        console.log('✅ Perfil encontrado:', perfilData);
        setPerfil(perfilData);
      }
      
      // 3. Verificar viagens do usuário
      const { data: viagensData, error: viagensError } = await supabase
        .from('viagens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (viagensError) {
        console.error('❌ Erro ao buscar viagens:', viagensError);
      } else {
        console.log('✅ Viagens encontradas:', viagensData.length);
        setViagens(viagensData);
      }
      
    } catch (error) {
      console.error('💥 Erro geral:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarPerfil = async () => {
    if (!dadosUsuario) return;
    
    setLoading(true);
    
    try {
      const nome = dadosUsuario.user_metadata?.nome || 
                   dadosUsuario.user_metadata?.name || 
                   'Usuário';
      
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          user_id: dadosUsuario.id,
          nome: nome,
          email: dadosUsuario.email
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar perfil:', error);
        alert('Erro ao criar perfil: ' + error.message);
      } else {
        console.log('✅ Perfil criado:', data);
        setPerfil(data);
        alert('Perfil criado com sucesso!');
      }
      
    } catch (error) {
      console.error('💥 Erro ao criar perfil:', error);
      alert('Erro inesperado ao criar perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarDados();
  }, []);

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800">🔍 Verificação de Dados de Usuário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={verificarDados} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            Verificar Dados
          </Button>
          {dadosUsuario && !perfil && (
            <Button 
              onClick={criarPerfil} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Criar Perfil
            </Button>
          )}
        </div>

        {dadosUsuario && (
          <div className="space-y-3">
            <div className="p-3 bg-green-100 rounded text-sm">
              <strong>👤 Dados de Autenticação:</strong>
              <br />ID: {dadosUsuario.id}
              <br />Email: {dadosUsuario.email}
              <br />Verificado: {dadosUsuario.email_confirmed_at ? '✅ Sim' : '❌ Não'}
              <br />Nome (metadata): {JSON.stringify(dadosUsuario.user_metadata)}
            </div>

            {perfil ? (
              <div className="p-3 bg-green-100 rounded text-sm">
                <strong>✅ Perfil na Tabela:</strong>
                <br />ID: {perfil.id}
                <br />Nome: {perfil.nome}
                <br />Email: {perfil.email}
                <br />Criado: {new Date(perfil.created_at).toLocaleString()}
              </div>
            ) : (
              <div className="p-3 bg-red-100 rounded text-sm">
                <strong>❌ Perfil NÃO encontrado na tabela profiles</strong>
                <br />O trigger pode não estar funcionando ou o usuário foi criado antes do trigger.
              </div>
            )}

            <div className="p-3 bg-blue-100 rounded text-sm">
              <strong>🚗 Viagens:</strong>
              <br />Total: {viagens.length}
              {viagens.length > 0 && (
                <div className="mt-2">
                  Última: {new Date(viagens[0].created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-blue-700">
          ⚠️ Este componente é apenas para verificação. Remova após identificar o problema.
        </div>
      </CardContent>
    </Card>
  );
};