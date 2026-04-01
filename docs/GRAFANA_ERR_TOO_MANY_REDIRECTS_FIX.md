# 🔴 Fix: Grafana ERR_TOO_MANY_REDIRECTS

## Problema

Ao acessar Grafana: `grafana-production-60e7.up.railway.app`

Erro: **ERR_TOO_MANY_REDIRECTS** (loop de redirecionamento infinito)

## Causa

O Railway fornece HTTPS automático (proxy reverso), mas o Grafana está configurado incorretamente para lidar com isso.

## ✅ Solução Completa

### Passo 1: Corrigir Variáveis do Grafana

No **Railway Dashboard → Grafana → Variables**, ajustar/adicionar:

```bash
# ❌ REMOVER (se existir):
GF_SERVER_ROOT_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# ✅ ADICIONAR/ATUALIZAR:

# 1. URL completa com HTTPS
GF_SERVER_ROOT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# 2. Protocolo correto (Railway usa proxy HTTPS)
GF_SERVER_PROTOCOL=https

# 3. Configuração para proxy reverso
GF_SERVER_SERVE_FROM_SUB_PATH=false

# 4. Headers de proxy
GF_SERVER_ENABLE_GZIP=true

# 5. Configuração de cookies (importante!)
GF_SECURITY_COOKIE_SECURE=true
GF_SECURITY_COOKIE_SAMESITE=lax

# 6. Desabilitar strict transport security (se estiver causando loop)
GF_SERVER_ENFORCE_DOMAIN=false
```

### Passo 2: Adicionar Variáveis de Proxy (Crítico!)

```bash
# Railway usa proxy reverso, precisamos dizer ao Grafana
GF_SERVER_ROUTER_LOGGING=true
GF_LOG_LEVEL=debug

# Aceitar requisições do proxy do Railway
GF_SECURITY_ALLOW_EMBEDDING=true

# Configuração específica para Railway
GF_SERVER_HTTP_ADDR=0.0.0.0
GF_SERVER_HTTP_PORT=3000
```

### Passo 3: Verificar Variáveis Obrigatórias

Certifique-se de que estas variáveis **EXISTEM**:

```bash
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<sua-senha-forte>
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false
```

### Passo 4: Aguardar Redeploy

O Railway vai reiniciar o Grafana automaticamente após salvar as variáveis.

Aguarde ~30-60 segundos.

### Passo 5: Limpar Cache do Navegador

```bash
# Chrome/Edge
Ctrl+Shift+Delete → Limpar cookies e cache

# Firefox
Ctrl+Shift+Delete → Limpar tudo

# Safari
Cmd+Option+E → Limpar cache

# Ou usar aba anônima/privada
```

### Passo 6: Testar Novamente

```bash
# Acessar em aba anônima
https://grafana-production-60e7.up.railway.app

# Deve aparecer tela de login do Grafana
# Login: admin / <senha configurada>
```

## 🐛 Se Ainda Não Funcionar

### Solução Alternativa 1: Remover ROOT_URL

Às vezes, não definir `GF_SERVER_ROOT_URL` funciona melhor:

```bash
# REMOVER estas variáveis:
GF_SERVER_ROOT_URL
GF_SERVER_PROTOCOL

# MANTER apenas:
GF_SECURITY_COOKIE_SECURE=false
GF_SERVER_HTTP_ADDR=0.0.0.0
GF_SERVER_HTTP_PORT=3000
```

Restart e testar.

### Solução Alternativa 2: Desabilitar Cookies Seguros

Se o problema persistir, tentar:

```bash
GF_SECURITY_COOKIE_SECURE=false
GF_SECURITY_COOKIE_SAMESITE=none
```

**Atenção**: Menos seguro, mas funciona para debugging.

### Solução Alternativa 3: Verificar Logs

```bash
# Ver logs do Grafana no Railway
railway logs --service Grafana --tail 100

# Procurar por erros como:
# "redirect loop detected"
# "too many redirects"
# "cookie not set"
```

## 📋 Checklist Final de Variáveis

Copie e cole estas variáveis no Railway (ajustar senha):

```bash
# Servidor
GF_SERVER_ROOT_URL=https://grafana-production-60e7.up.railway.app
GF_SERVER_PROTOCOL=https
GF_SERVER_HTTP_ADDR=0.0.0.0
GF_SERVER_HTTP_PORT=3000
GF_SERVER_SERVE_FROM_SUB_PATH=false
GF_SERVER_ENFORCE_DOMAIN=false

# Segurança
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=SuaSenhaForteAqui123!
GF_SECURITY_SECRET_KEY=<gerar com: openssl rand -hex 32>
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false

# Cookies
GF_SECURITY_COOKIE_SECURE=true
GF_SECURITY_COOKIE_SAMESITE=lax

# Datasources (opcional, mas recomendado)
GF_DATASOURCES_DEFAULT_PROMETHEUS_URL=http://prometheus.railway.internal:9090
GF_DATASOURCES_DEFAULT_LOKI_URL=http://loki.railway.internal:3100
GF_DATASOURCES_DEFAULT_TEMPO_URL=http://tempo.railway.internal:3200

# Plugins
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel

# Debug (remover depois que funcionar)
GF_LOG_LEVEL=info
GF_SERVER_ROUTER_LOGGING=false
```

## 🎯 Resultado Esperado

Após aplicar as correções:

✅ Acessar `https://grafana-production-60e7.up.railway.app`  
✅ Ver tela de login do Grafana (não erro)  
✅ Fazer login com admin / senha  
✅ Ver interface do Grafana  

## 📚 Referências

- [Grafana Behind Reverse Proxy](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#serve-grafana-behind-a-reverse-proxy)
- [Railway HTTPS/SSL](https://docs.railway.app/guides/public-networking#https)
- [Grafana Cookie Settings](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-security-hardening/)

## 🆘 Ainda Com Problema?

Se após todas as tentativas ainda não funcionar:

1. **Compartilhar logs**:
   ```bash
   railway logs --service Grafana --tail 200 > grafana-logs.txt
   ```

2. **Verificar variáveis atuais**:
   ```bash
   railway run --service Grafana env | grep GF_
   ```

3. **Testar localmente**:
   ```bash
   # Rodar Grafana local com mesmas configs
   docker run -p 3000:3000 \
     -e GF_SERVER_ROOT_URL=http://localhost:3000 \
     -e GF_SECURITY_ADMIN_PASSWORD=admin \
     grafana/grafana:latest
   ```

## ✨ Dica Pro

Para evitar esse problema no futuro, sempre configurar Grafana com:

```bash
# Dockerfile ou railway.json
GF_SERVER_ROOT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
GF_SERVER_PROTOCOL=https
GF_SECURITY_COOKIE_SECURE=true
```

Isso garante compatibilidade com proxy reverso do Railway desde o início.
