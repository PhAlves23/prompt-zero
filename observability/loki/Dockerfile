ARG VERSION=3.4.2

FROM grafana/loki:${VERSION}

# Copiar configuração
COPY loki-config.yml /etc/loki/local-config.yaml

# Comando
CMD ["-config.file=/etc/loki/local-config.yaml"]
