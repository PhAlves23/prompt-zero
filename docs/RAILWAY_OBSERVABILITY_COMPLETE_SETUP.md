# ✅ Checklist Completo - Deploy Stack Observabilidade Railway

## 📋 Root Directories (GitHub)

Conectar cada serviço ao repositório com estes diretórios:

| Serviço | Repository | Branch | Root Directory |
|---------|-----------|--------|----------------|
| **Grafana** | `PhAlves23/prompt-zero` | `main` | `observability/grafana` |
| **Loki** | `PhAlves23/prompt-zero` | `main` | `observability/loki` |
| **Prometheus** | `PhAlves23/prompt-zero` | `main` | `observability/prometheus` |
| **Tempo** | `PhAlves23/prompt-zero` | `main` | `observability/tempo` |

## 📦 Volumes Necessários

| Serviço | Mount Path | Size |
|---------|-----------|------|
| **Loki** | `/loki` | 5-10 GB |
| **Prometheus** | `/prometheus` | 10-20 GB |
| **Tempo** | `/var/tempo` | 10-20 GB |
| **Grafana** | `/var/lib/grafana` | 1-2 GB |

## 🔧 Variáveis de Ambiente

### Grafana
```bash
GF_SERVER_ROOT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
GF_SERVER_PROTOCOL=https
GF_SERVER_HTTP_ADDR=0.0.0.0
GF_SERVER_HTTP_PORT=3000
GF_SERVER_SERVE_FROM_SUB_PATH=false
GF_SERVER_ENFORCE_DOMAIN=false
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<senha-forte>
GF_SECURITY_SECRET_KEY=<openssl rand -hex 32>
GF_SECURITY_COOKIE_SECURE=true
GF_SECURITY_COOKIE_SAMESITE=lax
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel
```

### Loki
```bash
# Nenhuma variável necessária
# Configuração está no loki-config.yml
```

### Prometheus
```bash
# Nenhuma variável necessária
# Configuração está no prometheus-railway.yml
```

### Tempo
```bash
# Nenhuma variável necessária
# Configuração está no tempo-config.yml
```

### Backend (Conectar aos Serviços)
```bash
# Já configuradas, apenas verificar:
METRICS_ENABLED=true
METRICS_PATH=/api/metrics
LOKI_ENABLED=true
LOKI_ENDPOINT=http://loki.railway.internal:3100
TRACING_ENABLED=true
TEMPO_ENDPOINT=http://tempo.railway.internal:4318
SERVICE_NAME=promptzero-backend-prod
SERVICE_VERSION=1.0.0
```

## 🚀 Ordem de Deploy

1. **Loki** (independente)
2. **Tempo** (independente)
3. **Prometheus** (depende de Tempo para metrics_generator)
4. **Grafana** (depende de todos os anteriores)

## ✅ Verificação Pós-Deploy

### 1. Verificar se Serviços Estão Rodando

```bash
# Cada serviço deve estar com status "Running" (verde)
Railway Dashboard → Project → Services
```

### 2. Verificar Logs (Sem Erros)

```bash
railway logs --service loki --tail 20
railway logs --service prometheus --tail 20
railway logs --service tempo --tail 20
railway logs --service grafana --tail 20
```

### 3. Healthchecks

```bash
# Se você expor publicamente (ou via Railway CLI):
curl https://loki-production-xyz.up.railway.app/ready
curl https://prometheus-production-xyz.up.railway.app/-/healthy
curl https://tempo-production-xyz.up.railway.app/ready
curl https://grafana-production-xyz.up.railway.app/api/health
```

### 4. Testar Conectividade Interna

```bash
# Do Grafana para outros serviços:
railway run --service grafana

# Dentro do container:
wget -O- http://prometheus.railway.internal:9090/-/healthy
wget -O- http://loki.railway.internal:3100/ready
wget -O- http://tempo.railway.internal:3200/ready
```

### 5. Verificar Backend Enviando Dados

```bash
# Métricas
curl https://api.promptzero.dev/api/metrics

# Verificar no Prometheus se está coletando:
# https://prometheus-xyz.up.railway.app/targets
# Target "promptzero-backend" deve estar UP
```

### 6. Verificar Dashboard no Grafana

1. Acessar Grafana
2. Dashboards → PromptZero Backend Overview
3. Verificar se gráficos mostram dados
4. Se "No data", ver troubleshooting

## 🐛 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Serviço não inicia | Verificar logs: `railway logs --service <nome>` |
| "Permission denied" | Verificar se volume foi criado |
| "Out of disk" | Aumentar tamanho do volume |
| Grafana "No data" | Verificar datasources e targets do Prometheus |
| Loop de redirect | Verificar `GF_SERVER_ROOT_URL` |

## 📚 Documentação Completa

- [RAILWAY_VOLUMES_SETUP.md](./RAILWAY_VOLUMES_SETUP.md) - Detalhes de volumes
- [RAILWAY_GRAFANA_CHECKLIST.md](./RAILWAY_GRAFANA_CHECKLIST.md) - Checklist Grafana
- [DEPLOY_SUCCESS_NEXT_STEPS.md](./DEPLOY_SUCCESS_NEXT_STEPS.md) - Próximos passos
- [GRAFANA_ERR_TOO_MANY_REDIRECTS_FIX.md](./GRAFANA_ERR_TOO_MANY_REDIRECTS_FIX.md) - Fix redirect loop

## 💰 Custos Estimados (Railway)

### Serviços (Compute)
- Loki: ~$5/mês (512 MB RAM)
- Prometheus: ~$10/mês (1 GB RAM)
- Tempo: ~$10/mês (1 GB RAM)
- Grafana: ~$5/mês (512 MB RAM)

### Volumes (Storage)
- Loki: 10 GB = $2.50/mês
- Prometheus: 20 GB = $5.00/mês
- Tempo: 10 GB = $2.50/mês
- Grafana: 2 GB = $0.50/mês

**Total Stack**: ~$40-50/mês

### Alternativa: Grafana Cloud
- Free tier: 10k métricas + 50GB logs/mês
- Paid: ~$8-20/mês após limits
- **Economia**: ~$20-30/mês vs self-hosted

## 🎉 Resultado Final

Depois de tudo configurado:

✅ Stack completa de observabilidade rodando  
✅ Dashboards automaticamente provisionados  
✅ Métricas, logs e traces sendo coletados  
✅ Dados persistidos em volumes  
✅ Correlação automática entre tudo  
✅ Pronto para produção!  

## 🚀 Quick Start

```bash
# 1. Conectar cada serviço ao GitHub
# 2. Configurar root directories (tabela acima)
# 3. Adicionar volumes (tabela acima)
# 4. Configurar variáveis do Grafana
# 5. Aguardar deploys
# 6. Testar tudo
# 7. 🎉 Profit!
```
