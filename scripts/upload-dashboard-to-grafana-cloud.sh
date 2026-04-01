#!/bin/bash
# Script para fazer upload de dashboards para Grafana Cloud

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar variáveis de ambiente
if [ -z "$GRAFANA_CLOUD_URL" ]; then
  echo -e "${RED}❌ Erro: GRAFANA_CLOUD_URL não definida${NC}"
  echo "Exemplo: export GRAFANA_CLOUD_URL='https://your-instance.grafana.net'"
  exit 1
fi

if [ -z "$GRAFANA_CLOUD_API_KEY" ]; then
  echo -e "${RED}❌ Erro: GRAFANA_CLOUD_API_KEY não definida${NC}"
  echo "Crie uma API key em: $GRAFANA_CLOUD_URL/org/apikeys"
  exit 1
fi

DASHBOARD_DIR="observability/grafana/dashboards"

echo -e "${GREEN}📊 Iniciando upload de dashboards para Grafana Cloud${NC}"
echo -e "URL: ${YELLOW}$GRAFANA_CLOUD_URL${NC}"
echo ""

# Função para fazer upload de um dashboard
upload_dashboard() {
  local file=$1
  local filename=$(basename "$file")
  
  echo -e "${YELLOW}⬆️  Uploading: $filename${NC}"
  
  # Ler o JSON do dashboard
  dashboard_json=$(cat "$file")
  
  # Criar payload para a API
  payload=$(jq -n \
    --argjson dashboard "$dashboard_json" \
    '{
      dashboard: $dashboard,
      overwrite: true,
      folderId: 0,
      message: "Uploaded via script"
    }')
  
  # Fazer upload via API
  response=$(curl -s -X POST "$GRAFANA_CLOUD_URL/api/dashboards/db" \
    -H "Authorization: Bearer $GRAFANA_CLOUD_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload")
  
  # Verificar resposta
  if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
    dashboard_url=$(echo "$response" | jq -r '.url')
    echo -e "${GREEN}✅ Sucesso: $filename${NC}"
    echo -e "   URL: ${YELLOW}$GRAFANA_CLOUD_URL$dashboard_url${NC}"
  else
    echo -e "${RED}❌ Erro ao fazer upload: $filename${NC}"
    echo "$response" | jq '.'
    return 1
  fi
  
  echo ""
}

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ Erro: jq não está instalado${NC}"
  echo "Instale com: brew install jq (macOS) ou apt-get install jq (Linux)"
  exit 1
fi

# Fazer upload de todos os dashboards
total=0
success=0
failed=0

for file in "$DASHBOARD_DIR"/*.json; do
  if [ -f "$file" ]; then
    total=$((total + 1))
    if upload_dashboard "$file"; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
    fi
  fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Resumo do Upload${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total:    ${YELLOW}$total${NC}"
echo -e "Sucesso:  ${GREEN}$success${NC}"
echo -e "Falhas:   ${RED}$failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 Todos os dashboards foram enviados com sucesso!${NC}"
  echo -e "Acesse: ${YELLOW}$GRAFANA_CLOUD_URL/dashboards${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Alguns dashboards falhararam no upload${NC}"
  exit 1
fi
