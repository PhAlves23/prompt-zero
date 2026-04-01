ARG VERSION=11.5.2

FROM grafana/grafana-oss:${VERSION}

USER root

# Instalar gettext para envsubst (substituição de variáveis de ambiente)
RUN apk add --no-cache gettext

# Copiar entrypoint customizado
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copiar configurações de provisioning
COPY provisioning/ /etc/grafana/provisioning/

# Copiar dashboards
COPY dashboards/ /var/lib/grafana/dashboards/

# Voltar para o usuário grafana
USER grafana

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Usar entrypoint customizado
ENTRYPOINT ["/entrypoint.sh"]
