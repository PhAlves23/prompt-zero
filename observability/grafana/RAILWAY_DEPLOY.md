# 🚀 Deploy do Grafana na Railway

## Opções de Deploy

Você tem **2 opções** para rodar o Grafana em produção:

### 🌥️ Opção 1: Grafana Cloud (Recomendado)

**Vantagens**:
- ✅ Free tier generoso (10k séries métricas + 50GB logs/mês)
- ✅ Zero manutenção
- ✅ Alta disponibilidade (99.9% SLA)
- ✅ Escalável automaticamente
- ✅ Backups automáticos
- ✅ Alertas e notificações inclusos

**Desvantagens**:
- ❌ Custos após free tier (~$8/mês)
- ❌ Dados fora do seu ambiente

**Como fazer**:

1. **Criar conta**: https://grafana.com/auth/sign-up

2. **Configurar datasources** (Prometheus, Loki, Tempo):
   - Connections → Add New Connection
   - Adicionar URLs públicas dos seus serviços no Railway

3. **Upload do dashboard**:
   ```bash
   # Definir variáveis
   export GRAFANA_CLOUD_URL="https://your-instance.grafana.net"
   export GRAFANA_CLOUD_API_KEY="your-api-key"
   
   # Fazer upload
   ./scripts/upload-dashboard-to-grafana-cloud.sh
   ```

---

### 🏠 Opção 2: Self-Hosted na Railway

**Vantagens**:
- ✅ Controle total
- ✅ Dados no seu ambiente
- ✅ Sem limites de free tier
- ✅ Customização completa

**Desvantagens**:
- ❌ Custo de recursos (~$5-10/mês)
- ❌ Manutenção manual
- ❌ Você gerencia backups

**Como fazer**:

#### Passo 1: Deploy do Grafana

```bash
# De dentro da pasta observability/grafana
cd observability/grafana

# Deploy via Railway CLI
railway up --service grafana-production

# Ou via Railway Dashboard:
# 1. New Service → Deploy from GitHub Repo
# 2. Root Directory: observability/grafana
# 3. Build Config: Usar Dockerfile
```

#### Passo 2: Configurar Variáveis de Ambiente

No Railway Dashboard → Grafana Service → Variables:

```bash
# Autenticação (OBRIGATÓRIO mudar em prod!)
GF_SECURITY_ADMIN_PASSWORD=SenhaForteAqui123!

# URL pública (Railway fornece automaticamente)
GF_SERVER_ROOT_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Segurança
GF_SECURITY_SECRET_KEY=chave-secreta-aleatoria-32-caracteres
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false

# Datasources (URLs internas do Railway)
# Prometheus
GF_DATASOURCES_PROMETHEUS_URL=http://prometheus.railway.internal:9090

# Loki  
GF_DATASOURCES_LOKI_URL=http://loki.railway.internal:3100

# Tempo
GF_DATASOURCES_TEMPO_URL=http://tempo.railway.internal:3200
```

#### Passo 3: Configurar Volume Persistente

No Railway Dashboard → Grafana Service → Settings → Volumes:

```bash
# Adicionar volume
Mount Path: /var/lib/grafana
Size: 5GB (suficiente para dashboards e configurações)
```

**Importante**: Sem volume, você perde os dados a cada deploy!

#### Passo 4: Expor Publicamente

No Railway Dashboard → Grafana Service → Settings → Networking:

```bash
# Gerar domínio público
✅ Generate Domain

# Resultado: https://grafana-production-xyz.up.railway.app
# Railway adiciona HTTPS automaticamente!
```

#### Passo 5: Verificar Dashboard

1. Acesse a URL pública
2. Login: `admin` / `SenhaForteAqui123!` (a que você definiu)
3. Navegue para: **Dashboards** → **PromptZero** → **Backend Overview**
4. Dashboard deve aparecer automaticamente! ✨

## 🔐 Segurança em Produção

### NUNCA use `admin/admin` em produção!

Configure autenticação forte:

#### Opção A: OAuth (Google, GitHub)

No Railway, adicionar variáveis:

```bash
# GitHub OAuth
GF_AUTH_GITHUB_ENABLED=true
GF_AUTH_GITHUB_CLIENT_ID=your-github-client-id
GF_AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
GF_AUTH_GITHUB_SCOPES=user:email,read:org
GF_AUTH_GITHUB_ALLOWED_ORGANIZATIONS=your-org

# Google OAuth
GF_AUTH_GOOGLE_ENABLED=true
GF_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
GF_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
GF_AUTH_GOOGLE_ALLOWED_DOMAINS=yourdomain.com
```

#### Opção B: LDAP/Active Directory

```bash
GF_AUTH_LDAP_ENABLED=true
GF_AUTH_LDAP_CONFIG_FILE=/etc/grafana/ldap.toml
```

#### Opção C: SAML (Enterprise)

```bash
GF_AUTH_SAML_ENABLED=true
GF_AUTH_SAML_CERTIFICATE_PATH=/etc/grafana/saml.crt
GF_AUTH_SAML_PRIVATE_KEY_PATH=/etc/grafana/saml.key
```

## 🔗 Conectar aos Serviços do Railway

### URLs Internas (Recomendado)

Railway fornece networking interno para serviços se comunicarem:

```bash
# No Grafana, configurar datasources com URLs internas:
Prometheus: http://prometheus.railway.internal:9090
Loki:       http://loki.railway.internal:3100
Tempo:      http://tempo.railway.internal:3200
```

### URLs Públicas (Alternativa)

Se preferir usar URLs públicas:

```bash
# Expor serviços publicamente
Prometheus: https://prometheus-production-xyz.up.railway.app
Loki:       https://loki-production-xyz.up.railway.app
Tempo:      https://tempo-production-xyz.up.railway.app

# Configurar no Grafana com as URLs públicas
```

**Atenção**: URLs públicas consomem mais banda e são menos seguras.

## 📊 Verificar se Está Funcionando

### 1. Healthcheck

```bash
curl https://grafana-production-xyz.up.railway.app/api/health

# Deve retornar:
{
  "commit": "...",
  "database": "ok",
  "version": "10.x.x"
}
```

### 2. Testar Datasources

Na UI do Grafana:
1. Configuration → Data Sources
2. Clicar em cada datasource (Prometheus, Loki, Tempo)
3. Clicar em "Test"
4. Deve aparecer: ✅ "Data source is working"

### 3. Ver Métricas

No dashboard "Backend Overview":
- Se aparecerem gráficos com dados = ✅ Funcionando!
- Se aparecer "No data" = ❌ Verificar datasources

## 🚨 Troubleshooting

### Problema: Dashboard não aparece

**Causa**: Provisioning não funcionou

**Solução**:
```bash
# Verificar logs do Grafana
railway logs --service grafana-production

# Deve mostrar:
# "Dashboard provisioned successfully"
```

### Problema: "No data" nos gráficos

**Causa**: Prometheus não está alcançando o backend

**Solução 1**: Verificar se backend está expondo métricas
```bash
curl https://backend-production-xyz.up.railway.app/api/metrics
```

**Solução 2**: Configurar Prometheus para fazer scrape do backend
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'promptzero-backend'
    static_configs:
      - targets: ['backend.railway.internal:3001']
    metrics_path: '/api/metrics'
```

### Problema: Grafana não inicia

**Causa**: Falta de variáveis obrigatórias

**Solução**: Verificar se todas as env vars estão definidas
```bash
railway run env | grep GF_
```

## 💰 Custos Estimados

### Grafana Cloud (Free Tier)
- **Métricas**: 10,000 séries gratuitas
- **Logs**: 50GB/mês grátis
- **Traces**: 50GB/mês grátis
- **Custo adicional**: ~$8/mês após limits

### Self-Hosted na Railway
- **Grafana**: ~$5/mês (512MB RAM, 0.5 vCPU)
- **Prometheus**: ~$10/mês (1GB RAM, 1 vCPU)
- **Loki**: ~$10/mês (1GB RAM, 1 vCPU)
- **Tempo**: ~$10/mês (1GB RAM, 1 vCPU)
- **Total**: ~$35/mês para stack completa

**Recomendação**: Use Grafana Cloud para começar (free tier) e migre para self-hosted se ultrapassar os limites.

## 📚 Próximos Passos

- [ ] Escolher entre Grafana Cloud ou Self-hosted
- [ ] Fazer deploy do Grafana
- [ ] Configurar autenticação forte
- [ ] Upload do dashboard via script
- [ ] Testar datasources
- [ ] Configurar alertas críticos
- [ ] Adicionar membros da equipe
- [ ] Instalar app mobile

## 🆘 Precisa de Ajuda?

- **Grafana Docs**: https://grafana.com/docs/
- **Railway Docs**: https://docs.railway.app/
- **Grafana Community**: https://community.grafana.com/
