import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, CheckCircle2, Mail } from 'lucide-react';
import OTPInput from '@/components/ui/otp-input';

interface EmailCodeVerifyProps {
  email: string;
  onAuth: () => void;
  allowResend?: boolean;
}

export default function EmailCodeVerify({ email, onAuth, allowResend = true }: EmailCodeVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown para reenvio
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  async function handleVerify(e?: React.FormEvent, codeToVerify?: string) {
    if (e) e.preventDefault();
    
    const currentCode = codeToVerify || code;
    
    setError(null);
    if (currentCode.length < 6) {
      setError('Código deve ter 6 dígitos');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: currentCode,
        type: 'email'
      });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data.session) {
        onAuth();
      } else {
        setError('Sessão não criada. Tente novamente.');
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-verificar quando código tiver 6 dígitos
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError(null);
    
    if (newCode.length === 6) {
      // Auto-verificar após pequeno delay, passando o código diretamente
      setTimeout(() => {
        if (newCode.length === 6) {
          handleVerify(undefined, newCode);
        }
      }, 300);
    }
  };

  async function handleResendCode() {
    setResending(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
      });
      
      if (error) {
        setError('Erro ao reenviar código: ' + error.message);
      } else {
        setError(null);
        setResendCountdown(60); // 60 segundos de countdown
        // Mostrar mensagem de sucesso temporariamente
        setTimeout(() => {
          setError('✅ Novo código enviado para seu email!');
          setTimeout(() => setError(null), 3000);
        }, 500);
      }
    } catch (err) {
      setError('Erro inesperado ao reenviar código.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com ícone e instrução - tema escuro */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/40 ring-4 ring-blue-500/20">
            <Mail className="w-8 h-8 text-blue-100" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-100">Verifique seu código</h3>
          <p className="text-sm text-gray-400">
            Digite o código de 6 dígitos enviado para
          </p>
          <p className="text-sm font-medium text-blue-400 break-all">{email}</p>
        </div>
      </div>

      {/* Input OTP moderno */}
      <div className="space-y-4">
        <OTPInput
          length={6}
          value={code}
          onChange={handleCodeChange}
          disabled={loading}
          error={!!error && !error.includes('✅')}
          className="justify-center"
        />
        
        {/* Indicador de progresso visual - tema escuro */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className={`w-2 h-1 rounded-full transition-all duration-300 ${
                  index < code.length 
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm shadow-blue-400/50' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status/Error messages - tema escuro */}
      {error && (
        <div className={`flex items-center justify-center gap-2 text-sm p-3 rounded-lg backdrop-blur-sm ${
          error.includes('✅') 
            ? 'bg-green-900/50 text-green-300 border border-green-700/50 shadow-lg shadow-green-900/20' 
            : 'bg-red-900/50 text-red-300 border border-red-700/50 shadow-lg shadow-red-900/20'
        }`}>
          {error.includes('✅') ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
          {error}
        </div>
      )}

      {/* Loading state - tema escuro */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400 py-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          Verificando código...
        </div>
      )}

      {/* Botão de reenvio - tema escuro */}
      {allowResend && (
        <div className="text-center space-y-3">
          <p className="text-xs text-gray-500">Não recebeu o código?</p>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleResendCode}
            disabled={resending || resendCountdown > 0}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 font-medium border border-blue-500/20 hover:border-blue-400/40 backdrop-blur-sm transition-all duration-200"
          >
            {resending ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Reenviando...
              </div>
            ) : resendCountdown > 0 ? (
              `Reenviar em ${resendCountdown}s`
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reenviar código
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
