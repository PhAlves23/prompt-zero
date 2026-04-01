# Estrutura do Projeto PromptZero

Este é um monorepo contendo todas as partes da aplicação PromptZero.

## 📁 Estrutura de Pastas

```
prompt-zero/
│
├── backend/                          # API NestJS
│   ├── src/                          # Código-fonte
│   ├── prisma/                       # Schema e migrações
│   ├── test/                         # Testes
│   └── README.md                     # Docs do backend
│
├── frontend/                         # Aplicação Next.js
│   ├── app/                          # App Router (páginas)
│   ├── components/                   # Componentes React
│   ├── lib/                          # Utilitários
│   ├── stores/                       # Estado global (Zustand)
│   └── README.md                     # Docs do frontend
│
├── prometheus/                       # Observabilidade - Coleta
│   ├── Dockerfile                    # Imagem Prometheus
│   ├── prometheus.yml                # Config scraping
│   ├── railway.toml                  # Config Railway
│   ├── README.md                     # Guia de deploy
│   ├── CHECKLIST.md                  # Verificação
│   └── COMANDOS.md                   # Comandos rápidos
│
├── grafana/                          # Observabilidade - Visualização
│   ├── provisioning/
│   │   ├── datasources/              # Data sources (Prometheus)
│   │   └── dashboards/               # Dashboards prontos
│   └── README.md                     # Docs Grafana
│
├── docs/                             # Documentação
│   ├── FRONTEND.md                   # Guia completo frontend
│   ├── BACKEND.md                    # Guia completo backend
│   ├── TESTING.md                    # Guia de testes
│   ├── PROMETHEUS-RESUMO.md          # Resumo visual
│   ├── PROMETHEUS-QUICKSTART.md      # Início rápido
│   ├── PROMETHEUS-RAILWAY.md         # Configuração Railway
│   ├── CONECTAR-PROMETHEUS-GRAFANA.md # Guia de conexão
│   ├── ci-cd-railway.md              # CI/CD
│   └── assets/                       # Imagens
│
├── .github/workflows/                # CI/CD
│   ├── backend-ci.yml                # Backend pipeline
│   └── frontend-ci.yml               # Frontend pipeline
│
├── docker-compose.yml                # PostgreSQL + Redis (dev)
├── docker-compose.prometheus.yml     # Prometheus + Grafana (local)
├── prometheus.yml                    # Config Prometheus local
│
├── .gitignore                        # Git ignore
├── README.md                         # Documentação principal
└── STRUCTURE.md                      # Este arquivo
```

## 🎯 Organização por Responsabilidade

### Backend (`/backend`)
- API REST em NestJS
- Autenticação JWT
- Integração com LLMs (OpenAI, Anthropic, Google, OpenRouter)
- Analytics e experimentos A/B
- Expõe métricas Prometheus em `/metrics`

### Frontend (`/frontend`)
- Interface Next.js 16 com App Router
- React Server Components
- Integração com backend via BFF pattern
- Dark mode e i18n (3 idiomas)

### Prometheus (`/prometheus`)
- Configuração para deploy no Railway
- Faz scraping do endpoint `/metrics` do backend
- Armazena métricas em time-series database
- Usa private networking do Railway

### Grafana (`/grafana`)
- Configuração de provisioning automático
- Data source Prometheus pré-configurado
- Dashboard "PromptZero Backend Metrics" pronto
- Para uso local com Docker Compose

### Documentação (`/docs`)
- Guias completos de cada parte do projeto
- Tutoriais de configuração
- Decisões arquiteturais
- Diagramas e imagens

## 🚀 Deploy

### Desenvolvimento Local

```bash
# 1. Backend + PostgreSQL + Redis
cd backend
docker compose up -d
yarn prisma:migrate:dev
yarn start:dev

# 2. Frontend
cd frontend
yarn dev

# 3. Observabilidade (opcional)
docker compose -f docker-compose.prometheus.yml up -d
```

### Produção (Railway)

O Railway detecta automaticamente a estrutura monorepo:

**Serviços:**
- `back-end` → Root Directory: `backend/`
- `front-end` → Root Directory: `frontend/`
- `railway-prometheus` → Root Directory: `prometheus/`
- `grafana` → Deploy via template

**CI/CD:**
- GitHub Actions valida backend e frontend
- Railway faz deploy automático no push

## 📊 Fluxo de Observabilidade

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BACKEND                                                   │
│    http://localhost:3001/metrics                            │
│    Expõe métricas Prometheus                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
                          ↓ (scraping a cada 15s)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PROMETHEUS                                                │
│    http://localhost:9090 (local)                            │
│    https://railway-prometheus.railway.app (produção)        │
│    Coleta e armazena métricas                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
                          ↓ (consulta via PromQL)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GRAFANA                                                   │
│    http://localhost:3030 (local)                            │
│    https://grafana.railway.app (produção)                   │
│    Visualiza métricas em dashboards                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuração por Ambiente

### Local (Desenvolvimento)

**Backend:** `.env` local com PostgreSQL/Redis do Docker
**Frontend:** Conecta ao backend local via proxy
**Prometheus:** Scraping de `host.docker.internal:3001`
**Grafana:** Data source aponta para `prometheus:9090`

### Railway (Produção)

**Backend:** Variáveis de ambiente do Railway
**Frontend:** `BACKEND_API_URL` aponta para backend Railway
**Prometheus:** Scraping via `back-end.railway.internal:3001` (private networking)
**Grafana:** Data source aponta para `railway-prometheus.railway.internal:9090`

## 🎨 Convenções

### Git Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: formatação de código
refactor: refatoração
test: adiciona ou corrige testes
chore: tarefas de manutenção
```

### Branches

```
main              # Produção (protegida)
develop           # Desenvolvimento
feature/xxx       # Novas features
fix/xxx           # Bug fixes
docs/xxx          # Documentação
```

### Versionamento

- Backend e Frontend versionados juntos
- Tags seguem semver: `v1.0.0`, `v1.1.0`, etc.
- Changelog em `CHANGELOG.md` (raiz)

## 📦 Scripts Úteis

### Raiz do Projeto

```bash
# Instalar tudo
yarn install:all

# Lint tudo
yarn lint:all

# Test tudo
yarn test:all

# Build tudo
yarn build:all
```

### Por Serviço

```bash
# Backend
cd backend && yarn start:dev

# Frontend
cd frontend && yarn dev

# Prometheus (Railway)
cd prometheus && railway up

# Observabilidade local
docker compose -f docker-compose.prometheus.yml up -d
```

## 🧪 Testes

```bash
# Backend (unitários + E2E)
cd backend
yarn test
yarn test:e2e

# Frontend
cd frontend
yarn test

# Cobertura
yarn test:cov
```

## 📚 Documentação por Área

| Área | Arquivo | Descrição |
|------|---------|-----------|
| **Frontend** | `docs/FRONTEND.md` | Arquitetura, componentes, rotas |
| **Backend** | `backend/README.md` | API, autenticação, LLM |
| **Testes** | `docs/TESTING.md` | Estratégia de testes |
| **Prometheus** | `prometheus/README.md` | Deploy e configuração |
| **Grafana** | `grafana/README.md` | Dashboards e provisioning |
| **CI/CD** | `docs/ci-cd-railway.md` | Pipeline e deploy |
| **Geral** | `README.md` | Visão geral do projeto |

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça suas alterações
4. Commit: `git commit -m 'feat: adiciona minha feature'`
5. Push: `git push origin feature/minha-feature`
6. Abra um Pull Request

## 🔍 Troubleshooting

### "Comando não encontrado"

Certifique-se de instalar dependências em cada pasta:
```bash
cd backend && yarn install
cd frontend && yarn install
```

### "Porta já em uso"

Verifique serviços rodando:
```bash
# Backend (3001)
lsof -i :3001

# Frontend (3000)
lsof -i :3000

# Prometheus (9090)
lsof -i :9090

# Grafana (3030)
lsof -i :3030
```

### "Banco não conecta"

```bash
cd backend
docker compose up -d postgres
yarn prisma:migrate:dev
```

## 📖 Recursos Adicionais

- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Railway Docs](https://docs.railway.app/)

---

**Estrutura atualizada em:** 2026-03-31
