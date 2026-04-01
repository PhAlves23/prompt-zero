# 🚨 SOLUÇÃO URGENTE: Erro 401 no Deploy

## ❌ Problema Atual

Deploy falhando com:
```
Failed to upload code with status code 401 Unauthorized
```

Mesmo com secrets configurados no GitHub.

## ✅ Solução Imediata

O workflow tenta usar `RAILWAY_API_TOKEN` primeiro, depois faz fallback para `RAILWAY_TOKEN`.

**Você tem configurado:** `RAILWAY_TOKEN`  
**O workflow prefere:** `RAILWAY_API_TOKEN`

### Opção 1: Adicionar RAILWAY_API_TOKEN (Recomendado)

1. Acesse: https://github.com/PhAlves23/prompt-zero/settings/secrets/actions

2. Clique em **"New repository secret"**

3. Configure:
   - **Name:** `RAILWAY_API_TOKEN`
   - **Secret:** (mesmo valor que você usou em `RAILWAY_TOKEN`)

4. Clique em **"Add secret"**

### Opção 2: Verificar se o Token Está Válido

Possíveis problemas com o token atual:

1. **Token expirado**
   - Tokens do Railway podem expirar
   - Solução: Gerar novo token

2. **Token sem permissões**
   - Token precisa ter permissões de deploy
   - Project Tokens: limitados ao projeto
   - Account Tokens: permissões mais amplas

3. **Token com espaços/quebras de linha**
   - Copiar/colar pode adicionar caracteres invisíveis
   - Solução: Gerar novo e copiar com cuidado

### Como Gerar Novo Token do Railway

1. Acesse: https://railway.app/account/tokens

2. Clique em **"Create a Token"**

3. Nome sugerido: `GitHub Actions Deploy - 2026-04-01`

4. **IMPORTANTE:** Copie o token IMEDIATAMENTE
   - Você não poderá vê-lo novamente
   - Ctrl+C para copiar
   - Cole em um editor de texto temporário para verificar

5. No GitHub, adicione como `RAILWAY_API_TOKEN`

## 🔍 Verificar Token Localmente

Antes de adicionar no GitHub, teste localmente:

```bash
# Teste o token
export RAILWAY_TOKEN="seu-token-aqui"

# Deve mostrar seu email
railway whoami

# Deve mostrar o projeto
railway status

# Se der erro 401, o token está inválido
```

## 📋 Checklist

- [ ] Token do Railway gerado (Account Token)
- [ ] Token testado localmente com `railway whoami`
- [ ] Token adicionado no GitHub como `RAILWAY_API_TOKEN`
- [ ] Ou: Token existente `RAILWAY_TOKEN` atualizado
- [ ] Novo deploy triggered

## 🚀 Depois de Adicionar/Atualizar

Faça um novo push para triggerar o deploy:

```bash
# Opção A: Commit vazio (força CI)
git commit --allow-empty -m "ci: trigger deploy with updated token"
git push origin main

# Opção B: Via GitHub UI
# Actions → Deploy Production (Railway) → Re-run all jobs
```

---

**Status:** Aguardando configuração do token  
**Data:** 2026-04-01 02:10 GMT-3
