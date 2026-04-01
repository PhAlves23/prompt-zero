# ✅ Configuração Completa - Pronto para Deploy!

## Status Atual

✅ Secrets configurados no GitHub Environment "production":
- `RAILWAY_TOKEN` ✓
- `RAILWAY_PROJECT_ID` ✓
- `RAILWAY_ENVIRONMENT_ID` ✓
- `RAILWAY_BACKEND_SERVICE_ID` ✓
- `RAILWAY_FRONTEND_SERVICE_ID` ✓
- `RAILWAY_BACKEND_DATABASE_URL_PROD` ✓

✅ Workflow atualizado para usar o environment "production"

## 🚀 Executar Deploy Agora

### Método 1: Via GitHub Actions UI (Recomendado para primeiro teste)

1. Acesse: https://github.com/Alves23/prompt-zero/actions

2. No menu lateral esquerdo, clique em **"Deploy Production (Railway)"**

3. Clique no botão **"Run workflow"** (canto superior direito)

4. Confirme:
   - Branch: `main`
   - Clique em **"Run workflow"** (botão verde)

5. Aguarde a execução:
   - Backend Validate (~2-3 min)
   - Frontend Validate (~3-4 min)
   - Backend Deploy (~1-2 min)
   - Frontend Deploy (~1-2 min)
   - **Total: ~7-10 minutos**

### Método 2: Via Push (Automático)

```bash
# Commitar as mudanças do workflow
git add .
git commit -m "chore: configure railway deployment with production environment"
git push origin main
```

O deploy será executado automaticamente após o push na branch `main`.

## 🔍 Monitorar o Deploy

### No GitHub Actions

1. Acesse: https://github.com/Alves23/prompt-zero/actions
2. Clique na execução mais recente
3. Acompanhe cada job:
   - ✓ Backend Validate
   - ✓ Frontend Validate
   - ✓ Backend Migrate + Deploy Railway
   - ✓ Frontend Deploy Railway

### Ver Logs Detalhados

Clique em cada step para ver logs:
- "Prepare Railway API token" - Verifica token
- "Deploy backend service" - Upload do backend
- "Deploy frontend service" - Upload do frontend

## ✅ Verificar Deploy Bem-Sucedido

### Backend

1. Acesse a URL do backend no Railway
2. Teste o endpoint: `https://seu-backend.up.railway.app/api/v1`
3. Deve retornar:
   ```json
   {
     "status": "ok",
     "service": "prompt-vault-backend",
     "message": "API is healthy"
   }
   ```

### Frontend

1. Acesse a URL do frontend no Railway
2. Deve carregar a aplicação PromptZero

## ❌ Se o Deploy Falhar

### Erro: "401 Unauthorized"

O token pode estar expirado ou inválido.

**Solução:**
1. Gere um novo token: https://railway.app/account/tokens
2. Atualize no GitHub: Settings > Environments > production > RAILWAY_TOKEN
3. Execute o deploy novamente

### Erro: "Service not found"

Um dos IDs de serviço pode estar incorreto.

**Verificar:**
```bash
railway services
```

Compare os IDs com os configurados no GitHub.

### Erro: Migration Failed

Problema nas migrações do Prisma.

**Verificar:**
1. Logs do step "Run production migrations"
2. Se necessário, execute manualmente:
   ```bash
   railway run --service backend yarn prisma:migrate:deploy
   ```

### Erro: Build Failed

Problema no build do código.

**Verificar:**
1. Logs do step "Build"
2. Execute localmente:
   ```bash
   cd backend && yarn build
   cd ../frontend && pnpm build
   ```

## 📊 Próximas Execuções

Após a primeira execução bem-sucedida, o deploy será **automático** sempre que você fizer push na branch `main`.

## 🎯 Checklist Final

Antes de executar o deploy:

- [x] Token do Railway gerado e configurado
- [x] Todos os 6 secrets configurados no environment "production"
- [x] Workflow atualizado para usar environment "production"
- [ ] Executar primeiro deploy de teste
- [ ] Verificar backend respondendo
- [ ] Verificar frontend carregando
- [ ] Verificar logs no Railway Dashboard

## 📝 Comandos Úteis

### Ver status do Railway localmente
```bash
railway status
```

### Ver variáveis de ambiente do backend
```bash
railway variables --service backend
```

### Ver logs em tempo real
```bash
railway logs --service backend
railway logs --service frontend
```

### Fazer rollback se necessário
```bash
railway rollback --service backend
```

---

## 🚀 Próximo Passo

**Execute o deploy agora!**

Vá para: https://github.com/Alves23/prompt-zero/actions

Clique em **"Deploy Production (Railway)"** > **"Run workflow"**

---

**Boa sorte com o deploy! 🎉**

Se precisar de ajuda, consulte:
- `docs/RAILWAY_TOKEN_FIX.md` - Troubleshooting do token
- `docs/ci-cd-railway.md` - Documentação completa do CI/CD
- `NEXT_STEPS.md` - Guia geral
