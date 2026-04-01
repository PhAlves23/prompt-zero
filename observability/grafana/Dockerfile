FROM grafana/grafana:latest

# Copiar configurações de provisioning
COPY provisioning/ /etc/grafana/provisioning/

# Copiar dashboards
COPY dashboards/ /var/lib/grafana/dashboards/

# Variáveis de ambiente com defaults
ENV GF_SECURITY_ADMIN_USER=admin
ENV GF_USERS_ALLOW_SIGN_UP=false
ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s/

# Plugins úteis
ENV GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel

# Porta
EXPOSE 3000

# Grafana usa o usuário 472 por padrão
USER grafana

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
