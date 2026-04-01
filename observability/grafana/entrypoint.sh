#!/bin/bash
set -e

echo "=== Grafana Init Script ==="
echo "Aguardando serviços de observabilidade estarem disponíveis..."

# Função para verificar se um serviço está disponível
wait_for_service() {
  local host=$1
  local port=$2
  local service_name=$3
  local max_attempts=30
  local attempt=0

  echo "Verificando $service_name ($host:$port)..."
  
  while [ $attempt -lt $max_attempts ]; do
    if nc -z -w5 "$host" "$port" 2>/dev/null; then
      echo "✓ $service_name está disponível!"
      return 0
    fi
    
    attempt=$((attempt + 1))
    echo "  Tentativa $attempt/$max_attempts - aguardando $service_name..."
    sleep 2
  done
  
  echo "⚠ Aviso: $service_name não está disponível após $max_attempts tentativas"
  echo "  O Grafana será iniciado mesmo assim. Configure os datasources manualmente se necessário."
  return 1
}

# Verificar se os serviços estão disponíveis (não crítico, apenas informativo)
# Instalando netcat se não estiver disponível
if ! command -v nc &> /dev/null; then
  echo "Instalando netcat..."
  apk add --no-cache netcat-openbsd 2>/dev/null || echo "Não foi possível instalar netcat"
fi

# Tentar conectar aos serviços
if command -v nc &> /dev/null; then
  wait_for_service "loki.railway.internal" "3100" "Loki" || true
  wait_for_service "prometheus.railway.internal" "9090" "Prometheus" || true
  wait_for_service "tempo.railway.internal" "3200" "Tempo" || true
else
  echo "⚠ netcat não disponível, pulando verificação de serviços"
fi

echo ""
echo "=== Iniciando Grafana ==="
echo ""

# Iniciar o Grafana com o comando padrão
exec /run.sh "$@"
