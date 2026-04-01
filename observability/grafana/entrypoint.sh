#!/bin/bash
set -e

echo "=== Grafana Init Script ==="

# Expandir variáveis de ambiente no arquivo de datasources
DATASOURCES_FILE="/etc/grafana/provisioning/datasources/datasources.yml"

if [ -f "$DATASOURCES_FILE" ]; then
  echo "Processando variáveis de ambiente no arquivo de datasources..."
  
  # Criar arquivo temporário com variáveis expandidas
  envsubst < "$DATASOURCES_FILE" > "$DATASOURCES_FILE.tmp"
  mv "$DATASOURCES_FILE.tmp" "$DATASOURCES_FILE"
  
  echo "✓ Variáveis de ambiente processadas"
  cat "$DATASOURCES_FILE"
fi

echo ""
echo "=== Iniciando Grafana ==="
echo ""

# Iniciar o Grafana com o comando padrão
exec /run.sh "$@"
