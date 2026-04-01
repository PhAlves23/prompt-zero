# Configuração Prometheus + Grafana no Railway

## Arquitetura

```
Backend (Railway)
    ↓ expõe /metrics
Prometheus (Railway) ← scrape do backend
    ↓ armazena dados
Grafana (Railway) ← visualiza dados do Prometheus
```

## Opção 1: Prometheus no Railway (Recomendado)

### Passo 1: Criar serviço Prometheus no Railway

1. No seu projeto Railway, clique em **"+ New"**
2. Selecione **"Empty Service"**
3. Nome: `prometheus`

### Passo 2: Configurar Dockerfile para Prometheus

Crie um novo repositório ou pasta no seu projeto com:

**`Dockerfile`**:
```dockerfile
FROM prom/prometheus:latest

# Copiar configuração customizada
COPY prometheus.yml /etc/prometheus/prometheus.yml

EXPOSE 9090

CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus", \
     "--web.console.libraries=/usr/share/prometheus/console_libraries", \
     "--web.console.templates=/usr/share/prometheus/consoles"]
```

**`prometheus.yml`**:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape do backend PromptZero no Railway
  - job_name: 'promptzero-backend'
    metrics_path: '/metrics'
    scheme: 'https'
    static_configs:
      - targets: ['seu-backend.up.railway.app']
        labels:
          env: 'production'
          service: 'backend'

  # Self-monitoring do Prometheus
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

**Substitua** `seu-backend.up.railway.app` pela URL real do seu backend no Railway!

### Passo 3: Deploy do Prometheus

1. Conecte o repositório ao Railway ou faça upload dos arquivos
2. Railway vai detectar o Dockerfile e fazer build
3. Anote a URL do Prometheus: `https://seu-prometheus.up.railway.app`

### Passo 4: Configurar Grafana

Agora no seu Grafana do Railway:

1. **Configuration** → **Data sources** → **Add data source**
2. Selecione **Prometheus**
3. **URL**: Use a **URL interna** do Railway se possível:
   ```
   http://prometheus.railway.internal:9090
   ```
   
   Ou use a URL pública:
   ```
   https://seu-prometheus.up.railway.app
   ```

4. **Scrape interval**: `15s`
5. **Clique em "Save & Test"** - deve mostrar "Data source is working"

### Passo 5: Importar Dashboard

No Grafana:

1. **Dashboards** → **Import**
2. Copie o conteúdo do arquivo `grafana/provisioning/dashboards/promptzero-backend.json` (do seu projeto local)
3. Cole no campo "Import via panel json"
4. Selecione o data source Prometheus que você acabou de criar
5. Clique em **Import**

Pronto! Dashboard funcionando! 🎉

---

## Opção 2: Usar Grafana Cloud (Mais Simples)

Se não quiser gerenciar o Prometheus, use o Grafana Cloud:

### Passo 1: Criar conta no Grafana Cloud

1. Acesse: https://grafana.com/
2. Crie conta gratuita (free tier é generoso)
3. Crie um stack (região: escolha a mais próxima)

### Passo 2: Configurar Prometheus Agent no Railway

O Grafana Cloud fornece um **Prometheus Agent** que você roda no Railway para fazer scraping.

1. No Grafana Cloud, vá em **Configuration** → **Integrations**
2. Selecione **Prometheus** → **Send Metrics**
3. Copie o snippet de configuração fornecido

Exemplo de configuração:

```yaml
# prometheus-agent.yml
global:
  scrape_interval: 15s

remote_write:
  - url: https://prometheus-prod-XX-XXXX.grafana.net/api/prom/push
    basic_auth:
      username: 123456
      password: YOUR_GRAFANA_CLOUD_API_KEY

scrape_configs:
  - job_name: 'promptzero-backend'
    metrics_path: '/metrics'
    scheme: 'https'
    static_configs:
      - targets: ['seu-backend.up.railway.app']
```

### Passo 3: Deploy do Agent no Railway

Crie um serviço no Railway com:

**`Dockerfile`**:
```dockerfile
FROM prom/prometheus:latest

COPY prometheus-agent.yml /etc/prometheus/prometheus.yml

EXPOSE 9090

CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--web.enable-lifecycle", \
     "--storage.agent.path=/prometheus"]
```

### Passo 4: Visualizar no Grafana Cloud

Acesse o Grafana Cloud e as métricas já estarão disponíveis!

Importe o dashboard do PromptZero:
1. **Dashboards** → **Import**
2. Cole o JSON do dashboard
3. Selecione o data source (já configurado automaticamente)

---

## Opção 3: Usar o Grafana Railway + Prometheus Local

Se você quer manter o Grafana no Railway mas rodar Prometheus localmente:

### Passo 1: Rodar Prometheus localmente

```bash
# No seu projeto local
docker compose -f docker-compose.prometheus.yml up -d prometheus
```

### Passo 2: Expor Prometheus com ngrok ou Cloudflare Tunnel

**Usando ngrok**:
```bash
ngrok http 9090
```

Anote a URL fornecida: `https://xxxx-xxxx-xxxx.ngrok.io`

**Usando Cloudflare Tunnel**:
```bash
cloudflared tunnel --url http://localhost:9090
```

### Passo 3: Configurar Grafana Railway

No Grafana do Railway:
1. **Configuration** → **Data sources** → **Add data source**
2. Selecione **Prometheus**
3. **URL**: Cole a URL do ngrok/cloudflare
4. **Save & Test**

**Desvantagem**: Seu computador precisa ficar ligado

---

## Opção 4: Backend Railway expõe métricas → Grafana lê diretamente

**ATENÇÃO**: Isso **NÃO FUNCIONA** porque o Grafana precisa do Prometheus como intermediário.

O Grafana não consegue ler o formato de métricas do Prometheus diretamente do endpoint `/metrics`.

---

## Recomendação

Para seu caso (já tem Grafana no Railway):

**Escolha a Opção 1** (Prometheus no Railway também)

Vantagens:
- Tudo centralizado no Railway
- Não depende de computador local
- Infraestrutura completa
- Fácil de manter

**OU escolha a Opção 2** (Grafana Cloud)

Vantagens:
- Não precisa gerenciar Prometheus
- Free tier generoso
- Infraestrutura gerenciada
- Alertas inclusos
- Múltiplos usuários no free tier

---

## Checklist de Configuração

- [ ] Backend expõe `/metrics` (já está ✅)
- [ ] Prometheus faz scraping do backend
- [ ] Grafana conecta ao Prometheus
- [ ] Dashboard importado no Grafana
- [ ] Métricas aparecendo nos gráficos

---

## Testando se está funcionando

### 1. Testar endpoint do backend

```bash
curl https://seu-backend.up.railway.app/metrics
```

Deve retornar métricas em formato Prometheus.

### 2. Testar Prometheus (se no Railway)

```bash
curl https://seu-prometheus.up.railway.app/api/v1/targets
```

Deve mostrar o backend como target "UP".

### 3. Testar Grafana

1. Acesse o Grafana
2. **Explore** → Selecione data source Prometheus
3. Digite query: `up`
4. Clique em **Run Query**
5. Deve mostrar resultado `up{job="promptzero-backend"} 1`

---

## Estrutura final no Railway

```
Railway Project: PromptZero
├── backend (NestJS)
│   └── Expõe: https://backend.railway.app/metrics
├── frontend (Next.js)
│   └── Expõe: https://frontend.railway.app
├── prometheus (Prometheus)
│   ├── Scrape: backend/metrics a cada 15s
│   └── Expõe: https://prometheus.railway.app
└── grafana (Grafana)
    ├── Lê dados do: prometheus
    └── Expõe: https://grafana.railway.app
```

---

## Próximos passos

Depois de configurar:

1. Configure alertas no Grafana
2. Crie dashboards customizados
3. Configure notificações (Slack, email)
4. Adicione mais data sources (PostgreSQL, Redis)
5. Configure backup do Grafana
6. Configure usuários e permissões

---

## Arquivo de referência

Use o dashboard pronto que criei:
- Arquivo: `grafana/provisioning/dashboards/promptzero-backend.json`
- Copie o conteúdo e importe no Grafana Railway

---

## Troubleshooting Railway

### Prometheus não consegue acessar backend

**Problema**: Target mostra "DOWN" no Prometheus

**Soluções**:
1. Verifique se a URL do backend está correta
2. Verifique se `/metrics` está acessível publicamente
3. Use URL interna do Railway se possível: `http://backend.railway.internal:3001/metrics`

### Grafana não conecta ao Prometheus

**Problema**: "Bad Gateway" ou "Connection refused"

**Soluções**:
1. Use URL interna: `http://prometheus.railway.internal:9090`
2. Se não funcionar, use URL pública
3. Verifique se o Prometheus está rodando

### Dashboard vazio

**Problema**: Gráficos não mostram dados

**Soluções**:
1. Verifique se há tráfego no backend
2. Ajuste o time range (últimos 15 minutos)
3. Verifique no Explore se há dados: query `up`
4. Aguarde 1-2 minutos para dados aparecerem
