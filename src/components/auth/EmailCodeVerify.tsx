import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface EmailCodeVerifyProps {
  email: string;
  onAuth: () => void;
}

export default function EmailCodeVerify({ email, onAuth }: EmailCodeVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length < 6) {
      setError('Código deve ter 6 dígitos');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      onAuth();
    } else {
      setError('Sessão não criada. Tente novamente.');
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Código (6 dígitos)</label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="tracking-widest text-center"
          required
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Verificando...' : 'Confirmar Código'}
      </Button>
    </form>
  );
}
