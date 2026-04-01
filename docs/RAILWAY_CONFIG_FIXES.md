# 🔧 Correções Aplicadas - Deploy Observability Railway

## Problemas Encontrados

### ❌ 1. Loki - Configuração Desatualizada

**Erro nos logs:**
```
failed parsing config: /etc/loki/local-config.yaml: yaml: unmarshal errors:
  line 34: field shared_store not found in type indexshipper.Config
  line 53: field max_look_back_period not found in type config.ChunkStoreConfig
```

**Causa:** Campos `shared_store`, `max_look_back_period` e `table_manager` foram **deprecated** nas versões mais recentes do Loki (v3.x+).

**Correção Aplicada:**
```yaml
# ANTES (❌ deprecated)
storage_config:
  tsdb_shipper:
    shared_store: filesystem  # ❌ REMOVIDO

chunk_store_config:
  max_look_back_period: 0s    # ❌ REMOVIDO

table_manager:                 # ❌ REMOVIDO
  retention_deletes_enabled: true
  retention_period: 744h

# DEPOIS (✅ correto)
storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
  filesystem:
    directory: /loki/chunks
```

---

### ❌ 2. Prometheus - Configuração Desatualizada

**Erro nos logs:**
```
time=2026-04-01T03:31:48.773Z level=ERROR source=main.go:672 
msg="Error loading config (--config.file=/etc/prometheus/prometheus.yml)" 
err="parsing YAML file /etc/prometheus/prometheus.yml: yaml: unmarshal errors:
  line 86: field wal_compression not found in type config.plain"
```

**Causa:** Campo `wal_compression` movido e estrutura `storage.tsdb.retention` alterada nas versões mais recentes.

**Correção Aplicada:**
```yaml
# ANTES (❌ estrutura antiga)
storage:
  tsdb:
    retention:
      time: 30d
      size: 50GB
    wal_compression: true       # ❌ REMOVIDO

# DEPOIS (✅ estrutura nova)
storage:
  tsdb:
    retention_time: 30d         # ✅ flat structure
    retention_size: 50GB        # ✅ flat structure
```

---

### ✅ 3. Tempo - Funcionando Perfeitamente!

**Logs:**
```
level=info msg="Starting Tempo" version="v2.9.0"
level=info msg="server listening on addresses" http=[::]:3200 grpc=[::]:9095
level=info msg="Tempo is ready"
```

**Status:** ✅ Active
**Config:** Sem problemas
**Build:** Sucesso

---

### ❌ 4. Grafana - Falhando por Dependência

**Erro:**
```
Attempt #11 failed with service unavailable
1/1 replicas never became healthy!
Healthcheck failed!
```

**Causa:** Grafana depende de Loki e Prometheus estarem rodando para provisionar os datasources. Como Loki e Prometheus falharam, Grafana também falhou no healthcheck.

**Solução:** Após Loki e Prometheus subirem com sucesso, fazer restart do Grafana.

---

## Correções Aplicadas

### Commit:
```bash
fix: corrigir configs de Loki e Prometheus para versões recentes

- Loki: remover campos deprecated (shared_store, max_look_back_period, table_manager)
- Prometheus: ajustar storage config (retention_time/size sem wal_compression)
- Erros corrigidos nos logs do Railway
```

### Arquivos Modificados:
1. `observability/loki/loki-config.yml`
2. `observability/prometheus/prometheus-railway.yml`

---

## Próximos Passos

### 1. Aguardar Railway Detectar Mudanças

O Railway detecta automaticamente mudanças no GitHub e faz redeploy:
- ⏳ Loki: Aguardando novo deploy
- ⏳ Prometheus: Aguardando novo deploy

### 2. Verificar Logs dos Novos Deploys

**Loki - Deve aparecer:**
```
level=info msg="Loki started"
level=info msg="server listening on addresses"
```

**Prometheus - Deve aparecer:**
```
level=info msg="Server is ready to receive web requests."
level=info msg="Completed loading of configuration file"
```

### 3. Restart do Grafana

Após Loki e Prometheus estarem Active:
1. Railway → Grafana Service
2. Three dots (⋮) → **Restart**
3. Aguardar logs:
   ```
   msg="Initializing provisioning datasources"
   msg="Successfully provisioned datasource" name=Prometheus
   msg="Successfully provisioned datasource" name=Loki
   msg="Successfully provisioned datasource" name=Tempo
   ```

---

## Status Esperado Após Correções

```
✅ Tempo       → Active (já estava funcionando)
✅ Loki        → Active (após redeploy com config corrigido)
✅ Prometheus  → Active (após redeploy com config corrigido)
✅ Grafana     → Active (após restart com datasources provisionados)
```

---

## Validação Final

### 1. Verificar Status no Railway
- [ ] Todos os 4 serviços com status "Active" (bolinha verde)
- [ ] Sem erros nos Deploy Logs

### 2. Acessar Grafana
```
URL: https://grafana-production-60e7.up.railway.app
Login: admin / <sua senha configurada>
```

### 3. Verificar Datasources
1. Grafana → Configuration → Data Sources
2. Deve mostrar 3 datasources:
   - ✅ Prometheus (status: working)
   - ✅ Loki (status: working)
   - ✅ Tempo (status: working)

### 4. Testar Queries

**Prometheus:**
```promql
up{job="prometheus"}
```

**Loki:**
```logql
{job="loki"}
```

**Tempo:**
- Acessar Explore → Tempo → Search
- Deve carregar sem erros

---

## Referências de Configuração

### Loki v3.x+ Schema
- [Loki Configuration Reference](https://grafana.com/docs/loki/latest/configuration/)
- Migração: `tsdb_shipper` não precisa mais de `shared_store` explícito
- `chunk_store_config` e `table_manager` foram deprecated

### Prometheus v3.x+ Schema
- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- `storage.tsdb` agora usa flat structure: `retention_time` e `retention_size`
- `wal_compression` removido do config file (agora é default behavior)

### Compatibilidade de Versões

| Serviço    | Versão Dockerfile | Config Compatível |
|------------|-------------------|-------------------|
| Loki       | 3.4.2             | ✅ Corrigido      |
| Prometheus | v3.2.1            | ✅ Corrigido      |
| Tempo      | 2.9.0             | ✅ OK             |
| Grafana    | 11.5.2            | ✅ OK             |

---

## Troubleshooting Adicional

### Se Loki continuar falhando:
```bash
# Verificar se volume tem permissões
# Railway deve criar automaticamente os diretórios em /loki
```

### Se Prometheus continuar falhando:
```bash
# Verificar se scrape_configs estão acessíveis
# back-end.railway.internal:3001 deve estar rodando
```

### Se Grafana não provisionar datasources:
```bash
# Verificar variáveis de ambiente:
PROMETHEUS_INTERNAL_URL=http://prometheus.railway.internal:9090
LOKI_INTERNAL_URL=http://loki.railway.internal:3100
TEMPO_INTERNAL_URL=http://tempo.railway.internal:3200
```

---

## Resumo

✅ **Correções aplicadas e commitadas**
✅ **Push feito para GitHub**
⏳ **Aguardando Railway detectar mudanças e fazer redeploy**

Agora é só aguardar os novos deploys aparecerem no Railway! 🚀
