# Configuração do Grafana no Railway

## Problemas Identificados e Soluções

### 1. Plugins Angular Desabilitados

Os seguintes plugins não funcionam mais no Grafana 11.5+:
- `grafana-simple-json-datasource`
- `grafana-piechart-panel`
- `grafana-worldmap-panel`

**Solução**: Remover da variável `GF_INSTALL_PLUGINS`:

```
GF_INSTALL_PLUGINS=grafana-clock-panel
```

### 2. URLs de Datasources

Os datasources agora usam variáveis de ambiente para URLs dinâmicas.

**Variáveis necessárias no Railway** (já configuradas):
```
LOKI_INTERNAL_URL=http://${{691bedec-bf64-499c-9f3f-5232a8e2e3da.RAILWAY_PRIVATE_DOMAIN}}:${{691bedec-bf64-499c-9f3f-5232a8e2e3da.PORT}}
PROMETHEUS_INTERNAL_URL=http://${{400e0859-e275-4ee9-920a-d5ae3ebefb11.RAILWAY_PRIVATE_DOMAIN}}:${{400e0859-e275-4ee9-920a-d5ae3ebefb11.PORT}}
TEMPO_INTERNAL_URL=http://${{c6c20cc0-6f63-40a1-bde8-e77bf0133178.RAILWAY_PRIVATE_DOMAIN}}:${{c6c20cc0-6f63-40a1-bde8-e77bf0133178.PORT}}
```

### 3. Entrypoint Simplificado

O novo entrypoint:
- Remove a verificação de disponibilidade de serviços (que causava timeouts)
- Processa variáveis de ambiente no arquivo de datasources usando `envsubst`
- Inicia o Grafana imediatamente

## O que foi alterado

1. **Dockerfile**:
   - Removido `netcat-openbsd`
   - Adicionado `gettext` (para `envsubst`)

2. **entrypoint.sh**:
   - Removida lógica de `wait_for_service`
   - Adicionado processamento de variáveis com `envsubst`

3. **datasources.yml**:
   - URLs agora usam `${LOKI_INTERNAL_URL}`, `${PROMETHEUS_INTERNAL_URL}`, `${TEMPO_INTERNAL_URL}`
   - Datasources marcados como `editable: true` para permitir ajustes manuais

4. **railway.json**:
   - Mantido `healthcheckPath: /api/health`

## Próximos Passos no Railway

1. **Atualizar a variável de ambiente**:
   ```
   GF_INSTALL_PLUGINS=grafana-clock-panel
   ```

2. **Verificar que as variáveis de URL existem**:
   - `LOKI_INTERNAL_URL`
   - `PROMETHEUS_INTERNAL_URL`
   - `TEMPO_INTERNAL_URL`

3. **Fazer redeploy do serviço Grafana**

## Alternativas aos Plugins Angular

- **grafana-piechart-panel** → Use o painel nativo "Pie Chart" do Grafana
- **grafana-worldmap-panel** → Use o painel nativo "Geomap" do Grafana
- **grafana-simple-json-datasource** → Considere usar datasources nativos ou criar um plugin moderno

## Verificação de Health

O healthcheck está configurado para:
- Path: `/api/health`
- Intervalo: 30s
- Timeout: 3s
- Período de inicialização: 60s
- Tentativas: 3

## Logs de Depuração

Se o problema persistir, verifique:
1. Se as variáveis de ambiente estão sendo expandidas corretamente no entrypoint
2. Se os serviços Loki, Prometheus e Tempo estão rodando e acessíveis
3. Os logs do Grafana para erros de provisionamento
