# Deploy de Observabilidade no Railway

Guia passo a passo para configurar a stack de observabilidade no Railway.

## 🎯 Opções de Deploy

Você tem duas opções principais:

1. **Grafana Cloud (Recomendado)** - Serviços gerenciados, mais fácil e escalável
2. **Self-Hosted no Railway** - Mais controle, mas requer mais configuração

---

## 🌟 Opção 1: Grafana Cloud (Recomendado)

Esta é a opção mais simples e escalável para produção.

### Passo 1: Criar Conta no Grafana Cloud

1. Acesse https://grafana.com/auth/sign-up/create-user
2. Crie uma conta gratuita (inclui 50GB de logs, 10k séries de métricas, 50GB de traces)
3. Acesse o Grafana Cloud Portal

### Passo 2: Obter Credenciais

#### Prometheus (Métricas)

1. No Grafana Cloud Portal → Prometheus → "Send Metrics"
2. Copie as credenciais:
   ```
   URL: https://prometheus-prod-XX-prod-XX-XXXXX.grafana.net/api/prom/push
   User: XXXXXX
   Password: glc_XXXXXXXXXXXXXXXXXX
   ```

#### Loki (Logs)

1. No Grafana Cloud Portal → Loki → "Send Logs"
2. Copie as credenciais:
   ```
   URL: https://logs-prod-XXX.grafana.net
   User: XXXXXX
   Password: glc_XXXXXXXXXXXXXXXXXX
   ```

#### Tempo (Traces)

1. No Grafana Cloud Portal → Tempo → "Send Traces"
2. Copie as credenciais:
   ```
   Endpoint: https://tempo-prod-XX-prod-XX-XXXXX.grafana.net:443
   ```

### Passo 3: Configurar Variáveis no Railway

No seu serviço Backend no Railway, adicione as seguintes variáveis:

```bash
# Observabilidade - Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
NODE_ENV=production

# Tempo (Grafana Cloud)
TEMPO_ENDPOINT=https://tempo-prod-XX-prod-XX-XXXXX.grafana.net:443
TEMPO_USERNAME=XXXXXX
TEMPO_PASSWORD=glc_XXXXXXXXXXXXXXXXXX

# Loki (Grafana Cloud)
LOKI_ENABLED=true
LOKI_ENDPOINT=https://logs-prod-XXX.grafana.net
LOKI_USERNAME=XXXXXX
LOKI_PASSWORD=glc_XXXXXXXXXXXXXXXXXX
LOG_LEVEL=warn

# Métricas (Prometheus scrape continua funcionando via /api/metrics)
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### Passo 4: Atualizar Código para Grafana Cloud

Crie um arquivo `backend/src/observability/tracing-cloud.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';

export function initTracingCloud() {
  const tempoEndpoint = process.env.TEMPO_ENDPOINT;
  const tempoUsername = process.env.TEMPO_USERNAME;
  const tempoPassword = process.env.TEMPO_PASSWORD;

  if (!tempoEndpoint) {
    console.warn('TEMPO_ENDPOINT not configured, skipping tracing');
    return;
  }

  const serviceName = process.env.SERVICE_NAME || 'promptzero-backend';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'production';

  // Encode credentials for Basic Auth
  const auth = tempoUsername && tempoPassword
    ? Buffer.from(`${tempoUsername}:${tempoPassword}`).toString('base64')
    : undefined;

  const traceExporter = new OTLPTraceExporter({
    url: `${tempoEndpoint}/v1/traces`,
    headers: auth ? { Authorization: `Basic ${auth}` } : {},
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('✅ OpenTelemetry tracing initialized (Grafana Cloud)');

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}
```

Atualize `backend/src/observability/logger.ts` para autenticação no Loki:

```typescript
if (lokiEnabled) {
  const lokiUsername = process.env.LOKI_USERNAME;
  const lokiPassword = process.env.LOKI_PASSWORD;

  const auth = lokiUsername && lokiPassword
    ? Buffer.from(`${lokiUsername}:${lokiPassword}`).toString('base64')
    : undefined;

  transports.push(
    new LokiTransport({
      host: lokiUrl,
      headers: auth ? { Authorization: `Basic ${auth}` } : {},
      labels: {
        service: serviceName,
        environment,
      },
      json: true,
      format: defaultFormat,
      replaceTimestamp: true,
      onConnectionError: (err) => {
        console.error('Loki connection error:', err);
      },
    }),
  );
}
```

Atualize `backend/src/main.ts`:

```typescript
import { initTracingCloud } from './observability/tracing-cloud';

const tracingEnabled = process.env.TRACING_ENABLED === 'true';
if (tracingEnabled) {
  logger.info('Initializing OpenTelemetry tracing...');
  initTracingCloud();
}
```

### Passo 5: Deploy e Verificar

1. Commit e push as mudanças
2. O Railway fará o deploy automaticamente
3. Acesse o Grafana Cloud e verifique:
   - **Explore → Loki**: Veja os logs chegando
   - **Explore → Tempo**: Veja os traces
   - **Explore → Prometheus**: Métricas (se configurado remote write)

### Passo 6: Criar Dashboards

No Grafana Cloud:
1. Crie um novo dashboard
2. Adicione os painéis usando as queries do exemplo
3. Configure alertas para métricas críticas

---

## 🏗️ Opção 2: Self-Hosted no Railway

Para hospedar Prometheus, Loki e Tempo no próprio Railway.

### Passo 1: Criar Services no Railway

#### Service 1: Prometheus

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.prometheus"

[deploy]
startCommand = "/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus"
healthcheckPath = "/-/healthy"
healthcheckTimeout = 300
```

```dockerfile
# Dockerfile.prometheus
FROM prom/prometheus:latest
COPY observability/prometheus/prometheus.yml /etc/prometheus/prometheus.yml
```

**Variáveis**:
- `PROMETHEUS_RETENTION_TIME`: `15d` (retenção de 15 dias)

#### Service 2: Loki

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.loki"

[deploy]
startCommand = "/usr/bin/loki -config.file=/etc/loki/local-config.yaml"
healthcheckPath = "/ready"
healthcheckTimeout = 300
```

```dockerfile
# Dockerfile.loki
FROM grafana/loki:latest
COPY observability/loki/loki-config.yml /etc/loki/local-config.yaml
```

#### Service 3: Tempo

```yaml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.tempo"

[deploy]
startCommand = "/tempo -config.file=/etc/tempo/config.yml"
healthcheckPath = "/ready"
healthcheckTimeout = 300
```

```dockerfile
# Dockerfile.tempo
FROM grafana/tempo:latest
COPY observability/tempo/tempo-config.yml /etc/tempo/config.yml
```

#### Service 4: Grafana

Template disponível no Railway: "Grafana"

**Variáveis**:
```bash
GF_SECURITY_ADMIN_PASSWORD=seu_password_seguro
GF_SERVER_ROOT_URL=https://seu-grafana.railway.app
```

### Passo 2: Configurar Networking

No Railway, configure as URLs privadas:

```bash
# Backend Service
TEMPO_ENDPOINT=http://tempo.railway.internal:4318
LOKI_ENDPOINT=http://loki.railway.internal:3100
PROMETHEUS_URL=http://prometheus.railway.internal:9090
```

### Passo 3: Configurar Prometheus para Scrape

Atualize `observability/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'promptzero-backend'
    scrape_interval: 15s
    static_configs:
      - targets: ['backend.railway.internal:3001']
    metrics_path: '/api/metrics'
    scheme: http
```

### Passo 4: Configurar Datasources no Grafana

No Grafana (manual ou via provisioning):

1. **Prometheus**:
   - URL: `http://prometheus.railway.internal:9090`
   
2. **Loki**:
   - URL: `http://loki.railway.internal:3100`
   
3. **Tempo**:
   - URL: `http://tempo.railway.internal:3200`

### Passo 5: Persistência (Volumes)

⚠️ **Importante**: Railway não tem volumes persistentes nativamente.

Opções:
1. **AWS S3/GCS**: Configure Loki e Tempo para usar object storage
2. **Railway Volumes**: Use volumes (beta) se disponível
3. **Aceite volatilidade**: Para staging/dev

---

## 📊 Verificação Pós-Deploy

### Health Checks

```bash
# Prometheus
curl https://seu-prometheus.railway.app/-/healthy

# Loki
curl https://seu-loki.railway.app/ready

# Tempo
curl https://seu-tempo.railway.app/ready

# Backend metrics
curl https://seu-backend.railway.app/api/metrics
```

### Teste de Logs

```bash
# Ver últimos logs no Grafana
# Explore → Loki
{service="promptzero-backend"} | json
```

### Teste de Traces

```bash
# Fazer uma requisição ao backend
curl https://seu-backend.railway.app/api/v1/prompts

# Ver traces no Grafana
# Explore → Tempo
{service.name="promptzero-backend"}
```

---

## 🚨 Alertas Recomendados

### Prometheus Alerting Rules

```yaml
# observability/prometheus/alerts.yml
groups:
  - name: backend_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) / 
          rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_ms_bucket[5m])
          ) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}ms"

      - alert: ServiceDown
        expr: up{job="promptzero-backend"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Backend service is down"
```

### Grafana Alert Rules

Configure no Grafana UI:
1. **Alerting → Alert rules → New alert rule**
2. Use as queries acima
3. Configure notificações (Slack, Discord, Email, PagerDuty)

---

## 💰 Custos Estimados

### Grafana Cloud (Free Tier)
- ✅ Até 50GB de logs/mês
- ✅ Até 10k séries de métricas
- ✅ Até 50GB de traces/mês
- ✅ 14 dias de retenção

**Suficiente para**: Maioria das startups e MVPs

### Self-Hosted no Railway
- Prometheus: ~$5-10/mês (1GB RAM)
- Loki: ~$5-10/mês (1GB RAM)
- Tempo: ~$5-10/mês (1GB RAM)
- Grafana: ~$5/mês (512MB RAM)

**Total**: ~$20-35/mês (sem volumes persistentes)

**Recomendação**: Use Grafana Cloud no free tier primeiro, escale para self-hosted quando necessário.

---

## 🔧 Troubleshooting em Produção

### Logs não aparecem

1. Verifique conectividade:
   ```bash
   railway run -- curl $LOKI_ENDPOINT/ready
   ```

2. Verifique autenticação (se Grafana Cloud)

3. Verifique logs do backend:
   ```bash
   railway logs
   ```

### Traces não aparecem

1. Verifique `TRACING_ENABLED=true`
2. Teste endpoint OTLP:
   ```bash
   curl -X POST $TEMPO_ENDPOINT/v1/traces
   ```

### Métricas não aparecem

1. Verifique endpoint público:
   ```bash
   curl https://seu-backend.railway.app/api/metrics
   ```

2. Verifique target no Prometheus:
   - http://seu-prometheus.railway.app/targets

---

## 📚 Próximos Passos

1. ✅ Configure alertas para erros críticos
2. ✅ Crie dashboards específicos por feature
3. ✅ Configure retenção adequada (custos vs necessidade)
4. ✅ Implemente amostragem de traces (tail sampling) em alta carga
5. ✅ Configure log aggregation rules no Loki para reduzir volume

---

## 🔗 Links Úteis

- [Grafana Cloud Pricing](https://grafana.com/pricing/)
- [Railway Docs](https://docs.railway.app/)
- [OpenTelemetry Best Practices](https://opentelemetry.io/docs/concepts/observability-primer/)
