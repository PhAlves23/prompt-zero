#!/bin/bash
# Script para obter todos os IDs necessários do Railway de uma vez
# Usage: ./scripts/get-railway-ids.sh

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Railway Configuration IDs           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Railway CLI não encontrado!"
    echo "   Instale com: npm install -g @railway/cli@latest"
    exit 1
fi

# Verificar autenticação
if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC}  RAILWAY_TOKEN não definida. Tentando usar autenticação local..."
fi

echo -e "${GREEN}📋 Project Information${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Obter Project ID
echo ""
echo "RAILWAY_PROJECT_ID:"
PROJECT_ID=$(railway status 2>/dev/null | grep "Project" | awk '{print $2}' | tr -d '()' || echo "")
if [ -n "$PROJECT_ID" ]; then
    echo -e "  ${GREEN}✓${NC} $PROJECT_ID"
else
    echo -e "  ${YELLOW}⚠${NC}  Não encontrado. Execute 'railway link' primeiro."
fi

echo ""
echo -e "${GREEN}🌍 Environment IDs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "RAILWAY_ENVIRONMENT_ID:"
railway environments 2>/dev/null || echo -e "  ${YELLOW}⚠${NC}  Erro ao listar ambientes"

echo ""
echo -e "${GREEN}🚀 Service IDs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "RAILWAY_BACKEND_SERVICE_ID & RAILWAY_FRONTEND_SERVICE_ID:"
railway services 2>/dev/null || echo -e "  ${YELLOW}⚠${NC}  Erro ao listar serviços"

echo ""
echo -e "${GREEN}💾 Database URL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "RAILWAY_BACKEND_DATABASE_URL_PROD:"
echo "  Obtenha no Railway Dashboard:"
echo "  1. Acesse o serviço Backend"
echo "  2. Clique na aba 'Variables'"
echo "  3. Copie o valor de DATABASE_URL"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Próximos Passos                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "1. Copie os IDs acima"
echo "2. Configure no GitHub:"
echo "   Settings > Secrets and variables > Actions"
echo ""
echo "3. Secrets necessários:"
echo "   - RAILWAY_API_TOKEN"
echo "   - RAILWAY_PROJECT_ID"
echo "   - RAILWAY_ENVIRONMENT_ID"
echo "   - RAILWAY_BACKEND_SERVICE_ID"
echo "   - RAILWAY_FRONTEND_SERVICE_ID"
echo "   - RAILWAY_BACKEND_DATABASE_URL_PROD"
echo ""
echo -e "📖 Guia completo: ${BLUE}docs/GITHUB_SECRETS_SETUP.md${NC}"
echo ""
