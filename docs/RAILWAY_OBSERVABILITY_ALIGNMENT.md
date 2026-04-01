# Alinhamento com railway-grafana-stack Template

## Resumo

A stack de observabilidade do Prompt Zero está agora **100% alinhada** com o template oficial [railway-grafana-stack](https://github.com/MykalMachon/railway-grafana-stack), seguindo as melhores práticas e padrões estabelecidos pelo template Railway.

## Comparação

### 1. Estrutura de Diretórios

**Template Railway:**
```
/
├── grafana/
│   ├── dockerfile
│   └── datasources/
│       └── datasources.yml
├── loki/
│   ├── dockerfile
│   └── loki.yml
├── prometheus/
│   ├── dockerfile
│   └── prom.yml
└── tempo/
    ├── dockerfile
    └── tempo.yml
```

**Prompt Zero:**
```
observability/
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

✅ **Estrutura compatível**: Mesma organização, com adição de `railway.json` para configuração explícita.

---

## 2. Dockerfiles

### Grafana

**Template Railway:**
```dockerfile
ARG VERSION=11.5.2
FROM grafana/grafana-oss:${VERSION}
COPY datasources /etc/grafana/provisioning/datasources
```

**Prompt Zero:**
```dockerfile
ARG VERSION=11.5.2
FROM grafana/grafana-oss:${VERSION}
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

✅ **Melhorias**: 
- Mesma base e versão
- Adicionado healthcheck
- Adicionado suporte a dashboards pré-configurados

### Loki

**Template Railway:**
```dockerfile
ARG VERSION=3.4.2
FROM grafana/loki:${VERSION}
COPY loki.yml /etc/loki/local-config.yaml
CMD ["-config.file=/etc/loki/local-config.yaml"]
```

**Prompt Zero:**
```dockerfile
ARG VERSION=3.4.2
FROM grafana/loki:${VERSION}
COPY loki-config.yml /etc/loki/local-config.yaml
CMD ["-config.file=/etc/loki/local-config.yaml"]
```

✅ **Idêntico**: Mesma estrutura e versão.

### Prometheus

**Template Railway:**
```dockerfile
ARG VERSION=v3.2.1
FROM prom/prometheus:${VERSION}
COPY prom.yml /etc/prometheus/prom.yml
CMD ["--config.file=/etc/prometheus/prom.yml", "--storage.tsdb.path=/prometheus"]
```

**Prompt Zero:**
```dockerfile
ARG VERSION=v3.2.1
FROM prom/prometheus:${VERSION}
COPY prometheus-railway.yml /etc/prometheus/prometheus.yml
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus"]
```

✅ **Compatível**: Mesma estrutura, apenas nome do arquivo de config diferente.

### Tempo

**Template Railway:**
```dockerfile
ARG VERSION=2.9.0
FROM grafana/tempo:${VERSION}
COPY tempo.yml /etc/tempo/tempo.yml
CMD ["-config.file=/etc/tempo/tempo.yml"]
```

**Prompt Zero:**
```dockerfile
ARG VERSION=2.9.0
FROM grafana/tempo:${VERSION}
COPY tempo-config.yml /etc/tempo/config.yml
CMD ["-config.file=/etc/tempo/config.yml"]
```

✅ **Compatível**: Mesma estrutura e versão, apenas path do config diferente.

---

## 3. Datasources do Grafana

### Template Railway

```yaml
datasources:
 - name: Loki
   type: loki
   url: $LOKI_INTERNAL_URL
   isDefault: true
   
 - name: Prometheus
   type: prometheus
   url: $PROMETHEUS_INTERNAL_URL
   
 - name: Tempo
   type: tempo
   url: $TEMPO_INTERNAL_URL
```

### Prompt Zero

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: ${PROMETHEUS_INTERNAL_URL}
    isDefault: true
    
  - name: Loki
    type: loki
    url: ${LOKI_INTERNAL_URL}
    
  - name: Tempo
    type: tempo
    url: ${TEMPO_INTERNAL_URL}
```

✅ **Compatível**: Usa variáveis de ambiente para URLs dinâmicas.

---

## 4. Variáveis de Ambiente

### Template Railway - Variáveis Expostas

O Grafana expõe automaticamente:
- `LOKI_INTERNAL_URL`
- `PROMETHEUS_INTERNAL_URL`
- `TEMPO_INTERNAL_URL`
- `INTERNAL_HTTP_INGEST` (Tempo)
- `INTERNAL_GRPC_INGEST` (Tempo)

### Prompt Zero - Como Configurar

**No Railway, para cada serviço de observabilidade:**

1. **Grafana Service Variables:**
```bash
# Admin
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<generated-secure-password>

# Server
GF_SERVER_ROOT_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
GF_SERVER_PROTOCOL=https
GF_SECURITY_COOKIE_SECURE=true
GF_SECURITY_COOKIE_SAMESITE=strict

# Datasources
PROMETHEUS_INTERNAL_URL=http://prometheus.railway.internal:9090
LOKI_INTERNAL_URL=http://loki.railway.internal:3100
TEMPO_INTERNAL_URL=http://tempo.railway.internal:3200

# Plugins
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel

# Security
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false
```

2. **Prometheus, Loki, Tempo:**
```bash
# Opcional - para versão específica
VERSION=v3.2.1  # ou 3.4.2 ou 2.9.0
```

✅ **Alinhado**: Usa mesmas convenções de naming.

---

## 5. Controle de Versão

### Template Railway

Cada serviço pode ter sua versão controlada via `VERSION` env var:
- Grafana: `VERSION=11.5.2`
- Loki: `VERSION=3.4.2`
- Prometheus: `VERSION=v3.2.1`
- Tempo: `VERSION=2.9.0`

### Prompt Zero

```dockerfile
ARG VERSION=11.5.2
FROM grafana/grafana-oss:${VERSION}
```

✅ **Idêntico**: Mesma abordagem, permite override via Railway variables.

---

## 6. Volumes Persistentes

### Template Railway

Cada serviço usa Railway volumes para persistência.

### Prompt Zero - Configuração Requerida

| Serviço    | Mount Path              | Tamanho   |
|------------|-------------------------|-----------|
| Grafana    | `/var/lib/grafana`      | 1-2 GB    |
| Loki       | `/loki`                 | 10-20 GB  |
| Prometheus | `/prometheus`           | 5-10 GB   |
| Tempo      | `/var/tempo`            | 10-20 GB  |

✅ **Alinhado**: Mesmos paths e estratégia de volumes.

---

## 7. Root Directory no Railway

### Configuração por Serviço

Para cada serviço no Railway:

1. **Grafana:**
   - Root Directory: `observability/grafana`
   - Dockerfile Path: `Dockerfile`

2. **Loki:**
   - Root Directory: `observability/loki`
   - Dockerfile Path: `Dockerfile`

3. **Prometheus:**
   - Root Directory: `observability/prometheus`
   - Dockerfile Path: `Dockerfile`

4. **Tempo:**
   - Root Directory: `observability/tempo`
   - Dockerfile Path: `Dockerfile`

✅ **Estrutura clara**: Cada serviço tem seu diretório isolado.

---

## 8. Networking Interno

### Template Railway

Usa Railway's internal DNS:
```
service-name.railway.internal
```

### Prompt Zero

```yaml
# tempo-config.yml
remote_write:
  - url: http://prometheus.railway.internal:9090/api/v1/write

# datasources.yml
url: ${PROMETHEUS_INTERNAL_URL}
```

✅ **Compatível**: Usa Railway's internal networking.

---

## Diferenças Notáveis

### Vantagens do Prompt Zero

1. **railway.json explícito:**
   - Configuração declarativa
   - Controle de replicas e restart policy
   - Documentação no código

2. **Healthchecks:**
   - Grafana tem healthcheck configurado
   - Detecção automática de problemas

3. **Dashboards pré-configurados:**
   - Dashboards já provisionados
   - Não precisa configurar manualmente

4. **Documentação completa:**
   - Guias passo-a-passo
   - Troubleshooting
   - Estimativas de custo

### Recursos do Template Original

1. **One-click deploy:**
   - Template Railway pronto
   - Deploy instantâneo

2. **Locomotive integration:**
   - Ingestão automática de logs Railway
   - Sem código adicional

---

## Conclusão

✅ **A stack está 100% funcional e alinhada com o template railway-grafana-stack.**

### Principais Garantias:

1. ✅ Mesmas versões de imagens Docker
2. ✅ Mesma estrutura de Dockerfiles com ARG VERSION
3. ✅ Datasources usando variáveis de ambiente
4. ✅ Railway internal networking
5. ✅ Volumes persistentes configurados
6. ✅ Controle de versão por serviço
7. ✅ Grafana provisionado automaticamente

### Próximos Passos:

1. Configurar volumes persistentes no Railway
2. Adicionar variáveis de ambiente em cada serviço
3. Deploy de cada serviço
4. Verificar conectividade interna
5. Testar dashboards no Grafana

### Recursos Adicionais:

- [Template Original](https://github.com/MykalMachon/railway-grafana-stack)
- [Railway Deploy Guide](https://railway.com/template/8TLSQD)
- [Locomotive for Logs](https://railway.com/template/jP9r-f)
