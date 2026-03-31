# Documentação Frontend - PromptZero

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Estrutura de Pastas](#estrutura-de-pastas)
4. [Tecnologias e Dependências](#tecnologias-e-dependências)
5. [Sistema de Rotas](#sistema-de-rotas)
6. [Internacionalização (i18n)](#internacionalização-i18n)
7. [Autenticação e Sessão](#autenticação-e-sessão)
8. [Integração com API](#integração-com-api)
9. [Gerenciamento de Estado](#gerenciamento-de-estado)
10. [Componentes Principais](#componentes-principais)
11. [Sistema de Temas](#sistema-de-temas)
12. [Formulários e Validação](#formulários-e-validação)
13. [Testes](#testes)
14. [Configurações](#configurações)
15. [Variáveis de Ambiente](#variáveis-de-ambiente)
16. [Scripts Disponíveis](#scripts-disponíveis)

---

## Visão Geral

O frontend do PromptZero é uma aplicação **Next.js 16** usando o **App Router**, construída com **React 19**, **TypeScript 5** e **Tailwind CSS v4**. A aplicação oferece uma interface moderna e responsiva para gerenciamento de prompts de IA, com suporte completo a múltiplos idiomas, temas claro/escuro, e integração com diversos provedores de LLM.

### Características Principais

- **Multilíngue**: Suporte nativo para Português (pt-BR), Inglês (en-US) e Espanhol (es-ES)
- **Autenticação Segura**: Sistema de sessão baseado em cookies httpOnly com JWT
- **Interface Moderna**: Componentes shadcn/ui com tema customizado PromptZero
- **Gerenciamento de Estado**: React Query para dados remotos, Zustand para estado global, nuqs para estado na URL
- **Execução de Prompts**: Interface para executar prompts com streaming de respostas
- **Analytics**: Dashboard com visualizações de métricas e custos
- **Experimentos A/B**: Sistema completo de testes A/B de prompts
- **Exploração Pública**: Navegação de prompts públicos sem autenticação

---

## Arquitetura

### Padrão de Arquitetura

O frontend segue uma arquitetura em camadas:

```
┌─────────────────────────────────────────┐
│         Páginas (App Router)            │
│    Server Components + Client Pages     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Componentes de Apresentação        │
│    UI Components + Feature Components   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        Camada de Dados                  │
│  React Query + Server Actions + Stores  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Integração com API              │
│   BFF Proxy (client) + serverFetch      │
└─────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Server Components**: Buscam dados diretamente do backend via `serverFetch` (com cookies)
2. **Client Components**: Usam React Query com `bffFetch` (proxy `/api/bff`)
3. **Mutações**: React Query mutations + revalidação via Server Actions
4. **Estado Local**: Zustand para preferências globais, nuqs para filtros na URL

---

## Estrutura de Pastas

```
frontend/
├── app/                          # App Router do Next.js
│   ├── [lang]/                   # Rotas com locale dinâmico
│   │   ├── dictionaries/         # Arquivos JSON de tradução
│   │   │   ├── pt-BR.json
│   │   │   ├── en-US.json
│   │   │   └── es-ES.json
│   │   ├── dictionaries.ts       # Carregamento lazy dos dicionários
│   │   ├── layout.tsx            # Layout raiz com <html> e <body>
│   │   ├── page.tsx              # Home (redireciona conforme auth)
│   │   ├── auth/                 # Páginas de autenticação
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── prompts/              # Gerenciamento de prompts
│   │   │   ├── [id]/             # Detalhe do prompt
│   │   │   │   └── versions/     # Versões do prompt
│   │   │   └── new/              # Criar novo prompt
│   │   ├── settings/             # Configurações do usuário
│   │   ├── explore/              # Exploração pública
│   │   ├── experiments/          # Experimentos A/B
│   │   ├── workspaces/           # Gerenciamento de workspaces
│   │   └── tags/                 # Gerenciamento de tags
│   ├── api/                      # Route Handlers
│   │   ├── session/              # Login, register, logout, refresh
│   │   └── bff/                  # Proxy para backend (BFF pattern)
│   ├── dashboard/                # Atalho de redirecionamento
│   └── globals.css               # Estilos globais + Tailwind
│
├── components/                   # Componentes React
│   ├── ui/                       # Componentes primitivos (shadcn)
│   ├── pages/                    # Client components por feature
│   │   ├── dashboard-page-client.tsx
│   │   ├── prompts-page-client.tsx
│   │   ├── prompt-detail-client.tsx
│   │   ├── settings-page-client.tsx
│   │   ├── explore-page-client.tsx
│   │   ├── experiments-page-client.tsx
│   │   └── ...
│   ├── auth/                     # Componentes de autenticação
│   │   ├── auth-split-shell.tsx
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── app-shell.tsx             # Layout principal autenticado
│   ├── app-sidebar.tsx           # Navegação lateral
│   ├── site-header.tsx           # Cabeçalho
│   ├── theme-provider.tsx        # Provider de tema
│   ├── language-switcher.tsx     # Seletor de idioma
│   ├── mode-toggle.tsx           # Toggle dark/light
│   └── ...
│
├── lib/                          # Utilitários e lógica de negócio
│   ├── api/                      # Cliente e serviços de API
│   │   ├── client.ts             # bffFetch (browser)
│   │   ├── http.ts               # serverFetch (servidor)
│   │   ├── services.ts           # Serviços tipados
│   │   ├── types.ts              # Tipos TypeScript
│   │   └── query-keys.ts         # Chaves React Query
│   ├── actions/                  # Server Actions
│   │   ├── auth-actions.ts
│   │   └── prompt-actions.ts
│   ├── auth/                     # Utilitários de auth
│   │   ├── session.ts            # getSessionUser
│   │   └── constants.ts          # Nomes de cookies
│   ├── features/                 # Lógica de domínio
│   │   └── executions/
│   │       └── stream-execution.ts
│   ├── i18n.ts                   # Configurações i18n
│   ├── locales.ts                # Lista de locales
│   └── utils.ts                  # Utilitários gerais
│
├── stores/                       # Estado global (Zustand)
│   └── ui-store.ts               # Período analítico
│
├── hooks/                        # React Hooks customizados
│   └── use-mobile.ts
│
├── tests/                        # Testes (Vitest)
│   └── stream-execution.test.ts
│
├── public/                       # Assets estáticos
│   ├── favicon.ico
│   └── provedores-ia/            # Logos de provedores
│
├── middleware.ts                 # Middleware de locale
├── components.json               # Configuração shadcn
├── next.config.ts                # Configuração Next.js
├── tsconfig.json                 # Configuração TypeScript
├── postcss.config.mjs            # PostCSS + Tailwind
├── vitest.config.ts              # Configuração de testes
├── package.json                  # Dependências e scripts
└── AGENTS.md / CLAUDE.md         # Documentação para IA
```

---

## Tecnologias e Dependências

### Core

- **Next.js 16.2.1**: Framework React com App Router
- **React 19.2.4**: Biblioteca UI
- **TypeScript 5**: Tipagem estática
- **Tailwind CSS v4**: Framework CSS utility-first

### UI e Componentes

- **Radix UI**: Primitivos acessíveis (`@radix-ui/*`)
- **shadcn/ui**: Biblioteca de componentes (estilo `radix-nova`, base `zinc`)
- **Hugeicons**: Ícones (`@hugeicons/react`, `@hugeicons/core-free-icons`)
- **Lucide React**: Ícones complementares
- **cmdk**: Command menu
- **vaul**: Drawer mobile
- **Embla Carousel**: Carrosséis
- **input-otp**: Input de OTP
- **Recharts 3.8.0**: Gráficos e visualizações
- **react-resizable-panels**: Painéis redimensionáveis
- **Sonner**: Sistema de notificações toast

### Formulários e Validação

- **react-hook-form 7.72.0**: Gerenciamento de formulários
- **@hookform/resolvers**: Integração com validadores
- **Zod v4**: Schema validation

### Gerenciamento de Dados

- **@tanstack/react-query 5.95.2**: Cache e sincronização de dados remotos
- **@tanstack/react-query-devtools**: Ferramentas de debug
- **@tanstack/react-table 8.21.3**: Tabelas avançadas
- **nuqs 2.8.9**: Estado na query string
- **Zustand 5.0.12**: Estado global leve

### Drag and Drop

- **@dnd-kit**: Suite completa (core, sortable, modifiers, utilities)

### Utilitários

- **date-fns 4.1.0**: Manipulação de datas
- **react-day-picker 9.14.0**: Seletor de datas
- **class-variance-authority**: Variantes de componentes
- **clsx**: Composição de classes CSS
- **tailwind-merge**: Merge inteligente de classes Tailwind
- **tw-animate-css**: Animações CSS

### Internacionalização

- **negotiator**: Negociação de locale
- **@formatjs/intl-localematcher**: Matching de locales

### Dev Tools

- **Vitest 4.1.2**: Framework de testes
- **ESLint 9**: Linting
- **eslint-config-next**: Configuração ESLint para Next.js

---

## Sistema de Rotas

### Middleware de Locale

O arquivo `middleware.ts` intercepta todas as requisições e garante que URLs sem prefixo de locale sejam redirecionadas para a versão com locale:

- `/dashboard` → `/pt-BR/dashboard` (locale negociado)
- Negociação via `Accept-Language` header
- Locales suportados: `pt-BR`, `en-US`, `es-ES`
- Locale padrão: `pt-BR`
- Exclui: `_next`, `api`, arquivos estáticos com extensão

### Rotas Principais

Base: `/[lang]/...` onde `[lang]` é um dos locales suportados.

#### Rotas Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/[lang]` | `app/[lang]/page.tsx` | Home - redireciona para dashboard (logado) ou login (não logado) |
| `/[lang]/auth/login` | `app/[lang]/auth/login/page.tsx` | Página de login |
| `/[lang]/auth/register` | `app/[lang]/auth/register/page.tsx` | Página de registro |
| `/[lang]/explore` | `app/[lang]/explore/page.tsx` | Explorar prompts públicos |
| `/[lang]/explore/[id]` | `app/[lang]/explore/[id]/page.tsx` | Detalhe de prompt público |

#### Rotas Autenticadas

Todas as rotas abaixo exigem sessão ativa (redirecionam para login se não autenticado):

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/[lang]/dashboard` | `app/[lang]/dashboard/page.tsx` | Dashboard com analytics e métricas |
| `/[lang]/prompts` | `app/[lang]/prompts/page.tsx` | Lista de prompts do usuário |
| `/[lang]/prompts/new` | `app/[lang]/prompts/new/page.tsx` | Criar novo prompt |
| `/[lang]/prompts/[id]` | `app/[lang]/prompts/[id]/page.tsx` | Detalhe e edição de prompt |
| `/[lang]/prompts/[id]/versions/[versionId]` | `app/[lang]/prompts/[id]/versions/[versionId]/page.tsx` | Visualizar versão específica |
| `/[lang]/settings` | `app/[lang]/settings/page.tsx` | Configurações do usuário |
| `/[lang]/experiments` | `app/[lang]/experiments/page.tsx` | Experimentos A/B |
| `/[lang]/workspaces` | `app/[lang]/workspaces/page.tsx` | Gerenciamento de workspaces |
| `/[lang]/tags` | `app/[lang]/tags/page.tsx` | Gerenciamento de tags |

#### API Routes (Route Handlers)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/session/login` | POST | Login e criação de sessão |
| `/api/session/register` | POST | Registro de novo usuário |
| `/api/session/logout` | POST | Logout e limpeza de cookies |
| `/api/session/refresh` | POST | Renovação de tokens |
| `/api/bff/[...path]` | ALL | Proxy transparente para backend |

---

## Internacionalização (i18n)

### Configuração de Locales

Arquivo: `lib/locales.ts`

```typescript
export const locales = ["pt-BR", "en-US", "es-ES"] as const;
export const defaultLocale = "pt-BR";
export type Locale = (typeof locales)[number];
```

### Dicionários

Os dicionários de tradução estão em `app/[lang]/dictionaries/`:

- `pt-BR.json`: Português do Brasil
- `en-US.json`: Inglês Americano
- `es-ES.json`: Espanhol

Estrutura do dicionário:

```json
{
  "meta": {
    "title": "...",
    "description": "..."
  },
  "nav": {
    "dashboard": "...",
    "prompts": "...",
    ...
  },
  "auth": {
    "login": "...",
    "register": "...",
    ...
  },
  "prompts": { ... },
  "settings": { ... },
  ...
}
```

### Carregamento de Dicionários

Arquivo: `app/[lang]/dictionaries.ts`

```typescript
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return import(`./dictionaries/${locale}.json`).then(
    (module) => module.default
  );
}
```

### Componente de Troca de Idioma

O `LanguageSwitcher` permite alternar entre idiomas, modificando o primeiro segmento do pathname:

```typescript
// Exemplo: /pt-BR/dashboard → /en-US/dashboard
```

### Observação Importante

A `AppSidebar` possui strings i18n duplicadas em `getSidebarI18n()` além dos dicionários JSON, criando dois caminhos paralelos de internacionalização.

---

## Autenticação e Sessão

### Arquitetura de Autenticação

O sistema usa **cookies httpOnly** para armazenar tokens JWT, garantindo segurança contra XSS:

- `pz_access_token`: Token de acesso (curta duração)
- `pz_refresh_token`: Token de refresh (longa duração)

### Configuração de Cookies

Arquivo: `lib/auth/constants.ts`

```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 // 7 dias para refresh
}
```

### Sessão no Servidor

Arquivo: `lib/auth/session.ts`

```typescript
export async function getSessionUser(): Promise<SessionUser | null> {
  // Lê pz_access_token do cookie
  // Chama apiServices.auth.me()
  // Retorna null se falhar
}
```

### Rotas de API de Sessão

**POST `/api/session/login`**
- Recebe email e senha
- Chama backend para autenticação
- Define cookies httpOnly com tokens
- Retorna sucesso/erro

**POST `/api/session/register`**
- Recebe dados de registro
- Cria usuário no backend
- Define cookies de sessão
- Retorna sucesso/erro

**POST `/api/session/logout`**
- Remove cookies de sessão
- Retorna sucesso

**POST `/api/session/refresh`**
- Usa refresh token para obter novo access token
- Atualiza cookies
- Retorna sucesso/erro

### Proteção de Rotas

As páginas protegidas verificam a sessão usando `getSessionUser()`:

```typescript
const user = await getSessionUser();
if (!user) {
  redirect(`/${lang}/auth/login`);
}
```

### Server Action de Refresh

Arquivo: `lib/actions/auth-actions.ts`

```typescript
export async function refreshSessionAction() {
  // Chama /api/session/refresh
  // Revalida path raiz
}
```

---

## Integração com API

### Duas Camadas de Integração

#### 1. Server-Side (`serverFetch`)

Arquivo: `lib/api/http.ts`

Usado em **Server Components** e **Server Actions**:

```typescript
const response = await serverFetch('/prompts', {
  method: 'GET',
  // Automaticamente adiciona Authorization: Bearer <token>
  // do cookie pz_access_token
});
```

**Características:**
- Lê `BACKEND_API_URL` (default: `http://localhost:3001/api/v1`)
- Adiciona automaticamente header `Authorization: Bearer`
- Usa cookies do servidor
- Marcado com `server-only`

#### 2. Client-Side (`bffFetch`)

Arquivo: `lib/api/client.ts`

Usado em **Client Components** via React Query:

```typescript
const data = await bffFetch('/prompts', {
  method: 'GET',
  // Cookies enviados automaticamente (credentials: 'include')
});
```

**Características:**
- Chama `/api/bff/[...path]` (proxy)
- Cookies enviados automaticamente
- Mesma interface que fetch nativo

#### 3. BFF Proxy

Arquivo: `app/api/bff/[...path]/route.ts`

Proxy transparente que:
- Recebe requisições do cliente
- Extrai `pz_access_token` do cookie
- Adiciona header `Authorization: Bearer`
- Repassa para backend
- Retorna resposta ao cliente

### Serviços Tipados

Arquivo: `lib/api/services.ts`

Wrapper tipado sobre `serverFetch` organizado por domínio:

```typescript
export const apiServices = {
  auth: {
    register: (data) => serverFetch('/auth/register', ...),
    login: (data) => serverFetch('/auth/login', ...),
    me: () => serverFetch('/auth/me'),
    refresh: (token) => serverFetch('/auth/refresh', ...),
  },
  prompts: {
    list: (params) => serverFetch('/prompts', ...),
    create: (data) => serverFetch('/prompts', ...),
    getById: (id) => serverFetch(`/prompts/${id}`),
    update: (id, data) => serverFetch(`/prompts/${id}`, ...),
    delete: (id) => serverFetch(`/prompts/${id}`, ...),
    // ... versões, variáveis, fork
  },
  workspaces: { ... },
  tags: { ... },
  settings: { ... },
  analytics: { ... },
  explore: { ... },
  experiments: { ... },
};
```

### Tipos TypeScript

Arquivo: `lib/api/types.ts`

Contratos TypeScript alinhados com o backend:

```typescript
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  model: string;
  language: string;
  isPublic: boolean;
  // ...
}

// ... dezenas de tipos
```

### Chaves de Cache (React Query)

Arquivo: `lib/api/query-keys.ts`

Chaves estáveis para invalidação e cache:

```typescript
export const queryKeys = {
  prompts: {
    all: ['prompts'] as const,
    lists: () => [...queryKeys.prompts.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.prompts.lists(), filters] as const,
    details: () => [...queryKeys.prompts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.prompts.details(), id] as const,
  },
  // ... outros domínios
};
```

---

## Gerenciamento de Estado

### 1. React Query (Dados Remotos)

Usado para **todos os dados remotos** no cliente:

```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: queryKeys.prompts.list(filters),
  queryFn: () => bffFetch('/prompts', { params }),
});

// Mutation
const mutation = useMutation({
  mutationFn: (data) => bffFetch('/prompts', { method: 'POST', body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all });
  },
});
```

**Configuração:** Provider em `app/[lang]/layout.tsx` via `AppProviders`

### 2. Zustand (Estado Global)

Arquivo: `stores/ui-store.ts`

Estado global **mínimo**, atualmente apenas para período analítico:

```typescript
interface UiState {
  selectedPeriod: '7d' | '30d' | '90d';
  setSelectedPeriod: (period: '7d' | '30d' | '90d') => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedPeriod: '7d',
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
}));
```

### 3. nuqs (Estado na URL)

Usado para **filtros, buscas e abas** que devem persistir na URL:

```typescript
import { useQueryState } from 'nuqs';

// Aba ativa
const [activeTab, setActiveTab] = useQueryState('tab', {
  defaultValue: 'general',
});

// Busca
const [search, setSearch] = useQueryState('search', {
  defaultValue: '',
});
```

**Integração:** `NuqsAdapter` em `AppProviders` para compatibilidade com App Router

### 4. Server Actions

Arquivo: `lib/actions/`

Para mutações que precisam de revalidação no servidor:

```typescript
'use server';

export async function updatePromptAction(id: string, data: UpdatePromptDto) {
  const result = await apiServices.prompts.update(id, data);
  revalidatePath(`/[lang]/prompts/${id}`);
  return result;
}
```

---

## Componentes Principais

### Shell e Layout

#### AppShell

Arquivo: `components/app-shell.tsx`

Layout principal para páginas autenticadas:

```typescript
<SidebarProvider>
  <AppSidebar user={user} />
  <SiteHeader />
  <main>{children}</main>
</SidebarProvider>
```

#### AppSidebar

Arquivo: `components/app-sidebar.tsx`

Navegação lateral com:
- Perfil do usuário
- Menu principal (Dashboard, Prompts, Explore, etc.)
- Prompts recentes (via React Query)
- Navegação secundária (Settings, Support)
- Integração com `bffFetch` para dados dinâmicos

#### SiteHeader

Cabeçalho com breadcrumbs, busca e controles de tema/idioma.

### Componentes de Autenticação

#### AuthSplitShell

Arquivo: `components/auth/auth-split-shell.tsx`

Layout split-screen para páginas de auth (login/register):
- Lado esquerdo: Formulário
- Lado direito: Branding e informações

#### LoginForm

Arquivo: `components/auth/login-form.tsx`

Formulário de login com:
- `react-hook-form` + Zod validation
- Campos: email, senha
- Integração com `/api/session/login`
- Tratamento de erros
- Link para registro

#### RegisterForm

Arquivo: `components/auth/register-form.tsx`

Formulário de registro similar ao login.

### Componentes de Páginas

Localizados em `components/pages/`, são client components complexos:

#### DashboardPageClient

- Analytics com Recharts
- Seletor de período (7d/30d/90d) via nuqs
- Cards de métricas (execuções, custos, prompts)
- Gráficos: execuções por dia, custo por modelo, top prompts

#### PromptsPageClient

- Lista de prompts com filtros
- DataTable com ordenação e paginação
- Busca, filtro por workspace/tag
- Ações: criar, editar, deletar, favoritar

#### PromptDetailClient

Componente mais complexo (~1180 linhas):
- Edição de prompt
- Gerenciamento de versões
- Variáveis de template
- Execução com streaming
- Histórico de execuções
- Múltiplas queries e mutations React Query

#### SettingsPageClient

- Sistema de abas (general, api-keys, providers)
- Formulários de configuração
- Gerenciamento de credenciais por provedor
- Validação e feedback

#### ExplorePageClient

- Navegação de prompts públicos
- Filtros e busca
- Sem requisito de autenticação

#### ExperimentsPageClient

- Criação de experimentos A/B
- Execução de testes
- Votação
- Visualização de resultados

### Componentes UI (shadcn)

Localizados em `components/ui/`, incluem:

- **Button**: Botões com variantes
- **Card**: Cards com header, content, footer
- **Dialog**: Modais acessíveis
- **Form**: Wrapper para react-hook-form
- **Input, Textarea, Select**: Inputs controlados
- **Table**: Tabelas semânticas
- **Sidebar**: Navegação lateral
- **Chart**: Wrappers para Recharts
- **Tabs**: Sistema de abas
- **Dropdown Menu**: Menus dropdown
- **Popover, Tooltip**: Overlays
- **Badge**: Labels e tags
- **Avatar**: Avatares de usuário
- **Calendar**: Seletor de datas
- **Command**: Command palette
- **Drawer**: Drawer mobile
- **Carousel**: Carrosséis
- **Resizable**: Painéis redimensionáveis

Configuração: `components.json`

```json
{
  "style": "radix-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "postcss.config.mjs",
    "css": "app/globals.css",
    "baseColor": "zinc"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## Sistema de Temas

### Theme Provider

Arquivo: `components/theme-provider.tsx`

Gerenciamento de tema **sem dependência de `next-themes`** (implementação custom):

```typescript
type Theme = 'light' | 'dark' | 'system';

// Armazena preferência em localStorage (chave: pz_theme)
// Aplica classe 'dark' no document.documentElement
// Detecta preferência do sistema via matchMedia
```

### Paleta de Cores PromptZero

Arquivo: `app/globals.css`

Variáveis CSS customizadas usando **OKLCH**:

```css
:root {
  /* Marca PromptZero */
  --pz-black: oklch(0.15 0.01 270);
  --pz-surface: oklch(0.98 0.005 270);
  --pz-lime: oklch(0.85 0.15 130);
  --pz-cyan: oklch(0.75 0.12 195);
  --pz-violet: oklch(0.65 0.18 285);
  
  /* Tokens shadcn mapeados */
  --background: var(--pz-surface);
  --foreground: var(--pz-black);
  --primary: var(--pz-violet);
  --sidebar-background: var(--pz-black);
  /* ... dezenas de tokens */
}

.dark {
  /* Redefinições para dark mode */
  --background: oklch(0.12 0.01 270);
  --foreground: oklch(0.98 0.005 270);
  /* ... */
}
```

### Tailwind CSS v4

Configuração: `postcss.config.mjs`

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

Importação em `globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme inline {
  /* Mapeamento de tokens para utilitários Tailwind */
  --font-heading: var(--font-space-mono);
  --font-sans: var(--font-dm-sans);
  --font-mono: var(--font-jetbrains-mono);
  /* ... */
}

@custom-variant dark (&:is(.dark *));
```

### Fontes

Configuradas em `app/[lang]/layout.tsx` via `next/font/google`:

- **Space Mono**: Headings
- **DM Sans**: Corpo de texto
- **JetBrains Mono**: Código

### ModeToggle

Arquivo: `components/mode-toggle.tsx`

Componente para alternar entre light/dark/system:

```typescript
<DropdownMenu>
  <DropdownMenuItem onClick={() => setTheme('light')}>
    Light
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => setTheme('dark')}>
    Dark
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => setTheme('system')}>
    System
  </DropdownMenuItem>
</DropdownMenu>
```

---

## Formulários e Validação

### Stack de Formulários

- **react-hook-form**: Gerenciamento de estado de formulários
- **@hookform/resolvers**: Integração com Zod
- **Zod v4**: Schema validation

### Exemplo de Uso

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormData = z.infer<typeof loginSchema>;

const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
    email: '',
    password: '',
  },
});

const onSubmit = async (data: LoginFormData) => {
  // Enviar para API
};
```

### Componentes de Formulário

Wrappers shadcn para integração com react-hook-form:

- `Form`: Context provider
- `FormField`: Campo controlado
- `FormItem`: Container de campo
- `FormLabel`: Label acessível
- `FormControl`: Wrapper de input
- `FormDescription`: Texto de ajuda
- `FormMessage`: Mensagens de erro

---

## Testes

### Framework

**Vitest 4.1.2** configurado em `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

Para E2E, o projeto também usa **Playwright** com configuração em `playwright.config.ts` e specs em `tests/e2e/`.

### Testes Existentes

Arquivo: `tests/stream-execution.test.ts`

Testes para streaming de execução de prompts:
- Parsing de eventos SSE
- Tratamento de erros
- Retries e resiliência

Arquivo: `tests/e2e/smoke.spec.ts`

Testes E2E de fumaça:
- Redirecionamento para rota com locale
- Abertura de rota pública `/pt-BR/explore`

### Executar Testes

```bash
# Unitários
npm test

# E2E (Playwright)
npm run test:e2e

# Instalar browser do Playwright (primeira execução)
npm run test:e2e:install
```

---

## Configurações

### Next.js

Arquivo: `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Configuração mínima; comportamento padrão do Next.js 16.

### TypeScript

Arquivo: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### ESLint

Arquivo: `eslint.config.mjs`

```javascript
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
```

### PostCSS

Arquivo: `postcss.config.mjs`

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

---

## Variáveis de Ambiente

### Variáveis Necessárias

**.env.local** (ou variáveis de ambiente):

```bash
# URL do backend (usado em serverFetch)
BACKEND_API_URL=http://localhost:3001/api/v1

# Outras variáveis opcionais
NODE_ENV=development
```

### Uso no Código

```typescript
// lib/api/http.ts
const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api/v1';
```

---

## Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento (porta 3000)
npm run dev

# Build de produção
npm run build

# Iniciar servidor de produção
npm start

# Linting
npm run lint

# Testes
npm test
```

### Fluxo de Desenvolvimento

1. **Desenvolvimento local:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

2. **Build:**
   ```bash
   npm run build
   ```

3. **Produção:**
   ```bash
   npm start
   ```

---

## Funcionalidades Principais

### 1. Dashboard

- Visão geral de métricas
- Gráficos de execuções por dia
- Análise de custos por modelo
- Top prompts mais usados
- Seletor de período (7d/30d/90d)

### 2. Gerenciamento de Prompts

- **Criar**: Formulário com título, descrição, conteúdo, modelo, idioma
- **Listar**: Tabela com filtros, busca, ordenação
- **Editar**: Atualização cria nova versão automaticamente
- **Deletar**: Soft delete
- **Favoritar**: Marcar prompts como favoritos
- **Fork**: Duplicar prompts públicos
- **Versões**: Histórico completo, restauração de versões
- **Variáveis**: Sistema de template com variáveis tipadas
- **Execução**: Interface de execução com streaming de resposta

### 3. Workspaces

- Organização de prompts em workspaces
- Cores customizadas
- Workspace padrão
- CRUD completo

### 4. Tags

- Sistema de tags para categorização
- Cores customizadas
- Múltiplas tags por prompt
- CRUD completo

### 5. Configurações

Sistema de abas:

- **Geral**: Nome, email, senha
- **API Keys** (legado): OpenAI, Anthropic
- **Provedores**: Credenciais por provedor (OpenAI, Anthropic, Google, OpenRouter)

### 6. Experimentos A/B

- Criar experimentos comparando dois prompts
- Configurar split de tráfego
- Executar e votar
- Visualizar resultados estatísticos
- Parar experimentos

### 7. Exploração Pública

- Navegar prompts públicos sem login
- Filtros e busca
- Visualizar detalhes
- Fork para conta própria (requer login)

---

## Padrões de Código

### Server vs Client Components

**Server Components (padrão):**
- Páginas em `app/[lang]/*/page.tsx`
- Buscam dados com `serverFetch`
- Verificam sessão com `getSessionUser()`
- Passam dados para client components

**Client Components:**
- Marcados com `'use client'`
- Usam hooks (useState, useQuery, etc.)
- Interatividade e estado local
- Geralmente em `components/pages/*-client.tsx`

### Convenções de Nomenclatura

- **Componentes**: PascalCase (`AppShell`, `LoginForm`)
- **Arquivos**: kebab-case (`app-shell.tsx`, `login-form.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useMobile`, `useTheme`)
- **Tipos**: PascalCase (`UserProfile`, `Prompt`)
- **Constantes**: SCREAMING_SNAKE_CASE ou camelCase

### Organização de Imports

```typescript
// 1. React e Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Bibliotecas externas
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Componentes internos
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/app-shell';

// 4. Utilitários e tipos
import { cn } from '@/lib/utils';
import type { Prompt } from '@/lib/api/types';
```

---

## Features Avançadas

### 1. Streaming de Execução

Arquivo: `lib/features/executions/stream-execution.ts`

Sistema de execução de prompts com streaming SSE:

```typescript
export async function streamExecution(
  promptId: string,
  variables: Record<string, string>,
  options: StreamOptions
): Promise<StreamResult> {
  // Conecta ao endpoint SSE
  // Parse de eventos: start, chunk, done, error
  // Retry automático em caso de falha
  // Retorna resultado completo
}
```

**Eventos SSE:**
- `start`: Início da execução
- `chunk`: Fragmento de resposta
- `done`: Execução concluída
- `error`: Erro durante execução

### 2. DataTable Genérica

Componente reutilizável com:
- Ordenação por colunas
- Paginação
- Seleção de linhas
- Filtros
- Ações em massa

Baseado em `@tanstack/react-table`.

### 3. Sistema de Notificações

Usando **Sonner**:

```typescript
import { toast } from 'sonner';

toast.success('Prompt criado com sucesso!');
toast.error('Erro ao criar prompt');
toast.loading('Salvando...');
```

### 4. Drag and Drop

Usando **@dnd-kit** para:
- Reordenação de variáveis
- Organização de prompts
- Priorização de itens

---

## Boas Práticas

### 1. Tipagem Forte

- Todos os componentes e funções são tipados
- Interfaces compartilhadas em `lib/api/types.ts`
- Uso de `z.infer<typeof schema>` para tipos derivados de Zod

### 2. Separação de Responsabilidades

- Server Components para busca de dados
- Client Components para interatividade
- Server Actions para mutações com revalidação
- Services para lógica de API

### 3. Performance

- Server Components reduzem JavaScript no cliente
- React Query com cache inteligente
- Lazy loading de dicionários
- Code splitting automático do Next.js

### 4. Acessibilidade

- Componentes Radix UI são acessíveis por padrão
- Semântica HTML correta
- Suporte a navegação por teclado
- ARIA labels onde necessário

### 5. Segurança

- Cookies httpOnly para tokens
- CSRF protection via SameSite
- Validação client-side e server-side
- Sanitização de inputs

---

## Troubleshooting

### Problemas Comuns

#### 1. Erro de Autenticação

**Sintoma:** Redirecionamento constante para login

**Solução:**
- Verificar se backend está rodando
- Verificar `BACKEND_API_URL`
- Verificar cookies no navegador
- Verificar logs do servidor

#### 2. Erro de i18n

**Sintoma:** Strings não traduzidas ou erro de locale

**Solução:**
- Verificar se locale está em `locales.ts`
- Verificar se dicionário existe
- Verificar estrutura do JSON de tradução

#### 3. Erro de Build

**Sintoma:** Build falha

**Solução:**
- Limpar `.next`: `rm -rf .next`
- Reinstalar dependências: `rm -rf node_modules && npm install`
- Verificar erros de TypeScript

#### 4. React Query não atualiza

**Sintoma:** Dados desatualizados após mutação

**Solução:**
- Verificar invalidação de queries
- Verificar chaves de query
- Usar React Query DevTools para debug

---

## Próximos Passos e Melhorias

### Oportunidades de Melhoria

1. **Unificar i18n na Sidebar**: Remover `getSidebarI18n` e usar apenas dicionários JSON
2. **Adicionar rota para Analytics**: `AnalyticsPageClient` existe mas não tem `page.tsx` correspondente
3. **Testes**: Expandir cobertura de testes (atualmente apenas stream-execution)
4. **Documentação de Componentes**: Adicionar Storybook ou similar
5. **Performance**: Implementar virtual scrolling para listas grandes
6. **PWA**: Adicionar suporte a Progressive Web App
7. **Offline**: Cache de dados para uso offline
8. **Websockets**: Considerar WebSockets para updates em tempo real

### Roadmap Sugerido

- [x] Testes E2E com Playwright
- [ ] Storybook para documentação de componentes
- [ ] Otimização de bundle size
- [ ] Implementar ISR (Incremental Static Regeneration) onde aplicável
- [ ] Adicionar telemetria e analytics
- [ ] Melhorar acessibilidade (audit completo)
- [ ] Implementar rate limiting no cliente

---

## Recursos Adicionais

### Documentação Relacionada

- **AGENTS.md / CLAUDE.md**: Avisos sobre mudanças no Next.js 16
- **components.json**: Configuração shadcn
- **README.md**: Instruções de setup (se existir)

### Links Úteis

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [React Query](https://tanstack.com/query/latest)
- [Radix UI](https://www.radix-ui.com)

---

## Glossário

- **BFF**: Backend For Frontend - padrão de proxy API
- **SSE**: Server-Sent Events - streaming unidirecional
- **SSR**: Server-Side Rendering
- **RSC**: React Server Components
- **i18n**: Internacionalização
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete
- **A/B Testing**: Teste de duas variantes

---

## Contato e Suporte

Para dúvidas sobre o frontend, consulte:
- Esta documentação
- Código-fonte comentado
- Issues no repositório
- Documentação do backend em `DOCS/BACKEND.md`

---

**Última atualização:** 31 de Março de 2026  
**Versão do Frontend:** 0.1.0  
**Versão do Next.js:** 16.2.1  
**Versão do React:** 19.2.4
