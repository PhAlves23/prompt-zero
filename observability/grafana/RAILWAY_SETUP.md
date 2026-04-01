# Configuração do Grafana no Railway

## Problemas Identificados e Solução

### Problema Principal
Estávamos usando `envsubst` com `${VARIAVEL}` para substituir variáveis de ambiente, mas o Grafana tem suporte nativo para variáveis de ambiente usando a sintaxe `$VARIAVEL` (sem chaves).

### Solução Implementada
Simplificamos a configuração seguindo o padrão do [railway-grafana-stack](https://github.com/MykalMachon/railway-grafana-stack):

1. **Dockerfile simplificado**: Removido entrypoint customizado, gettext e complexidade desnecessária
2. **Sintaxe de variáveis corrigida**: Mudado de `${LOKI_INTERNAL_URL}` para `$LOKI_INTERNAL_URL`
3. **Grafana faz a substituição**: O próprio Grafana substitui as variáveis nativamente

## Plugins Angular Desabilitados

Os seguintes plugins não funcionam mais no Grafana 11.5+:
- `grafana-simple-json-datasource`
- `grafana-piechart-panel`
- `grafana-worldmap-panel`

**Solução**: Atualizar a variável `GF_INSTALL_PLUGINS` no Railway:

```
GF_INSTALL_PLUGINS=grafana-clock-panel
```

## Variáveis de Ambiente Necessárias

O Grafana depende destas variáveis (já configuradas no Railway):

```
LOKI_INTERNAL_URL=http://${{691bedec-bf64-499c-9f3f-5232a8e2e3da.RAILWAY_PRIVATE_DOMAIN}}:${{691bedec-bf64-499c-9f3f-5232a8e2e3da.PORT}}
PROMETHEUS_INTERNAL_URL=http://${{400e0859-e275-4ee9-920a-d5ae3ebefb11.RAILWAY_PRIVATE_DOMAIN}}:${{400e0859-e275-4ee9-920a-d5ae3ebefb11.PORT}}
TEMPO_INTERNAL_URL=http://${{c6c20cc0-6f63-40a1-bde8-e77bf0133178.RAILWAY_PRIVATE_DOMAIN}}:${{c6c20cc0-6f63-40a1-bde8-e77bf0133178.PORT}}
```

## Alterações Realizadas

1. **Dockerfile**:
   - Removido entrypoint customizado
   - Removido instalação de gettext
   - Estrutura simples: apenas COPY dos arquivos de configuração

2. **datasources.yml**:
   - URLs agora usam `$LOKI_INTERNAL_URL` (sem `{}`)
   - Grafana substitui automaticamente as variáveis
   - Adicionado `prune: false` para evitar remoção de datasources

3. **entrypoint.sh**:
   - Removido completamente (não é mais necessário)

## Como Funciona

O Grafana tem suporte nativo para substituição de variáveis de ambiente em arquivos de provisioning:
- Usa a sintaxe `$VARIAVEL` ou `${VARIAVEL}`
- A substituição acontece automaticamente durante o startup
- Não requer ferramentas externas como `envsubst`

Referência: [Grafana Environment Variable Interpolation](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#variable-expansion)

## Próximos Passos no Railway

1. **Atualizar a variável de ambiente**:
   ```
   GF_INSTALL_PLUGINS=grafana-clock-panel
   ```

2. **Fazer redeploy** do serviço Grafana (já acontecerá automaticamente com o push)

3. **Verificar logs** após o deploy para confirmar que os datasources foram provisionados com sucesso

## Alternativas aos Plugins Angular

- **grafana-piechart-panel** → Use o painel nativo "Pie Chart" do Grafana
- **grafana-worldmap-panel** → Use o painel nativo "Geomap" do Grafana
- **grafana-simple-json-datasource** → Considere usar datasources nativos ou criar um plugin moderno

## Verificação de Health

O healthcheck está configurado no `railway.json`:
- Path: `/api/health`
- O Grafana tem healthcheck interno que responde nesse endpoint

## Referência

Este setup foi baseado no template bem-sucedido:
- **Repositório**: [MykalMachon/railway-grafana-stack](https://github.com/MykalMachon/railway-grafana-stack)
- **Template Railway**: [Deploy on Railway](https://railway.com/template/8TLSQD)
