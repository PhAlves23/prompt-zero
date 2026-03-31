# CI/CD para Railway (Frontend + Backend)

Este projeto está configurado com dois workflows no GitHub Actions:

- `.github/workflows/ci.yml`
  - Roda em `pull_request` e `push` na `main`
  - Backend: `lint`, `test`, `test:e2e`, `build` (com Postgres de serviço)
  - Frontend: `pnpm install --frozen-lockfile`, `lint`, `build`, `test:e2e` (Playwright)

- `.github/workflows/deploy-production-railway.yml`
  - Roda em `push` na `main` e manualmente (`workflow_dispatch`)
  - Executa validações de backend/frontend
  - Frontend também valida `test:e2e` (Playwright) antes do deploy
  - Executa `prisma migrate deploy` no backend
  - Faz deploy no Railway de backend e frontend

## Secrets obrigatórios no GitHub

Os jobs de deploy usam o environment **`fantastic-bravery / production`**. Configure os secrets nesse environment (ou no repositório, se não usar environment).

- **`RAILWAY_API_TOKEN`** (recomendado): **Account API Token** em Railway → **Account → Tokens**. O CLI usa isso para `railway whoami` e `railway status`. Um *project token* em `RAILWAY_TOKEN` **não** autentica esses comandos.
- **`RAILWAY_TOKEN`** (opcional): *project token* ou o mesmo valor do API token, conforme a [documentação do CLI](https://docs.railway.com/reference/cli-api) (`RAILWAY_TOKEN` vs `RAILWAY_API_TOKEN`). O workflow define `RAILWAY_API_TOKEN` no job como `secrets.RAILWAY_API_TOKEN || secrets.RAILWAY_TOKEN` para quem só preencheu um dos dois.
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
- O frontend usa `pnpm` (há `frontend/pnpm-lock.yaml`).
- O arquivo `frontend/pnpm-workspace.yaml` precisa conter `packages: ["."]` para evitar erro `packages field missing or empty` no Railway.
- O deploy usa `railway up --ci` com identificação explícita de projeto/serviço/ambiente.

## Variáveis obrigatórias no Railway (backend)

Na Railway o `NODE_ENV` costuma ser `production`. O backend usa `getEnvSecret()` (por exemplo em `auth.module.ts` e `jwt.strategy.ts`): nesse modo **não há fallback** e variáveis ausentes derrubam o boot com erros como `Variável de ambiente obrigatória ausente: JWT_ACCESS_SECRET`.

Defina no serviço do **backend** (mesmo conjunto do `.env.example` de produção), no mínimo:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_SECRET`
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` (opcionais; há defaults no código)
- `FRONTEND_URL`, `PORT` (Railway injeta `PORT`; ajuste se necessário)

Sem isso o container reinicia em loop e os logs mostram `ExceptionHandler` no `AuthModule`.

## Prometheus no Railway (scrape do backend)

### Erro: `is not a valid hostname` com URL completa

Em `static_configs.targets` o Prometheus aceita apenas **`host:port`**, sem `https://`, sem path e sem `/metrics`.

**Errado** (gera o erro que você viu com `node.demo.prometheus.io`):

```yaml
static_configs:
  - targets: ["https://node.demo.prometheus.io/metrics"]
```

**Certo** (HTTPS e path ficam em campos separados):

```yaml
scrape_configs:
  - job_name: promptzero-backend
    scrape_interval: 15s
    scheme: https # use http se for rede interna sem TLS
    metrics_path: /metrics
    static_configs:
      - targets: ["seu-dominio-publico.up.railway.app:443"]
```

Para **Private Networking** na Railway, use `http`, host interno do backend e a porta do processo (a mesma variável `PORT` do serviço):

```yaml
scrape_configs:
  - job_name: promptzero-backend
    scrape_interval: 15s
    scheme: http
    metrics_path: /metrics
    static_configs:
      - targets: ["nome-do-servico-backend.railway.internal:8080"]
```

Substitua `nome-do-servico-backend` e `8080` pelos valores reais (hostname privado na UI do Railway + porta exposta pelo container).

### Template `railway-prometheus`

Se o serviço usa variáveis de ambiente para montar o `prometheus.yml`, garanta que o valor injetado seja **só host:port** no target, e que `metrics_path` e `scheme` estejam configurados à parte — não uma URL completa num único campo.
