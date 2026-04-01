FROM grafana/loki:latest

# Copiar configuração
COPY loki-config.yml /etc/loki/local-config.yaml

# Porta
EXPOSE 3100

# Comando
CMD ["-config.file=/etc/loki/local-config.yaml"]
