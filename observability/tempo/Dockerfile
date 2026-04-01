FROM grafana/tempo:latest

# Copiar configuração
COPY tempo-config.yml /etc/tempo/config.yml

# Portas
EXPOSE 3200 4317 4318 9411

# Comando
CMD ["-config.file=/etc/tempo/config.yml"]
