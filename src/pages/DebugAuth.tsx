import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DebugData {
  session: Session | null;
  user: User | null;
  email_confirmed_at?: string | null;
  raw_user_meta_data?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  last_sign_in_at?: string | null;
}

const DebugAuth: React.FC = () => {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const navigate = useNavigate();

  const pushLog = (msg: string) => {
    setLogs(prev => [new Date().toLocaleTimeString() + ' - ' + msg, ...prev.slice(0, 199)]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      pushLog('Sessão carregada');
      if (session) {
        pushLog('Usuário: ' + session.user.email);
      } else {
        pushLog('Sem sessão');
      }
      setData({
        session,
        user: session?.user,
        email_confirmed_at: session?.user?.email_confirmed_at,
        raw_user_meta_data: session?.user?.user_metadata,
        app_metadata: session?.user?.app_metadata,
        last_sign_in_at: session?.user?.last_sign_in_at
      });
    } catch (e) {
      pushLog('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'));
    } finally {
      setLoading(false);
    }
  }, []);

  const forceSignOut = async () => {
    await supabase.auth.signOut();
    pushLog('signOut() executado');
    await load();
  };

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-muted p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Debug Auth</h1>
          <div className="space-x-2">
            <Button variant="outline" onClick={load} disabled={loading}>Recarregar</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
            <Button variant="destructive" onClick={forceSignOut}>Forçar Logout</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado da Sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p>Carregando...</p>}
            {!loading && !data?.session && (
              <p className="text-sm text-muted-foreground">Nenhuma sessão ativa.</p>
            )}
            {!loading && data?.session && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><span className="font-medium">Email:</span> {data.user?.email}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Confirmado:</span>
                  {data.email_confirmed_at ? (
                    <Badge variant="default" className="bg-green-600">SIM</Badge>
                  ) : (
                    <Badge variant="destructive">NÃO</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2"><span className="font-medium">last_sign_in_at:</span> {data.last_sign_in_at || '-'}</div>
                <div>
                  <span className="font-medium block mb-1">app_metadata:</span>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48">{JSON.stringify(data.app_metadata, null, 2)}</pre>
                </div>
                <div>
                  <span className="font-medium block mb-1">user_metadata:</span>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48">{JSON.stringify(data.raw_user_meta_data, null, 2)}</pre>
                </div>
                <div>
                  <span className="font-medium block mb-1">Acesso Token Payload (decodificado se disponível):</span>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48">
{(() => {
  try {
  const token = data.session?.access_token;
    if (!token) return 'Sem token';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return JSON.stringify(payload, null, 2);
  } catch (e) {
    return 'Não foi possível decodificar';
  }
})()}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajuda – Porque ainda vem link?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>Template de email ainda contém a variável de link (ConfirmationURL). Remova qualquer <code>{`{{ .ConfirmationURL }}`}</code>.</li>
              <li>"Enable Magic Links" não foi desativado no painel.</li>
              <li>"Enable Email Confirmations" mantém envio de link (desative para fluxo OTP puro).</li>
              <li>Cache de template: aguarde 5–10 minutos após salvar.</li>
              <li>Teste com email novo (cadastros antigos já confirmados não exigem OTP).</li>
              <li>Limpe localStorage e cookies antes de novo teste.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs (últimos {logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/80 text-green-400 font-mono text-xs p-3 rounded h-56 overflow-auto space-y-1">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugAuth;
