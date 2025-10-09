import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, LogIn, UserPlus, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';
import EmailCodeVerify from '@/components/auth/EmailCodeVerify';

// Função para validar email com regex mais rigorosa
const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!email) {
    return { isValid: false, message: 'Email é obrigatório' };
  }
  
  if (email.length > 254) {
    return { isValid: false, message: 'Email muito longo' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Formato de email inválido' };
  }
  
  // Lista de domínios suspeitos ou temporários
  const suspiciousDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (suspiciousDomains.includes(domain)) {
    return { isValid: false, message: 'Email temporário não é permitido' };
  }
  
  return { isValid: true };
};

// Função para validar senha
const validatePassword = (password: string): { isValid: boolean; message?: string; strength: 'weak' | 'medium' | 'strong' } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Senha deve ter pelo menos 8 caracteres', strength: 'weak' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  
  if (strengthScore < 3) {
    return { 
      isValid: false, 
      message: 'Senha deve conter pelo menos: maiúscula, minúscula e número', 
      strength: 'weak' 
    };
  }
  
  const strength = strengthScore === 4 ? 'strong' : 'medium';
  return { isValid: true, strength };
};

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Estados para verificação de email
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  // Removidos estados de OTP/verificação
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: true });
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; message?: string; strength?: 'weak' | 'medium' | 'strong' }>({ isValid: true });
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Verificar se usuário já está logado E verificado
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('🔍 Verificando sessão existente:', session.user);
        
        // CRÍTICO: Só permitir acesso se email foi verificado
        if (session.user.email_confirmed_at) {
          console.log('✅ Usuário já verificado, redirecionando...');
          navigate('/');
        } else {
          console.log('⚠️ Usuário não verificado, forçando logout...');
          await supabase.auth.signOut();
          setError('Email não verificado. Faça o cadastro novamente.');
        }
      }
    };
    
    checkAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Mudança de auth:', event, session?.user);
        
        if (event === 'SIGNED_IN' && session) {
          // OBRIGATÓRIO: Verificar se o email foi confirmado
          if (session.user.email_confirmed_at) {
            console.log('✅ Login com email verificado!');
            toast({
              title: "🎉 Email Confirmado!",
              description: "Bem-vindo ao sistema!",
            });
            navigate('/');
          } else {
            console.log('❌ Login sem verificação - BLOQUEADO');
            await supabase.auth.signOut();
            setError('🚫 Email não verificado. Complete a verificação primeiro.');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário deslogado');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Countdown OTP removido

  // Validação em tempo real do email
  const handleEmailChange = (email: string, isSignup: boolean = false) => {
    if (isSignup) {
      setSignupData(prev => ({ ...prev, email }));
      const validation = validateEmail(email);
      setEmailValidation(validation);
    } else {
      setLoginData(prev => ({ ...prev, email }));
    }
  };

  // Validação em tempo real da senha
  const handlePasswordChange = (password: string) => {
    setSignupData(prev => ({ ...prev, password }));
    const validation = validatePassword(password);
    setPasswordValidation(validation);
  };

  // Fluxo OTP removido

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Blindagem: só permite seguir se email confirmado
      if (!data?.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setError('Email ainda não verificado. Solicite novo código via cadastro.');
        return;
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });

      navigate('/');
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validações rigorosas
    const emailVal = validateEmail(signupData.email);
    const passwordVal = validatePassword(signupData.password);

    if (!emailVal.isValid) {
      setError(emailVal.message || 'Email inválido');
      setIsLoading(false);
      return;
    }

    if (!passwordVal.isValid) {
      setError(passwordVal.message || 'Senha inválida');
      setIsLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (!signupData.nome.trim() || signupData.nome.length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      // Usar signInWithOtp para enviar código de 6 dígitos por email
      const { data, error } = await supabase.auth.signInWithOtp({
        email: signupData.email.toLowerCase().trim(),
        options: { 
          shouldCreateUser: true,
          data: { 
            nome: signupData.nome.trim(),
            password: signupData.password // Armazenar temporariamente para criar a conta depois
          }
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar código:', error);
        if (error.message.includes('Signups not allowed')) {
          setError('Cadastro desabilitado.');
        } else {
          setError('Erro ao enviar código: ' + error.message);
        }
        return;
      }

      // Mostrar tela de verificação de código
      setVerificationEmail(signupData.email);
      setShowEmailVerification(true);
      
      toast({ 
        title: 'Código enviado!', 
        description: `Verifique seu email (${signupData.email}) e digite o código de 6 dígitos.` 
      });

    } catch (err) {
      console.error('💥 Erro inesperado:', err);
      setError('Erro inesperado. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para lidar com verificação de código OTP bem-sucedida
  const handleEmailVerified = async () => {
    try {
      // Após verificação OTP bem-sucedida, criar a conta com senha
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email.toLowerCase().trim(),
        password: signupData.password,
        options: { 
          data: { nome: signupData.nome.trim() }
        }
      });

      if (error) {
        console.error('❌ Erro ao finalizar cadastro:', error);
        // Se a conta já existe, é porque o OTP foi verificado com sucesso
        if (error.message.includes('User already registered')) {
          toast({ 
            title: '🎉 Cadastro concluído!', 
            description: 'Email verificado com sucesso! Você pode fazer login agora.' 
          });
        } else {
          setError('Erro ao finalizar cadastro: ' + error.message);
          return;
        }
      } else {
        toast({ 
          title: '🎉 Cadastro concluído!', 
          description: 'Conta criada e verificada com sucesso! Você pode fazer login agora.' 
        });
      }
      
      // Resetar formulário e voltar para login
      setShowEmailVerification(false);
      setSignupData({ nome: '', email: '', password: '', confirmPassword: '' });
      
    } catch (err) {
      console.error('💥 Erro ao finalizar cadastro:', err);
      setError('Erro inesperado ao finalizar cadastro.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-4">
            <img 
              src="/logo.dd.png"
              alt="DriverControl Logo" 
              className="h-20 w-20"
            />
            <h1 className="text-4xl font-bold text-blue-600">DriverControl</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie seus ganhos e gastos como motorista
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/95 border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Acesse sua conta</CardTitle>
            <CardDescription>
              Faça login ou crie uma conta para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Cadastro
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Senha
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {!showEmailVerification ? (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-nome" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome completo
                      </Label>
                      <Input
                        id="signup-nome"
                        type="text"
                        placeholder="Seu nome completo"
                        value={signupData.nome}
                        onChange={(e) => setSignupData(prev => ({ ...prev, nome: e.target.value }))}
                        required
                        className="bg-background/50"
                        minLength={2}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                        {signupData.email && (
                          emailValidation.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )
                        )}
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupData.email}
                        onChange={(e) => handleEmailChange(e.target.value, true)}
                        required
                        className={`bg-background/50 ${
                          signupData.email && !emailValidation.isValid 
                            ? 'border-red-500 focus:border-red-500' 
                            : signupData.email && emailValidation.isValid 
                            ? 'border-green-500 focus:border-green-500' 
                            : ''
                        }`}
                      />
                      {signupData.email && !emailValidation.isValid && (
                        <p className="text-xs text-red-500">{emailValidation.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Senha
                        {signupData.password && (
                          passwordValidation.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )
                        )}
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        required
                        className={`bg-background/50 ${
                          signupData.password && !passwordValidation.isValid 
                            ? 'border-red-500 focus:border-red-500' 
                            : signupData.password && passwordValidation.isValid 
                            ? 'border-green-500 focus:border-green-500' 
                            : ''
                        }`}
                      />
                      {signupData.password && (
                        <div className="space-y-1">
                          {!passwordValidation.isValid && (
                            <p className="text-xs text-red-500">{passwordValidation.message}</p>
                          )}
                          {passwordValidation.strength && (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <div className={`h-1 w-8 rounded ${
                                  passwordValidation.strength === 'weak' ? 'bg-red-500' :
                                  passwordValidation.strength === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`} />
                                <div className={`h-1 w-8 rounded ${
                                  passwordValidation.strength === 'medium' ? 'bg-yellow-500' :
                                  passwordValidation.strength === 'strong' ? 'bg-green-500' :
                                  'bg-gray-300'
                                }`} />
                                <div className={`h-1 w-8 rounded ${
                                  passwordValidation.strength === 'strong' ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                              </div>
                              <span className={`text-xs ${
                                passwordValidation.strength === 'weak' ? 'text-red-500' :
                                passwordValidation.strength === 'medium' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {passwordValidation.strength === 'weak' ? 'Fraca' :
                                 passwordValidation.strength === 'medium' ? 'Média' : 'Forte'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Confirmar senha
                        {signupData.confirmPassword && (
                          signupData.password === signupData.confirmPassword ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )
                        )}
                      </Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        className={`bg-background/50 ${
                          signupData.confirmPassword && signupData.password !== signupData.confirmPassword
                            ? 'border-red-500 focus:border-red-500' 
                            : signupData.confirmPassword && signupData.password === signupData.confirmPassword
                            ? 'border-green-500 focus:border-green-500' 
                            : ''
                        }`}
                      />
                      {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && (
                        <p className="text-xs text-red-500">As senhas não coincidem</p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading || !emailValidation.isValid || !passwordValidation.isValid || signupData.password !== signupData.confirmPassword}
                    >
                      {isLoading ? 'Enviando código...' : 'Criar conta'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6 py-4">
                    <EmailCodeVerify 
                      email={verificationEmail} 
                      onAuth={handleEmailVerified} 
                    />
                    
                    <div className="text-center pt-4 border-t border-gray-700/50">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowEmailVerification(false)}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 text-sm font-medium border border-gray-600/30 hover:border-gray-500/50 backdrop-blur-sm transition-all duration-200"
                      >
                        ← Alterar dados do cadastro
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;