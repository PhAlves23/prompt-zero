ARG VERSION=11.5.2

FROM grafana/grafana-oss:${VERSION}

# Copiar configurações de provisioning
COPY provisioning/datasources /etc/grafana/provisioning/datasources
COPY provisioning/dashboards /etc/grafana/provisioning/dashboards

# Copiar dashboards
COPY dashboards /var/lib/grafana/dashboards
