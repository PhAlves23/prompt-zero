# Fix: Grafana Failing to Start on Railway

## Problema Identificado

O Grafana estava falhandonostartup com o erro:
```
logger=provisioning level=error msg="Failed to provision data sources" 
error="Datasource provisioning error: data source not found"
```

### Causa Raiz

1. **Ordem de inicialização**: O Grafana tentava provisionar datasources (Loki, Prometheus, Tempo) antes desses serviços estarem disponíveis na rede interna do Railway
2. **Validação rigorosa**: O Grafana com `prune: false` estava tentando validar a conectividade dos datasources durante o provisionamento, causando falha no startup
3. **Access mode incorreto**: O Loki estava configurado com `access: direct` (acesso direto do browser), quando deveria ser `proxy` (acesso via servidor Grafana)

## Mudanças Implementadas

### 1. Datasources Configuration (`datasources.yml`)

**Alterações:**
- ✅ Removido `prune: false` (deixar o comportamento padrão do Grafana)
- ✅ Mudado Loki de `access: direct` → `access: proxy`
- ✅ Adicionado `editable: false` para todos os datasources
- ✅ Adicionado configurações `jsonData` com timeouts adequados:
  - Loki: timeout 60s, maxLines 1000
  - Prometheus: timeInterval 30s, queryTimeout 60s
  - Tempo: timeout 60s

**Antes:**
```yaml
prune: false
datasources:
  - name: Loki
    type: loki
    access: direct  # ❌ Problema!
    url: http://loki.railway.internal:3100
```

**Depois:**
```yaml
datasources:
  - name: Loki
    type: loki
    access: proxy  # ✅ Correto
    url: http://loki.railway.internal:3100
    editable: false
    jsonData:
      timeout: 60
```

### 2. Entrypoint Script (`entrypoint.sh`)

Criado script de inicialização que:
- ✅ Aguarda até 60 segundos (30 tentativas × 2s) pela disponibilidade de cada serviço
- ✅ Verifica conectividade via `nc` (netcat) para:
  - Loki na porta 3100
  - Prometheus na porta 9090
  - Tempo na porta 3200
- ✅ **Não bloqueia** o startup se serviços não estiverem disponíveis (graceful degradation)
- ✅ Mostra logs informativos durante a inicialização

### 3. Dockerfile Updates

**Alterações:**
- ✅ Instalação do `netcat-openbsd` para verificação de conectividade
- ✅ Cópia e execução do `entrypoint.sh` customizado
- ✅ Aumentado `start-period` do healthcheck de 40s → 60s (para dar tempo do script de verificação)
- ✅ Mantido permissões corretas (USER grafana)

## Deploy no Railway

### Opção 1: Commit e Push (Recomendado)

```bash
cd /Users/phalves/ph-projects/pessoal/prompt-zero

# Adicionar as mudanças
git add observability/grafana/

# Commit
git commit -m "fix(grafana): corrigir falha no provisionamento de datasources

- Mudado Loki access mode de direct para proxy
- Adicionado entrypoint script para aguardar serviços
- Removido prune: false para usar comportamento padrão
- Adicionado timeouts e configurações jsonData
- Aumentado healthcheck start-period para 60s"

# Push
git push origin main
```

O Railway detectará automaticamente as mudanças e fará o redeploy do Grafana.

### Opção 2: Redeploy Manual

Se preferir testar antes de commitar:

1. Acesse o Railway Dashboard
2. Vá para o serviço **Grafana**
3. Clique em **Deployments**
4. Clique em **Deploy** ou **Redeploy**

## Verificação Pós-Deploy

### 1. Verificar Logs do Deploy

No Railway, verifique os logs de deploy do Grafana. Você deve ver:

```
=== Grafana Init Script ===
Aguardando serviços de observabilidade estarem disponíveis...
Verificando Loki (loki.railway.internal:3100)...
✓ Loki está disponível!
Verificando Prometheus (prometheus.railway.internal:9090)...
✓ Prometheus está disponível!
Verificando Tempo (tempo.railway.internal:3200)...
✓ Tempo está disponível!

=== Iniciando Grafana ===
```

### 2. Verificar Status do Serviço

O Grafana deve mostrar status **Deployed** (verde) no Railway.

### 3. Acessar Grafana UI

1. No Railway, clique no serviço Grafana
2. Clique em **Networking** → **Generate Domain** (se ainda não tiver)
3. Acesse a URL gerada
4. Login com as credenciais configuradas nas variáveis de ambiente:
   - User: `GF_SECURITY_ADMIN_USER`
   - Password: `GF_SECURITY_ADMIN_PASSWORD`

### 4. Verificar Datasources

No Grafana UI:
1. Menu lateral → **Connections** → **Data Sources**
2. Deve ver 3 datasources:
   - ✅ **Loki** (default)
   - ✅ **Prometheus**
   - ✅ **Tempo**
3. Clique em cada um e teste com **Save & Test** - todos devem mostrar "Data source is working"

## Troubleshooting

### Se o Grafana ainda falhar

1. **Verificar variáveis de ambiente obrigatórias:**
   ```
   GF_SECURITY_ADMIN_USER
   GF_SECURITY_ADMIN_PASSWORD
   GF_SECURITY_SECRET_KEY
   GF_SERVER_ROOT_URL
   ```

2. **Verificar se outros serviços estão rodando:**
   - Loki deve estar **Deployed**
   - Prometheus deve estar **Deployed**
   - Tempo deve estar **Deployed**

3. **Verificar logs do Grafana:**
   - Procure por erros relacionados a provisioning
   - Se houver erro de "data source not found", pode ser necessário remover completamente a configuração de provisioning e adicionar datasources manualmente

### Rollback de Emergência

Se precisar voltar rapidamente:

```bash
git revert HEAD
git push origin main
```

## Próximos Passos

Após o Grafana estar rodando:

1. ✅ Importar/verificar dashboards
2. ✅ Configurar alertas (se necessário)
3. ✅ Testar queries em cada datasource
4. ✅ Documentar URLs de acesso

## Referências

- [Grafana Provisioning Datasources](https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources)
- [Railway Private Networking](https://docs.railway.com/guides/private-networking)
- [Grafana Docker Image](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/)
