/**
 * Script de teste automatizado para fluxo OTP Supabase
 * - Cria email aleatório
 * - Solicita código OTP
 * - (Opcional) Verifica se email_confirmed_at está correto
 * - Loga resultado no console
 *
 * Execute manualmente no Node ou adapte para rodar no frontend
 */
import { supabase } from '@/integrations/supabase/client';

function randomEmail() {
  const rand = Math.random().toString(36).substring(2, 10);
  return `otp_test_${rand}@gmail.com`;
}

async function testOtpSignup() {
  const email = randomEmail();
  const nome = 'Teste OTP';
  const senha = 'TesteSenha@123';
  console.log('Iniciando teste com email:', email);

  // Solicita código OTP
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { nome, pending_password: senha }
    }
  });

  if (error) {
    console.error('Erro ao solicitar OTP:', error.message);
    return;
  }
  console.log('OTP solicitado com sucesso!');
  console.log('Verifique o email recebido.');
  // Aqui você deve digitar manualmente o código recebido no email
  // Exemplo:
  // const codigo = prompt('Digite o código recebido:');
  // const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
  //   email,
  //   token: codigo,
  //   type: 'email'
  // });
  // if (verifyError) console.error('Erro ao verificar OTP:', verifyError.message);
  // else console.log('Verificação OK!', verifyData);
}

// Para rodar no Node, descomente:
// testOtpSignup();

export { testOtpSignup };
