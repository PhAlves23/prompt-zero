#!/bin/bash
# Script para gerar variáveis de ambiente seguras para o Grafana

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Gerador de Variáveis Seguras do Grafana${NC}"
echo ""

# Verificar se openssl está disponível
if ! command -v openssl &> /dev/null; then
  echo -e "${YELLOW}⚠️  openssl não encontrado, usando alternativa...${NC}"
  SECRET_KEY=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
else
  SECRET_KEY=$(openssl rand -hex 32)
fi

echo -e "${GREEN}✅ Variáveis geradas com sucesso!${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Copie e cole estas variáveis no Railway Dashboard${NC}"
echo -e "${YELLOW}   (Grafana Service → Variables → New Variable)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat <<EOF
# 🔐 Segurança
GF_SECURITY_SECRET_KEY=${SECRET_KEY}
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+' | head -c 32)

# 🌐 Servidor (substituir com sua domain pública do Railway)
GF_SERVER_ROOT_URL=\${{RAILWAY_PUBLIC_DOMAIN}}

# 👥 Usuários
GF_USERS_ALLOW_SIGN_UP=false
GF_AUTH_ANONYMOUS_ENABLED=false

# 📊 Datasources (usar URLs internas do Railway)
GF_DATASOURCES_DEFAULT_PROMETHEUS_URL=http://prometheus.railway.internal:9090
GF_DATASOURCES_DEFAULT_LOKI_URL=http://loki.railway.internal:3100
GF_DATASOURCES_DEFAULT_TEMPO_URL=http://tempo.railway.internal:3200

# 🔌 Plugins
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-clock-panel
EOF

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}⚠️  IMPORTANTE: Salve estas credenciais em local seguro!${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Copie as variáveis acima"
echo "2. Cole no Railway Dashboard → Grafana → Variables"
echo "3. Salve e aguarde o redeploy automático"
echo "4. Acesse o Grafana com as credenciais geradas"
echo ""
