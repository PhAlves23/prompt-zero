# Como Conectar Prometheus ao Grafana no Railway

## ✅ Resumo Rápido

### O que você precisa fazer:

1. **Configurar o Prometheus** para fazer scraping do backend
2. **Conectar o Grafana ao Prometheus**
3. **Importar o dashboard** pronto
4. **Verificar se está recebendo dados**

---

## 🔧 Parte 1: Configurar Prometheus para coletar do Backend

### 1.1. Pegar a URL do seu backend

No Railway, abra o serviço `back-end` e copie a URL pública. Exemplo:
```
prompt-zero-backend-production-a1b2.up.railway.app
```

### 1.2. Editar prometheus-railway.yml

Abra o arquivo `prometheus-railway.yml` no projeto e **substitua**:

```yaml
targets: ['SEU-BACKEND.up.railway.app']
```

Por (cole a URL real do seu backend):

```yaml
targets: ['prompt-zero-backend-production-a1b2.up.railway.app']
```

### 1.3. Fazer deploy no Railway

**Se você usou um template:**

O Prometheus do Railway provavelmente tem um arquivo de configuração padrão. Você precisa atualizá-lo.

**Opção A - Via variável de ambiente (se o template suportar):**

No Railway, vá no serviço `railway-prometheus` → Variables → Adicione:
```
BACKEND_URL=prompt-zero-backend-production-a1b2.up.railway.app
```

**Opção B - Via repositório Git (recomendado):**

1. Crie pasta `prometheus/` no projeto:
   ```bash
   mkdir -p prometheus
   ```

2. Copie os arquivos:
   ```bash
   cp Dockerfile.prometheus prometheus/Dockerfile
   cp prometheus-railway.yml prometheus/prometheus.yml
   ```

3. Commit e push:
   ```bash
   git add prometheus/
   git commit -m "feat: configura Prometheus para Railway"
   git push
   ```

4. No Railway:
   - Serviço `railway-prometheus` → Settings
   - "Source" → Conecte ao repositório
   - "Root Directory" → `prometheus`
   - Clique em "Deploy"

### 1.4. Aguarde o deploy

O Railway vai fazer rebuild do Prometheus. Aguarde 1-2 minutos.

---

## 🔍 Parte 2: Verificar se Prometheus está recebendo dados do backend

### Teste 1: Backend expõe métricas?

```bash
curl https://prompt-zero-backend-production-a1b2.up.railway.app/metrics
```

**Resultado esperado:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/prompts",status_code="200"} 42
...
```

✅ **Se ver métricas** → Backend está OK!  
❌ **Se ver 404** → Backend não está expondo `/metrics`

### Teste 2: Prometheus está coletando?

1. **Abra o Prometheus** no navegador:
   ```
   https://railway-prometheus-production-xxxx.up.railway.app
   ```

2. **Vá em "Status" → "Targets"** (menu superior)

3. **Procure por `promptzero-backend`**:
   - ✅ **UP (verde)** → Prometheus está coletando com sucesso!
   - ❌ **DOWN (vermelho)** → Clique no target para ver o erro
   - 🟡 **UNKNOWN (amarelo)** → Aguarde 30 segundos e recarregue

**Erros comuns e soluções:**

| Erro | O que significa | Solução |
|------|----------------|---------|
| `connection refused` | Não consegue conectar ao backend | Verifique se a URL está correta no prometheus.yml |
| `404 page not found` | Endpoint `/metrics` não existe | Verifique se `METRICS_ENABLED=true` no backend |
| `context deadline exceeded` | Timeout (> 10s) | Backend está muito lento ou travado |
| `no such host` | Hostname inválido | URL do backend está errada |

### Teste 3: Consultar métricas no Prometheus

Na interface do Prometheus:

1. **Clique em "Graph"** (menu superior)

2. **Digite esta query**:
   ```promql
   up{job="promptzero-backend"}
   ```

3. **Clique em "Execute"**

4. **Resultado esperado**:
   ```
   up{job="promptzero-backend", instance="..."} 1
   ```

**O que significa:**
- `1` = Backend está UP ✅
- `0` = Backend está DOWN ❌
- Nenhum resultado = Prometheus não está configurado para fazer scraping

### Teste 4: Métricas HTTP

Execute mais queries para confirmar:

```promql
# Total de requisições
http_requests_total

# Duração das requisições
http_request_duration_seconds_count

# Memória usada
process_resident_memory_bytes
```

Se todas retornarem dados → **Perfeito!** ✅

---

## 🎨 Parte 3: Conectar Grafana ao Prometheus

### 3.1. Pegar URLs

Você precisa da URL do Prometheus. Teste na ordem:

**1ª opção (mais rápida) - URL interna:**
```
http://railway-prometheus.railway.internal:9090
```

**2ª opção - Nome do serviço:**
```
http://railway-prometheus:9090
```

**3ª opção - URL pública:**
```
https://railway-prometheus-production-xxxx.up.railway.app
```

### 3.2. Configurar Data Source no Grafana

1. **Acesse o Grafana** no navegador (sua URL do Railway)

2. **Faça login** (usuário e senha que você configurou)

3. **Menu lateral esquerdo** → Clique no ícone de **engrenagem ⚙️**

4. **Clique em "Data sources"**

5. **Clique em "Add data source"** (botão azul)

6. **Selecione "Prometheus"** (primeiro da lista)

7. **Preencha os campos**:

   - **Name**: `Prometheus` (ou qualquer nome)
   
   - **URL**: Tente as URLs na ordem acima, começando pela interna:
     ```
     http://railway-prometheus.railway.internal:9090
     ```
   
   - **Access**: `Server (default)`
   
   - **Scrape interval**: `15s`
   
   - **HTTP Method**: `GET`
   
   - Deixe o resto como padrão

8. **Role até o final** e clique em **"Save & Test"**

**Resultado esperado:**
- ✅ **"Data source is working"** → Conectado com sucesso!
- ❌ **Erro** → Tente a próxima URL da lista

### 3.3. Testar no Explore

1. **Menu lateral** → Clique no ícone de **bússola 🧭** (Explore)

2. **No topo**, selecione o data source **"Prometheus"**

3. **Digite esta query**:
   ```promql
   up
   ```

4. **Clique em "Run Query"**

5. **Deve mostrar**:
   ```
   up{job="prometheus", instance="localhost:9090"} 1
   up{job="promptzero-backend", instance="..."} 1
   ```

Se aparecer o `promptzero-backend` → **Tudo certo!** ✅

---

## 📊 Parte 4: Importar Dashboard

### 4.1. Copiar o JSON do dashboard

1. **Abra o arquivo** no projeto: `grafana/provisioning/dashboards/promptzero-backend.json`

2. **Copie todo o conteúdo** (Ctrl+A, Ctrl+C)

### 4.2. Importar no Grafana

1. **No Grafana**, menu lateral → Clique no ícone **"+"** → **"Import"**

2. **Cole o JSON** no campo "Import via panel json"

3. **Clique em "Load"**

4. **Configure**:
   - **Name**: Pode deixar "PromptZero Backend Metrics"
   - **Folder**: Escolha uma pasta ou deixe "General"
   - **Prometheus**: Selecione o data source que você criou

5. **Clique em "Import"**

**Pronto!** Dashboard importado! 🎉

### 4.3. Ver o dashboard

Você será redirecionado automaticamente. Deve ver 8 painéis:

1. ✅ **Request Rate (req/s)** - Taxa de requisições
2. ✅ **Request Duration P95 (seconds)** - Latência
3. ✅ **HTTP Status Codes** - Distribuição de status
4. ✅ **Error Rate (5xx)** - Taxa de erros
5. ✅ **Memory Usage** - Memória usada
6. ✅ **Event Loop Lag** - Performance do Node.js
7. ✅ **Top 10 Slowest Routes** - Rotas mais lentas
8. ✅ **Request Count by Route** - Total por rota

### 4.4. Se o dashboard estiver vazio

É normal se acabou de configurar. Siga:

1. **Gere tráfego** no backend:
   ```bash
   # Faça login
   curl -X POST https://SEU-BACKEND.up.railway.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@promptvault.com","password":"Password@123"}'
   
   # Liste prompts
   curl https://SEU-BACKEND.up.railway.app/api/v1/prompts \
     -H "Authorization: Bearer SEU_TOKEN"
   ```

2. **Aguarde 15-30 segundos** (tempo do Prometheus fazer scraping)

3. **Recarregue o dashboard** (F5)

4. **Ajuste o time range** (canto superior direito):
   - Clique no seletor
   - Escolha **"Last 5 minutes"**

---

## ✅ Checklist Final: Tudo Funcionando?

Use esta checklist para confirmar que está tudo OK:

### Backend
- [ ] `curl https://backend.railway.app/metrics` retorna métricas
- [ ] Backend tem variável `METRICS_ENABLED=true`

### Prometheus
- [ ] Prometheus acessível em: `https://prometheus.railway.app`
- [ ] Status → Targets → `promptzero-backend` está **UP (verde)**
- [ ] Query `up{job="promptzero-backend"}` retorna `1`
- [ ] Query `http_requests_total` retorna dados

### Grafana
- [ ] Grafana acessível em: `https://grafana.railway.app`
- [ ] Data source Prometheus configurado
- [ ] "Save & Test" mostra ✅ "Data source is working"
- [ ] Explore → Query `up` → Mostra o backend

### Dashboard
- [ ] Dashboard "PromptZero Backend Metrics" importado
- [ ] Gráficos mostram dados (pode levar 1-2 minutos)
- [ ] Time range ajustado para "Last 5 minutes"

Se todos os itens estão ✅ → **Parabéns! Tudo funcionando!** 🎉

---

## 🐛 Troubleshooting

### Problema 1: Prometheus não encontra o backend

**Sintoma:** Target está DOWN (vermelho)

**Diagnóstico:**

1. Verifique a URL no arquivo `prometheus.yml`:
   ```bash
   # Deve ser a URL pública do Railway, SEM https://
   prompt-zero-backend-production-xxxx.up.railway.app
   ```

2. Teste manualmente:
   ```bash
   curl https://prompt-zero-backend-production-xxxx.up.railway.app/metrics
   ```

**Solução:**
- Corrija a URL no `prometheus.yml`
- Faça redeploy do Prometheus
- Aguarde 30 segundos

### Problema 2: Grafana não conecta ao Prometheus

**Sintoma:** "Bad Gateway" ou "Connection refused"

**Solução:**

Tente as URLs na ordem:

1. URL interna (mais rápida):
   ```
   http://railway-prometheus.railway.internal:9090
   ```

2. Nome do serviço:
   ```
   http://railway-prometheus:9090
   ```

3. URL pública:
   ```
   https://railway-prometheus-production-xxxx.up.railway.app
   ```

### Problema 3: Dashboard vazio

**Sintoma:** Painéis não mostram dados

**Diagnóstico:**

1. Verifique no Explore se há dados:
   ```promql
   http_requests_total
   ```

2. Se não há dados → O Prometheus não está coletando

3. Se há dados → Problema é no dashboard

**Solução:**

1. Gere tráfego no backend (faça requisições)
2. Aguarde 30-60 segundos
3. Ajuste time range para "Last 5 minutes"
4. Recarregue (F5)

### Problema 4: Métricas não aparecem no Prometheus

**Sintoma:** Query `http_requests_total` retorna vazio

**Solução:**

1. Confirme que o backend está expondo métricas:
   ```bash
   curl https://backend.railway.app/metrics | grep http_requests
   ```

2. Verifique target no Prometheus (deve estar UP)

3. Aguarde 30 segundos após target ficar UP

4. Execute a query novamente

---

## 📚 Próximos Passos

Depois de ter tudo funcionando:

1. **Configure alertas**
   - Grafana → Alerting → New alert rule
   - Exemplo: alerta se error rate > 5%

2. **Customize dashboards**
   - Adicione métricas de negócio
   - Ex: total de prompts executados por hora

3. **Configure notificações**
   - Slack, email, PagerDuty, etc.
   - Grafana → Alerting → Contact points

4. **Adicione mais data sources**
   - PostgreSQL (métricas de banco)
   - Redis (se você usar)

5. **Configure backup**
   - Exporte dashboards regularmente
   - Versione no Git

---

## 🎯 Links Úteis

- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Grafana Tutorials](https://grafana.com/tutorials/)
- [Railway Docs](https://docs.railway.app/)

---

**Dúvidas?** Consulte os outros guias:
- `docs/PROMETHEUS-QUICKSTART.md` - Testar localmente
- `docs/PROMETHEUS-RAILWAY.md` - Guia completo Railway
- `docs/PROMETHEUS-RESUMO.md` - Resumo visual
