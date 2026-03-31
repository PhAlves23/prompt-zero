# Documentação Backend - PromptZero

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Tecnologias e Dependências](#tecnologias-e-dependências)
5. [Modelo de Dados](#modelo-de-dados)
6. [Sistema de Autenticação](#sistema-de-autenticação)
7. [Endpoints da API](#endpoints-da-api)
8. [Módulos e Serviços](#módulos-e-serviços)
9. [Middlewares e Interceptors](#middlewares-e-interceptors)
10. [Validação e Tratamento de Erros](#validação-e-tratamento-de-erros)
11. [Internacionalização](#internacionalização)
12. [Integração com LLMs](#integração-com-llms)
13. [Sistema de Cache](#sistema-de-cache)
14. [Métricas e Monitoramento](#métricas-e-monitoramento)
15. [Seed e Dados Iniciais](#seed-e-dados-iniciais)
16. [Configurações](#configurações)
17. [Variáveis de Ambiente](#variáveis-de-ambiente)
18. [Scripts Disponíveis](#scripts-disponíveis)
19. [Testes](#testes)
20. [Deploy](#deploy)

---

## Visão Geral

O backend do PromptZero é uma API REST construída com **NestJS 11**, usando **PostgreSQL** (via Prisma) como banco de dados principal e **Redis** (opcional) para cache. A API oferece endpoints para gerenciamento de prompts de IA, execução com streaming, analytics, experimentos A/B, e muito mais.

### Características Principais

- **API REST Versionada**: Todas as rotas sob `/api/v1`
- **Autenticação JWT**: Access tokens + refresh tokens com rotação
- **Multilíngue**: Suporte a pt, en, es para mensagens de erro
- **Streaming**: Execução de prompts com SSE (Server-Sent Events)
- **Multi-Provider**: OpenAI, Anthropic, Google, OpenRouter
- **Analytics**: Métricas agregadas de uso e custos
- **Experimentos A/B**: Sistema completo de testes A/B
- **Métricas Prometheus**: Monitoramento de performance
- **Rate Limiting**: Throttling configurável por endpoint
- **Documentação Swagger**: API docs em `/api/docs`

---

## Arquitetura

### Padrão de Arquitetura

O backend segue uma arquitetura modular do NestJS com separação clara de responsabilidades:

```
┌─────────────────────────────────────────┐
│           Controllers                   │
│    (Rotas HTTP, Validação, DTOs)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│            Services                     │
│    (Lógica de Negócio, Orquestração)   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Prisma / Redis / LLM SDKs         │
│    (Persistência, Cache, Integrações)   │
└─────────────────────────────────────────┘
```

### Fluxo de Requisição

```
Request
  ↓
Middleware (requestId, logger)
  ↓
Guards (JWT, Throttle)
  ↓
Pipes (Validation)
  ↓
Controller (Route Handler)
  ↓
Service (Business Logic)
  ↓
Prisma / Redis / LLM
  ↓
Response
  ↓
Interceptors (Metrics)
  ↓
Exception Filters (Error Handling)
```

---

## Estrutura de Pastas

```
backend/
├── src/                          # Código-fonte
│   ├── main.ts                   # Entry point da aplicação
│   ├── app.module.ts             # Módulo raiz
│   ├── app.controller.ts         # Health check
│   ├── app.service.ts            # Service raiz
│   │
│   ├── config/                   # Configuração global
│   │   └── config.module.ts
│   │
│   ├── prisma/                   # Módulo Prisma
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── redis/                    # Módulo Redis
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   ├── auth/                     # Autenticação
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/                  # DTOs de auth
│   │
│   ├── users/                    # Usuários
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── prompts/                  # Prompts
│   │   ├── prompts.module.ts
│   │   ├── prompts.controller.ts
│   │   ├── prompts.service.ts
│   │   └── dto/
│   │
│   ├── workspaces/               # Workspaces
│   │   ├── workspaces.module.ts
│   │   ├── workspaces.controller.ts
│   │   ├── workspaces.service.ts
│   │   └── dto/
│   │
│   ├── tags/                     # Tags
│   │   ├── tags.module.ts
│   │   ├── tags.controller.ts
│   │   ├── tags.service.ts
│   │   └── dto/
│   │
│   ├── settings/                 # Configurações
│   │   ├── settings.module.ts
│   │   ├── settings.controller.ts
│   │   ├── settings.service.ts
│   │   └── dto/
│   │
│   ├── executions/               # Execução de prompts
│   │   ├── executions.module.ts
│   │   ├── executions.controller.ts
│   │   ├── executions.service.ts
│   │   ├── llm.service.ts        # Integração com LLMs
│   │   ├── provider-pricing.service.ts
│   │   └── dto/
│   │
│   ├── analytics/                # Analytics
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── dto/
│   │
│   ├── explore/                  # Exploração pública
│   │   ├── explore.module.ts
│   │   ├── explore.controller.ts
│   │   ├── explore.service.ts
│   │   └── dto/
│   │
│   ├── experiments/              # Experimentos A/B
│   │   ├── experiments.module.ts
│   │   ├── experiments.controller.ts
│   │   ├── experiments.service.ts
│   │   └── dto/
│   │
│   ├── metrics/                  # Métricas Prometheus
│   │   ├── metrics.module.ts
│   │   └── http-metrics.interceptor.ts
│   │
│   ├── common/                   # Utilitários compartilhados
│   │   ├── guards/               # Guards customizados
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── app-throttler.guard.ts
│   │   ├── decorators/           # Decorators
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/              # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── middleware/           # Middlewares
│   │   │   ├── request-id.middleware.ts
│   │   │   └── structured-logger.middleware.ts
│   │   ├── interfaces/           # Interfaces compartilhadas
│   │   └── utils/                # Utilitários
│   │       ├── env.util.ts
│   │       ├── crypto.util.ts
│   │       ├── period.util.ts
│   │       ├── template.util.ts
│   │       └── string.util.ts
│   │
│   └── i18n/                     # Internacionalização
│       ├── pt/
│       │   └── common.json
│       ├── en/
│       │   └── common.json
│       └── es/
│           └── common.json
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Schema do banco
│   ├── migrations/               # Migrações
│   └── seed.ts                   # Dados iniciais
│
├── test/                         # Testes
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── dist/                         # Build output
│
├── docker-compose.yml            # Postgres + Redis
├── .env.example                  # Exemplo de variáveis
├── nest-cli.json                 # Configuração Nest CLI
├── tsconfig.json                 # Configuração TypeScript
├── package.json                  # Dependências e scripts
└── README.md                     # Instruções de setup
```

---

## Tecnologias e Dependências

### Core Framework

- **NestJS 11**: Framework Node.js progressivo
- **Express**: HTTP server (via `@nestjs/platform-express`)
- **TypeScript 5.7.3**: Linguagem

### Banco de Dados

- **Prisma 6.19.2**: ORM
- **PostgreSQL**: Banco de dados relacional
- **ioredis 5.10.1**: Cliente Redis (cache opcional)

### Autenticação

- **@nestjs/jwt 11.0.2**: JWT tokens
- **@nestjs/passport 11.0.5**: Estratégias de autenticação
- **passport-jwt 4.0.1**: Estratégia JWT
- **bcrypt 6.0.0**: Hash de senhas

### Validação

- **class-validator 0.15.1**: Decorators de validação
- **class-transformer 0.5.1**: Transformação de objetos

### Documentação

- **@nestjs/swagger 11.2.6**: Geração de docs OpenAPI
- **swagger-ui-express 5.0.1**: UI do Swagger

### Rate Limiting

- **@nestjs/throttler 6.5.0**: Rate limiting e throttling

### Internacionalização

- **nestjs-i18n 10.6.0**: i18n para NestJS

### Métricas

- **@willsoto/nestjs-prometheus 6.1.0**: Integração Prometheus
- **prom-client 15.1.3**: Cliente Prometheus

### Integrações LLM

- **openai 6.33.0**: SDK OpenAI
- **@anthropic-ai/sdk 0.80.0**: SDK Anthropic
- Google Gemini: Via API REST (sem SDK dedicado)
- OpenRouter: Via API REST compatível com OpenAI

### Utilitários

- **rxjs 7.8.1**: Programação reativa

### Dev Tools

- **@nestjs/cli 11.0.0**: CLI do NestJS
- **Jest 30.0.0**: Framework de testes
- **ESLint 9**: Linting
- **Prettier 3.4.2**: Formatação de código
- **Husky 9.1.7**: Git hooks
- **lint-staged 16.4.0**: Linting em staged files
- **tsx 4.21.0**: Execução TypeScript (seed)

---

## Modelo de Dados

### Schema Prisma

Arquivo: `prisma/schema.prisma`

### Enums

```prisma
enum Language {
  pt
  en
  es
}

enum VariableType {
  text
  textarea
  select
}

enum ProviderType {
  openai
  anthropic
  google
  openrouter
}

enum ExperimentStatus {
  running
  stopped
}

enum ExperimentVariant {
  A
  B
}
```

### Entidades Principais

#### User

Usuário do sistema.

```prisma
model User {
  id                 String   @id @default(uuid())
  name               String
  email              String   @unique
  passwordHash       String
  refreshTokenHash   String?
  openaiApiKeyEnc    String?      // Legado
  anthropicApiKeyEnc String?      // Legado
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  workspaces          Workspace[]
  prompts             Prompt[]
  tags                Tag[]
  executions          Execution[]
  refreshSessions     RefreshTokenSession[]
  providerCredentials ProviderCredential[]
  experiments         PromptExperiment[]
}
```

**Campos cifrados:**
- `openaiApiKeyEnc`, `anthropicApiKeyEnc`: Chaves API legadas (substituídas por `ProviderCredential`)

#### Workspace

Organização de prompts em workspaces.

```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String
  description String?
  color       String   @default("#6366F1")
  isDefault   Boolean  @default(false)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User     @relation(...)
  prompts Prompt[]

  @@unique([userId, name])
  @@index([userId])
}
```

**Regras:**
- Nome único por usuário
- Um workspace pode ser marcado como padrão

#### Prompt

Prompt de IA com versionamento.

```prisma
model Prompt {
  id           String    @id @default(uuid())
  title        String
  description  String?
  content      String
  language     Language  @default(pt)
  model        String
  isPublic     Boolean   @default(false)
  isTemplate   Boolean   @default(false)
  isFavorite   Boolean   @default(false)
  forkCount    Int       @default(0)
  forkedFromId String?
  userId       String
  workspaceId  String?
  deletedAt    DateTime?  // Soft delete
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user           User               @relation(...)
  workspace      Workspace?         @relation(...)
  versions       PromptVersion[]
  tags           PromptTag[]
  variables      TemplateVariable[]
  executions     Execution[]
  experimentsAsA PromptExperiment[] @relation("PromptExperimentA")
  experimentsAsB PromptExperiment[] @relation("PromptExperimentB")
  forkedFrom     Prompt?            @relation("PromptFork", ...)
  forks          Prompt[]           @relation("PromptFork")

  @@index([userId, deletedAt, updatedAt])
  @@index([workspaceId])
}
```

**Features:**
- Soft delete via `deletedAt`
- Versionamento automático
- Sistema de fork para prompts públicos
- Suporte a templates com variáveis

#### PromptVersion

Histórico de versões de um prompt.

```prisma
model PromptVersion {
  id            String   @id @default(uuid())
  versionNumber Int
  content       String
  promptId      String
  createdAt     DateTime @default(now())

  prompt     Prompt      @relation(...)
  executions Execution[]

  @@unique([promptId, versionNumber])
  @@index([promptId, createdAt])
}
```

**Regras:**
- Número de versão único por prompt
- Versões são imutáveis
- Criadas automaticamente ao atualizar conteúdo

#### Tag

Tags para categorização de prompts.

```prisma
model Tag {
  id        String   @id @default(uuid())
  name      String
  slug      String
  color     String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User        @relation(...)
  prompts PromptTag[]

  @@unique([userId, slug])
  @@index([userId])
}
```

#### PromptTag

Junção many-to-many entre Prompt e Tag.

```prisma
model PromptTag {
  promptId String
  tagId    String

  prompt Prompt @relation(...)
  tag    Tag    @relation(...)

  @@id([promptId, tagId])
}
```

#### TemplateVariable

Variáveis para prompts template.

```prisma
model TemplateVariable {
  id           String       @id @default(uuid())
  name         String
  type         VariableType @default(text)
  defaultValue String?
  options      Json?        // Para type=select
  description  String?
  promptId     String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  prompt Prompt @relation(...)

  @@index([promptId])
}
```

**Tipos de variável:**
- `text`: Input de texto simples
- `textarea`: Textarea multilinhas
- `select`: Select com opções (armazenadas em `options` JSON)

#### Execution

Registro de execução de um prompt.

```prisma
model Execution {
  id              String       @id @default(uuid())
  provider        ProviderType @default(openai)
  input           String
  output          String
  model           String
  credentialId    String?
  temperature     Float
  maxTokens       Int
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int
  latencyMs       Int
  estimatedCost   Decimal      @db.Decimal(10, 6)
  variables       Json?
  promptId        String
  promptVersionId String
  userId          String
  createdAt       DateTime     @default(now())

  prompt             Prompt                    @relation(...)
  promptVersion      PromptVersion             @relation(...)
  user               User                      @relation(...)
  credential         ProviderCredential?       @relation(...)
  experimentExposure PromptExperimentExposure?

  @@index([userId, createdAt])
  @@index([promptId, createdAt])
  @@index([model, createdAt])
  @@index([provider, model, createdAt])
}
```

**Métricas capturadas:**
- Tokens de input/output
- Latência em ms
- Custo estimado em USD
- Variáveis usadas (JSON)

#### PromptExperiment

Experimento A/B comparando dois prompts.

```prisma
model PromptExperiment {
  id               String           @id @default(uuid())
  userId           String
  promptAId        String
  promptBId        String
  trafficSplitA    Int              @default(50)  // 0-100
  status           ExperimentStatus @default(running)
  sampleSizeTarget Int?
  startedAt        DateTime         @default(now())
  endedAt          DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  user      User                       @relation(...)
  promptA   Prompt                     @relation("PromptExperimentA", ...)
  promptB   Prompt                     @relation("PromptExperimentB", ...)
  exposures PromptExperimentExposure[]
  votes     PromptExperimentVote[]

  @@index([userId, status, createdAt])
  @@index([promptAId])
  @@index([promptBId])
}
```

#### PromptExperimentExposure

Registro de exposição a uma variante do experimento.

```prisma
model PromptExperimentExposure {
  id            String            @id @default(uuid())
  experimentId  String
  requestId     String            // x-request-id para correlação
  chosenVariant ExperimentVariant
  executionId   String            @unique
  createdAt     DateTime          @default(now())

  experiment PromptExperiment      @relation(...)
  execution  Execution             @relation(...)
  vote       PromptExperimentVote?

  @@index([experimentId, createdAt])
  @@index([experimentId, chosenVariant, createdAt])
}
```

#### PromptExperimentVote

Voto em um experimento A/B.

```prisma
model PromptExperimentVote {
  id            String            @id @default(uuid())
  experimentId  String
  exposureId    String            @unique
  winnerVariant ExperimentVariant
  createdAt     DateTime          @default(now())

  experiment PromptExperiment         @relation(...)
  exposure   PromptExperimentExposure @relation(...)

  @@index([experimentId, winnerVariant, createdAt])
}
```

#### RefreshTokenSession

Sessão de refresh token com rotação.

```prisma
model RefreshTokenSession {
  id            String    @id @default(uuid())
  tokenHash     String    // bcrypt hash
  familyId      String    // Família de tokens
  parentTokenId String?
  revokedAt     DateTime?
  createdAt     DateTime  @default(now())
  expiresAt     DateTime
  userId        String

  user     User                    @relation(...)
  parent   RefreshTokenSession?    @relation("RefreshTokenParent", ...)
  children RefreshTokenSession[]   @relation("RefreshTokenParent")

  @@index([userId, familyId])
  @@index([expiresAt])
}
```

**Segurança:**
- Rotação de tokens: cada refresh gera novo token e invalida o anterior
- Família de tokens: detecta reuso de tokens revogados
- Revogação em cascata: se token revogado for reusado, toda a família é revogada

#### ProviderCredential

Credenciais por provedor de LLM.

```prisma
model ProviderCredential {
  id             String       @id @default(uuid())
  userId         String
  provider       ProviderType
  label          String?
  apiKeyEnc      String       // Cifrada
  baseUrl        String?
  organizationId String?
  isDefault      Boolean      @default(false)
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user       User        @relation(...)
  executions Execution[]

  @@index([userId, provider, isActive])
}
```

**Segurança:**
- API keys são cifradas usando `ENCRYPTION_SECRET`
- Suporte a múltiplas credenciais por provedor
- Credencial padrão por provedor

#### ProviderModelPricing

Preços de modelos para cálculo de custos.

```prisma
model ProviderModelPricing {
  id              String       @id @default(uuid())
  provider        ProviderType
  model           String
  inputCostPer1k  Decimal      @db.Decimal(10, 6)
  outputCostPer1k Decimal      @db.Decimal(10, 6)
  currency        String       @default("USD")
  isActive        Boolean      @default(true)
  effectiveFrom   DateTime     @default(now())
  effectiveTo     DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([provider, model, isActive])
  @@index([effectiveFrom, effectiveTo])
}
```

**Features:**
- Versionamento de preços com datas de vigência
- Custo por 1k tokens (input e output separados)
- Suporte a múltiplas moedas (default USD)

---

## Sistema de Autenticação

### Arquitetura JWT

O sistema usa **dois tokens JWT**:

1. **Access Token**: Curta duração (15min default), usado em cada requisição
2. **Refresh Token**: Longa duração (7d default), usado para renovar access tokens

### Fluxo de Autenticação

#### 1. Registro

```
POST /api/v1/auth/register
Body: { name, email, password }

↓

1. Validação (DTO)
2. Verificar email único
3. Hash senha (bcrypt, cost 10)
4. Criar usuário no BD
5. Gerar access + refresh tokens
6. Criar RefreshTokenSession
7. Retornar tokens

Response: { accessToken, refreshToken, user }
```

#### 2. Login

```
POST /api/v1/auth/login
Body: { email, password }

↓

1. Validação
2. Buscar usuário por email
3. Comparar senha (bcrypt)
4. Gerar tokens
5. Criar nova sessão de refresh
6. Retornar tokens

Response: { accessToken, refreshToken, user }
```

#### 3. Acesso a Recursos Protegidos

```
GET /api/v1/prompts
Header: Authorization: Bearer <accessToken>

↓

1. JwtAuthGuard extrai token
2. JwtStrategy valida assinatura
3. Payload decodificado: { sub: userId, email }
4. Request.user = { sub, email }
5. Controller acessa @CurrentUser()
6. Service usa userId para filtrar dados

Response: [...prompts do usuário]
```

#### 4. Refresh de Token

```
POST /api/v1/auth/refresh
Body: { refreshToken }

↓

1. Validar assinatura do refresh token
2. Extrair sid (session id) e fid (family id)
3. Buscar sessão no BD
4. Verificar se não está revogada
5. Verificar se não expirou
6. Comparar hash (bcrypt)
7. Revogar sessão atual
8. Criar nova sessão (mesmo familyId, parent = sessão atual)
9. Gerar novos tokens
10. Retornar tokens

Response: { accessToken, refreshToken }
```

**Segurança contra reuso:**
- Se token já foi usado (sessão revogada), toda a família é revogada
- Detecta tentativas de replay attack

### JWT Strategy

Arquivo: `src/auth/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getEnvSecret(
        configService,
        'JWT_ACCESS_SECRET',
        'dev-secret-access'
      ),
    });
  }

  async validate(payload: any): Promise<AuthUser> {
    return { sub: payload.sub, email: payload.email };
  }
}
```

### Guards

#### JwtAuthGuard

Arquivo: `src/common/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Aplicado via decorator:

```typescript
@UseGuards(JwtAuthGuard)
@Get()
async findAll(@CurrentUser() user: AuthUser) {
  // user.sub contém o userId
}
```

#### AppThrottlerGuard

Arquivo: `src/common/guards/app-throttler.guard.ts`

Rate limiting global com exceção para path de métricas:

```typescript
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const metricsPath = this.configService.get('METRICS_PATH', '/metrics');
    return request.path === metricsPath;
  }
}
```

### Decorators

#### @CurrentUser()

Arquivo: `src/common/decorators/current-user.decorator.ts`

Extrai usuário autenticado do request:

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## Endpoints da API

Base: **`/api/v1`** (prefixo global `api` + versionamento URI versão `1`)

### Health Check

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api` ou `/api/v1` | Não | Status da API |

**Response:**
```json
{
  "status": "ok",
  "service": "PromptZero API",
  "message": "API está funcionando corretamente"
}
```

### Auth (`/api/v1/auth`)

| Método | Endpoint | Auth | Rate Limit | Descrição |
|--------|----------|------|------------|-----------|
| POST | `/auth/register` | Não | 10/min | Registrar novo usuário |
| POST | `/auth/login` | Não | 10/min | Login |
| POST | `/auth/refresh` | Não | 20/min | Renovar tokens |
| GET | `/auth/me` | JWT | - | Perfil do usuário autenticado |

#### POST /auth/register

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "SenhaSegura123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com"
  }
}
```

#### POST /auth/login

**Request:**
```json
{
  "email": "joao@example.com",
  "password": "SenhaSegura123!"
}
```

**Response:** Igual ao register

#### POST /auth/refresh

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### GET /auth/me

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "createdAt": "2026-03-31T10:00:00Z",
  "updatedAt": "2026-03-31T10:00:00Z"
}
```

### Prompts (`/api/v1/prompts`)

Todos os endpoints exigem JWT.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/prompts` | Criar prompt |
| GET | `/prompts` | Listar prompts |
| GET | `/prompts/:id` | Detalhe do prompt |
| PATCH | `/prompts/:id` | Atualizar prompt |
| DELETE | `/prompts/:id` | Deletar prompt (soft delete) |
| GET | `/prompts/:id/versions` | Listar versões |
| GET | `/prompts/:id/versions/:versionId` | Detalhe da versão |
| DELETE | `/prompts/:id/versions/:versionId` | Deletar versão |
| POST | `/prompts/:id/versions/:versionId/restore` | Restaurar versão |
| GET | `/prompts/:id/variables` | Listar variáveis |
| PUT | `/prompts/:id/variables` | Sincronizar variáveis |
| POST | `/prompts/:id/fork` | Fork de prompt público |

#### POST /prompts

**Request:**
```json
{
  "title": "Gerador de Posts Instagram",
  "description": "Cria posts engajadores para Instagram",
  "content": "Crie um post sobre {{topic}} para Instagram...",
  "model": "gpt-4o",
  "language": "pt",
  "isPublic": false,
  "isTemplate": true,
  "workspaceId": "uuid",
  "tagIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Gerador de Posts Instagram",
  "content": "...",
  "currentVersion": 1,
  "versions": [{ "id": "uuid", "versionNumber": 1, ... }],
  "tags": [...],
  "workspace": {...},
  ...
}
```

#### GET /prompts

**Query params:**
```
?search=instagram
&workspaceId=uuid
&tagIds=uuid1,uuid2
&isPublic=false
&isFavorite=true
&page=1
&limit=20
&sortBy=updatedAt
&sortOrder=desc
```

**Response:**
```json
{
  "data": [...prompts],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

#### PATCH /prompts/:id

**Request:**
```json
{
  "title": "Novo título",
  "content": "Novo conteúdo",
  "model": "gpt-4o-mini"
}
```

**Comportamento:**
- Se `content` mudou, cria nova versão automaticamente
- Atualiza campos do prompt
- Retorna prompt atualizado com nova versão

### Execuções (`/api/v1/prompts/:id/execute` e `/prompts/:id/executions`)

#### POST /prompts/:id/execute

**Streaming com SSE (Server-Sent Events)**

**Request:**
```json
{
  "variables": {
    "topic": "inteligência artificial"
  },
  "temperature": 0.7,
  "maxTokens": 1000,
  "credentialId": "uuid"  // Opcional
}
```

**Response (text/event-stream):**

```
event: start
data: {"executionId":"uuid","model":"gpt-4o"}

event: chunk
data: {"content":"Texto"}

event: chunk
data: {"content":" gerado"}

event: done
data: {"executionId":"uuid","inputTokens":50,"outputTokens":100,"latencyMs":1200,"estimatedCost":0.0025}

// Ou em caso de erro:
event: error
data: {"message":"Erro ao executar prompt","code":"EXECUTION_ERROR"}
```

**Eventos:**
- `start`: Início da execução
- `chunk`: Fragmento de resposta (streaming)
- `done`: Execução concluída com métricas
- `error`: Erro durante execução

#### GET /prompts/:id/executions

**Query params:**
```
?page=1
&limit=20
&startDate=2026-03-01
&endDate=2026-03-31
&model=gpt-4o
&provider=openai
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "input": "...",
      "output": "...",
      "model": "gpt-4o",
      "provider": "openai",
      "inputTokens": 50,
      "outputTokens": 100,
      "totalTokens": 150,
      "latencyMs": 1200,
      "estimatedCost": "0.002500",
      "createdAt": "2026-03-31T10:00:00Z"
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### Workspaces (`/api/v1/workspaces`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/workspaces` | Criar workspace |
| GET | `/workspaces` | Listar workspaces |
| GET | `/workspaces/:id` | Detalhe |
| PATCH | `/workspaces/:id` | Atualizar |
| DELETE | `/workspaces/:id` | Deletar |

### Tags (`/api/v1/tags`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/tags` | Criar tag |
| GET | `/tags` | Listar tags |
| GET | `/tags/:id` | Detalhe |
| PATCH | `/tags/:id` | Atualizar |
| DELETE | `/tags/:id` | Deletar |

### Settings (`/api/v1/users`)

**Nota:** Controller de settings usa prefixo `users`.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| PATCH | `/users/profile` | Atualizar perfil |
| PUT | `/users/api-keys` | Salvar API keys legadas |
| GET | `/users/api-keys` | Status das API keys |
| GET | `/users/provider-credentials` | Listar credenciais |
| POST | `/users/provider-credentials` | Criar/atualizar credencial |
| PATCH | `/users/provider-credentials/:id` | Atualizar credencial |
| DELETE | `/users/provider-credentials/:id` | Deletar credencial |

#### PUT /users/api-keys (Legado)

**Request:**
```json
{
  "openaiApiKey": "sk-...",
  "anthropicApiKey": "sk-ant-..."
}
```

**Response:**
```json
{
  "message": "API keys atualizadas com sucesso"
}
```

#### POST /users/provider-credentials

**Request:**
```json
{
  "provider": "openai",
  "label": "Minha chave OpenAI",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "organizationId": "org-...",
  "isDefault": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "provider": "openai",
  "label": "Minha chave OpenAI",
  "isDefault": true,
  "isActive": true,
  "createdAt": "2026-03-31T10:00:00Z"
}
```

### Analytics (`/api/v1/analytics`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/analytics/overview` | Visão geral |
| GET | `/analytics/executions-per-day` | Execuções por dia |
| GET | `/analytics/cost-per-model` | Custo por modelo |
| GET | `/analytics/top-prompts` | Top prompts |
| GET | `/analytics/ab-history` | Histórico A/B |
| GET | `/analytics/ab-ranking` | Ranking A/B |

**Query params comuns:**
```
?period=7d|30d|90d
&startDate=2026-03-01
&endDate=2026-03-31
```

#### GET /analytics/overview

**Response:**
```json
{
  "totalExecutions": 1250,
  "totalCost": "125.50",
  "totalPrompts": 42,
  "avgLatencyMs": 1500,
  "avgTokensPerExecution": 250,
  "topModel": "gpt-4o",
  "topProvider": "openai"
}
```

#### GET /analytics/executions-per-day

**Response:**
```json
{
  "data": [
    { "date": "2026-03-24", "count": 45 },
    { "date": "2026-03-25", "count": 52 },
    ...
  ]
}
```

#### GET /analytics/cost-per-model

**Response:**
```json
{
  "data": [
    { "model": "gpt-4o", "totalCost": "75.25", "executionCount": 500 },
    { "model": "claude-3-opus", "totalCost": "50.25", "executionCount": 250 }
  ]
}
```

#### GET /analytics/top-prompts

**Query params:** `?limit=10`

**Response:**
```json
{
  "data": [
    {
      "promptId": "uuid",
      "title": "Gerador de Posts",
      "executionCount": 150,
      "totalCost": "15.50",
      "avgLatencyMs": 1200
    }
  ]
}
```

### Explore (`/api/v1/explore`)

**Endpoints públicos (sem JWT)**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/explore` | Listar prompts públicos |
| GET | `/explore/:id` | Detalhe de prompt público |

#### GET /explore

**Query params:**
```
?search=instagram
&language=pt
&page=1
&limit=20
&sortBy=forkCount
&sortOrder=desc
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Gerador de Posts Instagram",
      "description": "...",
      "language": "pt",
      "model": "gpt-4o",
      "forkCount": 25,
      "user": {
        "name": "João Silva"
      },
      "tags": [...]
    }
  ],
  "meta": { ... }
}
```

### Experiments (`/api/v1/experiments`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/experiments` | Listar experimentos |
| POST | `/experiments` | Criar experimento |
| POST | `/experiments/:id/run` | Executar experimento |
| POST | `/experiments/:id/vote` | Votar em variante |
| GET | `/experiments/:id/results` | Resultados do experimento |
| POST | `/experiments/:id/stop` | Parar experimento |

#### POST /experiments

**Request:**
```json
{
  "promptAId": "uuid-a",
  "promptBId": "uuid-b",
  "trafficSplitA": 50,
  "sampleSizeTarget": 100
}
```

**Response:**
```json
{
  "id": "uuid",
  "promptAId": "uuid-a",
  "promptBId": "uuid-b",
  "trafficSplitA": 50,
  "status": "running",
  "startedAt": "2026-03-31T10:00:00Z"
}
```

#### POST /experiments/:id/run

Executa o experimento, escolhendo variante A ou B baseado no split de tráfego.

**Request:**
```json
{
  "variables": {
    "topic": "IA"
  },
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response (SSE):**
```
event: start
data: {"executionId":"uuid","variant":"A","promptId":"uuid-a"}

event: chunk
data: {"content":"..."}

event: done
data: {"executionId":"uuid","exposureId":"uuid-exposure",...}
```

#### POST /experiments/:id/vote

**Request:**
```json
{
  "exposureId": "uuid-exposure",
  "winnerVariant": "A"
}
```

**Response:**
```json
{
  "id": "uuid-vote",
  "experimentId": "uuid",
  "exposureId": "uuid-exposure",
  "winnerVariant": "A"
}
```

#### GET /experiments/:id/results

**Response:**
```json
{
  "experimentId": "uuid",
  "status": "running",
  "totalExposures": 50,
  "totalVotes": 30,
  "variantA": {
    "exposures": 25,
    "votes": 18,
    "winRate": 0.72,
    "avgLatencyMs": 1200,
    "avgCost": "0.0025"
  },
  "variantB": {
    "exposures": 25,
    "votes": 12,
    "winRate": 0.48,
    "avgLatencyMs": 1100,
    "avgCost": "0.0020"
  },
  "confidence": 0.85,
  "recommendation": "A"
}
```

### Métricas Prometheus

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/metrics` | Não | Métricas Prometheus |

**Response (formato Prometheus):**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/prompts",status="200"} 1250

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/v1/prompts"} 1000
...
```

---

## Módulos e Serviços

### Estrutura Modular

Cada domínio é um módulo NestJS independente:

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
├── RedisModule (global)
├── MetricsModule (global)
├── AuthModule
│   └── imports UsersModule
├── PromptsModule
├── WorkspacesModule
├── TagsModule
├── SettingsModule
├── ExecutionsModule
├── AnalyticsModule
├── ExploreModule
└── ExperimentsModule
```

### Módulos Principais

#### AuthModule

**Responsabilidades:**
- Registro de usuários
- Login
- Refresh de tokens
- Perfil do usuário
- Estratégia JWT

**Serviços:**
- `AuthService`: Lógica de autenticação
- `UsersService`: Gerenciamento de usuários (importado)

**Guards:**
- `JwtAuthGuard`: Proteção de rotas

#### PromptsModule

**Responsabilidades:**
- CRUD de prompts
- Versionamento
- Variáveis de template
- Fork de prompts públicos

**Serviços:**
- `PromptsService`: Lógica de negócio de prompts

**Regras de negócio:**
- Atualização de conteúdo cria nova versão
- Soft delete (não remove do BD)
- Validação de ownership
- Fork apenas de prompts públicos

#### ExecutionsModule

**Responsabilidades:**
- Execução de prompts com streaming
- Histórico de execuções
- Integração com LLMs
- Cálculo de custos

**Serviços:**
- `ExecutionsService`: Orquestração de execuções
- `LlmService`: Integração com provedores LLM
- `ProviderPricingService`: Cálculo de custos

**Providers suportados:**
- OpenAI (SDK oficial)
- Anthropic (SDK oficial)
- Google Gemini (API REST)
- OpenRouter (API compatível com OpenAI)

#### AnalyticsModule

**Responsabilidades:**
- Agregação de métricas
- Análise de custos
- Ranking de prompts
- Histórico de experimentos

**Serviços:**
- `AnalyticsService`: Queries agregadas no Prisma

#### ExperimentsModule

**Responsabilidades:**
- Criação de experimentos A/B
- Execução com seleção de variante
- Votação
- Cálculo de resultados estatísticos

**Serviços:**
- `ExperimentsService`: Lógica de experimentos
- `RedisService`: Cache de contadores de exposição (opcional)

**Algoritmo de seleção:**
- Usa `trafficSplitA` para determinar probabilidade
- Gera número aleatório 0-100
- Se <= splitA, escolhe A; senão B
- Registra exposição no BD

#### MetricsModule

**Responsabilidades:**
- Coleta de métricas HTTP
- Exposição em formato Prometheus

**Interceptors:**
- `HttpMetricsInterceptor`: Registra duração e status de requisições

**Métricas coletadas:**
- `http_requests_total`: Total de requisições
- `http_request_duration_seconds`: Duração das requisições

---

## Middlewares e Interceptors

### Middlewares

#### requestIdMiddleware

Arquivo: `src/common/middleware/request-id.middleware.ts`

```typescript
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
```

**Função:**
- Gera ou lê `x-request-id`
- Anexa ao request
- Retorna no response header
- Usado para correlação de logs

#### structuredLoggerMiddleware

Arquivo: `src/common/middleware/structured-logger.middleware.ts`

```typescript
export function structuredLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }));
  });
  
  next();
}
```

**Função:**
- Log estruturado em JSON
- Captura métricas de requisição
- Facilita parsing por ferramentas de log

### Interceptors

#### HttpMetricsInterceptor

Arquivo: `src/metrics/http-metrics.interceptor.ts`

```typescript
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        // Registra métricas Prometheus
        this.httpRequestsTotal.inc({ method, route, status });
        this.httpRequestDuration.observe({ method, route }, duration);
      })
    );
  }
}
```

**Métricas:**
- Counter: `http_requests_total`
- Histogram: `http_request_duration_seconds`

---

## Validação e Tratamento de Erros

### ValidationPipe Global

Configurado em `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
  })
);
```

**Comportamento:**
- `transform`: Converte payloads para instâncias de DTO
- `whitelist`: Remove propriedades não declaradas
- `forbidNonWhitelisted`: Rejeita propriedades extras
- `disableErrorMessages`: Oculta detalhes de validação em produção

### DTOs com class-validator

Exemplo:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SenhaSegura123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### HttpExceptionFilter

Arquivo: `src/common/filters/http-exception.filter.ts`

Captura todas as exceções e formata resposta:

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = this.getErrorMessage(exception);

    response.status(status).json({
      code: this.getErrorCode(status),
      message: this.translateIfNeeded(message),
      path: request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Formato de erro:**
```json
{
  "code": "UNAUTHORIZED",
  "message": "Credenciais inválidas",
  "path": "/api/v1/auth/login",
  "requestId": "uuid",
  "timestamp": "2026-03-31T10:00:00Z"
}
```

### Mensagens i18n

Mensagens que contêm `.` são tratadas como chaves i18n:

```typescript
throw new UnauthorizedException('errors.invalidCredentials');
// → Traduzido para "Credenciais inválidas" (pt)
// → "Invalid credentials" (en)
// → "Credenciales inválidas" (es)
```

### Exceções Comuns

- `BadRequestException`: Validação falhou (400)
- `UnauthorizedException`: Não autenticado (401)
- `ForbiddenException`: Sem permissão (403)
- `NotFoundException`: Recurso não encontrado (404)
- `ConflictException`: Conflito (ex: email duplicado) (409)
- `InternalServerErrorException`: Erro interno (500)

---

## Internacionalização

### Configuração

Arquivo: `src/i18n/` (diretórios `pt/`, `en/`, `es/`)

Cada idioma tem `common.json` com mensagens de erro e respostas.

### Estrutura do Dicionário

```json
{
  "errors": {
    "emailInUse": "E-mail já está em uso",
    "invalidCredentials": "Credenciais inválidas",
    "promptNotFound": "Prompt não encontrado",
    "promptForbidden": "Você não tem permissão para acessar este prompt",
    ...
  },
  "success": {
    "promptCreated": "Prompt criado com sucesso",
    "promptUpdated": "Prompt atualizado com sucesso",
    ...
  }
}
```

### Resolução de Locale

O `nestjs-i18n` resolve o idioma na seguinte ordem:

1. Query param `lang` (ex: `?lang=en`)
2. Header `x-lang`
3. Header `Accept-Language`
4. Fallback: `pt` (padrão)

### Uso no Código

```typescript
// Em services
throw new NotFoundException(
  this.i18n.t('errors.promptNotFound', { lang: I18nContext.current().lang })
);

// O filter traduz automaticamente chaves com '.'
throw new NotFoundException('errors.promptNotFound');
```

---

## Integração com LLMs

### LlmService

Arquivo: `src/executions/llm.service.ts`

Serviço centralizado para integração com múltiplos provedores.

### Provedores Suportados

#### 1. OpenAI

**SDK:** `openai`

**Modelos:**
- `gpt-4o`, `gpt-4o-mini`
- `gpt-4-turbo`, `gpt-4`
- `gpt-3.5-turbo`
- `o1`, `o1-mini`

**Configuração:**
```typescript
const client = new OpenAI({
  apiKey: credential.apiKey,
  baseURL: credential.baseUrl || 'https://api.openai.com/v1',
  organization: credential.organizationId,
});
```

#### 2. Anthropic

**SDK:** `@anthropic-ai/sdk`

**Modelos:**
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- `claude-3-5-sonnet-20241022`

**Configuração:**
```typescript
const client = new Anthropic({
  apiKey: credential.apiKey,
  baseURL: credential.baseUrl,
});
```

#### 3. Google Gemini

**Integração:** API REST (sem SDK dedicado)

**Modelos:**
- `gemini-2.0-flash-exp`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

**Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={apiKey}
```

#### 4. OpenRouter

**Integração:** API compatível com OpenAI

**Modelos:** Centenas de modelos de diversos provedores

**Configuração:**
```typescript
const client = new OpenAI({
  apiKey: credential.apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
});
```

### Streaming

Todos os provedores suportam streaming via SSE:

```typescript
async streamCompletion(
  provider: ProviderType,
  model: string,
  prompt: string,
  options: ExecutionOptions
): AsyncGenerator<string> {
  // Retorna generator que emite chunks
  for await (const chunk of stream) {
    yield chunk.content;
  }
}
```

### Resiliência

Configurações via variáveis de ambiente:

- `LLM_MAX_RETRIES`: Número de tentativas (default: 3)
- `LLM_RETRY_DELAY_MS`: Delay inicial entre retries (default: 1000)
- `LLM_RETRY_BACKOFF_MULTIPLIER`: Multiplicador de backoff (default: 2)
- `LLM_TIMEOUT_MS`: Timeout por requisição (default: 60000)
- `LLM_CIRCUIT_BREAKER_THRESHOLD`: Threshold do circuit breaker (default: 5)

**Estratégia:**
- Retry exponencial com backoff
- Circuit breaker para falhas consecutivas
- Timeout configurável
- Logs estruturados de erros

### Cálculo de Custos

Arquivo: `src/executions/provider-pricing.service.ts`

```typescript
async calculateCost(
  provider: ProviderType,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const pricing = await this.getPricing(provider, model);
  
  const inputCost = (inputTokens / 1000) * pricing.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputCostPer1k;
  
  return inputCost + outputCost;
}
```

**Fonte de preços:**
- Tabela `ProviderModelPricing`
- Preços por 1k tokens (input e output separados)
- Versionamento com datas de vigência

---

## Sistema de Cache

### RedisService

Arquivo: `src/redis/redis.service.ts`

Cache opcional para contadores de experimentos A/B.

**Uso:**

```typescript
// Incrementar contador
await this.redisService.increment(`experiment:${id}:exposures:A`);

// Obter contador
const count = await this.redisService.get(`experiment:${id}:exposures:A`);

// Expiração
await this.redisService.setWithExpiry(key, value, 3600); // 1 hora
```

**Fallback:**
- Se Redis não estiver disponível, serviço emite warning
- Operações de cache falham silenciosamente
- Dados sempre persistidos no PostgreSQL

### Configuração

```bash
REDIS_URL=redis://localhost:6379
```

Se não configurado, aplicação funciona normalmente sem cache.

---

## Métricas e Monitoramento

### Prometheus

Integração via `@willsoto/nestjs-prometheus`.

### Métricas Coletadas

#### 1. Métricas HTTP (automáticas)

- **http_requests_total**: Counter de requisições
  - Labels: `method`, `route`, `status`
- **http_request_duration_seconds**: Histogram de duração
  - Labels: `method`, `route`

#### 2. Métricas de Negócio (customizadas)

Podem ser adicionadas conforme necessário:

```typescript
@Injectable()
export class CustomMetricsService {
  private readonly executionsCounter = new Counter({
    name: 'prompt_executions_total',
    help: 'Total de execuções de prompts',
    labelNames: ['provider', 'model', 'status'],
  });

  recordExecution(provider: string, model: string, status: string) {
    this.executionsCounter.inc({ provider, model, status });
  }
}
```

### Endpoint de Métricas

```
GET /metrics
```

**Configuração:**
- `METRICS_ENABLED`: Habilitar/desabilitar (default: true)
- `METRICS_PATH`: Path customizado (default: `/metrics`)

**Segurança:**
- Endpoint público (sem JWT)
- Excluído do throttling
- Recomenda-se proteger via firewall/VPN em produção

### Integração com Grafana

1. Configurar Prometheus para scrape do endpoint `/metrics`
2. Adicionar Prometheus como data source no Grafana
3. Criar dashboards com as métricas coletadas

Exemplo de config Prometheus:

```yaml
scrape_configs:
  - job_name: 'promptzero-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

---

## Seed e Dados Iniciais

### Script de Seed

Arquivo: `prisma/seed.ts`

Executado com: `npm run prisma:seed`

### Dados Criados

#### 1. Usuário Admin

```typescript
{
  email: 'admin@promptvault.com',
  password: 'Password@123',  // Hash bcrypt
  name: 'Admin User'
}
```

#### 2. Workspaces

- **Default**: Workspace padrão (indigo)
- **Growth**: Crescimento e marketing (emerald)
- **Support**: Suporte ao cliente (amber)

#### 3. Tags

- marketing (blue)
- vendas (green)
- produto (purple)
- suporte (orange)
- social (pink)

#### 4. Prompts Template

Diversos prompts prontos para uso:

1. **Gerador de Posts Instagram**
   - Variáveis: `topic`, `tone`
   - Tags: marketing, social
   - Workspace: Growth

2. **Cold Email B2B**
   - Variáveis: `company`, `product`, `pain_point`
   - Tags: vendas
   - Workspace: Growth

3. **Release Notes**
   - Variáveis: `version`, `features`
   - Tags: produto
   - Workspace: Default

4. **Resposta de Suporte**
   - Variáveis: `customer_name`, `issue`
   - Tags: suporte
   - Workspace: Support

5. **Artigo SEO**
   - Variáveis: `keyword`, `word_count`
   - Tags: marketing
   - Workspace: Growth

... e mais prompts

#### 5. Execuções Sintéticas

- ~90 dias de dados históricos
- Distribuição realista de modelos
- Tokens, latência e custos simulados
- Vinculadas aos prompts seed

#### 6. Preços de Modelos

Tabela `ProviderModelPricing` populada com preços atuais de:
- OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo)
- Anthropic (claude-3-opus, sonnet, haiku, 3.5-sonnet)
- Google (gemini-2.0-flash, 1.5-pro, 1.5-flash)
- OpenRouter (modelos selecionados)

### Executar Seed

```bash
# Via npm script
npm run prisma:seed

# Ou diretamente
npx prisma db seed

# Ou com tsx
npx tsx prisma/seed.ts
```

**Nota:** Seed usa **upsert** para usuário e prompts (por email e título), permitindo re-execução sem duplicação.

---

## Configurações

### NestJS

#### main.ts

Entry point da aplicação:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Prefixo global
  app.setGlobalPrefix('api');
  
  // Versionamento
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Pipes, filters, middlewares
  app.useGlobalPipes(new ValidationPipe({ ... }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(requestIdMiddleware);
  app.use(structuredLoggerMiddleware);
  
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PromptZero API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Validações de produção
  if (process.env.NODE_ENV === 'production') {
    validateProductionEnv(configService);
  }
  
  const port = configService.get('PORT', 3001);
  await app.listen(port);
}
```

#### nest-cli.json

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "assets": [
      {
        "include": "i18n/**/*",
        "outDir": "dist/src"
      }
    ]
  }
}
```

**Função:**
- Copia arquivos `i18n/**/*` para `dist/src` no build
- Garante que JSONs de tradução estejam disponíveis em produção

### TypeScript

Arquivo: `tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint

Arquivo: `eslint.config.mjs`

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { prettier },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

### Prettier

Arquivo: `.prettierrc` (se existir) ou config inline no package.json.

### Husky + lint-staged

Git hooks configurados:

```json
{
  "lint-staged": {
    "*.{ts,js,json,md}": ["prettier --write"],
    "*.ts": ["eslint --fix"]
  }
}
```

**Hooks:**
- `pre-commit`: Executa lint-staged
- `commit-msg`: Valida mensagem de commit (commitlint)

---

## Variáveis de Ambiente

### Arquivo de Exemplo

`.env.example` contém todas as variáveis necessárias.

### Variáveis Obrigatórias

```bash
# Porta do servidor
PORT=3001

# Ambiente
NODE_ENV=development

# URL do frontend (CORS)
FRONTEND_URL=http://localhost:3000

# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5434/promptzero

# JWT Access Token
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m

# JWT Refresh Token
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Criptografia (para API keys)
ENCRYPTION_SECRET=your-encryption-secret-32-chars-min
```

### Variáveis Opcionais

```bash
# Redis (cache de experimentos A/B)
REDIS_URL=redis://localhost:6379

# LLM Resiliência
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY_MS=1000
LLM_RETRY_BACKOFF_MULTIPLIER=2
LLM_TIMEOUT_MS=60000
LLM_CIRCUIT_BREAKER_THRESHOLD=5

# Métricas Prometheus
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### Validação em Produção

Em `NODE_ENV=production`, o `main.ts` valida que as seguintes variáveis existem:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_SECRET`
- `DATABASE_URL`

Se alguma estiver faltando, a aplicação **não inicia**.

---

## Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar em modo desenvolvimento (watch)
npm run start:dev

# Iniciar em modo debug
npm run start:debug

# Build
npm run build

# Iniciar produção
npm run start:prod
```

### Prisma

```bash
# Gerar Prisma Client
npm run prisma:generate

# Criar migração
npm run prisma:migrate:dev

# Aplicar migrações (produção)
npm run prisma:migrate:deploy

# Seed do banco
npm run prisma:seed
```

### Qualidade de Código

```bash
# Linting
npm run lint

# Fix automático
npm run lint:fix

# Formatação
npm run format

# Verificar formatação
npm run format:check
```

### Testes

```bash
# Testes unitários
npm test

# Testes em watch mode
npm run test:watch

# Cobertura
npm run test:cov

# Testes E2E
npm run test:e2e

# Debug de testes
npm run test:debug
```

---

## Testes

### Framework

**Jest 30.0.0** configurado para:

- Testes unitários: `src/**/*.spec.ts`
- Testes E2E: `test/**/*.e2e-spec.ts`

### Configuração

#### Jest (unitários)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

#### Jest E2E

Arquivo: `test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "testEnvironment": "node"
}
```

### Exemplo de Teste

```typescript
describe('PromptsService', () => {
  let service: PromptsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PromptsService, PrismaService],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a prompt', async () => {
    const dto = { title: 'Test', content: '...', ... };
    const result = await service.create(userId, dto);
    expect(result.title).toBe('Test');
    expect(result.currentVersion).toBe(1);
  });
});
```

### Testes E2E

```typescript
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });
});
```

---

## Deploy

### Docker Compose (Desenvolvimento)

Arquivo: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5434:5432"
    environment:
      POSTGRES_USER: promptzero
      POSTGRES_PASSWORD: promptzero
      POSTGRES_DB: promptzero
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Iniciar:**
```bash
docker-compose up -d
```

### Build de Produção

```bash
# 1. Instalar dependências
npm ci

# 2. Gerar Prisma Client
npm run prisma:generate

# 3. Build
npm run build

# 4. Aplicar migrações
npm run prisma:migrate:deploy

# 5. Seed (opcional)
npm run prisma:seed

# 6. Iniciar
npm run start:prod
```

### Variáveis de Ambiente em Produção

**Obrigatórias:**
- `NODE_ENV=production`
- `DATABASE_URL`: PostgreSQL de produção
- `JWT_ACCESS_SECRET`: Segredo forte (32+ chars)
- `JWT_REFRESH_SECRET`: Segredo forte diferente do access
- `ENCRYPTION_SECRET`: Segredo para cifrar API keys (32+ chars)
- `FRONTEND_URL`: URL do frontend para CORS

**Recomendadas:**
- `REDIS_URL`: Para cache de experimentos
- `PORT`: Porta customizada se necessário
- Variáveis de resiliência LLM

### Health Check

Endpoint para health checks de orquestradores (Kubernetes, Docker Swarm, etc.):

```bash
curl http://localhost:3001/api
```

**Response esperado:**
```json
{
  "status": "ok",
  "service": "PromptZero API",
  "message": "..."
}
```

### Logs

Em produção, os logs estruturados podem ser coletados por:
- CloudWatch (AWS)
- Stackdriver (GCP)
- Application Insights (Azure)
- Datadog, New Relic, etc.

Formato JSON facilita parsing e indexação.

---

## Rate Limiting

### Configuração Global

Throttling configurado via `@nestjs/throttler`:

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,  // 60 segundos
    limit: 100,  // 100 requisições
  },
]);
```

### Rate Limits por Endpoint

Configurados via decorators:

```typescript
// Auth endpoints (mais restritivos)
@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10/min
@Post('register')
async register(@Body() dto: RegisterDto) { ... }

@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10/min
@Post('login')
async login(@Body() dto: LoginDto) { ... }

@Throttle({ default: { limit: 20, ttl: 60000 } })  // 20/min
@Post('refresh')
async refresh(@Body() dto: RefreshDto) { ... }
```

### Exceções

O `AppThrottlerGuard` **não aplica throttling** no path de métricas (`/metrics`).

---

## Segurança

### Boas Práticas Implementadas

1. **Senhas:**
   - Hash bcrypt (cost 10)
   - Nunca retornadas em responses
   - Validação de força no DTO

2. **Tokens JWT:**
   - Access token de curta duração
   - Refresh token com rotação
   - Detecção de reuso de tokens revogados
   - Segredos fortes obrigatórios em produção

3. **API Keys:**
   - Cifradas com `ENCRYPTION_SECRET`
   - Nunca retornadas em responses (apenas status)
   - Armazenadas em `ProviderCredential`

4. **CORS:**
   - Configurado para `FRONTEND_URL`
   - `credentials: true` para cookies

5. **Rate Limiting:**
   - Proteção contra brute force
   - Limites mais rígidos em auth

6. **Validação:**
   - DTOs com class-validator
   - Whitelist de propriedades
   - Rejeição de propriedades extras

7. **Ownership:**
   - Todos os recursos verificam `userId`
   - Exceções 403 se não for owner

8. **SQL Injection:**
   - Prisma usa prepared statements
   - Proteção automática

9. **Logs:**
   - Estruturados em JSON
   - Request ID para correlação
   - Não logam dados sensíveis

### Recomendações Adicionais

- [ ] Implementar rate limiting por IP
- [ ] Adicionar helmet para headers de segurança
- [ ] Implementar CSRF protection
- [ ] Adicionar auditoria de ações sensíveis
- [ ] Implementar 2FA
- [ ] Adicionar detecção de anomalias
- [ ] Rotação automática de segredos

---

## Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco

**Sintoma:** `Error: Can't reach database server`

**Solução:**
```bash
# Verificar se Postgres está rodando
docker-compose ps

# Iniciar Postgres
docker-compose up -d postgres

# Verificar DATABASE_URL no .env
echo $DATABASE_URL
```

#### 2. Erro de Migração

**Sintoma:** `Error: Migration failed`

**Solução:**
```bash
# Reset do banco (CUIDADO: apaga dados)
npx prisma migrate reset

# Ou aplicar migrações pendentes
npx prisma migrate deploy
```

#### 3. Erro de JWT

**Sintoma:** `401 Unauthorized` em rotas protegidas

**Solução:**
- Verificar se token está no header `Authorization: Bearer <token>`
- Verificar se token não expirou
- Verificar `JWT_ACCESS_SECRET` no .env
- Testar com `/auth/me`

#### 4. Erro de LLM

**Sintoma:** Execução falha com erro de provider

**Solução:**
- Verificar credenciais do provedor
- Verificar se API key é válida
- Verificar rate limits do provedor
- Verificar logs para detalhes
- Testar com curl direto na API do provedor

#### 5. Redis não conecta

**Sintoma:** Warning no log sobre Redis

**Solução:**
- Redis é opcional; aplicação funciona sem ele
- Para habilitar: `docker-compose up -d redis`
- Verificar `REDIS_URL` no .env

---

## Padrões de Código

### Estrutura de Módulo

```typescript
// *.module.ts
@Module({
  imports: [PrismaModule, ...],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],  // Se usado por outros módulos
})
export class PromptsModule {}
```

### Estrutura de Controller

```typescript
// *.controller.ts
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@ApiTags('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt' })
  @ApiResponse({ status: 201, type: PromptResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePromptDto,
  ): Promise<PromptResponseDto> {
    return this.promptsService.create(user.sub, dto);
  }
}
```

### Estrutura de Service

```typescript
// *.service.ts
@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(userId: string, dto: CreatePromptDto): Promise<Prompt> {
    // Validações
    // Lógica de negócio
    // Persistência
    return prompt;
  }

  async findById(userId: string, id: string): Promise<Prompt> {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: { versions: true, tags: true, workspace: true },
    });

    if (!prompt) {
      throw new NotFoundException('errors.promptNotFound');
    }

    if (prompt.userId !== userId && !prompt.isPublic) {
      throw new ForbiddenException('errors.promptForbidden');
    }

    return prompt;
  }
}
```

### Convenções de Nomenclatura

- **Módulos**: `*.module.ts`, PascalCase (`PromptsModule`)
- **Controllers**: `*.controller.ts`, PascalCase (`PromptsController`)
- **Services**: `*.service.ts`, PascalCase (`PromptsService`)
- **DTOs**: `*.dto.ts`, PascalCase (`CreatePromptDto`)
- **Guards**: `*.guard.ts`, PascalCase (`JwtAuthGuard`)
- **Middlewares**: `*.middleware.ts`, camelCase function (`requestIdMiddleware`)
- **Interfaces**: `*.interface.ts`, PascalCase (`AuthUser`)

---

## Documentação Swagger

### Acesso

```
http://localhost:3001/api/docs
```

### Autenticação no Swagger

1. Clicar em "Authorize"
2. Inserir token: `Bearer <accessToken>`
3. Testar endpoints protegidos

### Anotações

Decorators para documentação:

```typescript
@ApiTags('prompts')
@ApiOperation({ summary: 'Create a new prompt' })
@ApiResponse({ status: 201, description: 'Prompt created', type: PromptResponseDto })
@ApiResponse({ status: 400, description: 'Bad request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiBearerAuth()
```

### Exportar OpenAPI

```bash
# JSON disponível em:
curl http://localhost:3001/api/docs-json > openapi.json
```

---

## Boas Práticas

### 1. Separação de Responsabilidades

- **Controllers**: Rotas, validação, serialização
- **Services**: Lógica de negócio, orquestração
- **Repositories**: Acesso a dados (via Prisma)

### 2. Tipagem Forte

- Todos os DTOs são classes com decorators
- Tipos Prisma gerados automaticamente
- Interfaces para contratos internos

### 3. Tratamento de Erros

- Exceções HTTP específicas
- Mensagens i18n
- Request ID para correlação
- Logs estruturados

### 4. Performance

- Índices no banco para queries comuns
- Cache Redis para dados frequentes
- Streaming para respostas grandes
- Paginação em listagens

### 5. Segurança

- JWT com rotação
- Bcrypt para senhas
- Cifração de API keys
- Rate limiting
- CORS configurado
- Validação estrita

### 6. Observabilidade

- Logs estruturados
- Métricas Prometheus
- Request ID em todos os logs
- Swagger para documentação

---

## Arquitetura de Dados

### Relacionamentos

```
User
├── 1:N → Workspace
├── 1:N → Prompt
├── 1:N → Tag
├── 1:N → Execution
├── 1:N → RefreshTokenSession
├── 1:N → ProviderCredential
└── 1:N → PromptExperiment

Prompt
├── N:1 → User (owner)
├── N:1 → Workspace (opcional)
├── 1:N → PromptVersion
├── N:N → Tag (via PromptTag)
├── 1:N → TemplateVariable
├── 1:N → Execution
├── N:1 → Prompt (forkedFrom)
└── 1:N → Prompt (forks)

Execution
├── N:1 → Prompt
├── N:1 → PromptVersion
├── N:1 → User
├── N:1 → ProviderCredential (opcional)
└── 1:1 → PromptExperimentExposure (opcional)

PromptExperiment
├── N:1 → User
├── N:1 → Prompt (A)
├── N:1 → Prompt (B)
├── 1:N → PromptExperimentExposure
└── 1:N → PromptExperimentVote
```

### Índices Importantes

```prisma
// Queries comuns otimizadas
@@index([userId, deletedAt, updatedAt])  // Prompts do usuário
@@index([userId, createdAt])              // Execuções do usuário
@@index([promptId, createdAt])            // Execuções do prompt
@@index([model, createdAt])               // Execuções por modelo
@@index([provider, model, createdAt])     // Analytics por provedor
@@index([experimentId, chosenVariant])    // Resultados A/B
```

---

## Utilitários

### crypto.util.ts

```typescript
// Cifrar dados sensíveis
export function encrypt(text: string, secret: string): string;

// Decifrar
export function decrypt(encrypted: string, secret: string): string;
```

**Algoritmo:** AES-256-GCM

### template.util.ts

```typescript
// Extrair variáveis de template
export function extractVariables(content: string): string[];
// Exemplo: "Hello {{name}}" → ["name"]

// Substituir variáveis
export function replaceVariables(
  content: string,
  variables: Record<string, string>
): string;
// Exemplo: ("Hello {{name}}", { name: "João" }) → "Hello João"
```

### period.util.ts

```typescript
// Converter período para datas
export function periodToDates(period: '7d' | '30d' | '90d'): {
  startDate: Date;
  endDate: Date;
};
```

### env.util.ts

```typescript
// Obter segredo com validação em produção
export function getEnvSecret(
  configService: ConfigService,
  key: string,
  devFallback?: string
): string;
```

---

## Próximos Passos e Melhorias

### Oportunidades de Melhoria

1. **Testes**: Expandir cobertura (atualmente mínima)
2. **Cache**: Implementar cache de queries frequentes
3. **Webhooks**: Notificações de eventos
4. **Audit Log**: Rastreamento de ações sensíveis
5. **2FA**: Autenticação de dois fatores
6. **Rate Limiting por IP**: Proteção adicional
7. **GraphQL**: Considerar GraphQL além de REST
8. **WebSockets**: Updates em tempo real
9. **Background Jobs**: Queue para tarefas assíncronas
10. **Backup Automático**: Estratégia de backup do BD

### Roadmap Sugerido

- [ ] Testes E2E completos
- [ ] CI/CD pipeline
- [ ] Documentação de deployment
- [ ] Monitoring e alertas
- [ ] Performance profiling
- [ ] Load testing
- [ ] Security audit
- [ ] API versioning strategy (v2)
- [ ] Migração de API keys legadas para ProviderCredential

---

## Recursos Adicionais

### Documentação Relacionada

- **Swagger UI**: `http://localhost:3001/api/docs`
- **Prisma Schema**: `prisma/schema.prisma`
- **Frontend Docs**: `DOCS/FRONTEND.md`

### Links Úteis

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)

---

## Glossário

- **DTO**: Data Transfer Object - objeto para validação de entrada
- **JWT**: JSON Web Token - token de autenticação
- **SSE**: Server-Sent Events - streaming unidirecional
- **ORM**: Object-Relational Mapping - Prisma
- **Guard**: Proteção de rota no NestJS
- **Pipe**: Transformação/validação de dados
- **Interceptor**: Middleware que intercepta requests/responses
- **Provider**: Serviço injetável no NestJS
- **Soft Delete**: Deleção lógica (flag `deletedAt`)
- **A/B Testing**: Teste de duas variantes
- **Circuit Breaker**: Padrão de resiliência

---

## Contato e Suporte

Para dúvidas sobre o backend, consulte:
- Esta documentação
- Swagger UI em `/api/docs`
- Código-fonte comentado
- Issues no repositório
- Documentação do frontend em `DOCS/FRONTEND.md`

---

**Última atualização:** 31 de Março de 2026  
**Versão do Backend:** 0.0.1  
**Versão do NestJS:** 11.0.1  
**Versão do Prisma:** 6.19.2
