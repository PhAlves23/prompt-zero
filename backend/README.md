# PromptZero API (Backend)

API backend em NestJS para autenticação, CRUD/versionamento de prompts, templates dinâmicos, execução com streaming (SSE), analytics e explore/fork.

## Stack

- `NestJS` (arquitetura modular, DI, decorators)
- `Prisma + PostgreSQL` (ORM e persistência)
- `JWT + Passport` (auth com access token + refresh token family)
- `Swagger` (`/api/docs`)
- `class-validator` e `ValidationPipe` (validação de DTO)
- `OpenAI`, `Anthropic`, `Google Gemini` e `OpenRouter` (execução real de prompts)
- `@nestjs/throttler` (rate limit)
- `nestjs-i18n` (internacionalização de respostas e erros)
- `Prometheus` (`/metrics`) para métricas técnicas

## Requisitos

- Node.js `>= 20`
- Yarn `1.x`
- PostgreSQL rodando localmente (ou remoto)

## Configuração local

1. Instale dependências:

```bash
yarn
```

2. Crie o arquivo `.env` com base em `.env.example`:

```bash
cp .env.example .env
```

3. Suba o PostgreSQL com Docker Compose (porta `5434`, banco `promptzero`):

```bash
docker compose up -d
```

4. Gere o client do Prisma:

```bash
yarn prisma:generate
```

5. Rode migrations:

```bash
yarn prisma:migrate:dev
```

6. Rode seed:

```bash
yarn prisma:seed
```

7. Suba a API:

```bash
yarn start:dev
```

## Documentação e Observabilidade

- Swagger UI: `http://localhost:3001/api/docs`
- Swagger JSON OpenAPI: `http://localhost:3001/api/docs-json`
- Métricas Prometheus: `http://localhost:3001/metrics`

### Observabilidade com Prometheus + Grafana

Para visualizar métricas com Prometheus e Grafana localmente:

```bash
# Suba o backend
yarn start:dev

# Em outro terminal, suba Prometheus + Grafana
docker compose -f docker-compose.prometheus.yml up -d
```

Acesse:

- **Prometheus UI**: `http://localhost:9090` - Interface web do Prometheus para queries
- **Grafana**: `http://localhost:3030` - Dashboards avançados (usuário: `admin`, senha: `admin`)

O Grafana já vem configurado com:

- Data source Prometheus
- Dashboard "PromptZero Backend Metrics" com principais métricas

Para mais detalhes sobre configuração no Railway, veja: `../docs/PROMETHEUS-RAILWAY.md`

## Funcionalidades implementadas

- Auth: `register`, `login`, `refresh`, `me`.
- Prompt CRUD com soft delete e versionamento (`v1`, `v2`, ...).
- Templates com parsing de `{{variavel}}` e sincronização de `TemplateVariable`.
- Execução real de prompt com SSE:
  - `POST /api/v1/prompts/:id/execute`
  - `GET /api/v1/prompts/:id/executions`
- Multi-provedor:
  - credenciais por usuário em `ProviderCredential` (`openai`, `anthropic`, `google`, `openrouter`)
  - fallback para credenciais legadas de OpenAI/Anthropic quando necessário
- Pricing dinâmico por provedor/modelo:
  - tabela `ProviderModelPricing` com vigência (`effectiveFrom`, `effectiveTo`)
  - fallback automático para tabela estática quando não houver preço cadastrado
- Resiliência de chamadas LLM:
  - timeout configurável
  - retries com backoff exponencial
  - circuit breaker por provedor (abertura temporária após falhas consecutivas)
- Analytics por período:
  - `/api/v1/analytics/overview`
  - `/api/v1/analytics/executions-per-day`
  - `/api/v1/analytics/cost-per-model`
  - `/api/v1/analytics/top-prompts`
- Explore/Fork:
  - `GET /api/v1/explore`
  - `GET /api/v1/explore/:id`
  - `POST /api/v1/prompts/:id/fork`
- Settings:
  - perfil do usuário
  - API keys/credenciais criptografadas e mascaradas
- i18n backend completo:
  - resolução por `Accept-Language`, `x-lang` e `?lang=`
  - traduções em `pt`, `en`, `es` para erros e respostas textuais

## Scripts

- `yarn start:dev`: servidor em watch
- `yarn build`: build de produção
- `yarn lint`: valida ESLint
- `yarn lint:fix`: corrige lint automaticamente
- `yarn format`: aplica Prettier
- `yarn test`: testes unitários
- `yarn test:e2e`: testes e2e
- `yarn prisma:generate`: gera Prisma Client
- `yarn prisma:migrate:dev`: cria/aplica migration em dev
- `yarn prisma:migrate:deploy`: aplica migrations em produção
- `yarn prisma:seed`: popula dados iniciais

## Decisões técnicas e arquiteturais

- API versionada com prefixo global `/api/v1` para facilitar evolução sem quebra.
- `ValidationPipe` global com `transform`, `whitelist` e `forbidNonWhitelisted` para hardening de entrada.
- Filtro global de exceções com payload padronizado para erros HTTP.
- Filtro global de exceções traduz mensagens por idioma da requisição.
- Refresh token com **token family**:
  - cada refresh gera nova sessão/token
  - token anterior é revogado
  - tentativa de reuse revoga a família
- Soft delete em `Prompt` (`deletedAt`) para preservar histórico de auditoria.
- Versionamento de prompts imutável: editar gera nova versão; restore cria `N+1`.
- Swagger mantido como contrato de integração entre backend e frontend.
- Middleware de `X-Request-Id` e log estruturado por request.
- Rate limit global + thresholds mais restritos em auth.
- Custo de execução com prioridade para pricing dinâmico (`ProviderModelPricing`) e fallback estático.
- Camada de resiliência LLM centralizada no `LlmService` (retry, backoff, timeout e circuit breaker por provedor).

## Dependências e justificativas

- `@nestjs/config`: centralização de env vars.
- `@nestjs/swagger` + `swagger-ui-express`: documentação OpenAPI com UI.
- `@nestjs/passport` + `@nestjs/jwt` + `passport-jwt`: autenticação JWT padrão no ecossistema Nest.
- `@nestjs/throttler`: limitação de taxa para proteção contra brute force.
- `bcrypt`: hash de senhas e refresh tokens.
- `class-validator` + `class-transformer`: validação declarativa de DTO.
- `@prisma/client` + `prisma`: ORM tipado, migrations e seed.
- `openai` + `@anthropic-ai/sdk`: execução real de prompts com provedores LLM.
- `nestjs-i18n`: i18n no backend com fallback e resolvers de idioma.
- `husky` + `lint-staged`: validação automática de qualidade antes de commit.
- `@commitlint/cli` + `@commitlint/config-conventional`: padronização de commits (Conventional Commits).
- `tsx`: execução de seed em TypeScript.

## Qualidade de código

- Lint e format configurados.
- Hook de `pre-commit` roda `lint-staged`.
- Hook de `commit-msg` valida padrão de commit.
- Regra ativa contra `any` explícito sem necessidade.
- Testes e2e com cenários de erro/autorização (401, 403, 404, 409).

## Runbook de produção

### Variáveis obrigatórias em produção

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_SECRET`

Opcional (resiliência LLM):

- `LLM_MAX_RETRIES` (default: `2`)
- `LLM_BACKOFF_MS` (default: `300`)
- `LLM_TIMEOUT_MS` (default: `30000`)
- `LLM_CIRCUIT_FAILURE_THRESHOLD` (default: `3`)
- `LLM_CIRCUIT_COOLDOWN_MS` (default: `30000`)

Opcional (métricas Prometheus):

- `METRICS_ENABLED` (default: `true`)
- `METRICS_PATH` (default: `/metrics`)

Em produção, o bootstrap falha se essas variáveis não existirem.

### Deploy (ordem recomendada)

1. Build da aplicação:

```bash
yarn build
```

2. Aplicar migrations:

```bash
yarn prisma:migrate:deploy
```

3. Subir API:

```bash
yarn start:prod
```

### Healthcheck e smoke test

- Healthcheck: `GET /api/v1` deve retornar status `ok`.
- Swagger UI: `/api/docs`.
- Swagger JSON: `/api/docs-json`.

Smoke mínimo pós-deploy:

1. `POST /api/v1/auth/register` ou `login`
2. `GET /api/v1/auth/me` com Bearer token
3. `POST /api/v1/prompts`
4. `POST /api/v1/prompts/:id/execute`
5. `GET /api/v1/analytics/overview?period=30d`
