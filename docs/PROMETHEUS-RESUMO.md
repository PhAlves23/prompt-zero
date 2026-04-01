# Prometheus no PromptZero - Resumo Executivo

## O que é Prometheus?

**Prometheus** é um sistema de monitoramento e alertas open-source que:
- Coleta métricas de aplicações via HTTP
- Armazena dados em time-series database
- Permite consultas poderosas (PromQL)
- Integra-se com Grafana para visualizações

## Como funciona no PromptZero

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BACKEND EXPÕE MÉTRICAS                                   │
│                                                              │
│  Backend NestJS                                             │
│  ├── Coleta métricas internas                              │
│  │   ├── Requisições HTTP                                  │
│  │   ├── Duração de requests                              │
│  │   ├── Uso de memória                                    │
│  │   ├── CPU                                               │
│  │   └── Event loop lag                                    │
│  └── Expõe em: http://localhost:3001/metrics              │
│                                                              │
│  Formato Prometheus (texto):                                │
│  http_requests_total{route="/api/v1/prompts"} 42           │
│  http_request_duration_seconds_bucket{le="0.1"} 10         │
└─────────────────────────────────────────────────────────────┘
                          ↓
                          ↓ (scraping a cada 15s)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PROMETHEUS FAZ SCRAPING                                  │
│                                                              │
│  Prometheus Server                                          │
│  ├── Requisita /metrics periodicamente                     │
│  ├── Armazena dados em time-series DB                      │
│  └── Disponibiliza UI para queries                         │
│                                                              │
│  Acesso: http://localhost:9090                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
                          ↓ (consulta via PromQL)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GRAFANA VISUALIZA                                        │
│                                                              │
│  Grafana                                                    │
│  ├── Conecta ao Prometheus como data source               │
│  ├── Executa queries PromQL                                │
│  ├── Renderiza gráficos e dashboards                       │
│  └── Envia alertas (opcional)                             │
│                                                              │
│  Acesso: http://localhost:3030                             │
│  Login: admin / admin                                       │
└─────────────────────────────────────────────────────────────┘
```

## Configuração Rápida

### Passo 1: Verificar se o backend está expondo métricas

```bash
# Inicie o backend
cd backend
yarn start:dev

# Teste o endpoint
curl http://localhost:3001/metrics
```

**Você deve ver:** Texto com métricas no formato Prometheus

### Passo 2: Iniciar Prometheus + Grafana

```bash
# Na raiz do projeto
docker compose -f docker-compose.prometheus.yml up -d
```

**Isso inicia:**
- Prometheus em `http://localhost:9090`
- Grafana em `http://localhost:3030`

### Passo 3: Acessar e visualizar

1. **Prometheus**: Abra `http://localhost:9090`
   - Execute queries diretas
   - Veja status dos targets (Status → Targets)

2. **Grafana**: Abra `http://localhost:3030`
   - Login: `admin` / `admin`
   - Dashboard já configurado: "PromptZero Backend Metrics"
   - Gráficos prontos para visualização

### Passo 4: Gerar tráfego para ver métricas

```bash
# Faça requisições ao backend
curl http://localhost:3001/api/v1/prompts
```

Aguarde 15-30 segundos e veja as métricas aparecerem no Grafana!

## No Railway (Produção)

### Opção 1: Prometheus local fazendo scraping do Railway

Edite `prometheus.yml`:

```yaml
- job_name: 'promptzero-backend-production'
  metrics_path: '/metrics'
  scheme: 'https'
  static_configs:
    - targets: ['seu-backend.up.railway.app']
```

Reinicie o Prometheus:

```bash
docker compose -f docker-compose.prometheus.yml restart prometheus
```

### Opção 2: Grafana Cloud (recomendado para produção)

1. Crie conta gratuita em https://grafana.com/
2. Configure Prometheus Agent para scraping remoto
3. Visualize no Grafana Cloud

### Opção 3: Railway Observability

O Railway tem observabilidade nativa, mas é um recurso pago.

## Métricas Disponíveis

### HTTP
- `http_requests_total`: Total de requisições (por rota, método, status)
- `http_request_duration_seconds`: Duração das requisições (histograma)

### Sistema
- `process_cpu_user_seconds_total`: Uso de CPU
- `process_resident_memory_bytes`: Memória usada
- `nodejs_heap_size_used_bytes`: Heap usado
- `nodejs_eventloop_lag_seconds`: Event loop lag

### Queries úteis (PromQL)

```promql
# Taxa de requisições por segundo
rate(http_requests_total[5m])

# Latência P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Taxa de erros 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

## Arquivos Criados

```
prompt-zero/
├── docker-compose.prometheus.yml   # Docker Compose para Prometheus + Grafana
├── prometheus.yml                  # Configuração do Prometheus (targets)
├── grafana/
│   ├── README.md                   # Documentação da pasta
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml      # Data source do Prometheus
│       └── dashboards/
│           ├── dashboard-provider.yml
│           └── promptzero-backend.json  # Dashboard pronto
└── docs/
    ├── PROMETHEUS-QUICKSTART.md    # Guia rápido (este arquivo expandido)
    └── PROMETHEUS-RAILWAY.md       # Guia completo Railway
```

## Variáveis de Ambiente (Railway)

Configure no Railway:

```bash
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

Já está configurado por padrão!

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| `/metrics` retorna 404 | Verifique se `METRICS_ENABLED=true` no `.env` |
| Prometheus não coleta dados | Verifique se o target está "UP" em Status → Targets |
| Grafana não mostra dados | Teste o data source: Configuration → Data sources → Prometheus → Test |
| Dashboard vazio | Gere tráfego no backend e aguarde 15-30s |

## Próximos Passos

1. ✅ **Métricas básicas funcionando** (você está aqui!)
2. [ ] Configure alertas no Grafana (ex: taxa de erro > 5%)
3. [ ] Adicione métricas de negócio (ex: prompts executados por hora)
4. [ ] Configure Grafana Cloud para produção
5. [ ] Crie dashboard customizado com KPIs específicos

## Links Rápidos

- [Guia Completo: PROMETHEUS-QUICKSTART.md](./PROMETHEUS-QUICKSTART.md)
- [Configuração Railway: PROMETHEUS-RAILWAY.md](./PROMETHEUS-RAILWAY.md)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [PromQL Cheatsheet](https://promlabs.com/promql-cheat-sheet/)

## Exemplo de Dashboard

O dashboard pré-configurado mostra:

```
┌─────────────────────────────────────────────────────────┐
│ PromptZero Backend Metrics                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Request Rate (req/s)] ── [Request Duration P95 (s)]  │
│      📈 Linha                   📈 Linha                │
│                                                          │
│  [HTTP Status Codes]    ── [Error Rate (5xx)]          │
│      📊 Área                    📉 Linha                │
│                                                          │
│  [Memory Usage]         ── [Event Loop Lag]            │
│      📈 Linha                   📈 Linha                │
│                                                          │
│  [Top 10 Slowest Routes]  ── [Request Count by Route]  │
│      📋 Tabela                  📋 Tabela               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Comandos Essenciais

```bash
# Iniciar observabilidade
docker compose -f docker-compose.prometheus.yml up -d

# Ver logs
docker logs promptzero-prometheus
docker logs promptzero-grafana

# Parar
docker compose -f docker-compose.prometheus.yml down

# Parar e remover dados
docker compose -f docker-compose.prometheus.yml down -v

# Reiniciar após mudanças no prometheus.yml
docker compose -f docker-compose.prometheus.yml restart prometheus
```

---

**Pronto!** Agora você tem um sistema completo de observabilidade para o PromptZero 🎉

Para dúvidas ou problemas, consulte:
- [PROMETHEUS-QUICKSTART.md](./PROMETHEUS-QUICKSTART.md) - Guia detalhado
- [PROMETHEUS-RAILWAY.md](./PROMETHEUS-RAILWAY.md) - Configuração em produção
