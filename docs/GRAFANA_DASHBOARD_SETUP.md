# 📊 Como Funciona o Dashboard do Grafana com Métricas

## 🎯 Visão Geral

O PromptZero possui uma **stack completa de observabilidade** com Grafana, Prometheus, Loki e Tempo. Tudo está pré-configurado e pronto para uso local e em produção.

## 🏗️ Arquitetura de Observabilidade

```
┌─────────────────────────────────────────────────────────────┐
│                    GRAFANA (Port 3300)                      │
│              Dashboard de Visualização                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Prometheus│  │   Loki   │  │  Tempo   │                │
│  │(Métricas)│  │  (Logs)  │  │ (Traces) │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
         │              │              │
┌────────┴──────────────┴──────────────┴─────────────────────┐
│                                                             │
│                   BACKEND (NestJS)                          │
│                                                             │
│  • Expõe métricas em /api/metrics (Prometheus scrape)      │
│  • Envia logs via HTTP para Loki                           │
│  • Envia traces via OTLP para Tempo                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Configuração Local (Desenvolvimento)

### 1. Iniciar a Stack de Observabilidade

```bash
# Opção 1: Usando o script rápido
chmod +x observability/start-observability.sh
./observability/start-observability.sh

# Opção 2: Usando docker-compose diretamente
docker-compose -f docker-compose.observability.yml up -d
```

### 2. Verificar se os Serviços Estão Rodando

```bash
# Ver status de todos os serviços
docker-compose -f docker-compose.observability.yml ps

# Verificar saúde dos endpoints
curl http://localhost:9090/-/healthy      # Prometheus
curl http://localhost:3100/ready          # Loki
curl http://localhost:3200/ready          # Tempo
curl http://localhost:3300/api/health     # Grafana
```

### 3. Configurar o Backend para Enviar Métricas

O backend já está configurado! Basta garantir que as variáveis de ambiente estejam corretas no `backend/.env`:

```bash
# Tracing (Tempo)
TRACING_ENABLED=true
SERVICE_NAME=promptzero-backend
SERVICE_VERSION=1.0.0
TEMPO_ENDPOINT=http://localhost:4318

# Logs (Loki)
LOKI_ENABLED=true
LOKI_ENDPOINT=http://localhost:3100
LOG_LEVEL=debug

# Métricas (Prometheus)
METRICS_ENABLED=true
METRICS_PATH=/api/metrics
```

### 4. Iniciar o Backend

```bash
cd backend
yarn dev
```

### 5. Verificar se o Backend Está Enviando Métricas

```bash
# Testar endpoint de métricas
curl http://localhost:3001/api/metrics

# Deve retornar algo como:
# http_requests_total{method="GET",route="/api/v1/prompts",status="200"} 42
# http_request_duration_ms_bucket{le="100"} 35
# ...
```

### 6. Acessar o Grafana

1. Abra o navegador em: **http://localhost:3300**
2. Login:
   - **Usuário**: `admin`
   - **Senha**: `admin`
3. Navegue para **Dashboards** → **PromptZero Backend Overview**

## 📊 O que Você Verá no Dashboard

### Painel 1: Request Rate (Taxa de Requisições)
- **Métrica**: `rate(http_requests_total[5m])`
- **Descrição**: Quantas requisições por segundo o backend está processando
- **Útil para**: Identificar picos de tráfego, horários de maior uso

### Painel 2: Request Duration (Latência)
- **Métrica**: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`
- **Descrição**: P95 e P99 da latência das requisições
- **Útil para**: Identificar lentidão, otimizar endpoints lentos

### Painel 3: Error Rate (Taxa de Erros)
- **Métrica**: `rate(http_requests_total{status=~"5.."}[5m])`
- **Descrição**: Quantos erros 5xx por segundo
- **Útil para**: Alertas, identificar problemas em produção

### Painel 4: Memory Usage (Uso de Memória)
- **Métrica**: `process_resident_memory_bytes`
- **Descrição**: Memória RAM consumida pelo processo
- **Útil para**: Detectar memory leaks, otimizar uso de recursos

## 🔗 Correlação Automática entre Métricas, Logs e Traces

Uma das features mais poderosas é a **correlação automática**:

1. **De Métricas → Traces**:
   - Clique em um ponto no gráfico de latência
   - Veja o `traceId` do exemplar
   - Clique para abrir o trace completo no Tempo

2. **De Traces → Logs**:
   - Abra um trace no Tempo
   - Clique em "View Logs"
   - Veja todos os logs relacionados àquele trace

3. **De Logs → Traces**:
   - No Loki, filtre logs com erro
   - Clique no `traceId` no log
   - Abra o trace completo

## 🌐 Configuração em Produção (Railway)

### Arquitetura em Produção

```
┌─────────────────────────────────────────────────────────────┐
│                    GRAFANA CLOUD                            │
│              https://grafana.com (Managed)                  │
│                                                             │
│  • Prometheus (Métricas remotas)                           │
│  • Loki (Logs remotos)                                     │
│  • Tempo (Traces remotos)                                  │
└─────────────────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
         │              │              │
┌────────┴──────────────┴──────────────┴─────────────────────┐
│                                                             │
│              BACKEND no Railway (Production)                │
│                                                             │
│  • Expõe métricas em /api/metrics (Prometheus remote_write)│
│  • Envia logs via HTTP para Grafana Cloud Loki             │
│  • Envia traces via OTLP para Grafana Cloud Tempo          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Opção 1: Grafana Cloud (Recomendado)

**Vantagens**:
- ✅ Managed, sem manutenção
- ✅ Free tier generoso (10k séries, 50GB logs/mês)
- ✅ Alta disponibilidade
- ✅ Alertas inclusos

**Passos**:

1. **Criar conta no Grafana Cloud**: https://grafana.com/auth/sign-up

2. **Obter credenciais de integração**:
   - Acesse **Connections** → **Add Integration**
   - Copie:
     - `GRAFANA_CLOUD_PROMETHEUS_ENDPOINT`
     - `GRAFANA_CLOUD_PROMETHEUS_USER`
     - `GRAFANA_CLOUD_PROMETHEUS_PASSWORD`
     - `GRAFANA_CLOUD_LOKI_ENDPOINT`
     - `GRAFANA_CLOUD_LOKI_USER`
     - `GRAFANA_CLOUD_TEMPO_ENDPOINT`

3. **Configurar secrets no Railway**:
   ```bash
   # Via Railway CLI ou Dashboard
   railway secrets set \
     GRAFANA_CLOUD_PROMETHEUS_ENDPOINT="https://prometheus-xxx.grafana.net" \
     GRAFANA_CLOUD_PROMETHEUS_USER="12345" \
     GRAFANA_CLOUD_PROMETHEUS_PASSWORD="xxx" \
     GRAFANA_CLOUD_LOKI_ENDPOINT="https://logs-xxx.grafana.net" \
     GRAFANA_CLOUD_LOKI_USER="12345" \
     GRAFANA_CLOUD_TEMPO_ENDPOINT="https://tempo-xxx.grafana.net:443"
   ```

4. **Atualizar variáveis do backend no Railway**:
   ```bash
   # Via Railway Dashboard → Backend Service → Variables
   TRACING_ENABLED=true
   SERVICE_NAME=promptzero-backend-prod
   SERVICE_VERSION=1.0.0
   TEMPO_ENDPOINT=https://tempo-xxx.grafana.net:443
   
   LOKI_ENABLED=true
   LOKI_ENDPOINT=https://logs-xxx.grafana.net
   LOG_LEVEL=info
   
   METRICS_ENABLED=true
   METRICS_PATH=/api/metrics
   ```

5. **Configurar Prometheus Remote Write** (via Grafana Cloud Agent ou Prometheus próprio):
   - Instale o Grafana Cloud Agent no Railway
   - Configure para fazer scrape do `/api/metrics` do backend
   - Envia para Grafana Cloud Prometheus

### Opção 2: Self-Hosted na Railway

**Vantagens**:
- ✅ Controle total
- ✅ Sem dependência de third-party
- ✅ Dados permanecem no seu ambiente

**Desvantagens**:
- ❌ Custo de recursos (CPU/RAM)
- ❌ Manutenção manual
- ❌ Precisa configurar volumes persistentes

**Passos**:

1. **Deploy da stack de observabilidade no Railway**:
   ```bash
   # Criar novo serviço para cada componente
   railway up --service prometheus
   railway up --service loki
   railway up --service tempo
   railway up --service grafana
   ```

2. **Configurar volumes persistentes** (importante!):
   ```bash
   # No Railway Dashboard → Service → Settings → Volumes
   # Adicionar volumes para:
   - /prometheus (Prometheus data)
   - /loki (Loki data)
   - /var/tempo (Tempo data)
   - /var/lib/grafana (Grafana data)
   ```

3. **Configurar networking interno**:
   - Todos os serviços devem estar na mesma rede privada do Railway
   - Use URLs internas: `prometheus:9090`, `loki:3100`, `tempo:3200`

## 🎓 Queries Úteis para Criar Novos Painéis

### Métricas de Negócio

```promql
# Total de prompts criados (últimas 24h)
increase(prompts_created_total[24h])

# Prompts por workspace
sum by (workspace_id) (prompts_created_total)

# Taxa de execuções bem-sucedidas
rate(prompt_executions_total{status="success"}[5m]) /
rate(prompt_executions_total[5m])

# Custo total por modelo LLM (últimas 24h)
sum by (model) (prompt_execution_cost_usd[24h])

# P95 de tokens consumidos
histogram_quantile(0.95, rate(prompt_execution_tokens_bucket[5m]))
```

### Logs Avançados

```logql
# Todos os erros do backend
{service="promptzero-backend"} |= "ERROR"

# Logs de um usuário específico
{service="promptzero-backend"} | json | userId="user-123"

# Logs de requisições lentas (>1s)
{service="promptzero-backend"} | json | durationMs > 1000

# Erros com stack trace
{service="promptzero-backend"} | json | level="error" | error!=""
```

### Traces Avançados

```traceql
# Traces com duração > 500ms
{service.name="promptzero-backend" && duration>500ms}

# Traces que falharam
{service.name="promptzero-backend" && status=error}

# Traces de um endpoint específico
{service.name="promptzero-backend" && http.route="/api/v1/prompts/:id/execute"}

# Traces que chamaram banco de dados
{service.name="promptzero-backend" && span.name=~"prisma.*"}
```

## 🚨 Alertas (Grafana Alerts)

### Configurar Alertas Críticos

1. **No Grafana** → **Alerting** → **Alert Rules** → **Create Alert**

2. **Alerta: Alta Taxa de Erros**:
   ```promql
   # Condição
   rate(http_requests_total{status=~"5.."}[5m]) > 0.05
   
   # Configuração
   - Evaluate every: 1m
   - For: 5m
   - Severity: Critical
   ```

3. **Alerta: Latência Alta**:
   ```promql
   # Condição
   histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 500
   
   # Configuração
   - Evaluate every: 1m
   - For: 3m
   - Severity: Warning
   ```

4. **Alerta: Uso de Memória Alto**:
   ```promql
   # Condição
   process_resident_memory_bytes / 1024 / 1024 / 1024 > 1.5
   
   # Configuração
   - Evaluate every: 5m
   - For: 10m
   - Severity: Warning
   ```

### Configurar Notification Channels

- **Slack**: Adicione webhook URL
- **Email**: Configure SMTP
- **PagerDuty**: Para alertas críticos de produção
- **Discord/Telegram**: Para equipes menores

## 📱 Acesso Mobile

O Grafana possui app mobile oficial:
- **iOS**: https://apps.apple.com/app/grafana/id1463677462
- **Android**: https://play.google.com/store/apps/details?id=com.grafana.grafana

Configurar acesso remoto seguro:
1. Expor Grafana via HTTPS (Railway fornece SSL automático)
2. Configurar autenticação (OAuth, LDAP, SAML)
3. Instalar app e adicionar servidor

## 🔒 Segurança

### Produção DEVE ter:

1. **Autenticação forte**:
   - OAuth2 (Google, GitHub, etc.)
   - SSO corporativo
   - NUNCA usar `admin/admin` em produção

2. **HTTPS obrigatório**:
   - Railway fornece SSL automático
   - Grafana Cloud já é HTTPS

3. **Permissões granulares**:
   - Viewer: Apenas visualizar dashboards
   - Editor: Criar/editar dashboards
   - Admin: Gerenciar datasources e users

4. **API Keys rotacionadas**:
   - Usar Service Accounts ao invés de usuários
   - Rodar keys a cada 90 dias
   - Nunca commitar keys no git

## 📚 Próximos Passos

1. ✅ **Local**: Iniciar stack e visualizar métricas
2. ✅ **Dashboard**: Explorar "PromptZero Backend Overview"
3. ✅ **Customizar**: Adicionar painéis específicos do negócio
4. ⬜ **Alertas**: Configurar alertas críticos
5. ⬜ **Produção**: Deploy no Grafana Cloud
6. ⬜ **Mobile**: Instalar app para monitorar on-the-go

## 🆘 Troubleshooting

### Problema: Nenhuma métrica aparece no Grafana

**Solução**:
1. Verifique se o backend está expondo métricas:
   ```bash
   curl http://localhost:3001/api/metrics
   ```

2. Verifique se o Prometheus está fazendo scrape:
   - Acesse: http://localhost:9090/targets
   - O target `promptzero-backend` deve estar **UP**

3. Verifique conectividade:
   ```bash
   # De dentro do container do Prometheus
   docker exec prometheus wget -O- http://host.docker.internal:3001/api/metrics
   ```

### Problema: Logs não aparecem no Loki

**Solução**:
1. Verifique se `LOKI_ENABLED=true` no backend
2. Teste o endpoint do Loki:
   ```bash
   curl http://localhost:3100/ready
   ```
3. Verifique logs do backend:
   ```bash
   docker logs promptzero-backend | grep -i loki
   ```

### Problema: Traces não aparecem no Tempo

**Solução**:
1. Verifique se `TRACING_ENABLED=true` no backend
2. Teste conectividade com Tempo:
   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   ```
3. Verifique logs do Tempo:
   ```bash
   docker logs tempo
   ```

## 📖 Documentação Adicional

- **Observabilidade geral**: [docs/OBSERVABILIDADE.md](./OBSERVABILIDADE.md)
- **README da stack**: [observability/README.md](../observability/README.md)
- **Prometheus docs**: https://prometheus.io/docs/
- **Grafana docs**: https://grafana.com/docs/
- **Loki docs**: https://grafana.com/docs/loki/
- **Tempo docs**: https://grafana.com/docs/tempo/

## 🎉 Conclusão

Você agora tem uma stack completa de observabilidade! Com Grafana, Prometheus, Loki e Tempo, você consegue:

✅ **Monitorar** performance em tempo real  
✅ **Debugar** problemas com traces detalhados  
✅ **Alertar** equipe sobre incidentes  
✅ **Analisar** tendências e otimizar custos  
✅ **Visualizar** métricas de negócio  

**Happy monitoring!** 📊🚀
