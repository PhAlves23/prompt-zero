# 🔧 CORREÇÃO URGENTE: Reconectar Serviços ao Repositório Correto

## Problema Identificado

❌ **Loki, Prometheus e Tempo estão conectados ao template externo:**
- Source Repo: `MykalMachon/railway-grafana-stack`
- Status: **"GitHub Repo not found"**
- Isso impede novos deploys e atualizações

✅ **Grafana está correto:**
- Source Repo: `PhAlves23/prompt-zero`
- Root Directory: `/observability/grafana`

---

## Solução: Reconectar aos Seus Repositório

### 1. Reconectar Loki

#### a) Desconectar do template antigo
1. Vá em **Loki** → **Settings** → **Source**
2. Clique em **"Disconnect"** (ao lado de "MykalMachon/railway-grafana-stack")
3. Confirme a desconexão

#### b) Conectar ao seu repositório
1. Após desconectar, clique em **"Connect GitHub Repo"**
2. Selecione: `PhAlves23/prompt-zero`
3. Branch: `main`

#### c) Configurar Root Directory
1. Em **"Root Directory"**, configure:
   ```
   observability/loki
   ```
   ⚠️ **IMPORTANTE:** Sem `/` no início! Use `observability/loki` não `/observability/loki`

#### d) Verificar Dockerfile Path
1. O Railway vai detectar automaticamente
2. Deve ficar: `Dockerfile` (relativo ao Root Directory)
3. Se não detectar, adicione variável:
   ```
   RAILWAY_DOCKERFILE_PATH=Dockerfile
   ```

#### e) Trigger Deploy
1. Clique em **"Deploy"** na aba Deployments
2. Ou faça um commit qualquer no GitHub para trigger automático

---

### 2. Reconectar Prometheus

#### a) Desconectar do template antigo
1. Vá em **Prometheus** → **Settings** → **Source**
2. Clique em **"Disconnect"**
3. Confirme

#### b) Conectar ao seu repositório
1. **"Connect GitHub Repo"** → `PhAlves23/prompt-zero`
2. Branch: `main`

#### c) Configurar Root Directory
```
observability/prometheus
```

#### d) Verificar Dockerfile Path
- Deve detectar automaticamente
- Ou adicione: `RAILWAY_DOCKERFILE_PATH=Dockerfile`

#### e) Deploy

---

### 3. Reconectar Tempo

#### a) Desconectar do template antigo
1. **Tempo** → **Settings** → **Source**
2. **"Disconnect"**

#### b) Conectar ao seu repositório
1. `PhAlves23/prompt-zero`
2. Branch: `main`

#### c) Configurar Root Directory
```
observability/tempo
```

#### d) Verificar Dockerfile Path
- Auto-detectado ou `RAILWAY_DOCKERFILE_PATH=Dockerfile`

#### e) Deploy

---

## Ordem de Reconexão e Deploy

Para garantir que tudo funcione:

```
1º → Prometheus (reconectar + deploy)
   ↓ Aguardar ficar "Active"
   
2º → Loki (reconectar + deploy)
   ↓ Aguardar ficar "Active"
   
3º → Tempo (reconectar + deploy)
   ↓ Aguardar ficar "Active"
   
4º → Grafana (restart para reconectar datasources)
```

---

## Checklist de Configuração Correta

Após reconectar cada serviço, verifique:

### ✅ Loki
- [ ] Source Repo: `PhAlves23/prompt-zero`
- [ ] Root Directory: `observability/loki`
- [ ] Branch: `main`
- [ ] Status: Não mostra "GitHub Repo not found"
- [ ] Volume: `/loki` montado (se já tiver)
- [ ] Deploy: Sucesso

### ✅ Prometheus  
- [ ] Source Repo: `PhAlves23/prompt-zero`
- [ ] Root Directory: `observability/prometheus`
- [ ] Branch: `main`
- [ ] Status: Não mostra "GitHub Repo not found"
- [ ] Volume: `/prometheus` montado (se já tiver)
- [ ] Deploy: Sucesso

### ✅ Tempo
- [ ] Source Repo: `PhAlves23/prompt-zero`
- [ ] Root Directory: `observability/tempo`
- [ ] Branch: `main`
- [ ] Status: Não mostra "GitHub Repo not found"
- [ ] Volume: `/var/tempo` montado (se já tiver)
- [ ] Deploy: Sucesso

### ✅ Grafana
- [x] Source Repo: `PhAlves23/prompt-zero` ✅ **JÁ CORRETO**
- [x] Root Directory: `observability/grafana` ✅ **JÁ CORRETO**
- [x] Variáveis configuradas ✅
- [ ] Após outros serviços: Restart
- [ ] Datasources funcionando

---

## Verificar Deploy Bem-Sucedido

### Loki Logs (deve aparecer):
```
level=info msg="Loki started"
level=info msg="server listening on addresses"
```

### Prometheus Logs:
```
msg="Server is ready to receive web requests."
msg="Completed loading of configuration file"
```

### Tempo Logs:
```
msg="Tempo is ready"
msg="HTTP server listening"
```

### Grafana Logs (após restart):
```
msg="HTTP Server Listen"
msg="Initializing provisioning datasources"
msg="Successfully provisioned datasource" name=Prometheus
msg="Successfully provisioned datasource" name=Loki
msg="Successfully provisioned datasource" name=Tempo
```

---

## Troubleshooting

### Erro: "Failed to build"

**Sintoma:** Build falha após reconectar

**Causa:** Root Directory incorreto ou Dockerfile não encontrado

**Solução:**
1. Verifique Root Directory: `observability/loki` (sem `/` no início)
2. Confirme que arquivo existe: `observability/loki/Dockerfile` no GitHub
3. Verifique branch: deve ser `main`

---

### Erro: "No such file or directory: loki-config.yml"

**Sintoma:** Build passa mas container falha ao iniciar

**Causa:** Arquivo de configuração não encontrado relativo ao Root Directory

**Solução:**
1. Confirme que existe: `observability/loki/loki-config.yml` no GitHub
2. Verifique Dockerfile COPY path: `COPY loki-config.yml /etc/loki/local-config.yaml`

---

### Grafana não conecta nos datasources

**Sintoma:** "Data source is not reachable"

**Causa:** Serviços não estão todos rodando ou variáveis incorretas

**Solução:**
1. Confirme que Loki, Prometheus, Tempo estão **"Active"**
2. Verifique variáveis do Grafana:
   ```
   PROMETHEUS_INTERNAL_URL=http://prometheus.railway.internal:9090
   LOKI_INTERNAL_URL=http://loki.railway.internal:3100
   TEMPO_INTERNAL_URL=http://tempo.railway.internal:3200
   ```
3. Restart do Grafana
4. Aguarde 1-2 minutos para DNS interno propagar

---

## Volumes - Próximo Passo

Após reconectar e deployar com sucesso, você precisa adicionar volumes:

### Loki Volume
```
Mount Path: /loki
Size: 20 GB
```

### Prometheus Volume
```
Mount Path: /prometheus
Size: 10 GB
```

### Tempo Volume
```
Mount Path: /var/tempo
Size: 20 GB
```

⚠️ **Nota:** Adicionar volume vai reiniciar o serviço.

---

## Resumo da Situação Atual vs Desejada

### ❌ Situação Atual (Incorreta)

```
Grafana     ✅ → PhAlves23/prompt-zero (observability/grafana)
Loki        ❌ → MykalMachon/railway-grafana-stack (/loki) [REPO NOT FOUND]
Prometheus  ❌ → MykalMachon/railway-grafana-stack (/prometheus) [REPO NOT FOUND]
Tempo       ❌ → MykalMachon/railway-grafana-stack (/tempo) [REPO NOT FOUND]
```

### ✅ Situação Desejada (Correta)

```
Grafana     ✅ → PhAlves23/prompt-zero (observability/grafana)
Loki        ✅ → PhAlves23/prompt-zero (observability/loki)
Prometheus  ✅ → PhAlves23/prompt-zero (observability/prometheus)
Tempo       ✅ → PhAlves23/prompt-zero (observability/tempo)
```

---

## Comando para Validar Estrutura no GitHub

Antes de reconectar, confirme que os arquivos estão no lugar certo:

```bash
# No seu terminal local
cd /Users/phalves/ph-projects/pessoal/prompt-zero

# Verificar estrutura
tree observability/
```

Deve mostrar:
```
observability/
├── grafana/
│   ├── Dockerfile ✅
│   ├── railway.json ✅
│   ├── provisioning/
│   │   └── datasources/
│   │       └── datasources.yml ✅
│   └── dashboards/
├── loki/
│   ├── Dockerfile ✅
│   ├── railway.json ✅
│   └── loki-config.yml ✅
├── prometheus/
│   ├── Dockerfile ✅
│   ├── railway.json ✅
│   └── prometheus-railway.yml ✅
└── tempo/
    ├── Dockerfile ✅
    ├── railway.json ✅
    └── tempo-config.yml ✅
```

Se faltar algum arquivo, o deploy vai falhar!

---

## Após Correção

Quando tudo estiver reconectado e deployado:

1. ✅ Todos os 4 serviços mostram `PhAlves23/prompt-zero` como Source Repo
2. ✅ Nenhum mostra "GitHub Repo not found"
3. ✅ Todos estão "Active" (bolinha verde)
4. ✅ Grafana logs mostram datasources provisionados
5. ✅ Acesse Grafana → Configuration → Data Sources → Todos com status ✅

Aí sim você terá a stack 100% funcional! 🚀
