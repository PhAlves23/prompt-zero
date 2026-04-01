# 🚀 Guia Rápido - Grafana Dashboard

## ⚡ Início Rápido (1 minuto)

```bash
# 1. Iniciar stack de observabilidade
./observability/start-observability.sh

# 2. Iniciar backend
cd backend && yarn dev

# 3. Abrir Grafana
open http://localhost:3300
# Login: admin / admin
```

## 📊 O Que Você Vai Ver

### Dashboard Atual: "PromptZero Backend Overview"

| Painel | O Que Mostra | Valor Ideal |
|--------|-------------|------------|
| **Request Rate** | Requisições/segundo | Varia conforme uso |
| **Request Duration** | Latência (P95, P99) | < 200ms |
| **Error Rate** | Erros 5xx/segundo | 0 |
| **Memory Usage** | RAM consumida | < 1GB |

## 🔍 Como Navegar

### 1. Ver Todas as Métricas
- **Explore** → **Prometheus**
- Digite query: `http_requests_total`

### 2. Ver Logs
- **Explore** → **Loki**
- Digite query: `{service="promptzero-backend"}`

### 3. Ver Traces
- **Explore** → **Tempo**
- Digite query: `{service.name="promptzero-backend"}`

## 🎯 URLs de Acesso

| Serviço | URL Local | Uso |
|---------|-----------|-----|
| **Grafana** | http://localhost:3300 | Dashboards visuais |
| **Prometheus** | http://localhost:9090 | Queries de métricas |
| **Loki** | http://localhost:3100 | Agregação de logs |
| **Tempo** | http://localhost:3200 | Distributed tracing |

## 🌐 Produção (Railway)

### Opções

**1. Grafana Cloud** (Recomendado)
- ✅ Free tier generoso
- ✅ Zero manutenção
- ✅ Alta disponibilidade
- 👉 https://grafana.com

**2. Self-hosted no Railway**
- Fazer deploy dos serviços Prometheus, Loki, Tempo, Grafana
- Configurar volumes persistentes
- Mais trabalho, mais controle

## 🚨 Alertas Recomendados

1. **Alta taxa de erros**: > 5% de erros 5xx
2. **Latência alta**: P95 > 500ms
3. **Memória alta**: > 1.5GB
4. **Serviço down**: 0 requests em 5min

## 📱 Mobile App

- iOS: https://apps.apple.com/app/grafana/id1463677462
- Android: https://play.google.com/store/apps/details?id=com.grafana.grafana

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Sem métricas | `curl localhost:3001/api/metrics` |
| Sem logs | Verificar `LOKI_ENABLED=true` no .env |
| Sem traces | Verificar `TRACING_ENABLED=true` no .env |
| Target DOWN no Prometheus | Checar se backend está rodando |

## 📚 Docs Completos

- **Setup completo**: [GRAFANA_DASHBOARD_SETUP.md](./GRAFANA_DASHBOARD_SETUP.md)
- **Observabilidade**: [OBSERVABILIDADE.md](./OBSERVABILIDADE.md)
- **Stack README**: [observability/README.md](../observability/README.md)
