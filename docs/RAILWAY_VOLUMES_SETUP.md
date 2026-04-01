# 📦 Volumes Necessários para Observabilidade na Railway

## ⚠️ Importante

Os serviços de observabilidade precisam de **volumes persistentes** para não perder dados a cada deploy.

## 📋 Volumes por Serviço

### 1. Loki (Logs)

**Railway Dashboard → Loki → Settings → Volumes**

Adicionar volume:
```
Mount Path: /loki
Size: 5-10 GB
```

**Dados armazenados**:
- `/loki/chunks` - Logs compactados
- `/loki/tsdb-index` - Índice de busca
- `/loki/tsdb-cache` - Cache de queries
- `/loki/compactor` - Dados do compactor

**Retenção**: 31 dias (configurado no loki-config.yml)

---

### 2. Prometheus (Métricas)

**Railway Dashboard → Prometheus → Settings → Volumes**

Adicionar volume:
```
Mount Path: /prometheus
Size: 10-20 GB
```

**Dados armazenados**:
- Time-series database (TSDB)
- Write-Ahead Log (WAL)
- Métricas históricas

**Retenção**: 30 dias (configurado no prometheus-railway.yml)

---

### 3. Tempo (Traces)

**Railway Dashboard → Tempo → Settings → Volumes**

Adicionar volume:
```
Mount Path: /var/tempo
Size: 10-20 GB
```

**Dados armazenados**:
- `/var/tempo/traces` - Traces armazenados
- `/var/tempo/wal` - Write-Ahead Log
- `/var/tempo/generator/wal` - Metrics generator WAL

**Retenção**: 48 horas (configurado no tempo-config.yml)

---

### 4. Grafana (Dashboards e Config)

**Railway Dashboard → Grafana → Settings → Volumes**

Adicionar volume:
```
Mount Path: /var/lib/grafana
Size: 1-2 GB
```

**Dados armazenados**:
- Dashboards salvos
- Datasources configuradas
- Usuários e permissões
- Configurações da aplicação

**Importante**: Sem volume, você perde dashboards personalizados a cada deploy!

---

## 🎯 Resumo Rápido

| Serviço | Mount Path | Size Recomendado | Crítico? |
|---------|-----------|------------------|----------|
| **Loki** | `/loki` | 5-10 GB | ⚠️ Sim |
| **Prometheus** | `/prometheus` | 10-20 GB | ⚠️ Sim |
| **Tempo** | `/var/tempo` | 10-20 GB | ⚠️ Sim |
| **Grafana** | `/var/lib/grafana` | 1-2 GB | ✅ Opcional* |

*Opcional porque dashboards podem ser re-provisionados, mas você perde customizações.

---

## 🚀 Passo a Passo na Railway

Para cada serviço:

1. **Acessar Serviço**:
   ```
   Railway Dashboard → [Nome do Serviço] → Settings
   ```

2. **Criar Volume**:
   ```
   Volumes → Add Volume
   ```

3. **Configurar**:
   ```
   Mount Path: [usar da tabela acima]
   Size: [GB recomendado]
   ```

4. **Salvar**:
   - Railway vai reiniciar o serviço automaticamente
   - Dados serão persistidos no volume

---

## ⚡ Verificar se Volume Está Funcionando

Depois de criar os volumes, verificar logs:

### Loki
```bash
railway logs --service loki --tail 50

# Deve mostrar:
# "Starting Loki"
# "compactor started"
# Sem erros de "permission denied"
```

### Prometheus
```bash
railway logs --service prometheus --tail 50

# Deve mostrar:
# "Server is ready to receive web requests"
# "Completed loading of configuration file"
```

### Tempo
```bash
railway logs --service tempo --tail 50

# Deve mostrar:
# "tempo started"
# "GRPC Server listening"
# "HTTP Server listening"
```

---

## 📊 Estimativa de Uso de Espaço

### Tráfego Baixo (< 1000 req/dia)
- Loki: ~500 MB/semana
- Prometheus: ~1 GB/semana
- Tempo: ~500 MB/semana

### Tráfego Médio (1000-10000 req/dia)
- Loki: ~2 GB/semana
- Prometheus: ~5 GB/semana
- Tempo: ~2 GB/semana

### Tráfego Alto (> 10000 req/dia)
- Loki: ~5+ GB/semana
- Prometheus: ~10+ GB/semana
- Tempo: ~5+ GB/semana

**Dica**: Começar com volumes pequenos e aumentar conforme necessário.

---

## 🗑️ Limpeza Automática

Todos os serviços têm **retenção configurada**:

- **Loki**: 31 dias
- **Prometheus**: 30 dias
- **Tempo**: 48 horas (traces são grandes!)

Dados antigos são automaticamente deletados.

---

## 💰 Custos Railway

Volumes na Railway:
- **$0.25/GB/mês**

Exemplo (stack completa com tráfego médio):
- Loki: 10 GB = $2.50/mês
- Prometheus: 20 GB = $5.00/mês
- Tempo: 10 GB = $2.50/mês
- Grafana: 2 GB = $0.50/mês
- **Total**: ~$10.50/mês

---

## 🔧 Troubleshooting

### Erro: "permission denied" no Loki

**Causa**: Container não tem permissão de escrita no volume

**Solução**: Verificar se volume foi criado corretamente
```bash
railway logs --service loki | grep -i "permission"
```

### Erro: Prometheus "out of disk space"

**Causa**: Volume muito pequeno

**Solução**: 
1. Aumentar tamanho do volume no Railway
2. Ou reduzir retention_time no prometheus-railway.yml

### Erro: Tempo não inicia

**Causa**: Diretórios não criados

**Solução**: Os Dockerfiles já criam os diretórios necessários. Se persistir:
```bash
railway logs --service tempo --tail 100
```

---

## ✅ Checklist Final

Antes de considerar a stack funcional:

- [ ] Loki tem volume em `/loki`
- [ ] Prometheus tem volume em `/prometheus`
- [ ] Tempo tem volume em `/var/tempo`
- [ ] Grafana tem volume em `/var/lib/grafana` (opcional)
- [ ] Todos os serviços estão "Running" (verde) no Railway
- [ ] Logs não mostram erros de permissão ou disco
- [ ] Grafana consegue conectar aos datasources

---

## 📚 Referências

- [Railway Volumes Docs](https://docs.railway.app/guides/volumes)
- [Loki Storage Docs](https://grafana.com/docs/loki/latest/operations/storage/)
- [Prometheus Storage Docs](https://prometheus.io/docs/prometheus/latest/storage/)
- [Tempo Storage Docs](https://grafana.com/docs/tempo/latest/operations/backend/)
