# ✅ Checklist - Configuração do Grafana na Railway

Baseado nas suas variáveis atuais na Railway, aqui está o que precisa ser ajustado:

## 🔍 Status Atual

### ✅ Serviços Configurados
- [x] Grafana (com variáveis)
- [x] Loki (rodando)
- [x] Prometheus (rodando)
- [x] Tempo (provavelmente rodando, não apareceu na lista)
- [x] Backend (com TRACING_ENABLED, LOKI_ENABLED, METRICS_ENABLED)
- [x] Frontend

### 📋 Variáveis do Grafana (Atuais)

```
✅ GF_SECURITY_ADMIN_USER
✅ GF_SECURITY_ADMIN_PASSWORD
✅ GF_INSTALL_PLUGINS
✅ GF_DEFAULT_INSTANCE_NAME
✅ LOKI_INTERNAL_URL
✅ PROMETHEUS_INTERNAL_URL
✅ TEMPO_INTERNAL_URL (assumindo que existe)
```

## 🔧 Ajustes Necessários

### 1. Adicionar Variáveis Faltantes no Grafana

No Railway Dashboard → Grafana → Variables, adicionar:

```bash
# URL do servidor (usa a domain pública do Railway)
GF_SERVER_ROOT_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Segurança (se ainda não tiver)
GF_SECURITY_SECRET_KEY=<gerar-chave-aleatoria-32-chars>
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false

# Datasources (configuração automática via env vars)
GF_DATASOURCES_DEFAULT_PROMETHEUS_URL=${{PROMETHEUS_INTERNAL_URL}}
GF_DATASOURCES_DEFAULT_LOKI_URL=${{LOKI_INTERNAL_URL}}
GF_DATASOURCES_DEFAULT_TEMPO_URL=${{TEMPO_INTERNAL_URL}}
```

### 2. Verificar URLs Internas

Suas variáveis já têm as URLs internas corretas:
- `PROMETHEUS_INTERNAL_URL` → Deve apontar para Prometheus
- `LOKI_INTERNAL_URL` → Deve apontar para Loki  
- `TEMPO_INTERNAL_URL` → Deve apontar para Tempo

**Formato esperado**: `http://prometheus.railway.internal:9090`

### 3. Configurar Backend para Enviar para URLs Internas

No Railway Dashboard → Backend → Variables:

```bash
# Verificar se estão apontando para URLs internas do Railway:

# Loki (já configurado ✅)
LOKI_ENABLED=true
LOKI_ENDPOINT=${{LOKI_INTERNAL_URL}}  # ou URL interna manual

# Tempo (já configurado ✅)
TRACING_ENABLED=true
TEMPO_ENDPOINT=${{TEMPO_INTERNAL_URL}}  # ou URL interna manual

# Métricas (já configurado ✅)
METRICS_ENABLED=true
METRICS_PATH=/api/metrics
```

### 4. Configurar Prometheus para Fazer Scrape do Backend

O Prometheus precisa saber onde buscar as métricas do backend.

**Opção A**: Via variável de ambiente do Prometheus:

```bash
# No Railway Dashboard → Prometheus → Variables
PROMETHEUS_SCRAPE_CONFIGS=- job_name: 'promptzero-backend'
  static_configs:
    - targets: ['${{BACKEND_PRIVATE_DOMAIN}}:3001']
  metrics_path: '/api/metrics'
  scrape_interval: 15s
```

**Opção B**: Via arquivo de configuração (recomendado):

Criar `observability/prometheus/prometheus-railway.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'promptzero-backend'
    static_configs:
      - targets: ['back-end.railway.internal:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

Então no Prometheus, adicionar variável:
```bash
PROMETHEUS_CONFIG_FILE=/etc/prometheus/prometheus-railway.yml
```

## ✅ Passos Para Fazer Agora

### Passo 1: Gerar Domínio Público do Grafana

```bash
Railway Dashboard → Grafana → Settings → Networking → Generate Domain
```

Você vai receber algo como: `https://grafana-production-xyz.up.railway.app`

### Passo 2: Adicionar Variáveis Faltantes

No Grafana, adicionar:

```bash
GF_SERVER_ROOT_URL=https://grafana-production-xyz.up.railway.app
GF_SECURITY_SECRET_KEY=<gerar com: openssl rand -hex 32>
```

### Passo 3: Verificar se Datasources Estão Configuradas

Depois que o Grafana subir:

1. Acesse: `https://grafana-production-xyz.up.railway.app`
2. Login com: `GF_SECURITY_ADMIN_USER` / `GF_SECURITY_ADMIN_PASSWORD`
3. Ir em: **Configuration** → **Data Sources**
4. Verificar se aparecem:
   - ✅ Prometheus (verde)
   - ✅ Loki (verde)
   - ✅ Tempo (verde)

Se não aparecerem, adicionar manualmente:

**Prometheus**:
- URL: Usar valor de `${{PROMETHEUS_INTERNAL_URL}}`
- Access: Server (default)
- Test → Save & Test

**Loki**:
- URL: Usar valor de `${{LOKI_INTERNAL_URL}}`
- Access: Server (default)
- Test → Save & Test

**Tempo**:
- URL: Usar valor de `${{TEMPO_INTERNAL_URL}}`
- Access: Server (default)
- Test → Save & Test

### Passo 4: Upload do Dashboard

Duas opções:

**Opção A**: Via API (Recomendado)

```bash
# Obter API key do Grafana:
# Settings → API Keys → Add API key (Role: Admin)

export GRAFANA_URL="https://grafana-production-xyz.up.railway.app"
export GRAFANA_API_KEY="sua-api-key"

# Fazer upload
./scripts/upload-dashboard-to-grafana-cloud.sh
```

**Opção B**: Via UI (Manual)

1. No Grafana, ir em: **Dashboards** → **Import**
2. Copiar conteúdo de `observability/grafana/dashboards/backend-overview.json`
3. Colar e clicar em **Load**
4. Selecionar datasources e clicar em **Import**

### Passo 5: Verificar Métricas

1. Abrir o dashboard "PromptZero Backend Overview"
2. Deve aparecer dados nos gráficos:
   - Request Rate
   - Request Duration
   - Error Rate
   - Memory Usage

Se aparecer "No data":

**Verificar backend está expondo métricas**:
```bash
curl https://back-end-production-xyz.up.railway.app/api/metrics
# Deve retornar métricas Prometheus
```

**Verificar Prometheus está fazendo scrape**:
1. Acessar Prometheus: `https://prometheus-production-xyz.up.railway.app`
2. Ir em: Status → Targets
3. Verificar se `promptzero-backend` está **UP**

## 🐛 Troubleshooting Rápido

### Problema: Grafana não inicia

**Solução**: Verificar logs
```bash
railway logs --service Grafana
```

### Problema: Datasources não conectam

**Solução**: Verificar URLs internas
```bash
# Deve ser formato:
http://prometheus.railway.internal:9090
http://loki.railway.internal:3100
http://tempo.railway.internal:3200

# Não pode ser:
https://prometheus-xyz.up.railway.app (URL pública)
```

### Problema: Métricas não aparecem

**Solução 1**: Verificar se backend está expondo
```bash
curl https://seu-backend.up.railway.app/api/metrics
```

**Solução 2**: Verificar se Prometheus está fazendo scrape
```bash
# Acessar Prometheus UI → Status → Targets
# Target "promptzero-backend" deve estar UP
```

**Solução 3**: Verificar variáveis do backend
```bash
METRICS_ENABLED=true
METRICS_PATH=/api/metrics
```

## 📊 Resultado Esperado

Após seguir todos os passos:

✅ Grafana acessível em: `https://grafana-xyz.up.railway.app`  
✅ Login funcionando com user/password configurados  
✅ Datasources (Prometheus, Loki, Tempo) configuradas e verdes  
✅ Dashboard "PromptZero Backend Overview" aparece automaticamente  
✅ Gráficos mostram dados do backend em tempo real  
✅ Correlação entre métricas, logs e traces funcionando  

## 🎯 Próximos Passos

Depois de tudo funcionando:

1. [ ] Configurar alertas (latência alta, erros, memória)
2. [ ] Adicionar mais dashboards (frontend, database, cache)
3. [ ] Configurar OAuth para login (GitHub, Google)
4. [ ] Instalar app mobile do Grafana
5. [ ] Configurar notificações (Slack, Email)

## 📚 Documentação de Referência

- **Setup completo**: [docs/GRAFANA_DASHBOARD_SETUP.md]
- **Provisioning**: [docs/GRAFANA_PROVISIONING.md]
- **Deploy Railway**: [observability/grafana/RAILWAY_DEPLOY.md]
- **Quickstart**: [docs/GRAFANA_QUICKSTART.md]
