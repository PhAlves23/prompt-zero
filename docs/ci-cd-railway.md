# CI/CD para Railway (Frontend + Backend)

Este projeto está configurado com dois workflows no GitHub Actions:

- `.github/workflows/ci.yml`
  - Roda em `pull_request` e `push` na `main`
  - Backend: `lint`, `test`, `test:e2e`, `build` (com Postgres de serviço)
  - Frontend: `lint`, `build`

- `.github/workflows/deploy-production-railway.yml`
  - Roda em `push` na `main` e manualmente (`workflow_dispatch`)
  - Executa validações de backend/frontend
  - Executa `prisma migrate deploy` no backend
  - Faz deploy no Railway de backend e frontend

## Secrets obrigatórios no GitHub

Configure estes secrets no repositório (`Settings > Secrets and variables > Actions`):

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_BACKEND_SERVICE_ID`
- `RAILWAY_FRONTEND_SERVICE_ID`
- `RAILWAY_BACKEND_DATABASE_URL_PROD`

## Fluxo de deploy

1. Merge na `main`
2. Workflow de deploy valida backend e frontend
3. Backend aplica migrations (`prisma migrate deploy`)
4. Backend é publicado no Railway
5. Frontend é publicado no Railway

## Observações

- O backend só faz deploy após passar em `lint/test/test:e2e/build`.
- O frontend só faz deploy após passar em `lint/build`.
- O deploy usa `railway up --ci` com identificação explícita de projeto/serviço/ambiente.
