#!/bin/bash

# Script de Início Rápido para Observabilidade PromptZero
# Este script inicializa toda a stack de observabilidade

set -e

echo "🚀 Iniciando Stack de Observabilidade PromptZero..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker e tente novamente."
    exit 1
fi

echo -e "${BLUE}1. Criando diretórios necessários...${NC}"
mkdir -p observability/{prometheus,loki,tempo,grafana/provisioning/{datasources,dashboards},grafana/dashboards,otel-collector}

echo -e "${BLUE}2. Parando containers existentes (se houver)...${NC}"
docker-compose -f docker-compose.observability.yml down

echo -e "${BLUE}3. Iniciando serviços de observabilidade...${NC}"
docker-compose -f docker-compose.observability.yml up -d

echo ""
echo -e "${BLUE}4. Aguardando serviços iniciarem...${NC}"
sleep 10

# Verificar saúde dos serviços
echo -e "${BLUE}5. Verificando saúde dos serviços...${NC}"

services=(
    "Prometheus:http://localhost:9090/-/healthy"
    "Loki:http://localhost:3100/ready"
    "Tempo:http://localhost:3200/ready"
    "Grafana:http://localhost:3300/api/health"
)

all_healthy=true
for service in "${services[@]}"; do
    name="${service%%:*}"
    url="${service##*:}"
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name está saudável"
    else
        echo -e "  ${YELLOW}⚠${NC} $name ainda está iniciando ou com problemas"
        all_healthy=false
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Stack de Observabilidade Iniciada!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📊 ${BLUE}Serviços Disponíveis:${NC}"
echo ""
echo -e "  Prometheus:        ${YELLOW}http://localhost:9090${NC}"
echo -e "  Loki:              ${YELLOW}http://localhost:3100${NC}"
echo -e "  Tempo:             ${YELLOW}http://localhost:3200${NC}"
echo -e "  Grafana:           ${YELLOW}http://localhost:3300${NC}"
echo -e "                     User: ${YELLOW}admin${NC} | Password: ${YELLOW}admin${NC}"
echo -e "  OTel Collector:    ${YELLOW}http://localhost:4319${NC}"
echo ""
echo -e "🔍 ${BLUE}Endpoints de Coleta:${NC}"
echo ""
echo -e "  OTLP HTTP:         ${YELLOW}http://localhost:4318${NC}"
echo -e "  OTLP gRPC:         ${YELLOW}http://localhost:4317${NC}"
echo -e "  Zipkin:            ${YELLOW}http://localhost:9411${NC}"
echo ""
echo -e "📝 ${BLUE}Próximos Passos:${NC}"
echo ""
echo -e "  1. Configure as variáveis de ambiente no backend/.env:"
echo -e "     ${YELLOW}TRACING_ENABLED=true${NC}"
echo -e "     ${YELLOW}TEMPO_ENDPOINT=http://localhost:4318${NC}"
echo -e "     ${YELLOW}LOKI_ENABLED=true${NC}"
echo -e "     ${YELLOW}LOKI_ENDPOINT=http://localhost:3100${NC}"
echo ""
echo -e "  2. Inicie o backend: ${YELLOW}cd backend && yarn start:dev${NC}"
echo ""
echo -e "  3. Acesse o Grafana e explore os dashboards!"
echo ""
echo -e "📚 ${BLUE}Documentação:${NC} ${YELLOW}docs/OBSERVABILIDADE.md${NC}"
echo ""

if [ "$all_healthy" = false ]; then
    echo -e "${YELLOW}⚠ Alguns serviços ainda estão iniciando. Aguarde alguns segundos e verifique:${NC}"
    echo -e "  ${YELLOW}docker-compose -f docker-compose.observability.yml ps${NC}"
    echo ""
fi

echo -e "${GREEN}✨ Pronto para observar! ✨${NC}"
