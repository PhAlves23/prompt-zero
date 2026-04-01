# Guia Rápido: Prometheus + Grafana

Este guia mostra como visualizar as métricas do backend usando Prometheus e Grafana.

## 1. Iniciar o backend

```bash
cd backend
yarn start:dev
```

O backend estará rodando em `http://localhost:3001` e expondo métricas em `http://localhost:3001/metrics`.

## 2. Testar o endpoint de métricas

Abra o navegador ou use curl:

```bash
curl http://localhost:3001/metrics
```

Você verá algo assim:

```
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123456

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/prompts",status_code="200",service="promptzero-backend",env="development"} 5
```

## 3. Iniciar Prometheus + Grafana

Na raiz do projeto:

```bash
docker compose -f docker-compose.prometheus.yml up -d
```

Isso vai iniciar:
- **Prometheus** na porta `9090`
- **Grafana** na porta `3030`

## 4. Acessar o Prometheus

Abra: `http://localhost:9090`

### Testando queries no Prometheus

No menu superior, clique em "Graph" e teste essas queries:

**Taxa de requisições por segundo:**
```promql
rate(http_requests_total[5m])
```

**Requisições por rota:**
```promql
sum by (route) (http_requests_total)
```

**Latência P95:**
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**Uso de memória:**
```promql
process_resident_memory_bytes
```

## 5. Acessar o Grafana

Abra: `http://localhost:3030`

- **Usuário:** `admin`
- **Senha:** `admin`

### Dashboard automático

O Grafana já vem configurado com:
1. Data source Prometheus conectado
2. Dashboard "PromptZero Backend Metrics"

Para acessar o dashboard:
1. Clique no menu hamburguer (☰) no canto superior esquerdo
2. Clique em "Dashboards"
3. Selecione "PromptZero Backend Metrics"

### O que você verá no dashboard

- **Request Rate**: Taxa de requisições por segundo por rota
- **Request Duration P95**: Latência percentil 95 por rota
- **HTTP Status Codes**: Distribuição de status HTTP
- **Error Rate**: Taxa de erros 5xx
- **Memory Usage**: Uso de memória do processo Node.js
- **Event Loop Lag**: Latência do event loop (importante para performance)
- **Top 10 Slowest Routes**: Rotas mais lentas
- **Request Count by Route**: Total de requisições por rota

## 6. Gerar tráfego para ver métricas

Faça algumas requisições ao backend:

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get prompts
curl http://localhost:3001/api/v1/prompts \
  -H "Authorization: Bearer SEU_TOKEN"

# Analytics
curl http://localhost:3001/api/v1/analytics/overview?period=7d \
  -H "Authorization: Bearer SEU_TOKEN"
```

Depois de alguns segundos (15s de scrape interval), as métricas aparecerão no Grafana.

## 7. Parar os containers

```bash
docker compose -f docker-compose.prometheus.yml down
```

Para remover os dados também:

```bash
docker compose -f docker-compose.prometheus.yml down -v
```

## Configurando para Railway (Produção)

### Opção 1: Prometheus local fazendo scraping do Railway

1. No arquivo `prometheus.yml`, descomente e edite:

```yaml
- job_name: 'promptzero-backend-production'
  metrics_path: '/metrics'
  scheme: 'https'
  static_configs:
    - targets: ['seu-backend.up.railway.app']
      labels:
        env: 'production'
        service: 'backend'
```

2. Reinicie o Prometheus:

```bash
docker compose -f docker-compose.prometheus.yml restart prometheus
```

3. No Grafana, você verá métricas de desenvolvimento (local) e produção (Railway) juntas

### Opção 2: Grafana Cloud

1. Crie conta gratuita em https://grafana.com/
2. Configure um Prometheus Agent para fazer scraping remoto
3. Use o Grafana Cloud para visualização

Veja mais detalhes em: `docs/PROMETHEUS-RAILWAY.md`

## Troubleshooting

### Prometheus não está coletando métricas

1. Verifique se o backend está rodando:
   ```bash
   curl http://localhost:3001/metrics
   ```

2. Verifique os targets no Prometheus:
   - Abra `http://localhost:9090`
   - Vá em "Status" > "Targets"
   - Deve mostrar o target `promptzero-backend-local` como "UP"

3. Se estiver "DOWN", verifique:
   - Se você está no Mac/Windows, o `host.docker.internal` deve funcionar
   - No Linux, use `172.17.0.1` ou `--network host`

### Grafana não mostra dados

1. Verifique se o data source está conectado:
   - Vá em "Configuration" > "Data sources"
   - Clique em "Prometheus"
   - Clique em "Test" - deve mostrar "Data source is working"

2. Verifique se há dados no Prometheus:
   - Abra `http://localhost:9090`
   - Faça uma query simples: `up`
   - Deve retornar dados

3. Ajuste o time range no Grafana:
   - No canto superior direito, clique no seletor de tempo
   - Escolha "Last 5 minutes" ou "Last 15 minutes"

### Dashboard está vazio

1. Gere tráfego no backend fazendo requisições
2. Aguarde 15-30 segundos para o Prometheus fazer scraping
3. Recarregue o dashboard no Grafana

## Queries úteis

### Performance

```promql
# Requisições mais lentas (P99)
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Taxa de throughput total
sum(rate(http_requests_total[5m]))

# Requisições por método HTTP
sum by (method) (rate(http_requests_total[5m]))
```

### Erros

```promql
# Taxa de erro 4xx
sum(rate(http_requests_total{status_code=~"4.."}[5m]))

# Taxa de erro 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m]))

# Percentual de erros
sum(rate(http_requests_total{status_code=~"[45].."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### Sistema

```promql
# Uso de CPU
rate(process_cpu_user_seconds_total[5m]) * 100

# Heap usado
nodejs_heap_size_used_bytes

# Event loop lag (alerta se > 100ms)
nodejs_eventloop_lag_seconds > 0.1
```

## Criando alertas

No Prometheus, você pode criar regras de alerta. Exemplo:

```yaml
# alerts.yml
groups:
  - name: promptzero
    interval: 10s
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"
```

Configure o Alertmanager para enviar notificações (Slack, email, etc).

## Recursos adicionais

- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [PromQL Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Node.js Monitoring Best Practices](https://prometheus.io/docs/guides/nodejs/)
