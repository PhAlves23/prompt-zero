FROM grafana/tempo:latest

# Copiar configuração
COPY tempo-config.yml /etc/tempo/config.yml

# Criar diretórios necessários
RUN mkdir -p /var/tempo/traces /var/tempo/wal /var/tempo/generator/wal

# Portas
EXPOSE 3200 4317 4318 9411

# Comando
CMD ["-config.file=/etc/tempo/config.yml"]
