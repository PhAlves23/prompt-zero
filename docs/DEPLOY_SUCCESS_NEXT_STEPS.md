# 🚀 Deploy Bem-Sucedido - Próximos Passos

## ✅ Status Atual

### Frontend
- ✅ **Deployado com sucesso**: `promptzero.dev`
- ✅ **Next.js 16.2.1** rodando
- ✅ **Network Flow Logs** mostram tráfego entre serviços
- ✅ **DNS interno**: `front-end.railway.internal`

### Backend (Assumindo que está rodando)
- ⏳ Verificar se está expondo métricas
- ⏳ Conectar ao Prometheus
- ⏳ Verificar logs no Loki
- ⏳ Verificar traces no Tempo

## 📋 Checklist de Configuração

### Passo 1: Verificar Backend

```bash
# 1. Verificar se backend está rodando
curl https://api.promptzero.dev/api/v1

# 2. Verificar se métricas estão sendo expostas
curl https://api.promptzero.dev/api/metrics

# Deve retornar algo como:
# http_requests_total{method="GET",route="/api/v1",status="200"} 42
# http_request_duration_ms_bucket{le="100"} 35
# ...
```

**Se não retornar métricas**: Verificar variáveis do backend no Railway:
```bash
METRICS_ENABLED=true
METRICS_PATH=/api/metrics
```

### Passo 2: Configurar Prometheus

No **Railway Dashboard → Prometheus Service**:

#### Opção A: Via Variável de Ambiente (Simples)

Adicionar variável:
```bash
# Nome da variável
PROMETHEUS_CONFIG

# Valor (copiar de observability/prometheus/prometheus-railway.yml)
<colar conteúdo do arquivo YAML>
```

#### Opção B: Via Volume (Recomendado)

1. Criar volume no Prometheus:
   - Settings → Volumes → Add Volume
   - Mount path: `/etc/prometheus`

2. Fazer upload do arquivo de configuração:
   ```bash
   # Via Railway CLI
   railway volume mount prometheus-config
   cp observability/prometheus/prometheus-railway.yml /mnt/prometheus-config/prometheus.yml
   ```

3. Adicionar variável no Prometheus:
   ```bash
   PROMETHEUS_CONFIG_FILE=/etc/prometheus/prometheus.yml
   ```

4. Restart do Prometheus:
   ```bash
   railway service restart prometheus
   ```

### Passo 3: Verificar se Prometheus Está Coletando

1. **Acessar Prometheus**: 
   - Gerar domain público se ainda não tiver
   - Settings → Networking → Generate Domain

2. **Verificar Targets**:
   - Acessar: `https://prometheus-xyz.up.railway.app/targets`
   - Verificar se `promptzero-backend` está **UP** (verde)
   - Se estiver **DOWN** (vermelho), ver erro e ajustar

3. **Testar Query**:
   - Ir para Graph
   - Query: `http_requests_total`
   - Deve mostrar métricas do backend

### Passo 4: Configurar Grafana

Seguir o checklist anterior: [RAILWAY_GRAFANA_CHECKLIST.md](./RAILWAY_GRAFANA_CHECKLIST.md)

1. Gerar secrets:
   ```bash
   ./scripts/generate-grafana-secrets.sh
   ```

2. Adicionar variáveis no Grafana (Railway Dashboard)

3. Expor Grafana publicamente

4. Fazer upload do dashboard:
   ```bash
   export GRAFANA_URL="https://grafana-xyz.up.railway.app"
   export GRAFANA_API_KEY="criar-no-grafana"
   ./scripts/upload-dashboard-to-grafana-cloud.sh
   ```

### Passo 5: Verificar Loki (Logs)

No **Railway Dashboard → Backend Service**:

Verificar variáveis:
```bash
LOKI_ENABLED=true
LOKI_ENDPOINT=http://loki.railway.internal:3100
```

Testar se logs estão chegando:
```bash
# Acessar Loki (expor publicamente primeiro)
curl "https://loki-xyz.up.railway.app/loki/api/v1/query" \
  --data-urlencode 'query={service="promptzero-backend"}' \
  --data-urlencode 'limit=10'
```

### Passo 6: Verificar Tempo (Traces)

No **Railway Dashboard → Backend Service**:

Verificar variáveis:
```bash
TRACING_ENABLED=true
TEMPO_ENDPOINT=http://tempo.railway.internal:4318
SERVICE_NAME=promptzero-backend-prod
```

Testar se traces estão chegando:
```bash
# Via Grafana → Explore → Tempo
# Query: {service.name="promptzero-backend-prod"}
```

## 🔍 Troubleshooting

### Problema: Backend não expõe métricas

**Sintomas**:
```bash
curl https://api.promptzero.dev/api/metrics
# Retorna 404 ou erro
```

**Solução**:
1. Verificar variáveis do backend:
   ```bash
   METRICS_ENABLED=true
   METRICS_PATH=/api/metrics
   ```

2. Verificar logs do backend:
   ```bash
   railway logs --service back-end
   # Deve mostrar: "Metrics endpoint initialized"
   ```

3. Restart do backend:
   ```bash
   railway service restart back-end
   ```

### Problema: Prometheus não consegue fazer scrape

**Sintomas**: Target aparece **DOWN** no Prometheus

**Causas possíveis**:
1. DNS interno errado
2. Porta errada
3. Firewall/Network Policy

**Solução**:
1. Verificar DNS interno do backend:
   ```bash
   # Deve ser exatamente:
   back-end.railway.internal:3001
   # Não pode ser URL pública!
   ```

2. Verificar se serviços estão na mesma rede Railway

3. Testar conectividade de dentro do Prometheus:
   ```bash
   railway run --service prometheus
   wget -O- http://back-end.railway.internal:3001/api/metrics
   ```

### Problema: Grafana não mostra dados

**Sintomas**: Dashboard mostra "No data"

**Causas**:
1. Datasources não configuradas
2. Prometheus não está coletando
3. Queries incorretas

**Solução**:
1. **Verificar datasources no Grafana**:
   - Configuration → Data Sources
   - Prometheus, Loki, Tempo devem estar verdes

2. **Verificar se Prometheus tem dados**:
   ```bash
   # Acessar Prometheus diretamente
   # Graph → Query: http_requests_total
   # Deve retornar dados
   ```

3. **Verificar queries do dashboard**:
   - Dashboard Settings → JSON Model
   - Procurar por `job="promptzero-backend"`
   - Deve bater com o job_name do prometheus.yml

## 📊 Resultado Esperado

Depois de tudo configurado:

✅ Backend expondo métricas em `/api/metrics`  
✅ Prometheus fazendo scrape a cada 15s  
✅ Grafana conectado ao Prometheus, Loki, Tempo  
✅ Dashboard mostrando:
  - Request Rate (requisições/segundo)
  - Request Duration (latência P95, P99)
  - Error Rate (erros 5xx)
  - Memory Usage (RAM)  
✅ Logs aparecendo no Loki  
✅ Traces aparecendo no Tempo  
✅ Correlação funcionando (métrica → trace → logs)  

## 🎯 Comandos Rápidos

```bash
# Verificar métricas do backend
curl https://api.promptzero.dev/api/metrics

# Ver targets do Prometheus
open https://prometheus-xyz.up.railway.app/targets

# Acessar Grafana
open https://grafana-xyz.up.railway.app

# Ver logs do backend
railway logs --service back-end --tail 100

# Restart de serviços
railway service restart prometheus
railway service restart grafana
railway service restart back-end
```

## 📚 Documentação

- [RAILWAY_GRAFANA_CHECKLIST.md](./RAILWAY_GRAFANA_CHECKLIST.md) - Checklist completo
- [GRAFANA_PROVISIONING.md](./GRAFANA_PROVISIONING.md) - Como funciona provisioning
- [GRAFANA_DASHBOARD_SETUP.md](./GRAFANA_DASHBOARD_SETUP.md) - Setup completo
- [observability/grafana/RAILWAY_DEPLOY.md](../observability/grafana/RAILWAY_DEPLOY.md) - Deploy Railway

## 🎉 Parabéns!

Frontend deployado com sucesso! 🚀

Agora é só configurar a observabilidade seguindo os passos acima.
