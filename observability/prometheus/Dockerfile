ARG VERSION=v3.2.1

FROM prom/prometheus:${VERSION}

# Copiar configuração Railway
COPY prometheus-railway.yml /etc/prometheus/prometheus.yml

# Comando
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus"]
