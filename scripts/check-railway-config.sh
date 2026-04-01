#!/bin/bash

# Script para verificar a configuração do Railway e GitHub Secrets
# Usage: ./check-railway-config.sh

set -e

echo "🔍 Verificando configuração do Railway..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se uma variável está definida
check_var() {
    local var_name=$1
    local var_value=$2
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name não está definida"
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name está definida"
        return 0
    fi
}

# Verificar se Railway CLI está instalado
echo "📦 Verificando Railway CLI..."
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓${NC} Railway CLI instalado ($(railway --version))"
else
    echo -e "${RED}✗${NC} Railway CLI não encontrado"
    echo "   Instale com: npm install -g @railway/cli@latest"
    exit 1
fi
echo ""

# Verificar token do Railway
echo "🔑 Verificando autenticação Railway..."
if [ -n "$RAILWAY_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} RAILWAY_TOKEN está definida"
    
    # Testar autenticação
    if railway whoami &> /dev/null; then
        echo -e "${GREEN}✓${NC} Autenticação Railway válida"
        railway whoami
    else
        echo -e "${RED}✗${NC} Token Railway inválido ou expirado"
        echo "   Gere um novo token em: https://railway.app/account/tokens"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  RAILWAY_TOKEN não está definida"
    echo "   Para testar localmente, defina: export RAILWAY_TOKEN='seu-token'"
fi
echo ""

# Verificar configuração do projeto
echo "📋 Verificando configuração do projeto..."
if railway status &> /dev/null; then
    echo -e "${GREEN}✓${NC} Projeto Railway configurado"
    railway status
else
    echo -e "${YELLOW}⚠${NC}  Projeto Railway não configurado localmente"
    echo "   Execute: railway link"
fi
echo ""

# Verificar serviços
echo "🚀 Listando serviços..."
if railway services &> /dev/null; then
    railway services
else
    echo -e "${YELLOW}⚠${NC}  Não foi possível listar serviços"
fi
echo ""

# Verificar ambientes
echo "🌍 Listando ambientes..."
if railway environments &> /dev/null; then
    railway environments
else
    echo -e "${YELLOW}⚠${NC}  Não foi possível listar ambientes"
fi
echo ""

# Informações necessárias para GitHub Secrets
echo "📝 Informações para GitHub Secrets:"
echo ""
echo "Para configurar os secrets no GitHub Actions, você precisa dos seguintes valores:"
echo ""
echo "1. RAILWAY_API_TOKEN"
echo "   - Gere em: https://railway.app/account/tokens"
echo "   - Tipo: Account Token ou Project Token"
echo ""

# Tentar obter Project ID
if railway status &> /dev/null; then
    PROJECT_ID=$(railway status | grep "Project ID" | awk '{print $3}' || echo "")
    if [ -n "$PROJECT_ID" ]; then
        echo "2. RAILWAY_PROJECT_ID: $PROJECT_ID"
    else
        echo "2. RAILWAY_PROJECT_ID: (obtenha com 'railway status' ou na URL do projeto)"
    fi
else
    echo "2. RAILWAY_PROJECT_ID: (obtenha com 'railway status' ou na URL do projeto)"
fi
echo ""

echo "3. RAILWAY_ENVIRONMENT_ID"
echo "   - Obtenha com: railway environments"
echo "   - Use o ID do ambiente 'production'"
echo ""

echo "4. RAILWAY_BACKEND_SERVICE_ID"
echo "   - Obtenha com: railway services"
echo "   - Use o ID do serviço 'backend'"
echo ""

echo "5. RAILWAY_FRONTEND_SERVICE_ID"
echo "   - Obtenha com: railway services"
echo "   - Use o ID do serviço 'frontend'"
echo ""

echo "6. RAILWAY_BACKEND_DATABASE_URL_PROD"
echo "   - Obtenha no Railway Dashboard > Backend Service > Variables"
echo "   - Variável: DATABASE_URL"
echo ""

# Verificar se o workflow existe
echo "📄 Verificando workflows do GitHub Actions..."
if [ -f ".github/workflows/deploy-production-railway.yml" ]; then
    echo -e "${GREEN}✓${NC} Workflow de deploy encontrado"
else
    echo -e "${RED}✗${NC} Workflow de deploy não encontrado"
fi
echo ""

echo "✅ Verificação concluída!"
echo ""
echo "Para mais detalhes, consulte: docs/RAILWAY_TOKEN_FIX.md"
