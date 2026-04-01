# Configuração do Prometheus no Railway

## Como funciona a integração

### 1. Backend expõe métricas

O backend NestJS já está configurado para expor métricas Prometheus através do endpoint `/metrics`. Quando você acessa esse endpoint, recebe um texto no formato Prometheus com todas as métricas:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/prompts",status_code="200"} 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/prompts",status_code="200",le="0.01"} 10
```

### 2. Prometheus faz scraping

O Prometheus é um **servidor separado** que periodicamente (ex: a cada 15 segundos) faz requisições HTTP para o endpoint `/metrics` do seu backend e armazena os dados.

### 3. Visualização

- **Prometheus UI**: Interface web simples para consultar e visualizar métricas
- **Grafana** (recomendado): Dashboard avançado com gráficos bonitos e alertas

## Opções de configuração no Railway

### Opção 1: Railway Observability (Recomendado para produção)

O Railway tem observabilidade integrada, mas é um recurso pago:

1. Acesse o projeto no Railway
2. Vá em **Observability** no menu lateral
3. Ative o recurso (custo adicional)
4. Railway automaticamente coleta métricas do seu serviço

**Vantagens**:
- Zero configuração
- Integrado ao Railway
- Visualização nativa

**Desvantagens**:
- Custo adicional
- Menos flexível que Prometheus próprio

### Opção 2: Prometheus externo (Gratuito, requer setup)

Rode o Prometheus em outro lugar e configure para fazer scraping do seu backend Railway.

#### 2.1. Verificar se o endpoint está acessível

Primeiro, verifique se o endpoint `/metrics` está funcionando:

```bash
curl https://seu-backend-railway.up.railway.app/metrics
```

Se não estiver acessível externamente, você precisa garantir que:
- A porta está exposta
- Não há autenticação bloqueando o endpoint `/metrics`

#### 2.2. Configurar Prometheus local

1. Crie um arquivo `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'promptzero-backend'
    metrics_path: '/metrics'
    scheme: 'https'
    static_configs:
      - targets: ['seu-backend-railway.up.railway.app']
```

2. Rode o Prometheus com Docker:

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

3. Acesse o Prometheus UI: `http://localhost:9090`

#### 2.3. Adicionar Grafana (opcional, mas recomendado)

1. Rode o Grafana:

```bash
docker run -d \
  --name grafana \
  -p 3030:3000 \
  grafana/grafana
```

2. Acesse: `http://localhost:3030` (usuário: `admin`, senha: `admin`)

3. Adicione o Prometheus como data source:
   - **URL**: `http://prometheus:9090` (se estiver no mesmo network Docker)
   - Ou `http://host.docker.internal:9090` (no Mac/Windows)

4. Importe dashboards prontos:
   - Node.js Application Monitoring (Dashboard ID: 11159)
   - NestJS Monitoring (Dashboard ID: 15489)

### Opção 3: Serviço Prometheus gerenciado

Use um serviço SaaS que faz scraping remoto:

#### Grafana Cloud (tem free tier)

1. Crie conta em https://grafana.com/
2. Configure um Prometheus Agent para fazer scraping do seu Railway backend
3. Visualize no Grafana Cloud

#### Datadog, New Relic, etc.

Esses serviços têm integrações nativas com métricas Prometheus.

## Configuração das variáveis no Railway

No Railway, configure as seguintes variáveis de ambiente para o backend:

```bash
# Habilitar métricas (já é o padrão)
METRICS_ENABLED=true

# Path do endpoint de métricas
METRICS_PATH=/metrics
```

### Importante: Permitir acesso público ao /metrics

O endpoint `/metrics` precisa estar acessível sem autenticação para o Prometheus fazer scraping.

**Opção A**: Endpoint totalmente público (simples, mas menos seguro)
- Deixe o endpoint aberto
- Use rate limiting para prevenir abuse
- Já está configurado assim no seu backend

**Opção B**: Autenticação no Prometheus
- Configure o Prometheus para enviar um Bearer token ou Basic Auth
- Adicione middleware no NestJS para validar esse token no endpoint `/metrics`

**Opção C**: IP whitelist
- Configure o Railway para aceitar requisições ao `/metrics` apenas de IPs específicos
- Configure o Prometheus nesse IP permitido

## Testando o endpoint

### 1. Verificar se está funcionando localmente

```bash
# Rode o backend
yarn start:dev

# Em outro terminal
curl http://localhost:3001/metrics
```

Você deve ver algo como:

```
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123456

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/prompts",status_code="200",service="promptzero-backend",env="development"} 5
```

### 2. Verificar no Railway

Depois do deploy:

```bash
curl https://prompt-zero-backend-production-xxxx.up.railway.app/metrics
```

## Métricas disponíveis

### Métricas padrão do Node.js

- `process_cpu_*`: Uso de CPU
- `process_heap_*`: Memória heap
- `process_resident_memory_bytes`: Memória total
- `nodejs_eventloop_lag_*`: Event loop lag
- `nodejs_gc_*`: Garbage collector

### Métricas HTTP customizadas

- `http_requests_total`: Total de requisições (labels: method, route, status_code)
- `http_request_duration_seconds`: Duração das requisições em segundos

### Labels padrão

Todas as métricas incluem:
- `service`: "promptzero-backend"
- `env`: "development" ou "production"

## Queries úteis no Prometheus

### Taxa de requisições por segundo

```promql
rate(http_requests_total[5m])
```

### Requisições por rota

```promql
sum by (route) (http_requests_total)
```

### Latência P95

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

### Erro rate (status 5xx)

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

## Criando métricas customizadas

Se você quiser adicionar novas métricas, injete no seu service:

```typescript
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MyService {
  constructor(
    @InjectMetric('my_custom_counter')
    private readonly myCounter: Counter,
  ) {}

  doSomething() {
    this.myCounter.inc(); // Incrementa o contador
  }
}
```

E registre no `metrics.module.ts`:

```typescript
makeCounterProvider({
  name: 'my_custom_counter',
  help: 'Description of my counter',
  labelNames: ['label1', 'label2'],
})
```

## Docker Compose para Prometheus + Grafana local

Se quiser testar localmente com stack completa:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

## Troubleshooting

### Endpoint /metrics retorna 404

- Verifique se `METRICS_ENABLED=true`
- Verifique se o `MetricsModule` está importado no `AppModule`

### Métricas não aparecem

- Faça algumas requisições para o backend primeiro
- Métricas são coletadas conforme o uso

### Prometheus não consegue fazer scraping

- Verifique se o endpoint está acessível publicamente
- Verifique se não há autenticação bloqueando
- Verifique logs do Prometheus: `docker logs prometheus`

### Performance

- O endpoint `/metrics` é leve, mas se você tiver muitas métricas, pode adicionar cache
- Configure `scrape_interval` no Prometheus (15s é o padrão)

## Próximos passos recomendados

1. **Alertas**: Configure alertas no Prometheus/Grafana para erro rates, latência alta, etc.
2. **Dashboards**: Crie dashboards customizados com métricas de negócio
3. **Retenção**: Configure retenção de dados no Prometheus (padrão: 15 dias)
4. **Backup**: Configure backup das métricas se for crítico

## Referências

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [@willsoto/nestjs-prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
