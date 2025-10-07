# 🔧 Configuração OBRIGATÓRIA do Supabase para OTP

## ⚠️ **PROBLEMA IDENTIFICADO**

O Supabase está enviando **magic links** em vez de **códigos OTP**, e os links redirecionam para Lovable antigo.

---

## 🎯 **SOLUÇÃO IMPLEMENTADA**

### **Nova Abordagem:**
1. **Criar usuário** com `signUp()`
2. **Fazer logout** imediato  
3. **Enviar OTP** com `signInWithOtp()`
4. **Verificar código** para login

---

## 🛠️ **CONFIGURAÇÃO NO SUPABASE**

### **⚠️ CRÍTICO: Desabilitar Magic Links**

1. **Acesse:** https://supabase.com/dashboard
2. **Projeto:** `awojizpebwvbpqsvpvvc`
3. **Authentication** > **Settings**
4. **Magic Link**: ❌ **DESABILITAR**

### **📧 Template de Email OTP**

1. **Authentication** > **Email Templates**
2. **Magic Link Template**:

```html
<h2>Código de Verificação</h2>
<p>Seu código de acesso é:</p>
<h1 style="color: #4f46e5; font-size: 32px; text-align: center; letter-spacing: 8px;">{{ .Token }}</h1>
<p>Este código expira em 10 minutos.</p>
```

### **🔗 URLs de Redirecionamento**

```
Site URL: http://localhost:8086
Redirect URLs: 
- http://localhost:8086/auth
- https://seudominio.vercel.app/auth
```

---

## 🧪 **TESTE AGORA: http://localhost:8087/auth**

### **Fluxo Corrigido:**
1. ✅ **Cadastro** → Cria usuário
2. ✅ **Logout automático** → Força verificação  
3. ✅ **OTP enviado** → Código de 6 dígitos
4. ✅ **Verificação** → Login com código
5. ✅ **Acesso liberado** → Sistema funcionando

### **Logs Esperados:**
```
Iniciando processo de cadastro: email@teste.com
Erro no signup: [se usuário existe]
OTP enviado com sucesso
Verificando OTP: 123456
OTP verificado com sucesso!
```

---

## � **SE AINDA RECEBER LINKS**

### **Opção 1: Configurar no Painel**
- Desabilite **"Enable Magic Link"**
- Force **"OTP Authentication"**

### **Opção 2: Aguardar Propagação**
- Mudanças podem levar **5-10 minutos**
- Teste com **email diferente**

### **Opção 3: Contatar Supabase**
- Se persistir, pode ser limitação do plano
- Verifique documentação de OTP

---

## ✅ **RESULTADO ESPERADO**

Agora o sistema **força códigos OTP**:
- � **Email com código numérico** (não link)
- 🔒 **Verificação obrigatória** antes do acesso
- 🎯 **Sem redirecionamentos** externos
- ⚡ **Funcionamento local** garantido

**🚀 Teste e confirme se agora recebe códigos!**