# Guia Completo de Observabilidade - PromptZero

Este guia documenta a infraestrutura completa de observabilidade implementada no PromptZero, incluindo **Prometheus** (métricas), **Loki** (logs) e **Tempo** (traces distribuídos).

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Variáveis de Ambiente](#variáveis-de-ambiente)
4. [Configuração Local](#configuração-local)
5. [Configuração em Produção](#configuração-em-produção)
6. [Uso no Código](#uso-no-código)
7. [Dashboards e Visualização](#dashboards-e-visualização)
8. [Troubleshooting](#troubleshooting)

## 🔍 Visão Geral

A stack de observabilidade implementada fornece:

- **Prometheus**: Coleta e armazenamento de métricas (CPU, memória, requisições HTTP, etc.)
- **Loki**: Agregação e consulta de logs estruturados
- **Tempo**: Rastreamento distribuído de requisições (distributed tracing)
- **OpenTelemetry**: Instrumentação automática e manual
- **Grafana**: Visualização unificada de métricas, logs e traces

### Benefícios

✅ Correlação automática entre métricas, logs e traces  
✅ Rastreamento end-to-end de requisições  
✅ Logs estruturados com contexto de trace  
✅ Dashboards pré-configurados  
✅ Alertas baseados em métricas  

## 🏗️ Arquitetura

```
┌─────────────┐
│   Backend   │
│  (NestJS)   │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌──────────┐   ┌─────────────┐
│Prometheus│   │OpenTelemetry│
│ (scrape) │   │  Collector  │
└────┬─────┘   └──────┬──────┘
     │                │
     │         ┌──────┼──────┐
     │         │      │      │
     ▼         ▼      ▼      ▼
┌─────────┬─────┬──────┬──────┐
│ Grafana │Tempo│ Loki │Prom. │
└─────────┴─────┴──────┴──────┘
```

### Fluxo de Dados

1. **Métricas**: Backend expõe endpoint `/api/metrics` → Prometheus scrape a cada 15s
2. **Logs**: Backend envia logs via HTTP → Loki armazena e indexa
3. **Traces**: Backend envia spans via OTLP → Tempo ou OTel Collector → Tempo
4. **Visualização**: Grafana consulta todas as fontes e correlaciona dados

## 📝 Variáveis de Ambiente

### Obrigatórias para Observabilidade

```bash
# Tracing (OpenTelemetry + Tempo)
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://localhost:4318

# Logs (Loki)
LOKI_ENABLED=true
LOKI_ENDPOINT=http://localhost:3100
LOG_LEVEL=info

# Métricas (Prometheus) - endpoint de scrape é configurado automaticamente
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### Opcionais

```bash
# OTLP Endpoint para métricas push-based (se usar OTel Collector)
PROMETHEUS_OTLP_ENDPOINT=http://localhost:4318

# Ambiente de deployment
NODE_ENV=development  # ou production, staging
```

### Valores para Produção (Railway/Docker)

```bash
# Tracing
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://tempo:4318  # ou URL externa do Tempo

# Logs
LOKI_ENABLED=true
LOKI_ENDPOINT=http://loki:3100    # ou URL externa do Loki
LOG_LEVEL=warn

# Métricas
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

## 🚀 Configuração Local

### 1. Iniciar Stack de Observabilidade

```bash
# Na raiz do projeto
docker-compose -f docker-compose.observability.yml up -d
```

Isso irá iniciar:
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100
- **Tempo**: http://localhost:3200 (HTTP) e http://localhost:4318 (OTLP)
- **Grafana**: http://localhost:3300 (admin/admin)
- **OTel Collector**: http://localhost:4319 (OTLP HTTP)

### 2. Configurar Variáveis de Ambiente

Copie o `.env.example` para `.env` e configure:

```bash
cd backend
cp .env.example .env
```

Edite o `.env`:

```bash
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://localhost:4318
LOKI_ENABLED=true
LOKI_ENDPOINT=http://localhost:3100
LOG_LEVEL=debug
METRICS_ENABLED=true
```

### 3. Iniciar o Backend

```bash
cd backend
yarn install
yarn start:dev
```

### 4. Acessar Grafana

1. Abra http://localhost:3300
2. Login: `admin` / `admin`
3. As datasources já estão configuradas automaticamente
4. Acesse o dashboard "PromptZero Backend Overview"

## 🌐 Configuração em Produção

### Railway

#### Opção 1: Services no Railway

Adicione os seguintes services no Railway:

1. **Prometheus**:
   - Template: Prometheus
   - Variáveis: `prometheus.yml` via volume ou config

2. **Loki**:
   - Template: Grafana Loki
   - Porta: 3100

3. **Tempo**:
   - Template: Grafana Tempo
   - Portas: 3200 (HTTP), 4318 (OTLP)

4. **Grafana**:
   - Template: Grafana
   - Variáveis:
     - `GF_SECURITY_ADMIN_PASSWORD`: sua senha
   - Porta: 3000

Configure as variáveis no Backend Service:

```bash
TRACING_ENABLED=true
TEMPO_ENDPOINT=http://tempo.railway.internal:4318
LOKI_ENABLED=true
LOKI_ENDPOINT=http://loki.railway.internal:3100
METRICS_ENABLED=true
```

#### Opção 2: Grafana Cloud (Recomendado)

Use os serviços gerenciados da Grafana Cloud:

1. Crie uma conta em https://grafana.com/
2. Obtenha os endpoints e API keys
3. Configure as variáveis:

```bash
TRACING_ENABLED=true
TEMPO_ENDPOINT=https://tempo-prod-<region>.grafana.net/tempo
LOKI_ENABLED=true
LOKI_ENDPOINT=https://logs-prod-<region>.grafana.net
PROMETHEUS_OTLP_ENDPOINT=https://prometheus-prod-<region>.grafana.net
```

### Docker Compose (VPS/EC2)

Use o arquivo `docker-compose.observability.yml` fornecido:

```bash
docker-compose -f docker-compose.observability.yml up -d
```

Configure nginx como reverse proxy para expor apenas o Grafana publicamente.

## 💻 Uso no Código

### Logs Estruturados

```typescript
import { Injectable } from '@nestjs/common';
import { ObservabilityService } from './observability/observability.service';

@Injectable()
export class YourService {
  constructor(private readonly observability: ObservabilityService) {}

  async yourMethod() {
    // Logs com contexto de trace automático
    this.observability.info('Processing request', { 
      userId: 123, 
      action: 'create' 
    });

    try {
      // seu código
    } catch (error) {
      this.observability.error('Failed to process', { 
        error: error.message,
        stack: error.stack 
      });
    }
  }
}
```

### Traces Customizados

#### Usando Decorador

```typescript
import { Trace } from './observability/decorators/trace.decorator';

@Injectable()
export class YourService {
  @Trace('YourService.expensiveOperation')
  async expensiveOperation(data: any) {
    // Automaticamente cria um span com nome customizado
    return await this.processData(data);
  }
}
```

#### Usando ObservabilityService

```typescript
import { ObservabilityService } from './observability/observability.service';

@Injectable()
export class YourService {
  constructor(private readonly observability: ObservabilityService) {}

  async complexOperation() {
    return await this.observability.executeInSpan(
      'complex-operation',
      async (span) => {
        span.setAttribute('operation.type', 'batch');
        span.setAttribute('items.count', 100);

        // Adicionar eventos ao span
        this.observability.addSpanEvent('started-processing');

        const result = await this.process();

        this.observability.addSpanEvent('finished-processing', {
          resultSize: result.length,
        });

        return result;
      },
      { customerId: 123 },
    );
  }
}
```

### Métricas Customizadas

As métricas do Prometheus já são coletadas automaticamente através do endpoint `/api/metrics`. Para adicionar métricas customizadas, use o módulo existente `MetricsModule`.

## 📊 Dashboards e Visualização

### Dashboard Pré-configurado

O dashboard "PromptZero Backend Overview" inclui:

- **Request Rate**: Requisições por segundo
- **Request Duration**: P95 e P99 de latência
- **Error Rate**: Taxa de erros 5xx
- **Memory Usage**: Uso de memória do processo

### Criando Dashboards Customizados

1. Acesse Grafana → Dashboards → New Dashboard
2. Adicione painéis com queries:

**Exemplo - Taxa de Sucesso**:
```promql
sum(rate(http_requests_total{job="promptzero-backend",status!~"5.."}[5m])) 
/ 
sum(rate(http_requests_total{job="promptzero-backend"}[5m]))
```

**Exemplo - Logs de Erro**:
```logql
{service="promptzero-backend"} |= "ERROR" | json
```

**Exemplo - Traces por Endpoint**:
```traceql
{service.name="promptzero-backend"} 
| select(span.http.route)
```

### Correlação Automática

O Grafana está configurado para correlacionar automaticamente:

1. **Logs → Traces**: Links de `traceId` nos logs abrem o trace correspondente
2. **Traces → Logs**: Botão "Logs for this trace" nos traces
3. **Traces → Métricas**: Métricas do service graph geradas automaticamente

## 🔧 Troubleshooting

### Traces não aparecem no Tempo

1. Verifique se `TRACING_ENABLED=true`
2. Confirme a conectividade: `curl http://localhost:4318/v1/traces`
3. Verifique logs do backend: `docker logs promptzero-backend`
4. Verifique logs do Tempo: `docker logs tempo`

### Logs não aparecem no Loki

1. Verifique se `LOKI_ENABLED=true`
2. Teste a conexão: `curl http://localhost:3100/ready`
3. Verifique logs: `docker logs loki`
4. Confirme formato JSON nos logs do backend

### Métricas não aparecem no Prometheus

1. Verifique se o endpoint está acessível: `curl http://localhost:3001/api/metrics`
2. Verifique configuração de targets no Prometheus: http://localhost:9090/targets
3. Confirme que o backend está rodando em `host.docker.internal:3001`

### Grafana não se conecta às datasources

1. Verifique se os containers estão na mesma rede:
   ```bash
   docker network inspect observability_observability
   ```
2. Teste conectividade interna:
   ```bash
   docker exec grafana curl http://prometheus:9090/-/healthy
   docker exec grafana curl http://loki:3100/ready
   docker exec grafana curl http://tempo:3200/ready
   ```

## 📚 Recursos Adicionais

- [Documentação OpenTelemetry](https://opentelemetry.io/docs/)
- [Prometheus Query Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Reference](https://grafana.com/docs/loki/latest/logql/)
- [TraceQL Guide](https://grafana.com/docs/tempo/latest/traceql/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

## 🎯 Próximos Passos

1. **Alertas**: Configure alertas no Prometheus/Grafana
2. **Retenção**: Ajuste políticas de retenção conforme volume
3. **Amostragem**: Configure amostragem de traces em produção (ex: 10%)
4. **Service Level Objectives (SLOs)**: Defina SLOs para endpoints críticos
5. **Distributed Tracing Avançado**: Adicione traces para chamadas LLM, banco de dados, etc.

## 📄 Arquivos de Configuração

```
observability/
├── prometheus/
│   └── prometheus.yml          # Configuração do Prometheus
├── loki/
│   └── loki-config.yml         # Configuração do Loki
├── tempo/
│   └── tempo-config.yml        # Configuração do Tempo
├── otel-collector/
│   └── otel-collector-config.yml  # Configuração do OTel Collector
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── datasources.yml  # Datasources auto-provisionadas
    │   └── dashboards/
    │       └── dashboards.yml   # Dashboards auto-provisionados
    └── dashboards/
        └── backend-overview.json # Dashboard principal
```

## 🔐 Segurança

Para produção, configure:

1. **Autenticação**: 
   - Grafana: Configure OAuth ou LDAP
   - Prometheus: Use Basic Auth ou OAuth2 Proxy
   
2. **TLS/SSL**:
   - Configure certificados para todos os endpoints
   
3. **Network Policies**:
   - Limite acesso apenas aos IPs necessários
   
4. **Secrets Management**:
   - Use secrets manager para API keys do Grafana Cloud
