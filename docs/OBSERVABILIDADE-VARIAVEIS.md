# Variáveis de Ambiente - Observabilidade

Guia completo de todas as variáveis de ambiente necessárias para a stack de observabilidade.

## 📋 Variáveis Obrigatórias

### Tracing (OpenTelemetry + Tempo)

```bash
# Habilitar tracing
TRACING_ENABLED=true

# Identificação do serviço
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0

# Endpoint do Tempo (onde enviar traces)
# Local:
TEMPO_ENDPOINT=http://localhost:4318
# Produção (Railway):
TEMPO_ENDPOINT=http://tempo.railway.internal:4318
# Grafana Cloud:
TEMPO_ENDPOINT=https://tempo-prod-XX-prod-XX-XXXXX.grafana.net:443
```

### Logs (Loki)

```bash
# Habilitar envio de logs para Loki
LOKI_ENABLED=true

# Endpoint do Loki
# Local:
LOKI_ENDPOINT=http://localhost:3100
# Produção (Railway):
LOKI_ENDPOINT=http://loki.railway.internal:3100
# Grafana Cloud:
LOKI_ENDPOINT=https://logs-prod-XXX.grafana.net

# Nível de log
LOG_LEVEL=info  # ou: debug, warn, error
```

### Métricas (Prometheus)

```bash
# Habilitar endpoint de métricas
METRICS_ENABLED=true

# Caminho do endpoint (padrão: /metrics)
METRICS_PATH=/metrics
```

---

## 🔐 Variáveis de Autenticação (Grafana Cloud)

Se você estiver usando Grafana Cloud, adicione também:

### Autenticação Tempo

```bash
TEMPO_USERNAME=XXXXXX
TEMPO_PASSWORD=glc_XXXXXXXXXXXXXXXXXX
```

### Autenticação Loki

```bash
LOKI_USERNAME=XXXXXX
LOKI_PASSWORD=glc_XXXXXXXXXXXXXXXXXX
```

---

## 📝 Variáveis Opcionais

### OpenTelemetry Collector (Opcional)

Se você estiver usando o OTel Collector como intermediário:

```bash
# Endpoint do OTel Collector (OTLP HTTP)
PROMETHEUS_OTLP_ENDPOINT=http://localhost:4318
# ou em produção:
PROMETHEUS_OTLP_ENDPOINT=http://otel-collector.railway.internal:4318
```

### Configurações Avançadas

```bash
# Ambiente de deployment (afeta correlação de dados)
NODE_ENV=development  # ou: production, staging

# Sampling de traces (reduzir volume em produção)
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% dos traces
```

---

## 🌍 Exemplos por Ambiente

### Desenvolvimento Local

```bash
# .env
PORT=3001
NODE_ENV=development

# Observabilidade - Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://localhost:4318

# Observabilidade - Logs
LOKI_ENABLED=true
LOKI_ENDPOINT=http://localhost:3100
LOG_LEVEL=debug

# Observabilidade - Métricas
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### Staging/Produção (Railway - Self-Hosted)

```bash
PORT=3001
NODE_ENV=production

# Observabilidade - Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://tempo.railway.internal:4318

# Observabilidade - Logs
LOKI_ENABLED=true
LOKI_ENDPOINT=http://loki.railway.internal:3100
LOG_LEVEL=warn

# Observabilidade - Métricas
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### Produção (Railway + Grafana Cloud)

```bash
PORT=3001
NODE_ENV=production

# Observabilidade - Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.2.0
TEMPO_ENDPOINT=https://tempo-prod-10-prod-us-east-0.grafana.net:443
TEMPO_USERNAME=123456
TEMPO_PASSWORD=glc_eyJrIjoiXXXXXXXXXXXXXXXXXXXX

# Observabilidade - Logs
LOKI_ENABLED=true
LOKI_ENDPOINT=https://logs-prod-006.grafana.net
LOKI_USERNAME=123456
LOKI_PASSWORD=glc_eyJrIjoiXXXXXXXXXXXXXXXXXXXX
LOG_LEVEL=warn

# Observabilidade - Métricas
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

---

## ✅ Checklist de Configuração

### Desenvolvimento Local

- [ ] Docker Compose rodando (`docker-compose -f docker-compose.observability.yml up -d`)
- [ ] `TRACING_ENABLED=true`
- [ ] `TEMPO_ENDPOINT=http://localhost:4318`
- [ ] `LOKI_ENABLED=true`
- [ ] `LOKI_ENDPOINT=http://localhost:3100`
- [ ] `METRICS_ENABLED=true`
- [ ] Backend rodando (`yarn start:dev`)
- [ ] Grafana acessível (http://localhost:3300)
- [ ] Métricas acessíveis (http://localhost:3001/api/metrics)

### Produção (Railway)

#### Opção A: Self-Hosted

- [ ] Services criados no Railway (Prometheus, Loki, Tempo, Grafana)
- [ ] Variáveis configuradas no Backend Service
- [ ] `TEMPO_ENDPOINT=http://tempo.railway.internal:4318`
- [ ] `LOKI_ENDPOINT=http://loki.railway.internal:3100`
- [ ] `METRICS_ENABLED=true`
- [ ] Prometheus configurado para scrape do backend
- [ ] Datasources configuradas no Grafana
- [ ] Health checks passando

#### Opção B: Grafana Cloud

- [ ] Conta criada no Grafana Cloud
- [ ] Credenciais copiadas (Tempo, Loki, Prometheus)
- [ ] Variáveis configuradas no Railway
- [ ] `TEMPO_ENDPOINT` apontando para Grafana Cloud
- [ ] `TEMPO_USERNAME` e `TEMPO_PASSWORD` configurados
- [ ] `LOKI_ENDPOINT` apontando para Grafana Cloud
- [ ] `LOKI_USERNAME` e `LOKI_PASSWORD` configurados
- [ ] Código atualizado com autenticação (ver `docs/OBSERVABILIDADE-RAILWAY.md`)
- [ ] Deploy realizado
- [ ] Logs aparecendo no Grafana Cloud
- [ ] Traces aparecendo no Grafana Cloud

---

## 🔍 Validação

### Verificar Variáveis Localmente

```bash
cd backend
source .env
echo "Tracing: $TRACING_ENABLED"
echo "Tempo: $TEMPO_ENDPOINT"
echo "Loki: $LOKI_ENDPOINT"
echo "Metrics: $METRICS_ENABLED"
```

### Verificar Variáveis no Railway

```bash
railway variables
# ou via Railway Dashboard
```

### Testar Conectividade

```bash
# Tempo
curl -X POST $TEMPO_ENDPOINT/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'

# Loki
curl $LOKI_ENDPOINT/ready

# Métricas (local)
curl http://localhost:3001/api/metrics
```

---

## 🐛 Troubleshooting

### Erro: "TEMPO_ENDPOINT not configured"

**Causa**: Variável `TEMPO_ENDPOINT` não está definida.

**Solução**: Adicione no `.env`:
```bash
TEMPO_ENDPOINT=http://localhost:4318
```

### Erro: "Loki connection error"

**Causa**: Loki não está acessível ou URL incorreta.

**Solução**:
1. Verifique se Loki está rodando: `docker ps | grep loki`
2. Teste conectividade: `curl http://localhost:3100/ready`
3. Verifique a URL no `.env`

### Erro: "Failed to export traces"

**Causa**: Tempo não está acessível ou autenticação incorreta (Grafana Cloud).

**Solução**:
1. Verifique o endpoint: `curl -X POST $TEMPO_ENDPOINT/v1/traces`
2. Se Grafana Cloud, verifique username/password
3. Veja logs do backend para detalhes

### Métricas não aparecem no Prometheus

**Causa**: Prometheus não consegue fazer scrape do backend.

**Solução**:
1. Teste o endpoint: `curl http://localhost:3001/api/metrics`
2. Verifique configuração de targets no Prometheus
3. Se Docker, use `host.docker.internal:3001` no `prometheus.yml`

---

## 📚 Referências

- [Documentação Completa](./OBSERVABILIDADE.md)
- [Exemplos de Uso](./OBSERVABILIDADE-EXEMPLO.md)
- [Deploy no Railway](./OBSERVABILIDADE-RAILWAY.md)

---

## 🔗 Links Rápidos

- **Grafana Cloud**: https://grafana.com/
- **OpenTelemetry**: https://opentelemetry.io/
- **Railway**: https://railway.app/
- **Prometheus**: https://prometheus.io/
- **Loki**: https://grafana.com/oss/loki/
- **Tempo**: https://grafana.com/oss/tempo/
