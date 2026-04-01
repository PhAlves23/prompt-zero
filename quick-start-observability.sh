#!/bin/bash

# 🚀 Quick Start - Observabilidade PromptZero
# Execute este script para começar em 60 segundos!

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}║  🚀 PromptZero Observability - Quick Start           ║${NC}"
echo -e "${BLUE}║                                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar Docker
echo -e "${BLUE}[1/5]${NC} Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando!${NC}"
    echo "   Por favor, inicie o Docker e tente novamente."
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker OK"
echo ""

# Criar .env se não existir
echo -e "${BLUE}[2/5]${NC} Configurando variáveis de ambiente..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠${NC} Arquivo backend/.env criado. Configure as variáveis antes de prosseguir."
    exit 0
fi

# Adicionar variáveis de observability se não existirem
if ! grep -q "TRACING_ENABLED" backend/.env; then
    echo "" >> backend/.env
    echo "# Observability - Auto-added by quick-start" >> backend/.env
    echo "TRACING_ENABLED=true" >> backend/.env
    echo "SERVICE_NAME=promptzero-backend" >> backend/.env
    echo "SERVICE_VERSION=1.0.0" >> backend/.env
    echo "TEMPO_ENDPOINT=http://localhost:4318" >> backend/.env
    echo "LOKI_ENABLED=true" >> backend/.env
    echo "LOKI_ENDPOINT=http://localhost:3100" >> backend/.env
    echo "LOG_LEVEL=debug" >> backend/.env
    echo "METRICS_ENABLED=true" >> backend/.env
    echo "METRICS_PATH=/metrics" >> backend/.env
    echo -e "${GREEN}✓${NC} Variáveis de observability adicionadas ao .env"
else
    echo -e "${GREEN}✓${NC} Variáveis já configuradas"
fi
echo ""

# Iniciar stack de observabilidade
echo -e "${BLUE}[3/5]${NC} Iniciando stack de observabilidade..."
docker-compose -f docker-compose.observability.yml up -d
echo -e "${GREEN}✓${NC} Stack iniciada"
echo ""

# Aguardar serviços
echo -e "${BLUE}[4/5]${NC} Aguardando serviços ficarem prontos (30s)..."
sleep 30

# Verificar saúde
echo -e "${BLUE}[5/5]${NC} Verificando saúde dos serviços..."
all_healthy=true

check_service() {
    local name=$1
    local url=$2
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name"
    else
        echo -e "  ${RED}✗${NC} $name (ainda inicializando)"
        all_healthy=false
    fi
}

check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Loki      " "http://localhost:3100/ready"
check_service "Tempo     " "http://localhost:3200/ready"
check_service "Grafana   " "http://localhost:3300/api/health"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║  ✨ Stack de Observabilidade Pronta! ✨              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Acesse os serviços:${NC}"
echo ""
echo -e "  Grafana:    ${YELLOW}http://localhost:3300${NC} (admin/admin)"
echo -e "  Prometheus: ${YELLOW}http://localhost:9090${NC}"
echo -e "  Loki:       ${YELLOW}http://localhost:3100${NC}"
echo -e "  Tempo:      ${YELLOW}http://localhost:3200${NC}"
echo ""
echo -e "${BLUE}🚀 Próximos passos:${NC}"
echo ""
echo -e "  1. Inicie o backend:"
echo -e "     ${YELLOW}cd backend && yarn install && yarn start:dev${NC}"
echo ""
echo -e "  2. Acesse o Grafana e explore o dashboard:"
echo -e "     ${YELLOW}http://localhost:3300${NC}"
echo ""
echo -e "  3. Faça uma requisição ao backend:"
echo -e "     ${YELLOW}curl http://localhost:3001/api/metrics${NC}"
echo ""
echo -e "  4. Veja os traces, logs e métricas no Grafana!"
echo ""
echo -e "${BLUE}📚 Documentação:${NC}"
echo ""
echo -e "  Principal:    ${YELLOW}docs/OBSERVABILIDADE.md${NC}"
echo -e "  Exemplos:     ${YELLOW}docs/OBSERVABILIDADE-EXEMPLO.md${NC}"
echo -e "  Variáveis:    ${YELLOW}docs/OBSERVABILIDADE-VARIAVEIS.md${NC}"
echo -e "  Deploy:       ${YELLOW}docs/OBSERVABILIDADE-RAILWAY.md${NC}"
echo ""

if [ "$all_healthy" = false ]; then
    echo -e "${YELLOW}⚠ Alguns serviços ainda estão iniciando.${NC}"
    echo -e "  Aguarde mais alguns segundos e verifique:"
    echo -e "  ${YELLOW}docker-compose -f docker-compose.observability.yml ps${NC}"
    echo ""
fi

echo -e "${GREEN}✨ Divirta-se observando! ✨${NC}"
echo ""
