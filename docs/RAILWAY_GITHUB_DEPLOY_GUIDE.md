# Guia de Deploy: Configuração GitHub no Railway

## Visão Geral

Para fazer deploy da stack de observabilidade no Railway a partir do GitHub, você precisa criar **4 serviços separados**, cada um apontando para um diretório específico do mesmo repositório.

---

## Estrutura do Repositório

```
prompt-zero/
├── backend/
├── frontend/
└── observability/
    ├── grafana/
    │   ├── Dockerfile
    │   ├── railway.json
    │   ├── provisioning/
    │   │   └── datasources/
    │   │       └── datasources.yml
    │   └── dashboards/
    ├── loki/
    │   ├── Dockerfile
    │   ├── railway.json
    │   └── loki-config.yml
    ├── prometheus/
    │   ├── Dockerfile
    │   ├── railway.json
    │   └── prometheus-railway.yml
    └── tempo/
        ├── Dockerfile
        ├── railway.json
        └── tempo-config.yml
```

---

## Passo a Passo: Criar Serviços no Railway

### 1. Grafana Service

#### a) Criar novo serviço
1. No Railway Dashboard, clique em **"+ New"** → **"GitHub Repo"**
2. Selecione o repositório: `PhAlves23/prompt-zero`
3. Railway vai criar um serviço automaticamente

#### b) Configurar Root Directory
1. Vá em **Settings** do serviço
2. Em **"Source"**, encontre **"Root Directory"**
3. Configure:
   ```
   Root Directory: observability/grafana
   ```

#### c) Configurar Build
1. Em **Settings** → **"Build"**
2. Confirme:
   ```
   Builder: Dockerfile
   Dockerfile Path: Dockerfile
   ```

#### d) Adicionar Variáveis de Ambiente
1. Vá em **"Variables"**
2. Adicione:
   ```bash
   # Admin
   GF_SECURITY_ADMIN_USER=admin
   GF_SECURITY_ADMIN_PASSWORD=<gerar senha segura>
   GF_SECURITY_SECRET_KEY=<gerar com: openssl rand -hex 32>
   
   # Server
   GF_SERVER_ROOT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
   GF_SERVER_PROTOCOL=https
   GF_SECURITY_COOKIE_SECURE=true
   GF_SECURITY_COOKIE_SAMESITE=strict
   
   # Datasources (aguardar URLs dos outros serviços)
   PROMETHEUS_INTERNAL_URL=http://prometheus.railway.internal:9090
   LOKI_INTERNAL_URL=http://loki.railway.internal:3100
   TEMPO_INTERNAL_URL=http://tempo.railway.internal:3200
   
   # Plugins
   GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel,grafana-worldmap-panel
   
   # Security
   GF_USERS_ALLOW_SIGN_UP=false
   GF_AUTH_ANONYMOUS_ENABLED=false
   
   # Opcional: controlar versão
   VERSION=11.5.2
   ```

#### e) Adicionar Volume
1. Em **"Settings"** → **"Volumes"**
2. Clique em **"+ Add Volume"**
3. Configure:
   ```
   Mount Path: /var/lib/grafana
   Size: 2 GB (inicialmente)
   ```

#### f) Configurar Networking
1. Em **"Settings"** → **"Networking"**
2. Clique em **"Generate Domain"** para criar URL pública
3. Anote a URL gerada (ex: `grafana-production-xxxx.up.railway.app`)

---

### 2. Prometheus Service

#### a) Criar novo serviço
1. No Railway Dashboard, clique em **"+ New"** → **"GitHub Repo"**
2. Selecione o mesmo repositório: `PhAlves23/prompt-zero`

#### b) Configurar Root Directory
1. Vá em **Settings** → **"Source"**
2. Configure:
   ```
   Root Directory: observability/prometheus
   ```

#### c) Adicionar Variáveis (Opcional)
```bash
VERSION=v3.2.1
```

#### d) Adicionar Volume
```
Mount Path: /prometheus
Size: 10 GB
```

#### e) NÃO gerar domínio público
- Prometheus deve ser **apenas interno**
- Não clique em "Generate Domain"
- Railway vai automaticamente registrar no DNS interno: `prometheus.railway.internal`

---

### 3. Loki Service

#### a) Criar novo serviço
1. **"+ New"** → **"GitHub Repo"** → `PhAlves23/prompt-zero`

#### b) Configurar Root Directory
```
Root Directory: observability/loki
```

#### c) Adicionar Variáveis (Opcional)
```bash
VERSION=3.4.2
```

#### d) Adicionar Volume
```
Mount Path: /loki
Size: 20 GB
```

#### e) NÃO gerar domínio público
- Apenas uso interno: `loki.railway.internal`

---

### 4. Tempo Service

#### a) Criar novo serviço
1. **"+ New"** → **"GitHub Repo"** → `PhAlves23/prompt-zero`

#### b) Configurar Root Directory
```
Root Directory: observability/tempo
```

#### c) Adicionar Variáveis (Opcional)
```bash
VERSION=2.9.0
```

#### d) Adicionar Volume
```
Mount Path: /var/tempo
Size: 20 GB
```

#### e) NÃO gerar domínio público
- Apenas uso interno: `tempo.railway.internal`

---

## Resumo de Configuração

| Serviço    | Root Directory              | Public Domain | Internal DNS                      | Volume Mount Path     | Volume Size |
|------------|-----------------------------|---------------|-----------------------------------|-----------------------|-------------|
| Grafana    | `observability/grafana`     | ✅ Sim        | `grafana.railway.internal:3000`   | `/var/lib/grafana`    | 2 GB        |
| Prometheus | `observability/prometheus`  | ❌ Não        | `prometheus.railway.internal:9090`| `/prometheus`         | 10 GB       |
| Loki       | `observability/loki`        | ❌ Não        | `loki.railway.internal:3100`      | `/loki`               | 20 GB       |
| Tempo      | `observability/tempo`       | ❌ Não        | `tempo.railway.internal:3200`     | `/var/tempo`          | 20 GB       |

---

## Ordem de Deploy

Para garantir que tudo funcione corretamente:

### 1. Deploy Infraestrutura (Backend Services)
```
1º → Prometheus (base para métricas)
2º → Loki (logs)
3º → Tempo (traces)
```

### 2. Aguardar todos ficarem "Active"
- Verifique no Railway que todos os 3 serviços estão rodando
- Confirme que não há erros de build ou deploy

### 3. Deploy Grafana (Frontend)
```
4º → Grafana (consome dados dos outros 3)
```

---

## Como Verificar se está Correto

### Após Deploy de Cada Serviço

1. **Verificar Build Logs:**
   ```
   ✅ Successfully built image
   ✅ Successfully deployed
   ```

2. **Verificar Service Logs:**
   - Prometheus: `Server is ready to receive web requests`
   - Loki: `Loki started`
   - Tempo: `Tempo is ready`
   - Grafana: `HTTP Server Listen`

3. **Verificar Internal DNS:**
   ```bash
   # No log do Grafana, deve aparecer:
   Provisioning datasources...
   Successfully provisioned datasource: Prometheus
   Successfully provisioned datasource: Loki
   Successfully provisioned datasource: Tempo
   ```

---

## Troubleshooting

### Erro: "Failed to provision datasource"

**Causa:** Grafana tentou conectar nos outros serviços antes deles estarem prontos.

**Solução:**
1. Aguarde todos os serviços (Prometheus, Loki, Tempo) ficarem "Active"
2. Faça **Restart** do Grafana service
3. Verifique os logs novamente

---

### Erro: "Could not find Dockerfile"

**Causa:** Root Directory configurado incorretamente.

**Solução:**
1. Vá em **Settings** → **"Source"** → **"Root Directory"**
2. Certifique-se de estar usando:
   - `observability/grafana` (não `/observability/grafana`)
   - Sem barra no início
   - Path relativo à raiz do repositório

---

### Erro: "Connection refused" nos datasources

**Causa:** Internal DNS não resolvendo ou serviços não iniciados.

**Solução:**
1. Verifique que TODOS os serviços estão "Active"
2. Confirme que as variáveis `*_INTERNAL_URL` estão corretas
3. Formato: `http://service-name.railway.internal:PORT`
4. Não usar `https://` para comunicação interna

---

## Checklist Final

Antes de considerar o deploy completo:

- [ ] 4 serviços criados no Railway
- [ ] Todos apontando para `PhAlves23/prompt-zero`
- [ ] Root Directories configurados corretamente
- [ ] Volumes criados e montados
- [ ] Variáveis de ambiente do Grafana configuradas
- [ ] Apenas Grafana com domínio público
- [ ] Todos os 4 serviços com status "Active"
- [ ] Grafana logs mostram datasources provisionados
- [ ] Acesso ao Grafana funcionando
- [ ] Login com admin funciona
- [ ] Datasources aparecem em Configuration → Data Sources
- [ ] Datasources testados (botão "Save & Test")

---

## Próximos Passos

Após deploy bem-sucedido:

1. **Configurar Backend e Frontend:**
   - Adicionar variáveis para enviar métricas/logs/traces
   - Ver: `docs/OBSERVABILITY_INTEGRATION.md`

2. **Criar Dashboards:**
   - Importar dashboards da comunidade
   - Criar dashboards customizados

3. **Configurar Alertas:**
   - Alertas de performance
   - Alertas de erros

4. **Monitorar Custos:**
   - Acompanhar uso de volumes
   - Ajustar retention policies se necessário

---

## Comandos Úteis

### Gerar senhas seguras:
```bash
# Para GF_SECURITY_ADMIN_PASSWORD
openssl rand -base64 32

# Para GF_SECURITY_SECRET_KEY
openssl rand -hex 32
```

### Testar conectividade interna (de dentro de um serviço):
```bash
# No Railway shell de qualquer serviço:
curl http://prometheus.railway.internal:9090/-/ready
curl http://loki.railway.internal:3100/ready
curl http://tempo.railway.internal:3200/ready
```

---

## Recursos Adicionais

- [Railway Docs: Root Directory](https://docs.railway.com/guides/build-configuration#root-directory-and-monorepos)
- [Railway Docs: Internal Networking](https://docs.railway.com/guides/private-networking)
- [Railway Docs: Volumes](https://docs.railway.com/guides/volumes)
- [Template Railway Grafana Stack](https://github.com/MykalMachon/railway-grafana-stack)
