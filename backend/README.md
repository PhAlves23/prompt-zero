# Prompt Vault Pro API (Backend)

API backend em NestJS para autenticação, CRUD/versionamento de prompts, tags, workspaces e settings.

## Stack

- `NestJS` (arquitetura modular, DI, decorators)
- `Prisma + PostgreSQL` (ORM e persistência)
- `JWT + Passport` (auth com access token + refresh token)
- `Swagger` (`/api/docs`)
- `class-validator` e `ValidationPipe` (validação de DTO)

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

## Documentação Swagger

- UI: `http://localhost:3001/api/docs`
- JSON OpenAPI: `http://localhost:3001/api/docs-json`

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
- Refresh token armazenado com hash (`bcrypt`) para reduzir impacto de vazamento.
- Soft delete em `Prompt` (`deletedAt`) para preservar histórico de auditoria.
- Versionamento de prompts imutável: editar gera nova versão; restore cria `N+1`.
- Swagger mantido como contrato de integração entre backend e frontend.

## Dependências e justificativas

- `@nestjs/config`: centralização de env vars.
- `@nestjs/swagger` + `swagger-ui-express`: documentação OpenAPI com UI.
- `@nestjs/passport` + `@nestjs/jwt` + `passport-jwt`: autenticação JWT padrão no ecossistema Nest.
- `bcrypt`: hash de senhas e refresh tokens.
- `class-validator` + `class-transformer`: validação declarativa de DTO.
- `@prisma/client` + `prisma`: ORM tipado, migrations e seed.
- `husky` + `lint-staged`: validação automática de qualidade antes de commit.
- `@commitlint/cli` + `@commitlint/config-conventional`: padronização de commits (Conventional Commits).
- `tsx`: execução de seed em TypeScript.

## Qualidade de código

- Lint e format configurados.
- Hook de `pre-commit` roda `lint-staged`.
- Hook de `commit-msg` valida padrão de commit.
- Regra ativa contra `any` explícito sem necessidade.
