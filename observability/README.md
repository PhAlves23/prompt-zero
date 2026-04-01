# Observability Stack - PromptZero

Stack completa de observabilidade com **Prometheus**, **Loki**, **Tempo** e **Grafana**.

## 🚀 Início Rápido

```bash
# Tornar o script executável
chmod +x observability/start-observability.sh

# Iniciar a stack
./observability/start-observability.sh
```

## 📋 Serviços Incluídos

| Serviço | Descrição | Porta | URL |
|---------|-----------|-------|-----|
| **Prometheus** | Coleta e armazenamento de métricas | 9090 | http://localhost:9090 |
| **Loki** | Agregação de logs | 3100 | http://localhost:3100 |
| **Tempo** | Distributed tracing | 3200, 4317, 4318 | http://localhost:3200 |
| **Grafana** | Visualização e dashboards | 3300 | http://localhost:3300 |
| **OTel Collector** | Coletor OpenTelemetry | 4319, 8888 | http://localhost:4319 |

## 🔧 Configuração do Backend

Adicione as seguintes variáveis ao seu `backend/.env`:

```bash
# Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://localhost:4318

# Logs
LOKI_ENABLED=true
LOKI_ENDPOINT=http://localhost:3100
LOG_LEVEL=debug

# Métricas
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

## 📊 Acessando o Grafana

1. Abra http://localhost:3300
2. Login: `admin` / `admin`
3. Navegue para **Dashboards** → **PromptZero Backend Overview**

### Datasources Pré-configuradas

Todas as datasources já estão configuradas automaticamente:
- ✅ Prometheus
- ✅ Loki
- ✅ Tempo

Com correlação automática entre métricas, logs e traces!

## 💻 Comandos Úteis

### Iniciar a stack
```bash
docker-compose -f docker-compose.observability.yml up -d
```

### Parar a stack
```bash
docker-compose -f docker-compose.observability.yml down
```

### Parar e remover volumes (limpar dados)
```bash
docker-compose -f docker-compose.observability.yml down -v
```

### Ver logs dos serviços
```bash
# Todos os serviços
docker-compose -f docker-compose.observability.yml logs -f

# Serviço específico
docker-compose -f docker-compose.observability.yml logs -f prometheus
docker-compose -f docker-compose.observability.yml logs -f loki
docker-compose -f docker-compose.observability.yml logs -f tempo
docker-compose -f docker-compose.observability.yml logs -f grafana
```

### Verificar status
```bash
docker-compose -f docker-compose.observability.yml ps
```

### Verificar saúde dos endpoints
```bash
# Prometheus
curl http://localhost:9090/-/healthy

# Loki
curl http://localhost:3100/ready

# Tempo
curl http://localhost:3200/ready

# Grafana
curl http://localhost:3300/api/health
```

## 📁 Estrutura de Arquivos

```
observability/
├── prometheus/
│   └── prometheus.yml              # Config do Prometheus
├── loki/
│   └── loki-config.yml             # Config do Loki
├── tempo/
│   └── tempo-config.yml            # Config do Tempo
├── otel-collector/
│   └── otel-collector-config.yml   # Config do OTel Collector
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml     # Datasources auto-provisionadas
│   │   └── dashboards/
│   │       └── dashboards.yml      # Config de dashboards
│   └── dashboards/
│       └── backend-overview.json   # Dashboard principal
└── start-observability.sh          # Script de início rápido
```

## 🔍 Exemplos de Queries

### Prometheus (Métricas)

```promql
# Taxa de requisições por segundo
rate(http_requests_total{job="promptzero-backend"}[5m])

# P95 de latência
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Taxa de erros
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

### Loki (Logs)

```logql
# Todos os logs do backend
{service="promptzero-backend"}

# Logs de erro
{service="promptzero-backend"} |= "ERROR"

# Logs com filtro JSON
{service="promptzero-backend"} | json | level="error"

# Logs por traceId
{service="promptzero-backend"} | json | traceId="abc123"
```

### Tempo (Traces)

```traceql
# Traces do backend
{service.name="promptzero-backend"}

# Traces com erro
{service.name="promptzero-backend" && status=error}

# Traces lentos (>500ms)
{service.name="promptzero-backend" && duration>500ms}

# Traces de um endpoint específico
{service.name="promptzero-backend" && http.route="/api/v1/prompts"}
```

## 🎯 Fluxo de Dados

```
Backend (NestJS)
    │
    ├─→ Métricas (/api/metrics) ─→ Prometheus (scrape)
    │
    ├─→ Logs (HTTP) ─→ Loki
    │
    └─→ Traces (OTLP) ─→ Tempo
                          │
                   (opcional via)
                          │
                    OTel Collector
                          │
                    ├→ Tempo
                    ├→ Loki
                    └→ Prometheus

        Grafana consulta todos e correlaciona!
```

## 🐛 Troubleshooting

### Problema: Traces não aparecem no Tempo

**Soluções**:
1. Verifique se o backend está enviando traces:
   ```bash
   # Deve mostrar "Tracing initialized"
   docker logs promptzero-backend | grep -i trace
   ```

2. Verifique conectividade:
   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   ```

3. Verifique logs do Tempo:
   ```bash
   docker logs tempo
   ```

### Problema: Logs não aparecem no Loki

**Soluções**:
1. Teste o endpoint do Loki:
   ```bash
   curl http://localhost:3100/ready
   ```

2. Verifique se logs estão sendo enviados:
   ```bash
   docker logs promptzero-backend | grep -i loki
   ```

3. Verifique configuração `LOKI_ENABLED=true` no `.env`

### Problema: Métricas não aparecem no Prometheus

**Soluções**:
1. Teste o endpoint de métricas do backend:
   ```bash
   curl http://localhost:3001/api/metrics
   ```

2. Verifique targets no Prometheus:
   - Acesse http://localhost:9090/targets
   - O target `promptzero-backend` deve estar "UP"

3. Verifique se o backend está acessível:
   ```bash
   # De dentro do container do Prometheus
   docker exec prometheus wget -O- http://host.docker.internal:3001/api/metrics
   ```

### Problema: Grafana não conecta às datasources

**Soluções**:
1. Verifique conectividade entre containers:
   ```bash
   docker exec grafana curl http://prometheus:9090/-/healthy
   docker exec grafana curl http://loki:3100/ready
   docker exec grafana curl http://tempo:3200/ready
   ```

2. Verifique se os containers estão na mesma rede:
   ```bash
   docker network inspect observability_observability
   ```

3. Reinicie o Grafana:
   ```bash
   docker-compose -f docker-compose.observability.yml restart grafana
   ```

## 📚 Documentação Completa

Para documentação detalhada, incluindo uso no código, configuração em produção e exemplos avançados, consulte:

👉 **[docs/OBSERVABILIDADE.md](../docs/OBSERVABILIDADE.md)**

## 🔗 Links Úteis

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)

## 🎓 Exemplos de Uso no Código

### Log com Contexto

```typescript
import { ObservabilityService } from './observability/observability.service';

@Injectable()
export class MyService {
  constructor(private readonly obs: ObservabilityService) {}

  async myMethod() {
    this.obs.info('Processing request', { userId: 123 });
  }
}
```

### Trace Customizado

```typescript
import { Trace } from './observability/decorators/trace.decorator';

@Injectable()
export class MyService {
  @Trace('MyService.expensiveOperation')
  async expensiveOperation() {
    // Automaticamente cria span
  }
}
```

Mais exemplos em: [docs/OBSERVABILIDADE.md](../docs/OBSERVABILIDADE.md)
