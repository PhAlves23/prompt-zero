# 🚨 Como Resolver o Erro 401 no Deploy do Railway

## 📋 Resumo do Problema

O deploy está falhando com:
```
Failed to upload code with status code 401 Unauthorized
Error: Process completed with exit code 1.
```

**Causa:** Os secrets do GitHub Actions não estão configurados.

---

## ✅ Solução Rápida (3 Passos)

### Passo 1: Obter IDs do Railway

Execute no seu terminal:
```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero
./scripts/get-railway-ids.sh
```

Este script mostrará todos os IDs necessários.

### Passo 2: Gerar Token do Railway

1. Acesse: https://railway.app/account/tokens
2. Clique em **Create a Token**
3. Nome sugerido: `GitHub Actions Deploy`
4. **COPIE O TOKEN IMEDIATAMENTE** (você não verá novamente!)

### Passo 3: Configurar Secrets no GitHub

1. Acesse: https://github.com/Alves23/prompt-zero/settings/secrets/actions
2. Clique em **New repository secret**
3. Configure cada secret abaixo:

#### Lista de Secrets Necessários

| Nome do Secret | Como Obter |
|----------------|------------|
| `RAILWAY_API_TOKEN` | Token gerado no Passo 2 |
| `RAILWAY_PROJECT_ID` | Do script no Passo 1 |
| `RAILWAY_ENVIRONMENT_ID` | Do script no Passo 1 (ambiente production) |
| `RAILWAY_BACKEND_SERVICE_ID` | Do script no Passo 1 (serviço backend) |
| `RAILWAY_FRONTEND_SERVICE_ID` | Do script no Passo 1 (serviço frontend) |
| `RAILWAY_BACKEND_DATABASE_URL_PROD` | Railway Dashboard > Backend Service > Variables > DATABASE_URL |

---

## 🔍 Passo a Passo Detalhado

### 1️⃣ Obter Railway Project ID

```bash
railway status
```

Você verá algo como:
```
Project: prompt-zero (abc123xyz789)
```

O ID é: `abc123xyz789`

### 2️⃣ Obter Environment ID

```bash
railway environments
```

Procure pelo ambiente **production** e copie o ID.

### 3️⃣ Obter Service IDs

```bash
railway services
```

Você verá uma lista de serviços. Identifique:
- **Backend**: nome geralmente é "backend" ou "promptzero-backend"
- **Frontend**: nome geralmente é "frontend" ou "promptzero-frontend"

Copie os IDs de cada um.

### 4️⃣ Obter Database URL

**Via Railway Dashboard:**
1. Acesse https://railway.app
2. Clique no projeto "prompt-zero"
3. Clique no serviço **Backend**
4. Vá na aba **Variables**
5. Procure por `DATABASE_URL`
6. Copie o valor completo (ex: `postgresql://user:pass@host:port/db`)

**Via CLI:**
```bash
railway variables --service backend | grep DATABASE_URL
```

### 5️⃣ Configurar no GitHub

Para cada secret:

1. Vá em: https://github.com/Alves23/prompt-zero/settings/secrets/actions
2. Clique em **New repository secret**
3. Preencha:
   - **Name**: nome exato do secret (ex: `RAILWAY_API_TOKEN`)
   - **Secret**: valor copiado
4. Clique em **Add secret**
5. Repita para todos os 6 secrets

---

## 🧪 Testar a Configuração

### Opção 1: Via Script

```bash
./scripts/check-railway-config.sh
```

Este script verifica se todos os secrets necessários estão configurados.

### Opção 2: Executar Deploy Manualmente

1. Vá em: https://github.com/Alves23/prompt-zero/actions
2. Clique em **Deploy Production (Railway)**
3. Clique em **Run workflow**
4. Selecione a branch `main`
5. Clique em **Run workflow**

Se tudo estiver correto, você verá:
```
✅ Indexing...
✅ Uploading...
✅ Deployment successful
```

---

## ⚠️ Troubleshooting

### Erro persiste mesmo após configurar secrets

**1. Verifique se copiou o token corretamente:**
- Sem espaços no início/fim
- Sem quebras de linha
- Token completo

**2. Teste o token localmente:**
```bash
export RAILWAY_TOKEN="seu-token-aqui"
railway whoami
```

Se der erro, o token está inválido. Gere um novo.

**3. Verifique se os secrets estão com nomes corretos:**
- São case-sensitive: `RAILWAY_API_TOKEN` ≠ `railway_api_token`
- Sem espaços no nome

**4. Aguarde alguns segundos:**
- Secrets podem levar até 30 segundos para propagar

### Railway CLI não instalado

```bash
npm install -g @railway/cli@latest
```

### Não está autenticado no Railway CLI

```bash
railway login
```

Ou use o token:
```bash
export RAILWAY_TOKEN="seu-token-aqui"
railway whoami
```

### Script não tem permissão de execução

```bash
chmod +x ./scripts/get-railway-ids.sh
chmod +x ./scripts/check-railway-config.sh
```

---

## 📚 Recursos Adicionais

- [Guia completo de configuração](./docs/GITHUB_SECRETS_SETUP.md)
- [Detalhes sobre o erro de token](./docs/RAILWAY_TOKEN_FIX.md)
- [Railway CLI Documentation](https://docs.railway.app/reference/cli-api)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## ✨ Checklist Final

Antes de fazer deploy, confirme:

- [ ] Railway CLI instalado e autenticado
- [ ] Executei `./scripts/get-railway-ids.sh` e copiei todos os IDs
- [ ] Gerei um novo token no Railway
- [ ] Configurei os 6 secrets no GitHub:
  - [ ] `RAILWAY_API_TOKEN`
  - [ ] `RAILWAY_PROJECT_ID`
  - [ ] `RAILWAY_ENVIRONMENT_ID`
  - [ ] `RAILWAY_BACKEND_SERVICE_ID`
  - [ ] `RAILWAY_FRONTEND_SERVICE_ID`
  - [ ] `RAILWAY_BACKEND_DATABASE_URL_PROD`
- [ ] Executei `./scripts/check-railway-config.sh` (opcional)
- [ ] Testei o deploy manualmente no GitHub Actions

---

**Última atualização:** 2026-03-31
