# 🔴 SOLUÇÃO: Frontend 502 Bad Gateway

## 📋 Problema Identificado

O frontend está retornando erro **502 Bad Gateway** porque está tentando se conectar ao backend usando `http://localhost:3001/api/v1`, que não existe dentro do container do frontend no Railway.

### Causa Raiz

No arquivo `frontend/lib/api/http.ts`:

```typescript
const DEFAULT_BACKEND_URL = "http://localhost:3001/api/v1"

export function getBackendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_URL
  return configuredUrl.replace(/\/+$/, "")
}
```

A variável de ambiente `BACKEND_API_URL` **NÃO está configurada** no serviço frontend do Railway, então ele usa o default `localhost:3001`, que não funciona em produção.

## ✅ Solução

### 1️⃣ Adicionar Variável de Ambiente no Railway

Acesse o Railway e configure a variável para o serviço **front-end**:

**Via Railway Dashboard:**
1. Acesse: https://railway.app → Projeto PromptZero
2. Selecione o serviço **front-end**
3. Vá em **Variables**
4. Adicione:
   - **Nome:** `BACKEND_API_URL`
   - **Valor:** `https://api.promptzero.dev/api/v1`

**Via Railway CLI (alternativo):**

```bash
railway link
railway variables --service front-end set BACKEND_API_URL=https://api.promptzero.dev/api/v1
```

### 2️⃣ Forçar Redeploy do Frontend

Depois de adicionar a variável:

```bash
railway up --service front-end --detach
```

Ou simplesmente faça um push para main que irá triggar o CI/CD.

## 🔍 Verificação

Após o deploy, o frontend deve:

1. ✅ Conectar-se ao backend via `https://api.promptzero.dev/api/v1`
2. ✅ Retornar 200 OK em `https://promptzero.dev/`
3. ✅ Funcionar corretamente com autenticação e API calls

### Como Testar

```bash
# 1. Verificar se o frontend responde
curl -I https://promptzero.dev/

# Deve retornar:
# HTTP/2 200

# 2. Verificar se a página de login carrega
curl https://promptzero.dev/sign-in

# Deve retornar HTML válido
```

## 📊 Contexto Adicional

### Arquitetura Atual

```
Cloudflare DNS
├── promptzero.dev → Railway (front-end service)
│   └── Conecta via BACKEND_API_URL → https://api.promptzero.dev
│
└── api.promptzero.dev → Railway (back-end service)
    ├── PostgreSQL
    ├── Redis
    ├── MinIO
    └── Observability Stack
```

### Status dos Serviços

| Serviço | URL | Status |
|---------|-----|--------|
| Frontend | https://promptzero.dev/ | ❌ 502 (sem BACKEND_API_URL) |
| Backend API | https://api.promptzero.dev/ | ✅ Online (Swagger funcionando) |
| Backend Docs | https://api.promptzero.dev/docs | ✅ Online |

## 🎯 Próximos Passos

1. ✅ Adicionar `BACKEND_API_URL=https://api.promptzero.dev/api/v1` no Railway
2. ✅ Redeploy do frontend
3. ✅ Testar acesso ao https://promptzero.dev/
4. ✅ Testar login e funcionalidades básicas
5. ⚠️ Considerar adicionar essa variável no CI/CD para garantir que nunca seja esquecida

## 🔧 Melhoria Recomendada: Adicionar ao CI/CD

Atualize `.github/workflows/deploy-production-railway.yml` para garantir que a variável está configurada:

```yaml
frontend-deploy:
  name: Frontend Deploy Railway
  # ... resto do job
  steps:
    # ... outros steps
    
    - name: Ensure BACKEND_API_URL is set
      run: |
        railway variables --service "${{ secrets.RAILWAY_FRONTEND_SERVICE_ID }}" set BACKEND_API_URL=https://api.promptzero.dev/api/v1 || echo "Variable already set or CLI error"
      working-directory: frontend
      env:
        RAILWAY_TOKEN: ${{ env.RAILWAY_API_TOKEN }}
    
    - name: Deploy frontend service
      # ... resto do deploy
```

---

**Última atualização:** 2026-04-01 02:38 GMT-3
**Status:** Aguardando configuração da variável no Railway
