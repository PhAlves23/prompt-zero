#!/bin/bash
set -e

echo "=== Grafana Init Script ==="

# Debug: Mostrar variáveis de ambiente relevantes
echo "Verificando variáveis de ambiente dos datasources:"
echo "LOKI_INTERNAL_URL: ${LOKI_INTERNAL_URL:-NOT_SET}"
echo "PROMETHEUS_INTERNAL_URL: ${PROMETHEUS_INTERNAL_URL:-NOT_SET}"
echo "TEMPO_INTERNAL_URL: ${TEMPO_INTERNAL_URL:-NOT_SET}"
echo ""

# Expandir variáveis de ambiente no arquivo de datasources
DATASOURCES_FILE="/etc/grafana/provisioning/datasources/datasources.yml"
DATASOURCES_BACKUP="/etc/grafana/provisioning/datasources/datasources.yml.original"

if [ -f "$DATASOURCES_FILE" ]; then
  echo "Processando arquivo de datasources..."
  
  # Fazer backup do original
  cp "$DATASOURCES_FILE" "$DATASOURCES_BACKUP"
  
  # Se nenhuma variável estiver definida, criar arquivo vazio para evitar erro de provisionamento
  if [ -z "$LOKI_INTERNAL_URL" ] && [ -z "$PROMETHEUS_INTERNAL_URL" ] && [ -z "$TEMPO_INTERNAL_URL" ]; then
    echo "⚠ Nenhum datasource configurado. Criando configuração vazia."
    cat > "$DATASOURCES_FILE" << 'EOF'
apiVersion: 1
datasources: []
EOF
  else
    # Expandir variáveis de ambiente
    envsubst < "$DATASOURCES_BACKUP" > "$DATASOURCES_FILE"
    echo "✓ Variáveis de ambiente processadas"
  fi
  
  echo ""
  echo "Conteúdo final do arquivo de datasources:"
  cat "$DATASOURCES_FILE"
  echo ""
fi

echo "=== Iniciando Grafana ==="
echo ""

# Iniciar o Grafana com o comando padrão
exec /run.sh "$@"
