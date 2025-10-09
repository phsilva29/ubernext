# Calculadora Uber - Estimativa de Combustível e Lucro

## Project info



## How can I edit this code?

There are several ways of editing your application.



**Use your preferred IDE**



The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS


## Como publicar este projeto?

Você pode fazer deploy em qualquer serviço de hospedagem estática (Vercel, Netlify, etc) ou backend próprio. Basta compilar com:

```sh
npm run build
```

E subir o conteúdo da pasta `dist/`.



---

## 🔐 Autenticação por Código (OTP) – Configuração Obrigatória

Este projeto foi migrado para **verificação por CÓDIGO (OTP)** e o fluxo por magic link deve ser desativado no Supabase. Se ainda estiver recebendo links em vez de código, siga estes passos:

### 1. Desativar Magic Links no Supabase
Dashboard Supabase → Authentication → Providers → Email:
- Desmarque: Enable Magic Links
- Mantenha: Confirm Email (se quiser exigir confirmação explícita) ou deixe apenas OTP

### 2. Ajustar Templates de Email
Remova qualquer link do template e deixe só o token:
```html
<h2>Código de Verificação</h2>
<p>Use o código abaixo para confirmar seu acesso:</p>
<h1 style="font-size:32px;letter-spacing:8px;text-align:center;">{{ .Token }}</h1>
<p>Não compartilhe este código. Ele expira em 10 minutos.</p>
```

### 3. Redirect URLs
Garanta que não existem URLs antigas. Use apenas:
```
http://localhost:8087
https://SEU-DOMINIO.vercel.app
```
Não adicione rotas callback de magic link se não está usando esse fluxo.

### 4. Limpar Cache Local se persistir link
- Limpar localStorage e cookies
- Testar com email nunca usado
- Esperar 5–10 minutos (propagação)

### 5. Fluxo Interno Atual
1. `signInWithOtp()` envia código SEMPRE
2. Usuário digita código → `verifyOtp`
3. Senha só é aplicada após sucesso (hardening)
4. Usuário não verificado é deslogado automaticamente

### 6. Página `/email-verification`
Agora apenas instrui o usuário a usar código. Fluxo por link está desligado.

### 7. Logs Esperados (Console)
```
🚀 FORÇANDO CADASTRO COM OTP OBRIGATÓRIO: email@teste.com
✅ OTP enviado com sucesso - CADASTRO OBRIGATÓRIO COM VERIFICAÇÃO
🔍 Verificando OTP: 123456 para email: email@teste.com
✅ OTP VERIFICADO! Usuário autenticado: email@teste.com
🔐 Definindo senha obrigatória para novo usuário...
✅ Senha definida com sucesso!
```

Se após isso ainda vier magic link: a) template ainda tem link; b) magic link não foi desabilitado; c) cache não expirou.

---
