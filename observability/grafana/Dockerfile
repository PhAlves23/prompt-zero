ARG VERSION=11.5.2

FROM grafana/grafana-oss:${VERSION}

# Copiar configurações de provisioning
COPY provisioning/ /etc/grafana/provisioning/

# Copiar dashboards
COPY dashboards/ /var/lib/grafana/dashboards/

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
