ARG VERSION=2.9.0

FROM grafana/tempo:${VERSION}

# Copiar configuração
COPY tempo-config.yml /etc/tempo/config.yml

# Comando
CMD ["-config.file=/etc/tempo/config.yml"]
