# ✅ Checklist de Validação - Observabilidade

Use este checklist para validar que toda a infraestrutura de observabilidade está funcionando corretamente.

## 🎯 Ambiente Local

### 1. Docker Compose

- [ ] Stack iniciada com sucesso
  ```bash
  docker-compose -f docker-compose.observability.yml ps
  ```
  Todos os serviços devem estar "Up"

- [ ] Volumes criados
  ```bash
  docker volume ls | grep observability
  ```
  Deve mostrar: prometheus_data, loki_data, tempo_data, grafana_data

- [ ] Network criada
  ```bash
  docker network ls | grep observability
  ```
  Deve mostrar: observability_observability

### 2. Serviços - Health Checks

- [ ] **Prometheus** está saudável
  ```bash
  curl http://localhost:9090/-/healthy
  # Deve retornar: Prometheus Server is Healthy.
  ```

- [ ] **Loki** está pronto
  ```bash
  curl http://localhost:3100/ready
  # Deve retornar: ready
  ```

- [ ] **Tempo** está pronto
  ```bash
  curl http://localhost:3200/ready
  # Deve retornar: ready
  ```

- [ ] **Grafana** está saudável
  ```bash
  curl -s http://localhost:3300/api/health | jq
  # Deve retornar: {"database": "ok", "version": "..."}
  ```

- [ ] **OTel Collector** está respondendo
  ```bash
  curl -s http://localhost:8888/metrics | head -n 5
  # Deve mostrar métricas
  ```

### 3. Backend - Configuração

- [ ] Variáveis de ambiente configuradas
  ```bash
  grep -E "TRACING_ENABLED|TEMPO_ENDPOINT|LOKI_ENABLED|LOKI_ENDPOINT|METRICS_ENABLED" backend/.env
  ```

- [ ] Backend iniciado com sucesso
  ```bash
  # Em backend/.env deve ter:
  TRACING_ENABLED=true
  TEMPO_ENDPOINT=http://localhost:4318
  LOKI_ENABLED=true
  LOKI_ENDPOINT=http://localhost:3100
  METRICS_ENABLED=true
  ```

- [ ] Backend está rodando
  ```bash
  curl http://localhost:3001/api/health
  # Deve retornar: {"status":"ok"}
  ```

### 4. Métricas - Prometheus

- [ ] Endpoint de métricas acessível
  ```bash
  curl http://localhost:3001/api/metrics | head -n 10
  # Deve mostrar métricas em formato Prometheus
  ```

- [ ] Métricas HTTP presentes
  ```bash
  curl -s http://localhost:3001/api/metrics | grep http_requests_total
  # Deve encontrar a métrica
  ```

- [ ] Prometheus está fazendo scrape do backend
  - Acesse: http://localhost:9090/targets
  - Target `promptzero-backend` deve estar **UP** (verde)

- [ ] Métricas aparecem no Prometheus
  ```bash
  # Teste via API
  curl -s 'http://localhost:9090/api/v1/query?query=up{job="promptzero-backend"}' | jq '.data.result[0].value'
  # Deve retornar [timestamp, "1"]
  ```

### 5. Logs - Loki

- [ ] Backend está enviando logs
  ```bash
  # Faça uma requisição ao backend
  curl http://localhost:3001/api/v1/prompts
  
  # Veja os logs do backend
  docker logs backend 2>&1 | grep -i loki
  # Não deve mostrar erros de conexão
  ```

- [ ] Logs aparecem no Loki
  - Acesse Grafana: http://localhost:3300
  - Login: admin/admin
  - Explore → Loki
  - Query: `{service="promptzero-backend"}`
  - Deve mostrar logs recentes

- [ ] Logs contêm traceId
  ```logql
  {service="promptzero-backend"} | json | traceId != ""
  ```
  Deve encontrar logs com traceId

### 6. Traces - Tempo

- [ ] Endpoint OTLP acessível
  ```bash
  curl -X POST http://localhost:4318/v1/traces \
    -H "Content-Type: application/json" \
    -d '{"resourceSpans":[]}'
  # Não deve retornar erro
  ```

- [ ] Backend está enviando traces
  ```bash
  # Faça algumas requisições
  curl http://localhost:3001/api/v1/prompts
  curl http://localhost:3001/api/v1/workspaces
  
  # Veja logs do backend
  docker logs backend 2>&1 | grep -i "trace\|otel\|telemetry"
  # Deve mostrar "OpenTelemetry tracing initialized"
  ```

- [ ] Traces aparecem no Tempo
  - Acesse Grafana: http://localhost:3300
  - Explore → Tempo
  - Query: `{service.name="promptzero-backend"}`
  - Deve mostrar traces recentes

- [ ] Spans contêm atributos corretos
  - Clique em um trace
  - Verifique atributos: `http.method`, `http.route`, `http.status_code`

### 7. Grafana - Configuração

- [ ] Login funciona
  - URL: http://localhost:3300
  - User: `admin`
  - Password: `admin`

- [ ] Datasources configuradas
  - Acesse: Configuration → Data sources
  - Deve ter 3 datasources: Prometheus, Loki, Tempo
  - Todas devem estar com ✅ "Data source is working"

- [ ] Dashboard existe
  - Dashboards → Browse
  - Deve ter: "PromptZero Backend Overview"

- [ ] Dashboard mostra dados
  - Abra o dashboard "PromptZero Backend Overview"
  - Deve mostrar métricas em todos os painéis

### 8. Correlação - Logs ↔ Traces

- [ ] Log contém link para trace
  - Grafana → Explore → Loki
  - Query: `{service="promptzero-backend"} | json`
  - Clique em um log que tem `traceId`
  - Deve aparecer botão "Tempo" ao lado do traceId

- [ ] Trace contém link para logs
  - Grafana → Explore → Tempo
  - Clique em um trace
  - Deve ter botão "Logs for this trace"
  - Clicando deve abrir logs correlacionados

### 9. Testes Funcionais

- [ ] Fazer requisição e ver trace completo
  ```bash
  # 1. Fazer requisição
  curl -v http://localhost:3001/api/v1/prompts
  
  # 2. Copiar o X-Request-Id do response header
  
  # 3. No Grafana → Loki:
  {service="promptzero-backend"} | json | requestId="<REQUEST_ID>"
  
  # 4. Clicar no traceId para ver trace completo
  ```

- [ ] Simular erro e verificar observabilidade
  ```bash
  # Fazer requisição inválida
  curl -X POST http://localhost:3001/api/v1/prompts \
    -H "Content-Type: application/json" \
    -d '{"invalid": true}'
  
  # No Grafana → Loki:
  {service="promptzero-backend"} |= "ERROR"
  
  # Deve mostrar o erro com stack trace
  ```

- [ ] Ver métricas em tempo real
  - Faça várias requisições:
  ```bash
  for i in {1..20}; do curl http://localhost:3001/api/v1/prompts; done
  ```
  - No Grafana Dashboard, veja o gráfico de Request Rate subir

---

## 🌐 Ambiente de Produção (Railway)

### 1. Variáveis de Ambiente

- [ ] Variáveis configuradas no Railway
  ```
  TRACING_ENABLED=true
  SERVICE_NAME=promptzero-backend
  SERVICE_VERSION=<VERSION>
  TEMPO_ENDPOINT=<URL>
  LOKI_ENABLED=true
  LOKI_ENDPOINT=<URL>
  LOG_LEVEL=warn
  METRICS_ENABLED=true
  ```

- [ ] Se Grafana Cloud, credenciais configuradas
  ```
  TEMPO_USERNAME=<USERNAME>
  TEMPO_PASSWORD=<PASSWORD>
  LOKI_USERNAME=<USERNAME>
  LOKI_PASSWORD=<PASSWORD>
  ```

### 2. Deploy

- [ ] Build passou sem erros
  ```bash
  railway logs
  # Verificar se não há erros de build
  ```

- [ ] Aplicação iniciou corretamente
  ```bash
  railway logs | grep -i "tracing initialized"
  # Deve mostrar mensagem de inicialização
  ```

### 3. Endpoints Públicos

- [ ] Métricas acessíveis
  ```bash
  curl https://seu-backend.railway.app/api/metrics
  # Deve retornar métricas
  ```

- [ ] Health check passa
  ```bash
  curl https://seu-backend.railway.app/api/health
  # Deve retornar: {"status":"ok"}
  ```

### 4. Grafana Cloud (se aplicável)

- [ ] Logs aparecendo
  - Acesse Grafana Cloud
  - Explore → Loki
  - Query: `{service="promptzero-backend"}`
  - Deve mostrar logs recentes

- [ ] Traces aparecendo
  - Explore → Tempo
  - Query: `{service.name="promptzero-backend"}`
  - Deve mostrar traces

- [ ] Métricas aparecendo (se configurado remote write)
  - Explore → Prometheus
  - Query: `up{job="promptzero-backend"}`

### 5. Monitoramento Ativo

- [ ] Fazer requisições reais
  ```bash
  curl https://seu-backend.railway.app/api/v1/prompts
  ```

- [ ] Verificar traces no Grafana Cloud

- [ ] Verificar logs correlacionados

---

## 🚨 Troubleshooting

### Problema: Traces não aparecem

**Checklist**:
- [ ] `TRACING_ENABLED=true` está configurado
- [ ] `TEMPO_ENDPOINT` está correto
- [ ] Tempo está acessível (`curl <TEMPO_ENDPOINT>/v1/traces`)
- [ ] Backend mostra "OpenTelemetry tracing initialized" nos logs
- [ ] Não há erros de conexão nos logs

### Problema: Logs não aparecem no Loki

**Checklist**:
- [ ] `LOKI_ENABLED=true` está configurado
- [ ] `LOKI_ENDPOINT` está correto
- [ ] Loki está acessível (`curl <LOKI_ENDPOINT>/ready`)
- [ ] Não há "Loki connection error" nos logs do backend

### Problema: Métricas não aparecem no Prometheus

**Checklist**:
- [ ] `METRICS_ENABLED=true` está configurado
- [ ] Endpoint `/api/metrics` retorna dados
- [ ] Prometheus target está UP
- [ ] Configuração de scrape está correta no `prometheus.yml`

### Problema: Grafana não conecta às datasources

**Checklist**:
- [ ] Datasources estão configuradas corretamente
- [ ] URLs estão corretas (usar `http://service:port` para containers)
- [ ] Autenticação está correta (se Grafana Cloud)
- [ ] Teste de conexão passa em cada datasource

---

## ✅ Validação Final

Quando todos os itens estiverem marcados, sua stack de observabilidade está **100% funcional**!

### Teste E2E Completo

Execute este teste para validar todo o fluxo:

1. ✅ Faça uma requisição ao backend
2. ✅ Veja a métrica incrementar no Prometheus
3. ✅ Veja o log aparecer no Loki
4. ✅ Veja o trace aparecer no Tempo
5. ✅ Clique no traceId do log e navegue para o trace
6. ✅ No trace, clique em "Logs for this trace"
7. ✅ Veja métricas correlacionadas no dashboard

Se todos os passos funcionarem, **parabéns! 🎉** Sua observabilidade está completa!

---

## 📚 Próximos Passos

Após validar tudo:

1. [ ] Adicionar observabilidade em outros services
2. [ ] Configurar alertas no Grafana
3. [ ] Criar dashboards específicos por feature
4. [ ] Configurar log aggregation rules
5. [ ] Implementar amostragem de traces (produção)
6. [ ] Configurar SLOs (Service Level Objectives)

---

## 🆘 Suporte

Se algum item falhar, consulte:

- **Documentação principal**: `docs/OBSERVABILIDADE.md`
- **Troubleshooting detalhado**: `docs/OBSERVABILIDADE.md#troubleshooting`
- **Exemplos de uso**: `docs/OBSERVABILIDADE-EXEMPLO.md`
- **Deploy em produção**: `docs/OBSERVABILIDADE-RAILWAY.md`
