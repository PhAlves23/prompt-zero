# Scripts Utilitários

Este diretório contém scripts auxiliares para desenvolvimento e deploy.

## 📋 Índice

- [Railway](#railway)
  - [railway-run-seed.sh](#railway-run-seedsh) - **Executar seed no banco de produção** ⭐
  - [check-railway-config.sh](#check-railway-configsh) - Verificar configuração
  - [get-railway-ids.sh](#get-railway-idssh) - Obter IDs dos serviços
- [Grafana](#grafana)
  - [generate-grafana-secrets.sh](#generate-grafana-secretssh) - Gerar credenciais
  - [upload-dashboard-to-grafana-cloud.sh](#upload-dashboard-to-grafana-cloudsh) - Upload de dashboards

---

## Railway

### railway-run-seed.sh ⭐

**🌱 Executar seed no banco de dados de produção**

Este script conecta ao serviço backend no Railway e executa o seed do Prisma para popular o banco de dados de produção com o usuário admin e dados de exemplo.

**Uso:**
```bash
./scripts/railway-run-seed.sh
```

**O que faz:**
- ✅ Verifica autenticação no Railway
- ✅ Conecta ao serviço backend
- ✅ Executa `npm run seed` com variáveis de ambiente de produção
- ✅ Cria usuário admin: `admin@promptvault.com` / `Password@123`
- ✅ Cria workspaces, tags e prompts de exemplo

**Quando usar:**
- 🆕 Após primeiro deploy no Railway (banco vazio)
- 🔐 Quando login retorna `401 Unauthorized` (usuário não existe)
- 🔄 Para resetar dados de exemplo
- ✅ Para garantir que usuário admin existe com senha conhecida

**Pré-requisitos:**
```bash
# Instalar Railway CLI
npm i -g @railway/cli
# ou
brew install railway

# Fazer login
railway login
```

---

### `check-railway-config.sh`

Verifica a configuração do Railway e lista informações necessárias para os GitHub Secrets.

**Uso:**
```bash
./scripts/check-railway-config.sh
```

**Pré-requisitos:**
- Railway CLI instalado (`npm install -g @railway/cli@latest`)
- `RAILWAY_TOKEN` definida (para testes locais)

**O que verifica:**
- ✓ Railway CLI instalado e versão
- ✓ Autenticação com Railway (se token presente)
- ✓ Configuração do projeto local
- ✓ Lista de serviços disponíveis
- ✓ Lista de ambientes
- ✓ IDs necessários para GitHub Secrets

### `get-railway-ids.sh`

Obtém todos os IDs do Railway de forma rápida e formatada para copiar.

**Uso:**
```bash
./scripts/get-railway-ids.sh
```

**Pré-requisitos:**
- Railway CLI instalado
- Projeto linkado (`railway link`)

**Output:**
```
╔════════════════════════════════════════╗
║   Railway Configuration IDs           ║
╚════════════════════════════════════════╝

📋 Project Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RAILWAY_PROJECT_ID:
  ✓ abc123xyz...

🌍 Environment IDs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

**Exemplo de output:**
```
🔍 Verificando configuração do Railway...

📦 Verificando Railway CLI...
✓ Railway CLI instalado (railway version 4.36.0)

🔑 Verificando autenticação Railway...
✓ RAILWAY_TOKEN está definida
✓ Autenticação Railway válida
Logged in as: seu-email@example.com

📋 Verificando configuração do projeto...
✓ Projeto Railway configurado
Project: prompt-zero (abc123...)
Environment: production

🚀 Listando serviços...
- backend (service-id-123)
- frontend (service-id-456)
- postgres (service-id-789)

📝 Informações para GitHub Secrets:
...
```

## Como Adicionar Novos Scripts

1. Crie o arquivo na pasta `scripts/`
2. Adicione shebang e conjunto de segurança:
   ```bash
   #!/bin/bash
   set -e  # Exit on error
   ```
3. Torne executável: `chmod +x scripts/seu-script.sh`
4. Documente aqui no README

## Estrutura Recomendada

```bash
#!/bin/bash
# Descrição do que o script faz
# Usage: ./scripts/script-name.sh [args]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Sua lógica aqui
```

## Troubleshooting

### Permissão Negada

Se receber "Permission denied":
```bash
chmod +x scripts/nome-do-script.sh
```

### Script Não Encontrado

Execute do diretório raiz do projeto:
```bash
./scripts/nome-do-script.sh
```

Ou adicione ao PATH temporariamente:
```bash
export PATH="$PATH:$(pwd)/scripts"
nome-do-script.sh
```
