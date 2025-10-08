import { useState } from 'react';
import EmailCodeRequest from './EmailCodeRequest';
import EmailCodeVerify from './EmailCodeVerify';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmailOtpAuthProps {
  onLogged: () => void;
  allowChangeEmail?: boolean;
}

export default function EmailOtpAuth({ onLogged, allowChangeEmail = true }: EmailOtpAuthProps) {
  const [email, setEmail] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Login por Código</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!email && (
          <EmailCodeRequest onRequested={(e) => setEmail(e)} />
        )}
        {email && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground break-all">Código enviado para <strong>{email}</strong></p>
            <EmailCodeVerify email={email} onAuth={onLogged} />
            {allowChangeEmail && (
              <Button variant="ghost" type="button" className="w-full text-xs" onClick={() => setEmail(null)}>
                Usar outro e-mail
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
