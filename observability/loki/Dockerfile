FROM grafana/loki:latest

# Copiar configuração
COPY loki-config.yml /etc/loki/local-config.yaml

# Criar diretórios necessários
RUN mkdir -p /loki/chunks /loki/rules /loki/tsdb-index /loki/tsdb-cache /loki/compactor

# Porta
EXPOSE 3100 9096

# Comando
CMD ["-config.file=/etc/loki/local-config.yaml"]
