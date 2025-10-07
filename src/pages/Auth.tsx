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
import { Car, LogIn, UserPlus, Mail, Lock, User, CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react';
import OTPInput from '@/components/ui/otp-input';

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
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
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

  // Countdown para reenvio de OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

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

  // Verificar código OTP
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (otpCode.length !== 6) {
      setError('Código deve ter 6 dígitos');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 Verificando OTP:', otpCode, 'para email:', pendingEmail);
      
      // Verificar OTP para login/cadastro
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpCode,
        type: 'email'
      });

      console.log('📊 Resultado da verificação OTP:', { data, error });

      if (error) {
        console.error('❌ Erro na verificação:', error);
        if (error.message.includes('Token has expired') || error.message.includes('expired')) {
          setError('⏰ Código expirado. Solicite um novo código.');
        } else if (error.message.includes('Invalid token') || error.message.includes('invalid')) {
          setError('🚫 Código inválido. Verifique e tente novamente.');
        } else {
          setError('❌ ' + error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user && data.session) {
        console.log('✅ OTP VERIFICADO! Usuário autenticado:', data.user.email);
        
        // OBRIGATÓRIO: Definir senha para novos usuários
        if (signupData.password) {
          console.log('🔐 Definindo senha obrigatória para novo usuário...');
          
          try {
            const { error: passwordError } = await supabase.auth.updateUser({
              password: signupData.password,
              data: {
                nome: signupData.nome.trim(),
                email_verified: true,
                verified_at: new Date().toISOString()
              }
            });
            
            if (passwordError) {
              console.error('⚠️ Erro ao definir senha:', passwordError);
              toast({
                title: "⚠️ Aviso",
                description: "Conta criada, mas houve problema ao definir senha. Entre em contato.",
                variant: "destructive"
              });
            } else {
              console.log('✅ Senha definida com sucesso!');
            }
          } catch (passErr) {
            console.error('💥 Erro inesperado ao definir senha:', passErr);
          }
        }

        toast({
          title: "🎉 Email Verificado!",
          description: "Conta criada e verificada com sucesso!",
        });
        
        console.log('🚀 Redirecionando para dashboard...');
        navigate('/');
      } else {
        console.error('❌ Verificação falhou - sem usuário ou sessão');
        setError('Erro na verificação. Tente novamente.');
      }
    } catch (err) {
      console.error('💥 Erro inesperado na verificação:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return; // Ainda no período de espera

    setIsLoading(true);
    setError('');

    try {
      console.log('📤 Reenviando OTP para:', pendingEmail);
      
      // Reenviar OTP usando signInWithOtp - sempre envia código
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          shouldCreateUser: true, // Manter criação se não existir
          data: {
            nome: signupData.nome.trim(),
            pending_password: signupData.password
          }
        }
      });

      if (error) {
        console.error('❌ Erro ao reenviar:', error);
        setError('Erro ao reenviar código. Tente novamente.');
      } else {
        console.log('✅ Código reenviado com sucesso!');
        toast({
          title: "📧 Código Reenviado!",
          description: "Novo código enviado para seu email.",
        });
        setOtpCode(''); // Limpar código anterior
        setOtpCountdown(60); // 60 segundos de espera
      }
    } catch (err) {
      console.error('💥 Erro inesperado no reenvio:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

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
      console.log('🚀 FORÇANDO CADASTRO COM OTP OBRIGATÓRIO:', signupData.email);
      
      // NOVA ESTRATÉGIA: Só usar signInWithOtp que sempre envia código
      // Não usar signUp que pode criar usuário sem verificação
      const { data, error } = await supabase.auth.signInWithOtp({
        email: signupData.email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true, // Criar se não existir
          data: {
            nome: signupData.nome.trim(),
            pending_password: signupData.password // Armazenar senha temporariamente
          }
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar OTP:', error);
        if (error.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (error.message.includes('Signups not allowed')) {
          setError('Cadastro temporariamente desabilitado. Entre em contato.');  
        } else {
          setError('Erro ao enviar código de verificação: ' + error.message);
        }
        return;
      }

      console.log('✅ OTP enviado com sucesso - CADASTRO OBRIGATÓRIO COM VERIFICAÇÃO');
      setPendingEmail(signupData.email.toLowerCase().trim());
      setShowOtpVerification(true);
      setOtpCountdown(60);
      
      toast({
        title: "🔐 Verificação Obrigatória!",
        description: "Código enviado. Você DEVE verificar para acessar o sistema.",
      });

    } catch (err) {
      console.error('💥 Erro inesperado:', err);
      setError('Erro inesperado. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Car className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Calculadora Uber</h1>
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
                {showOtpVerification ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-3">
                      <div className="flex justify-center">
                        <div className="relative">
                          <Shield className="h-16 w-16 text-primary" />
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold">Verificação de Segurança</h3>
                      <p className="text-sm text-muted-foreground">
                        Enviamos um código de verificação para
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {pendingEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Digite o código de 6 dígitos abaixo
                      </p>
                    </div>

                    <form onSubmit={handleOtpVerification} className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-center block font-medium">
                          Código de Verificação
                        </Label>
                        <OTPInput
                          length={6}
                          value={otpCode}
                          onChange={setOtpCode}
                          disabled={isLoading}
                          className="justify-center"
                        />
                        {otpCode.length === 6 && (
                          <div className="flex justify-center">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-12"
                        disabled={isLoading || otpCode.length !== 6}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Verificando...
                          </>
                        ) : (
                          'Verificar Código'
                        )}
                      </Button>
                    </form>

                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Não recebeu o código?
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={handleResendOtp}
                          disabled={isLoading || otpCountdown > 0}
                          className="w-full"
                        >
                          {otpCountdown > 0 ? (
                            <>
                              <Clock className="h-4 w-4 mr-2" />
                              Reenviar em {otpCountdown}s
                            </>
                          ) : isLoading ? (
                            'Reenviando...'
                          ) : (
                            'Reenviar Código'
                          )}
                        </Button>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setShowOtpVerification(false);
                          setOtpCode('');
                          setPendingEmail('');
                          setOtpCountdown(0);
                        }}
                        className="w-full text-muted-foreground"
                      >
                        ← Voltar ao Cadastro
                      </Button>
                    </div>
                  </div>
                ) : emailVerificationSent ? (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <Mail className="h-16 w-16 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Verifique seu email</h3>
                      <p className="text-sm text-muted-foreground">
                        Enviamos um link de confirmação para <strong>{signupData.email}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clique no link no email para ativar sua conta. Verifique também a pasta de spam.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setEmailVerificationSent(false)}
                      className="w-full"
                    >
                      Voltar ao cadastro
                    </Button>
                  </div>
                ) : (
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
                      {isLoading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
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