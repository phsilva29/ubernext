import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, KeyRound } from 'lucide-react';

const EmailVerification = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verificação por Código Necessária</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <Shield className="h-16 w-16 mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Fluxo de Link Desativado</h3>
            <p className="text-sm text-muted-foreground">
              A verificação via link foi desativada. Agora todo acesso exige <strong>código OTP de 6 dígitos</strong> enviado ao seu email.
            </p>
            <p className="text-sm text-muted-foreground">
              Volte para a tela de cadastro/login e solicite um novo código.
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={() => navigate('/auth')} className="w-full">
              <KeyRound className="h-4 w-4 mr-2" /> Ir para Autenticação
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Ir para a Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;