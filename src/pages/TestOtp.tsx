import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

function randomEmail() {
  const rand = Math.random().toString(36).substring(2, 10);
  return `otp_test_${rand}@gmail.com`;
}

const TestOtp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('Teste OTP');
  const [senha, setSenha] = useState('TesteSenha@123');
  const [codigo, setCodigo] = useState('');
  const [step, setStep] = useState<'init'|'otp'|'verificado'|'erro'>('init');
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (msg: string) => setLog(l => [msg, ...l.slice(0, 19)]);

  const handleSolicitarOtp = async () => {
    const emailAleatorio = randomEmail();
    setEmail(emailAleatorio);
    pushLog('Solicitando OTP para: ' + emailAleatorio);
    setStep('init');
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAleatorio,
      options: {
        shouldCreateUser: true,
        data: { nome, pending_password: senha }
      }
    });
    if (error) {
      pushLog('Erro ao solicitar OTP: ' + error.message);
      setStep('erro');
    } else {
      pushLog('OTP solicitado! Verifique o email.');
      setStep('otp');
    }
  };

  const handleVerificarOtp = async () => {
    pushLog('Verificando código: ' + codigo);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email'
    });
    if (error) {
      pushLog('Erro ao verificar OTP: ' + error.message);
      setStep('erro');
    } else {
      pushLog('Verificação OK! Usuário: ' + (data.user?.email || 'N/A'));
      setStep('verificado');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded bg-background">
      <h2 className="text-xl font-bold mb-4">Teste Automático de OTP Supabase</h2>
      <div className="space-y-4">
        <button className="bg-primary text-white px-4 py-2 rounded" onClick={handleSolicitarOtp} disabled={step==='otp'}>
          Gerar Email Aleatório e Solicitar OTP
        </button>
        {email && <div><strong>Email gerado:</strong> {email}</div>}
        {step==='otp' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Digite o código recebido"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              className="border px-2 py-1 rounded w-full"
              maxLength={6}
            />
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleVerificarOtp} disabled={codigo.length!==6}>
              Verificar Código
            </button>
          </div>
        )}
        {step==='verificado' && <div className="text-green-600 font-bold">Verificação concluída com sucesso!</div>}
        {step==='erro' && <div className="text-red-600 font-bold">Erro no processo. Veja logs abaixo.</div>}
        <div className="mt-6">
          <strong>Logs:</strong>
          <ul className="text-xs bg-muted p-2 rounded mt-2 max-h-40 overflow-auto">
            {log.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestOtp;
