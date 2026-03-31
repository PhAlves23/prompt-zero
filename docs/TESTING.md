# Guia de testes — PromptZero

Este documento descreve a estratégia de testes, ferramentas e como executá-los localmente e no CI.

## Visão geral

| Camada | Ferramenta | Escopo |
|--------|------------|--------|
| Backend — unitário | Jest | Serviços e lógica isolada com mocks (`PrismaService`, etc.) |
| Backend — E2E | Jest + Supertest | Rotas HTTP `/api/v1/*` com `AppModule` e serviços mockados quando necessário |
| Frontend — unitário | Vitest | Helpers, cliente BFF, Zustand, `cn()`, streaming SSE |
| Frontend — E2E | Playwright | Fluxos no navegador; stack completa opcional via variáveis de ambiente |

## Backend

### Pré-requisitos

- Node 20+
- Dependências: `cd backend && npm install` ou `yarn`

### Comandos

```bash
cd backend

# Testes unitários (todos os *.spec.ts em src/)
npm test

# Watch
npm run test:watch

# Cobertura
npm run test:cov

# E2E (Supertest, arquivos test/*.e2e-spec.ts)
npm run test:e2e
```

### Convenções

- Arquivos unitários: `*.spec.ts` junto ao código em `src/`
- E2E: `test/*.e2e-spec.ts`, config em `test/jest-e2e.json`
- E2E costumam **sobrescrever** providers com `Test.createTestingModule({ imports: [AppModule] }).overrideProvider(...)` para isolar controllers e validação HTTP (pipes, guards, filtros)

## Frontend

### Comandos

```bash
cd frontend

# Unitários (tests/**/*.test.ts)
pnpm test

# E2E — apenas smoke (sem backend obrigatório no `webServer` padrão)
pnpm test:e2e

# Navegadores Playwright (primeira vez)
pnpm test:e2e:install
```

### Modo E2E “full stack” (Playwright)

Quando `CI=true` ou `E2E_FULL_STACK=1`, o [playwright.config.ts](../frontend/playwright.config.ts):

1. Sobe backend (migrations + seed) e frontend via `webServer`
2. Executa [global-setup.ts](../frontend/tests/e2e/global-setup.ts): login API `admin@promptvault.com` / `Password@123` e grava `tests/e2e/.auth/user.json`
3. Roda projetos **smoke** (`smoke.spec.ts`) e **e2e-authenticated** (todos os `*.e2e.spec.ts` com `storageState`)

Variáveis úteis:

- `E2E_DATABASE_URL` — URL Postgres para o backend no CI/local

### Arquivos E2E do frontend

| Arquivo | Descrição |
|---------|-----------|
| `tests/e2e/smoke.spec.ts` | Redirecionamento de locale, rota pública explore |
| `tests/e2e/features.e2e.spec.ts` | Dashboard, prompts, explore, workspaces, tags, experiments, settings |
| `tests/e2e/auth-flow.e2e.spec.ts` | Login/register sem sessão; dashboard com sessão |
| `tests/e2e/prompts-crud.e2e.spec.ts` | Listagem, criar prompt, abrir detalhe |
| `tests/e2e/prompt-execution.e2e.spec.ts` | Card e botão “Executar” no detalhe do prompt |

## CI/CD

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): job **backend** roda `lint`, `test`, `test:e2e`, `build`. Job **frontend** roda `lint`, `build`, `pnpm test` (Vitest) e `pnpm test:e2e` (Playwright com `CI=true`, modo full stack).

## Troubleshooting

### Backend E2E falha com JWT

Garanta `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` definidos no teste (como em `auth-prompts.e2e-spec.ts`).

### Frontend E2E autenticados falham localmente

Rode com stack completa e banco acessível:

```bash
export E2E_FULL_STACK=1
cd frontend && pnpm test:e2e
```

Ou use o mesmo `DATABASE_URL` que o `playwright.config` espera para o backend subir corretamente.

### Vitest — `fetch` / Response

Testes de `bffFetch` mockam `globalThis.fetch`. Corpo de `Response` só pode ser lido uma vez por instância.

## Referências

- [Jest](https://jestjs.io/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Supertest](https://github.com/ladjs/supertest)
