# 🤖 Dashboard do Grafana - Provisionamento Automático

## ✅ Resposta Rápida

**Você NÃO precisa configurar manualmente!** Tudo é provisionado automaticamente via código.

## 🎯 Como Funciona (Provisioning as Code)

### 1. Estrutura de Arquivos

```
observability/grafana/
├── provisioning/
│   ├── datasources/
│   │   └── datasources.yml          ← Datasources (Prometheus, Loki, Tempo)
│   └── dashboards/
│       └── dashboards.yml            ← Config de onde ler dashboards
└── dashboards/
    └── backend-overview.json         ← Dashboard em JSON
```

### 2. O Que Acontece Automaticamente

Quando o Grafana inicia:

```
1. Lê provisioning/datasources/datasources.yml
   → Cria automaticamente: Prometheus, Loki, Tempo
   → Já com correlação configurada!

2. Lê provisioning/dashboards/dashboards.yml
   → Vê que deve ler dashboards de /var/lib/grafana/dashboards

3. Carrega todos os .json de dashboards/
   → backend-overview.json vira "PromptZero Backend Overview"
   → Aparece automaticamente na pasta "PromptZero"
```

**Resultado**: Você abre o Grafana e tudo já está lá! 🎉

### 3. Configuração no Docker Compose

```yaml
grafana:
  image: grafana/grafana:latest
  volumes:
    # Monta as configs de provisioning
    - ./observability/grafana/provisioning:/etc/grafana/provisioning
    
    # Monta os dashboards JSON
    - ./observability/grafana/dashboards:/var/lib/grafana/dashboards
    
    # Persiste dados do Grafana
    - grafana_data:/var/lib/grafana
```

## 🚀 Como Usar na Railway

### Opção 1: Grafana Cloud (Recomendado)

**Vantagem**: Grafana Cloud também suporta provisioning automático!

1. **Criar conta**: https://grafana.com

2. **Fazer deploy do dashboard via API**:

```bash
# Script para fazer upload do dashboard
curl -X POST "https://your-instance.grafana.net/api/dashboards/db" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @observability/grafana/dashboards/backend-overview.json
```

3. **Ou usar Terraform** (Infra as Code):

```hcl
# grafana.tf
resource "grafana_dashboard" "backend_overview" {
  config_json = file("${path.module}/observability/grafana/dashboards/backend-overview.json")
  folder      = grafana_folder.promptzero.id
}
```

### Opção 2: Self-Hosted na Railway

**Passo a passo**:

#### 1. Criar Dockerfile para Grafana com Provisioning

```dockerfile
# observability/grafana/Dockerfile
FROM grafana/grafana:latest

# Copiar configs de provisioning
COPY provisioning/ /etc/grafana/provisioning/

# Copiar dashboards
COPY dashboards/ /var/lib/grafana/dashboards/

# Variáveis de ambiente
ENV GF_SECURITY_ADMIN_USER=admin
ENV GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
ENV GF_USERS_ALLOW_SIGN_UP=false
ENV GF_AUTH_ANONYMOUS_ENABLED=false

# Plugins opcionais
ENV GF_INSTALL_PLUGINS=grafana-piechart-panel

EXPOSE 3000
```

#### 2. Criar railway.json para o Grafana

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "observability/grafana/Dockerfile"
  },
  "deploy": {
    "runtime": "V2",
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### 3. Deploy na Railway

```bash
# Via Railway CLI (de dentro da pasta observability/grafana)
railway up --service grafana
```

#### 4. Configurar Volume para Persistência

No Railway Dashboard:
- Grafana Service → Settings → Volumes
- Add Volume: `/var/lib/grafana` (para persistir dados)

### Opção 3: Atualizar Dashboard via Script

Se você quiser **atualizar o dashboard depois de deployado**:

```bash
#!/bin/bash
# scripts/update-grafana-dashboard.sh

GRAFANA_URL="https://your-grafana.railway.app"
API_KEY="your-api-key"
DASHBOARD_FILE="observability/grafana/dashboards/backend-overview.json"

# Fazer upload do dashboard
curl -X POST "$GRAFANA_URL/api/dashboards/db" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$DASHBOARD_FILE"

echo "Dashboard atualizado com sucesso!"
```

## 📝 Como Criar Novos Dashboards

### Método 1: Editar JSON Diretamente

1. **Duplicar arquivo existente**:
```bash
cp observability/grafana/dashboards/backend-overview.json \
   observability/grafana/dashboards/frontend-overview.json
```

2. **Editar o JSON**:
```json
{
  "title": "PromptZero Frontend Overview",
  "uid": "promptzero-frontend",
  "panels": [
    {
      "datasource": "Prometheus",
      "targets": [{
        "expr": "rate(nextjs_http_requests_total[5m])"
      }],
      "title": "Next.js Request Rate"
    }
  ]
}
```

3. **Reiniciar Grafana**:
```bash
docker-compose -f docker-compose.observability.yml restart grafana
```

### Método 2: Exportar da UI do Grafana

1. **Criar dashboard manualmente no Grafana**
2. **Exportar como JSON**:
   - Dashboard Settings → JSON Model
   - Copy JSON
3. **Salvar no repositório**:
```bash
# Salvar em observability/grafana/dashboards/new-dashboard.json
```
4. **Commit no git**:
```bash
git add observability/grafana/dashboards/new-dashboard.json
git commit -m "feat: adicionar novo dashboard"
```

### Método 3: Usar Grafana Provisioning API

```bash
# Upload de dashboard via API
curl -X POST http://localhost:3300/api/dashboards/db \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d @observability/grafana/dashboards/backend-overview.json
```

## 🔄 Workflow Recomendado

### Para Desenvolvimento Local

```bash
# 1. Iniciar stack
./observability/start-observability.sh

# 2. Grafana já vem com dashboard configurado!
open http://localhost:3300
```

### Para Produção (Railway)

**Opção A: Grafana Cloud**
```bash
# 1. Criar conta no Grafana Cloud
# 2. Obter API key
# 3. Fazer upload via script
./scripts/upload-dashboard-to-grafana-cloud.sh
```

**Opção B: Self-hosted**
```bash
# 1. Deploy do Grafana na Railway com Dockerfile
railway up --service grafana

# 2. Dashboard já vem provisionado automaticamente!
# 3. Acessar: https://grafana-production.up.railway.app
```

## 📋 Checklist para Railway

### ✅ Local (Desenvolvimento)
- [x] Dashboard em JSON: `observability/grafana/dashboards/backend-overview.json`
- [x] Provisioning config: `observability/grafana/provisioning/`
- [x] Docker Compose configurado
- [x] Funciona automaticamente ao rodar `docker-compose up`

### ⬜ Railway (Produção)

**Se usar Grafana Cloud**:
- [ ] Criar conta no Grafana Cloud
- [ ] Obter API key
- [ ] Fazer upload do dashboard via API ou Terraform
- [ ] Configurar datasources (Prometheus, Loki, Tempo)

**Se usar Self-hosted**:
- [ ] Criar Dockerfile do Grafana com provisioning
- [ ] Fazer deploy na Railway
- [ ] Configurar volume persistente
- [ ] Configurar senha forte (via env var `GRAFANA_ADMIN_PASSWORD`)
- [ ] Expor via Railway public URL
- [ ] Configurar HTTPS (Railway faz automaticamente)

## 🎨 Exemplos de Dashboards Prontos

Você pode importar dashboards da comunidade:

```bash
# Dashboard IDs populares:
# - 1860: Node Exporter Full
# - 11074: Postgres Overview
# - 12486: Loki Dashboard
# - 14282: Tempo Operational

# Importar via CLI:
curl -X POST http://localhost:3300/api/dashboards/import \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{
    "dashboard": {
      "id": null,
      "uid": null,
      "title": "Node Exporter Full"
    },
    "overwrite": true,
    "inputs": [{
      "name": "DS_PROMETHEUS",
      "type": "datasource",
      "pluginId": "prometheus",
      "value": "Prometheus"
    }],
    "folderId": 0
  }' \
  -d "dashboard=$(curl https://grafana.com/api/dashboards/1860/revisions/latest/download)"
```

## 🔧 Troubleshooting

### Dashboard não aparece após restart

**Causa**: Caminho do volume está errado

**Solução**:
```bash
# Verificar se os arquivos estão montados
docker exec grafana ls -la /var/lib/grafana/dashboards/
docker exec grafana ls -la /etc/grafana/provisioning/

# Deve listar: backend-overview.json, datasources.yml, etc.
```

### Dashboard aparece mas sem dados

**Causa**: Datasources não configuradas

**Solução**:
```bash
# Verificar datasources no Grafana
# Configuration → Data Sources
# Deve ter: Prometheus, Loki, Tempo (todos verde)

# Testar conexão:
curl http://localhost:3300/api/datasources
```

### Mudanças no JSON não aparecem

**Causa**: Cache do Grafana

**Solução**:
```bash
# Forçar reload
docker-compose -f docker-compose.observability.yml restart grafana

# Ou limpar volumes e recriar
docker-compose -f docker-compose.observability.yml down -v
docker-compose -f docker-compose.observability.yml up -d
```

## 📚 Recursos Adicionais

- **Grafana Provisioning Docs**: https://grafana.com/docs/grafana/latest/administration/provisioning/
- **Dashboard JSON Schema**: https://grafana.com/docs/grafana/latest/dashboards/json-model/
- **Terraform Grafana Provider**: https://registry.terraform.io/providers/grafana/grafana/latest/docs
- **Grafana API Docs**: https://grafana.com/docs/grafana/latest/developers/http_api/

## 🎉 Resumo

**TL;DR**:

✅ **Local**: Dashboard já está em JSON e sobe automaticamente  
✅ **Produção**: Duas opções:
  1. **Grafana Cloud**: Upload via API/Terraform
  2. **Self-hosted**: Dockerfile com provisioning incluído

**Você NÃO precisa clicar em nada no Grafana!** Tudo via código! 🚀
