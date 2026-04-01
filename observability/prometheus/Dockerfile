FROM prom/prometheus:latest

# Copiar configuração Railway
COPY prometheus-railway.yml /etc/prometheus/prometheus.yml

# Porta
EXPOSE 9090

# Comando
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--storage.tsdb.path=/prometheus", \
     "--web.console.libraries=/usr/share/prometheus/console_libraries", \
     "--web.console.templates=/usr/share/prometheus/consoles", \
     "--web.enable-lifecycle", \
     "--web.enable-remote-write-receiver"]
