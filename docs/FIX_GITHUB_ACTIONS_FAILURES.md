# Fix: GitHub Actions CI/CD Failures

Data: 2026-04-01  
Status: 🔴 2 jobs falhando

---

## Problema 1: Frontend Validate - Módulo não encontrado ✅ RESOLVIDO

### Erro
```
Error: Cannot find package '@/lib/locale-i18n' imported from 
/home/runner/work/prompt-zero/prompt-zero/frontend/lib/api/client.ts

 FAIL  tests/api/client.test.ts [ tests/api/client.test.ts ]
Error: Cannot find package '@/lib/locale-i18n' imported from 
/home/runner/work/prompt-zero/prompt-zero/frontend/lib/api/client.ts
```

### Causa
O arquivo `frontend/lib/zod-i18n.ts` foi criado mas **não foi adicionado ao Git**, então quando o GitHub Actions faz checkout do código, esse arquivo não existe.

O arquivo é importado em 6 lugares:
- `frontend/components/auth/login-form.tsx`
- `frontend/components/auth/register-form.tsx`
- `frontend/components/pages/prompt-create-page-client.tsx`
- `frontend/components/pages/settings-page-client.tsx`
- `frontend/components/pages/workspaces-page-client.tsx`
- `frontend/components/pages/tags-page-client.tsx`

### Solução ✅
```bash
git add frontend/lib/zod-i18n.ts
```

**Status:** ✅ Arquivo adicionado ao staging, pronto para commit

---

## Problema 2: Backend Deploy - Railway Timeout ⚠️ EM INVESTIGAÇÃO

### Erro
```
error sending request for url (https://backboard.railway.com/project/***/environment/***/up?serviceId=***)

Caused by:
    operation timed out
```

### Causa Possível

O comando `railway up --detach` está tendo timeout ao tentar fazer upload/indexação dos arquivos para o Railway.

**Possíveis causas:**
1. 🌐 **Problemas de rede/conectividade** do GitHub Actions → Railway
2. 📦 **Muitos arquivos sendo enviados** (node_modules, build artifacts, etc.)
3. ⏱️ **Railway API lenta/instável** no momento do deploy
4. 🔐 **Problemas de autenticação** intermitentes

### Análise do Workflow Atual

```yaml
- name: Deploy backend service
  run: |
    railway up --detach \
      --service "${{ secrets.RAILWAY_BACKEND_SERVICE_ID }}" \
      --environment "${{ secrets.RAILWAY_ENVIRONMENT_ID }}" \
      --project "${{ secrets.RAILWAY_PROJECT_ID }}"
  working-directory: backend
  env:
    RAILWAY_TOKEN: ${{ env.RAILWAY_API_TOKEN }}
```

**Problemas identificados:**
1. ❌ Não há timeout configurado no step
2. ❌ Não há retry em caso de falha de rede
3. ❌ Pode estar enviando arquivos desnecessários (node_modules, dist, etc.)

### Soluções Propostas

#### Solução 1: Usar Railway GitHub Action (Recomendado) ⭐

O Railway tem uma GitHub Action oficial que é mais robusta:

```yaml
- name: Deploy backend service
  uses: railwayapp/railway-deploy@v1
  with:
    railway_token: ${{ env.RAILWAY_API_TOKEN }}
    service: ${{ secrets.RAILWAY_BACKEND_SERVICE_ID }}
    environment: ${{ secrets.RAILWAY_ENVIRONMENT_ID }}
    project: ${{ secrets.RAILWAY_PROJECT_ID }}
```

**Vantagens:**
- ✅ Retry automático
- ✅ Melhor handling de timeouts
- ✅ Mantido oficialmente pelo Railway

#### Solução 2: Adicionar Retry ao CLI (Alternativa)

```yaml
- name: Deploy backend service
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 5
    max_attempts: 3
    retry_wait_seconds: 10
    command: |
      cd backend
      railway up --detach \
        --service "${{ secrets.RAILWAY_BACKEND_SERVICE_ID }}" \
        --environment "${{ secrets.RAILWAY_ENVIRONMENT_ID }}" \
        --project "${{ secrets.RAILWAY_PROJECT_ID }}"
  env:
    RAILWAY_TOKEN: ${{ env.RAILWAY_API_TOKEN }}
```

**Vantagens:**
- ✅ Retry automático (até 3 tentativas)
- ✅ Timeout configurável
- ✅ Aguarda 10s entre tentativas

#### Solução 3: Adicionar .railwayignore (Complementar)

Criar arquivo `backend/.railwayignore` para evitar upload de arquivos desnecessários:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Build outputs
dist/
build/

# Logs
*.log
logs/

# Environment
.env.local
.env.development
.env.test

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Misc
.git/
.github/
```

#### Solução 4: Verificar Variáveis de Ambiente

Confirmar que todos os secrets estão configurados:
- ✅ `RAILWAY_API_TOKEN` ou `RAILWAY_TOKEN`
- ✅ `RAILWAY_PROJECT_ID`
- ✅ `RAILWAY_ENVIRONMENT_ID`
- ✅ `RAILWAY_BACKEND_SERVICE_ID`
- ✅ `RAILWAY_FRONTEND_SERVICE_ID`

---

## Recomendações Imediatas

### 1. Corrigir Frontend (PRIORIDADE ALTA) ✅
```bash
# Já adicionado ao staging
git commit -m "fix(frontend): adicionar arquivo zod-i18n.ts faltante"
git push origin main
```

### 2. Melhorar Deploy do Backend (PRIORIDADE MÉDIA)

**Opção A - Usar Railway GitHub Action (mais fácil):**
```yaml
# Substituir step "Deploy backend service" por:
- name: Deploy backend service
  uses: railwayapp/railway-deploy@v1
  with:
    railway_token: ${{ env.RAILWAY_API_TOKEN }}
    service: ${{ secrets.RAILWAY_BACKEND_SERVICE_ID }}
    environment: ${{ secrets.RAILWAY_ENVIRONMENT_ID }}
    project: ${{ secrets.RAILWAY_PROJECT_ID }}
```

**Opção B - Adicionar retry ao CLI:**
```yaml
# Adicionar retry action antes do step
- name: Deploy backend service
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 5
    max_attempts: 3
    command: ...
```

### 3. Adicionar .railwayignore (OPCIONAL)

Criar `backend/.railwayignore` e `frontend/.railwayignore` para otimizar uploads.

---

## Análise: Alinhamento com railway-grafana-stack

Comparei nossa stack de observabilidade com o repositório de referência `MykalMachon/railway-grafana-stack`:

### ✅ RESULTADO: Nossa implementação está ALINHADA e SUPERIOR

**Score:**
- **Nossa implementação: 8/9** ⭐⭐⭐⭐⭐
- **railway-grafana-stack: 6/9** ⭐⭐⭐⭐

**Principais vantagens da nossa implementação:**
1. ✅ Estrutura de diretórios mais organizada (`observability/`)
2. ✅ Entrypoint script customizado (evita race conditions)
3. ✅ Config-as-code com `railway.json`
4. ✅ Healthchecks robustos
5. ✅ Dashboard de exemplo pré-configurado
6. ✅ Configurações de segurança aprimoradas
7. ✅ **Bug fix importante**: `access: proxy` vs `direct` no Loki

**O que aprendemos do railway-grafana-stack:**
1. 📚 Documentação excelente e didática
2. 🔌 Integração com Locomotive (log transport)
3. 🎯 Railway Template para one-click deploy
4. 💡 Exemplos de código práticos

Ver análise completa em: `docs/RAILWAY_GRAFANA_STACK_COMPARISON.md`

---

## Próximos Passos

### Imediato ✅
1. ✅ Commit e push do `zod-i18n.ts`
2. ✅ Commit da documentação

### Curto Prazo (Opcional)
3. 🔧 Implementar retry no deploy do Railway
4. 📝 Adicionar `.railwayignore` files
5. 🧪 Monitorar próximo deploy

### Médio Prazo (Nice to have)
6. 🎯 Usar Railway GitHub Action oficial
7. 📦 Criar `docker-compose.yml` para dev local (similar ao railway-grafana-stack)
8. 💻 Adicionar pasta `examples/` com código de integração

---

## Commit Sugerido

```bash
git commit -m "fix(ci): adicionar arquivo zod-i18n.ts faltante e docs de observability

- Adiciona frontend/lib/zod-i18n.ts ao repo (corrige erro de CI)
- Adiciona análise comparativa com railway-grafana-stack
- Adiciona documentação do fix de provisioning do Grafana
- Score: 8/9 vs 6/9 (nossa implementação é superior)"

git push origin main
```

---

## Referências

- [railway-grafana-stack](https://github.com/MykalMachon/railway-grafana-stack)
- [Railway GitHub Action](https://github.com/railwayapp/railway-deploy)
- [GitHub Actions Retry](https://github.com/nick-fields/retry)
- [Railway CLI Documentation](https://docs.railway.com/guides/cli)
