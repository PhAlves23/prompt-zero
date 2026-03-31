# PromptZero - Documento de Apresentação do Projeto

> **Documento Completo para Apresentação**  
> Este documento fornece uma visão detalhada e técnica do projeto PromptZero, incluindo todas as funcionalidades, arquitetura, decisões técnicas e diferenciais implementados.

---

## 📋 Índice

1. [Visão Geral do Projeto](#-visão-geral-do-projeto)
2. [O Problema que Resolvemos](#-o-problema-que-resolvemos)
3. [Arquitetura Técnica](#-arquitetura-técnica)
4. [Stack Tecnológica](#-stack-tecnológica)
5. [Funcionalidades Detalhadas](#-funcionalidades-detalhadas)
6. [Diferenciais e Inovações](#-diferenciais-e-inovações)
7. [Segurança e Qualidade](#-segurança-e-qualidade)
8. [Modelo de Dados](#-modelo-de-dados)
9. [Fluxos Principais](#-fluxos-principais)
10. [Decisões Técnicas e Justificativas](#-decisões-técnicas-e-justificativas)
11. [Infraestrutura e DevOps](#-infraestrutura-e-devops)
12. [Métricas de Qualidade](#-métricas-de-qualidade)
13. [Demonstração Prática](#-demonstração-prática)

---

## 🎯 Visão Geral do Projeto

**PromptZero** é uma plataforma completa e profissional para gerenciamento inteligente de prompts de IA. A aplicação permite que usuários criem, organizem, versionem, executem e analisem prompts de forma estruturada, com suporte a múltiplos provedores de IA (OpenAI, Anthropic, Google Gemini, OpenRouter).

### O que a Aplicação Faz

- **Gerencia Prompts**: CRUD completo com versionamento automático, soft delete e histórico
- **Executa em Tempo Real**: Streaming de respostas via Server-Sent Events (SSE)
- **Organiza**: Sistema de Workspaces e Tags para categorização
- **Analisa**: Dashboard de analytics com métricas detalhadas de uso, custo e performance
- **Testa**: Sistema de Experimentos A/B para comparar variações de prompts
- **Compartilha**: Exploração pública de prompts da comunidade
- **Suporta Templates**: Sistema de variáveis dinâmicas para prompts reutilizáveis
- **Multi-idioma**: Interface completa em Português, Inglês e Espanhol
- **Multi-provedor**: Integração com 4 provedores e 15+ modelos de IA

---

## 💡 O Problema que Resolvemos

### Desafios do Mercado

1. **Fragmentação**: Equipes gerenciam prompts em documentos, planilhas ou código espalhado
2. **Falta de Versionamento**: Difícil rastrear mudanças e voltar versões anteriores
3. **Ausência de Analytics**: Não há visibilidade de custos e performance dos prompts
4. **Testes Manuais**: Comparar diferentes versões é trabalhoso e não científico
5. **Vendor Lock-in**: Prompts atrelados a um único provedor de IA
6. **Falta de Colaboração**: Não há forma estruturada de compartilhar conhecimento

### Nossa Solução

PromptZero centraliza todo o ciclo de vida de prompts em uma única plataforma:

- ✅ **Centralização**: Todos os prompts em um único lugar organizado
- ✅ **Versionamento Automático**: Cada edição cria uma nova versão automaticamente
- ✅ **Analytics Integrado**: Dashboard com métricas de uso, custo e latência
- ✅ **Testes A/B Científicos**: Sistema estatístico para escolher o melhor prompt
- ✅ **Agnóstico de Provedor**: Troque de OpenAI para Anthropic sem reescrever código
- ✅ **Colaboração**: Compartilhe prompts públicos e faça fork de prompts da comunidade

---

## 🏗️ Arquitetura Técnica

### Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  React 19  │  │ Tailwind   │  │ shadcn/ui + Radix UI  │ │
│  │ Server     │  │ CSS v4     │  │ Componentes           │ │
│  │ Components │  │            │  │ Acessíveis            │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│                                                               │
│  Estado: React Query + Zustand + nuqs                        │
│  BFF Pattern: Proxy /api/bff/* → Backend                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP + JWT
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS 11)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │Controllers │  │  Services  │  │   Prisma ORM          │ │
│  │ (Routes)   │→ │ (Business  │→ │   (Type-safe DB)      │ │
│  │ + DTOs     │  │  Logic)    │  │                        │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
│                                                               │
│  Auth: JWT + Refresh Tokens + Rotação                        │
│  Cache: Redis (opcional)                                     │
│  Metrics: Prometheus                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    INFRAESTRUTURA                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │PostgreSQL  │  │   Redis    │  │  Provedores de IA     │ │
│  │    16      │  │     7      │  │  - OpenAI             │ │
│  │ (Database) │  │  (Cache)   │  │  - Anthropic          │ │
│  │            │  │            │  │  - Google Gemini      │ │
│  │            │  │            │  │  - OpenRouter         │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Padrões Arquiteturais Implementados

1. **BFF (Backend for Frontend)**: Proxy no Next.js para segurança de cookies httpOnly
2. **Clean Architecture**: Separação clara entre Controllers, Services e Data Layer
3. **Repository Pattern**: Prisma como abstração do banco de dados
4. **CQRS Light**: Separação de leitura (queries) e escrita (commands/mutations)
5. **Circuit Breaker**: Proteção contra falhas de provedores externos de IA
6. **Retry Pattern**: Tentativas automáticas com backoff exponencial

---

## 🛠️ Stack Tecnológica

### Frontend

| Categoria | Tecnologia | Versão | Justificativa |
|-----------|-----------|---------|---------------|
| **Framework** | Next.js | 16.2.1 | App Router + React Server Components para performance |
| **UI Library** | React | 19.2.4 | Última versão com melhorias de performance |
| **Linguagem** | TypeScript | 5.7 | Type safety end-to-end |
| **Estilização** | Tailwind CSS | v4 | Utility-first, moderna, com @theme |
| **Componentes** | shadcn/ui + Radix | - | Acessíveis, customizáveis, sem vendor lock-in |
| **Estado Remoto** | React Query | 5.95.2 | Cache inteligente, sincronização automática |
| **Estado Global** | Zustand | 5.0.12 | Leve, simples, sem boilerplate |
| **Estado URL** | nuqs | 2.8.9 | Filtros e paginação na URL (SEO-friendly) |
| **Formulários** | React Hook Form | 7.72.0 | Performance + validação com Zod |
| **Validação** | Zod | 4.3.6 | Type-safe schemas com inferência automática |
| **Gráficos** | Recharts | 3.8.0 | Visualizações modernas e responsivas |
| **Ícones** | Hugeicons + Lucide | - | Biblioteca moderna e completa |
| **Internacionalização** | Next.js i18n | nativo | Rotas localizadas /pt-BR, /en-US, /es-ES |

### Backend

| Categoria | Tecnologia | Versão | Justificativa |
|-----------|-----------|---------|---------------|
| **Framework** | NestJS | 11.0.1 | Arquitetura modular, DI, TypeScript-first |
| **Linguagem** | TypeScript | 5.7.3 | Strict mode para máxima segurança de tipos |
| **Banco de Dados** | PostgreSQL | 16 | ACID, relacional, performance, confiabilidade |
| **ORM** | Prisma | 6.19.2 | Type-safe, migrations, introspection |
| **Cache** | Redis | 7 | In-memory, rápido, experimentos A/B |
| **Autenticação** | JWT + Passport | - | Stateless, refresh token rotation |
| **Validação** | class-validator | 0.15.1 | Decorators para validação de DTOs |
| **Documentação** | Swagger/OpenAPI | 11.2.6 | API docs interativa |
| **Rate Limiting** | @nestjs/throttler | 6.5.0 | Proteção contra abuse |
| **Métricas** | Prometheus | - | Monitoramento de performance |
| **LLM - OpenAI** | openai SDK | 6.33.0 | Integração oficial |
| **LLM - Anthropic** | @anthropic-ai/sdk | 0.80.0 | Integração oficial Claude |
| **Logs** | NestJS Logger | nativo | Logs estruturados em JSON |

### DevOps e Qualidade

| Categoria | Ferramenta | Justificativa |
|-----------|-----------|---------------|
| **Containerização** | Docker + Compose | Ambiente consistente, fácil setup |
| **CI/CD** | GitHub Actions | Automação de testes, lint, deploy |
| **Deploy** | Railway | Platform-as-Service, zero config |
| **Linting** | ESLint | Padrão de código consistente |
| **Formatação** | Prettier | Formatação automática |
| **Git Hooks** | Husky + lint-staged | Validação pré-commit |
| **Commits** | Commitlint | Conventional Commits |
| **Testes Backend** | Jest | Unitários + E2E |
| **Testes Frontend** | Vitest + Playwright | Unitários + E2E |

---

## 🎨 Funcionalidades Detalhadas

### 1. Gerenciamento de Prompts

#### CRUD Completo
- **Create**: Criar prompts com título, descrição, conteúdo, modelo, idioma
- **Read**: Listar todos os prompts com filtros e busca
- **Update**: Editar prompts (cria nova versão automaticamente se conteúdo mudar)
- **Delete**: Soft delete (prompts ficam marcados como deletados, mas não são removidos)

#### Versionamento Inteligente
```
Como Funciona:
1. Usuário cria prompt "Gere um post sobre {{topic}}" → versão 1
2. Usuário edita para "Gere um post criativo sobre {{topic}}" → versão 2
3. Usuário edita novamente "Gere um post criativo e engajador sobre {{topic}}" → versão 3

Cada versão mantém:
- Número da versão
- Conteúdo completo
- Data de criação
- Referências de execuções que usaram aquela versão
```

**Por que é importante:**
- Rastreabilidade completa de mudanças
- Possibilidade de voltar versões anteriores (restore)
- Comparação entre versões
- Histórico de evolução do prompt
- Análise de performance por versão

#### Sistema de Templates com Variáveis

Tipos de variáveis suportadas:
1. **text**: Input de texto simples
2. **textarea**: Texto longo (múltiplas linhas)
3. **select**: Lista dropdown com opções predefinidas

Exemplo prático:
```
Prompt Template:
"Crie um post para {{platform}} sobre {{topic}} com tom {{tone}}"

Variáveis configuradas:
- platform (select): ["Instagram", "LinkedIn", "Twitter"]
- topic (text): valor livre
- tone (select): ["profissional", "casual", "humorístico"]

Na execução:
- Usuário preenche os valores
- Sistema substitui variáveis no prompt
- Envia para IA com prompt final processado
```

#### Fork de Prompts Públicos

Sistema de compartilhamento estilo GitHub:
- Prompts podem ser marcados como públicos
- Qualquer usuário pode ver prompts públicos
- "Fork" copia o prompt para sua conta
- Contador de forks mostra popularidade
- Mantém referência ao prompt original

### 2. Workspaces e Organização

#### Workspaces
Organizadores de alto nível para agrupar prompts:

- Nome personalizado
- Descrição
- Cor temática (visual identity)
- Marcação de workspace padrão
- Relacionamento 1:N com prompts

**Casos de uso:**
- Workspace "Marketing" → todos os prompts de marketing
- Workspace "Desenvolvimento" → prompts para código
- Workspace "Atendimento" → prompts de suporte ao cliente

#### Tags
Sistema de categorização flexível:

- Nome + slug (URL-friendly)
- Cores customizadas
- Relacionamento N:N com prompts
- Um prompt pode ter múltiplas tags

**Diferença entre Workspace e Tags:**
- **Workspace**: Organização principal (projeto/time)
- **Tags**: Categorização cruzada (tópicos, tipos)

### 3. Execução de Prompts

#### Multi-Provider com 15+ Modelos

**OpenAI:**
- GPT-4o
- GPT-4o-mini
- GPT-4-turbo
- GPT-3.5-turbo
- o1
- o1-mini

**Anthropic:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude 3.5 Sonnet

**Google:**
- Gemini 2.0 Flash
- Gemini 1.5 Pro
- Gemini 1.5 Flash

**OpenRouter:**
- Centenas de modelos de diversos provedores através de API unificada

#### Sistema de Credenciais

**Por que ter múltiplas credenciais?**
- Times diferentes, API keys diferentes
- Ambientes separados (dev, staging, prod)
- Múltiplas contas do mesmo provedor
- Fallback se uma key atingir rate limit

**Funcionalidades:**
- Adicionar múltiplas API keys por provedor
- Marcar uma como padrão
- Label customizado para identificação
- Base URL customizada (para proxies ou Azure OpenAI)
- Organization ID (para OpenAI)
- Criptografia AES-256-GCM antes de salvar no banco

#### Streaming em Tempo Real (SSE)

**Como Funciona:**
```
1. Frontend faz requisição POST /api/v1/executions/stream/prompt/:id
2. Backend:
   - Valida usuário e prompt
   - Descriptografa API key do provedor
   - Inicia stream com SDK do provedor (OpenAI/Anthropic)
   - Processa cada chunk recebido
   - Envia para frontend via Server-Sent Events

3. Frontend:
   - Abre EventSource para receber stream
   - Eventos: 'token' (cada palavra), 'done' (conclusão), 'error' (erro)
   - Renderiza em tempo real conforme recebe
   - Calcula métricas (latência, tokens)

4. Backend (após conclusão):
   - Calcula custo estimado baseado em preços de modelos
   - Salva execução completa no banco
   - Retorna metadata (tokens, latência, custo)
```

**Vantagens do Streaming:**
- UX superior (feedback imediato)
- Percepção de velocidade (mesmo que tempo total seja igual)
- Possibilidade de cancelar durante execução

#### Resiliência e Confiabilidade

**Circuit Breaker:**
```typescript
// Se um provedor falhar X vezes seguidas, "abre o circuito"
// Requisições são rejeitadas imediatamente por Y segundos
// Após cooldown, tentativa automática para "fechar circuito"

Configurável:
- LLM_CIRCUIT_FAILURE_THRESHOLD (padrão: 3 falhas)
- LLM_CIRCUIT_COOLDOWN_MS (padrão: 30 segundos)
```

**Retry com Backoff Exponencial:**
```typescript
// Tentativa 1: falha → aguarda 300ms
// Tentativa 2: falha → aguarda 600ms
// Tentativa 3: falha → aguarda 1200ms
// Desiste e retorna erro

Configurável:
- LLM_MAX_RETRIES (padrão: 2)
- LLM_BACKOFF_MS (padrão: 300ms)
```

**Timeout:**
- Limite máximo de tempo de execução
- Padrão: 30 segundos
- Configurável via LLM_TIMEOUT_MS

### 4. Analytics e Métricas

#### Dashboard Interativo

**Métricas Principais:**
1. **Total de Execuções**: Quantidade total no período
2. **Custo Total**: Soma dos custos estimados (USD)
3. **Total de Prompts**: Quantos prompts criados
4. **Latência Média**: Tempo médio de resposta (ms)

**Visualizações:**

1. **Gráfico de Execuções por Dia** (Área)
   - Eixo X: Datas do período
   - Eixo Y: Quantidade de execuções
   - Mostra tendências e padrões de uso

2. **Custo por Modelo** (Barras horizontais)
   - Lista modelos ordenados por custo
   - Identifica quais modelos são mais caros
   - Auxilia em decisões de otimização

3. **Top 5 Prompts Mais Usados** (Lista)
   - Nome do prompt
   - Quantidade de execuções
   - Link direto para o prompt

**Períodos Selecionáveis:**
- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias

**Cálculo de Custos:**
```typescript
// Baseado em tabela de preços no banco (ProviderModelPricing)
custo = (inputTokens / 1000) * inputCostPer1k + 
        (outputTokens / 1000) * outputCostPer1k

// Exemplos de preços (2024):
// GPT-4o: input $5/1M, output $15/1M
// GPT-4o-mini: input $0.15/1M, output $0.60/1M
// Claude 3.5 Sonnet: input $3/1M, output $15/1M
```

### 5. Experimentos A/B

#### Sistema Completo de Testes A/B

**Fluxo Completo:**

```
1. CRIAR EXPERIMENTO
   - Seleciona 2 prompts (A e B)
   - Define traffic split (ex: 50% A, 50% B)
   - Define target de amostras (opcional)
   - Status: running

2. EXECUTAR EXPERIMENTO
   - Sistema escolhe variante aleatoriamente baseado no split
   - Executa prompt da variante escolhida
   - Cria "exposure" (registro de exposição)
   - Retorna resposta + exposureId

3. VOTAR
   - Usuário avalia qual resposta foi melhor
   - Envia voto com exposureId + winnerVariant (A ou B)
   - Sistema registra voto
   - Incrementa contadores no Redis (performance)

4. ANALISAR RESULTADOS
   - Votos A vs Votos B
   - Win rate de cada variante
   - Percentuais
   - Recomendação baseada em confiança estatística

5. PARAR EXPERIMENTO
   - Finaliza coleta de dados
   - Status: stopped
   - Mantém histórico para análise
```

**Traffic Split:**
- Permite testar com diferentes proporções
- Exemplo: 70% variante A (segura) vs 30% variante B (experimental)
- Útil para roll-out gradual de mudanças

**Métricas por Variante:**
- Número de exposições
- Número de votos recebidos
- Win rate (% de vitórias)
- Latência média
- Custo médio

**Análise Estatística:**
```typescript
// Cálculo de confiança (exemplo simplificado):
totalVotes = votesA + votesB
winRateA = (votesA / totalVotes) * 100
winRateB = (votesB / totalVotes) * 100

// Recomendação:
if (totalVotes < 30) {
  status = "Dados insuficientes"
} else if (winRateA > 60) {
  status = "Variante A vencendo com confiança"
} else if (winRateB > 60) {
  status = "Variante B vencendo com confiança"
} else {
  status = "Empate técnico, continue testando"
}
```

**Cache Redis para Performance:**
- Contadores de votos em Redis (ultra-rápido)
- Fallback para PostgreSQL se Redis indisponível
- Sincronização automática

### 6. Exploração Pública

#### Descoberta de Prompts da Comunidade

**Funcionalidades:**
- Navegação de prompts públicos sem login
- Filtros: idioma, modelo, popularidade
- Busca por texto
- Ordenação: mais recentes, mais populares (fork count)
- Preview completo do prompt
- Botão "Fork" para copiar para sua conta (requer login)

**Casos de Uso:**
- Inspiração para novos prompts
- Aprender com a comunidade
- Acelerar desenvolvimento (não reinventar a roda)
- Compartilhar conhecimento

### 7. Configurações de Usuário

#### Perfil
- Nome
- Email (único)
- Senha (com hash bcrypt)

#### Gerenciamento de Provedores
- Adicionar credenciais de múltiplos provedores
- Editar base URL (para proxies)
- Marcar como padrão
- Ativar/desativar
- Deletar credenciais

**Segurança:**
- API keys criptografadas com AES-256-GCM
- Chave de criptografia em variável de ambiente
- Nunca retornar API keys completas na API (apenas últimos 4 caracteres)

---

## 🚀 Diferenciais e Inovações

### 1. Versionamento Automático

**Diferencial:** Maioria das ferramentas não versiona prompts ou requer ação manual.

**Nossa Implementação:**
- Automático: qualquer edição no conteúdo cria nova versão
- Zero esforço do usuário
- Histórico completo mantido
- Possibilidade de restaurar versões antigas
- Análise de performance por versão

### 2. Multi-Provider Nativo

**Diferencial:** Ferramentas geralmente são vendor-locked a um provedor.

**Nossa Implementação:**
- Suporte a 4 provedores out-of-the-box
- Mesmo prompt pode ser executado em qualquer modelo
- Comparação de custo/performance entre modelos
- Migração transparente entre provedores
- Múltiplas credenciais por provedor

### 3. Experimentos A/B Científicos

**Diferencial:** Testes A/B geralmente são manuais e subjetivos.

**Nossa Implementação:**
- Sistema formal de experimentos
- Traffic split configurável
- Registro de todas as exposições
- Votação estruturada
- Análise estatística automatizada
- Cache Redis para alta performance

### 4. Streaming Real-Time

**Diferencial:** Muitas ferramentas só mostram resposta completa no final.

**Nossa Implementação:**
- Server-Sent Events (SSE)
- Resposta palavra por palavra
- UX superior
- Feedback visual imediato
- Possibilidade de cancelamento

### 5. Analytics Integrado

**Diferencial:** Analytics geralmente requer ferramentas externas.

**Nossa Implementação:**
- Dashboard nativo
- Métricas em tempo real
- Cálculo automático de custos
- Visualizações interativas
- Análise por período, modelo, prompt

### 6. Segurança Enterprise-Grade

**Diferencial:** Muitas ferramentas armazenam API keys em texto plano.

**Nossa Implementação:**
- Criptografia AES-256-GCM
- JWT com refresh token rotation
- Cookies httpOnly
- Rate limiting
- Circuit breaker
- Soft delete para auditoria

### 7. Internacionalização Completa

**Diferencial:** Maioria é apenas inglês.

**Nossa Implementação:**
- 3 idiomas: pt-BR, en-US, es-ES
- Rotas localizadas (/pt-BR/dashboard)
- Tradução completa de UI e mensagens de erro
- Detecção automática de idioma

### 8. Sistema de Templates

**Diferencial:** Prompts geralmente são texto fixo.

**Nossa Implementação:**
- Variáveis dinâmicas com tipos
- Valores padrão
- Validação automática
- Reutilização de prompts
- Menos duplicação

### 9. Infraestrutura Moderna

**Diferencial:** Muitas ferramentas usam stack legada.

**Nossa Implementação:**
- Next.js 16 (App Router)
- React 19 (Server Components)
- NestJS 11
- Prisma (type-safe ORM)
- Tailwind CSS v4
- TypeScript strict mode

### 10. DevOps Profissional

**Diferencial:** Falta de automação e testes.

**Nossa Implementação:**
- CI/CD com GitHub Actions
- Testes automatizados (unitários + E2E)
- Linting e formatação automática
- Git hooks
- Conventional commits
- Deploy automatizado
- Docker + Docker Compose
- Métricas Prometheus

---

## 🔒 Segurança e Qualidade

### Segurança Implementada

#### 1. Autenticação e Autorização

**JWT com Refresh Token Rotation:**
```
Fluxo:
1. Login → access token (15min) + refresh token (7 dias)
2. Access token expira → usa refresh para obter novo
3. Refresh usado → novo refresh emitido, antigo revogado
4. Se refresh antigo for reutilizado → detecta ataque
5. Revoga toda a "família" de tokens

Benefícios:
- Tokens de curta duração
- Detecção de roubo de tokens
- Revogação granular
```

**Cookies httpOnly:**
- Tokens em cookies, não localStorage
- Proteção contra XSS
- Secure flag em produção
- SameSite=Lax

#### 2. Criptografia de API Keys

```typescript
// Algoritmo: AES-256-GCM
// Processo:
encrypt(apiKey) {
  1. Gera IV aleatório (16 bytes)
  2. Criptografa com chave do .env
  3. Concatena IV + auth tag + texto cifrado
  4. Retorna base64
}

decrypt(encrypted) {
  1. Decodifica base64
  2. Extrai IV + auth tag + cifrado
  3. Descriptografa com chave do .env
  4. Retorna texto plano
}

// API keys NUNCA são armazenadas em texto plano
// Chave de criptografia NUNCA vai para git
```

#### 3. Rate Limiting

**Proteção por Endpoint:**
```typescript
// Configuração:
@Throttle({ default: { limit: 100, ttl: 60000 } })
// 100 requisições por minuto

// Endpoints sensíveis:
POST /auth/login → 5 req/min (proteção brute force)
POST /executions → 30 req/min (previne abuse de API keys)
GET /analytics → 20 req/min (queries pesadas)
```

#### 4. Validação de Dados

**Duas Camadas:**

1. **Frontend (Zod):**
```typescript
const promptSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1),
  model: z.string(),
  // ...
});
```

2. **Backend (class-validator):**
```typescript
export class CreatePromptDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;
  
  @IsString()
  @MinLength(1)
  content: string;
  // ...
}
```

#### 5. SQL Injection Protection

- **Prisma ORM**: Queries parametrizadas automaticamente
- **Sem SQL raw**: Todas as queries via Prisma
- **Type-safe**: TypeScript previne erros

#### 6. Proteção de Ownership

```typescript
// Exemplo: Verificação antes de editar prompt
async update(userId: string, promptId: string, dto: UpdatePromptDto) {
  const prompt = await this.prisma.prompt.findUnique({
    where: { id: promptId }
  });
  
  // Verifica se existe e não foi deletado
  if (!prompt || prompt.deletedAt) {
    throw new NotFoundException();
  }
  
  // Verifica ownership
  if (prompt.userId !== userId) {
    throw new ForbiddenException();
  }
  
  // Prossegue com update
}
```

### Qualidade de Código

#### 1. TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### 2. Linting e Formatação

- **ESLint**: Regras de código
- **Prettier**: Formatação consistente
- **Git hooks**: Validação automática pre-commit
- **CI/CD**: Build falha se houver erros

#### 3. Testes

**Backend (Jest):**
- Testes unitários de serviços
- Testes de integração
- Testes E2E com Supertest
- Coverage report

**Frontend (Vitest + Playwright):**
- Testes de componentes
- Testes de lógica de negócio
- Testes E2E de fluxos críticos

#### 4. Documentação

- **README.md**: 1164 linhas
- **DOCS/FRONTEND.md**: 1474 linhas
- **DOCS/BACKEND.md**: 3213 linhas
- **Swagger**: API docs interativa
- **Comentários inline**: Em código complexo

---

## 📊 Modelo de Dados

### Diagrama Entidade-Relacionamento

```
User (Usuário)
├─ 1:N → Workspace
├─ 1:N → Prompt
├─ 1:N → Tag
├─ 1:N → Execution
├─ 1:N → ProviderCredential
├─ 1:N → PromptExperiment
└─ 1:N → RefreshTokenSession

Prompt
├─ N:1 → User
├─ N:1 → Workspace (opcional)
├─ 1:N → PromptVersion
├─ N:N → Tag (via PromptTag)
├─ 1:N → TemplateVariable
├─ 1:N → Execution
├─ N:1 → Prompt (forkedFrom)
└─ 1:N → Prompt (forks)

PromptVersion
├─ N:1 → Prompt
└─ 1:N → Execution

Execution
├─ N:1 → User
├─ N:1 → Prompt
├─ N:1 → PromptVersion
├─ N:1 → ProviderCredential
└─ 1:1 → PromptExperimentExposure

PromptExperiment
├─ N:1 → User
├─ N:1 → Prompt (A)
├─ N:1 → Prompt (B)
├─ 1:N → PromptExperimentExposure
└─ 1:N → PromptExperimentVote

PromptExperimentExposure
├─ N:1 → PromptExperiment
├─ 1:1 → Execution
└─ 1:1 → PromptExperimentVote
```

### Entidades Principais

#### User
```prisma
model User {
  id               String   @id @default(uuid())
  name             String
  email            String   @unique
  passwordHash     String
  refreshTokenHash String?  // Hash do refresh token atual
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Campos Importantes:**
- `passwordHash`: bcrypt com cost 10
- `refreshTokenHash`: Hash do refresh token para validação
- Relacionamentos: todas as entidades principais

#### Workspace
```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String
  description String?
  color       String   @default("#6366F1")
  isDefault   Boolean  @default(false)  // Apenas 1 por usuário
  userId      String
}
```

**Características:**
- Cor para identidade visual
- Um workspace padrão por usuário
- Unique constraint: (userId, name)

#### Prompt
```prisma
model Prompt {
  id           String    @id @default(uuid())
  title        String
  description  String?
  content      String    // Conteúdo do prompt
  language     Language  @default(pt)
  model        String    // Modelo sugerido
  isPublic     Boolean   @default(false)
  isTemplate   Boolean   @default(false)
  isFavorite   Boolean   @default(false)
  forkCount    Int       @default(0)
  forkedFromId String?   // Referência ao original
  userId       String
  workspaceId  String?
  deletedAt    DateTime? // Soft delete
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**Campos Importantes:**
- `deletedAt`: Soft delete para auditoria
- `forkedFromId`: Rastreabilidade de forks
- `isTemplate`: Flag automática se tem variáveis

#### PromptVersion
```prisma
model PromptVersion {
  id            String   @id @default(uuid())
  versionNumber Int
  content       String
  promptId      String
  createdAt     DateTime @default(now())
  
  @@unique([promptId, versionNumber])
}
```

**Como Funciona:**
- Cada mudança no `content` do Prompt cria nova PromptVersion
- `versionNumber` incrementa automaticamente (1, 2, 3, ...)
- Unique constraint garante não duplicar versões

#### TemplateVariable
```prisma
model TemplateVariable {
  id           String       @id @default(uuid())
  name         String       // Nome da variável: "topic", "tone"
  type         VariableType @default(text)
  defaultValue String?
  options      Json?        // Para type=select: ["opt1", "opt2"]
  description  String?
  promptId     String
}
```

**Tipos:**
```prisma
enum VariableType {
  text      // Input simples
  textarea  // Texto longo
  select    // Dropdown com options
}
```

#### Execution
```prisma
model Execution {
  id              String       @id @default(uuid())
  provider        ProviderType @default(openai)
  input           String       // Prompt final processado
  output          String       // Resposta da IA
  model           String
  credentialId    String?
  temperature     Float
  maxTokens       Int
  inputTokens     Int
  outputTokens    Int
  totalTokens     Int
  latencyMs       Int          // Tempo de resposta
  estimatedCost   Decimal      @db.Decimal(10, 6)
  variables       Json?        // Valores das variáveis usadas
  promptId        String
  promptVersionId String
  userId          String
  createdAt       DateTime     @default(now())
}
```

**Métricas Armazenadas:**
- Tokens de entrada e saída
- Latência em milissegundos
- Custo estimado (calculado via ProviderModelPricing)
- Snapshot das variáveis usadas

#### ProviderCredential
```prisma
model ProviderCredential {
  id             String       @id @default(uuid())
  userId         String
  provider       ProviderType
  label          String?      // "Prod", "Dev", "Team A"
  apiKeyEnc      String       // API key criptografada
  baseUrl        String?      // URL customizada
  organizationId String?      // Para OpenAI
  isDefault      Boolean      @default(false)
  isActive       Boolean      @default(true)
}
```

**Segurança:**
- `apiKeyEnc`: AES-256-GCM encrypted
- Nunca retornar API key completa
- Suporte a múltiplas keys por provedor

#### PromptExperiment
```prisma
model PromptExperiment {
  id               String           @id @default(uuid())
  userId           String
  promptAId        String
  promptBId        String
  trafficSplitA    Int              @default(50) // 1-99
  status           ExperimentStatus @default(running)
  sampleSizeTarget Int?
  startedAt        DateTime         @default(now())
  endedAt          DateTime?
}
```

**Fluxo de Status:**
```
running → pode executar e votar
stopped → não pode mais executar (análise final)
```

#### PromptExperimentExposure
```prisma
model PromptExperimentExposure {
  id            String            @id @default(uuid())
  experimentId  String
  requestId     String            // Identificador da requisição
  chosenVariant ExperimentVariant // A ou B
  executionId   String            @unique
  createdAt     DateTime          @default(now())
}
```

**Representa:**
- Uma "exibição" de uma variante
- Vinculada a uma execução real
- Base para votação

#### PromptExperimentVote
```prisma
model PromptExperimentVote {
  id            String            @id @default(uuid())
  experimentId  String
  exposureId    String            @unique // 1 voto por exposure
  winnerVariant ExperimentVariant // A ou B
  createdAt     DateTime          @default(now())
}
```

**Regras:**
- 1 voto por exposure (unique constraint)
- Voto registrado após usuário avaliar respostas

#### RefreshTokenSession
```prisma
model RefreshTokenSession {
  id            String    @id @default(uuid())
  tokenHash     String    // Hash do refresh token
  familyId      String    // Família de tokens
  parentTokenId String?   // Token pai (rotação)
  revokedAt     DateTime?
  createdAt     DateTime  @default(now())
  expiresAt     DateTime
  userId        String
}
```

**Refresh Token Rotation:**
```
Token 1 (familyId: ABC) → usado → revogado
  ↓
Token 2 (familyId: ABC, parent: Token1) → usado → revogado
  ↓
Token 3 (familyId: ABC, parent: Token2) → usado → revogado
  ↓
Token 4 (familyId: ABC, parent: Token3) → ativo

Se Token 2 for usado novamente:
→ Detecta reuso
→ Revoga toda família ABC
→ Usuário precisa fazer login novamente
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Autenticação

```
REGISTRO:
1. Usuário preenche formulário (name, email, password)
2. Frontend valida com Zod
3. POST /api/session/register
4. Backend:
   - Valida DTO
   - Verifica se email já existe
   - Hash da senha (bcrypt)
   - Cria User
   - Cria Workspace padrão
   - Gera access + refresh tokens
   - Armazena refresh token session
5. Retorna tokens em cookies httpOnly
6. Redireciona para /dashboard

LOGIN:
1. Usuário preenche (email, password)
2. POST /api/session/login
3. Backend:
   - Busca usuário por email
   - Compara senha com hash (bcrypt)
   - Gera access + refresh tokens
   - Armazena refresh token session
4. Retorna tokens em cookies
5. Redireciona para /dashboard

REFRESH:
1. Access token expira
2. Frontend detecta 401
3. POST /api/session/refresh (com refresh token no cookie)
4. Backend:
   - Valida refresh token
   - Verifica se não foi revogado
   - Verifica se não expirou
   - Gera novos access + refresh tokens
   - Revoga refresh token antigo
   - Cria novo refresh token session (parent = antigo)
5. Retorna novos tokens
6. Frontend retenta requisição original

LOGOUT:
1. POST /api/session/logout
2. Backend:
   - Revoga refresh token atual
   - Limpa cookies
3. Redireciona para /login
```

### 2. Fluxo de Criação de Prompt

```
1. Usuário clica "Novo Prompt"
2. Navega para /prompts/new
3. Preenche formulário:
   - Título: "Gerador de Posts Instagram"
   - Descrição: "Cria posts engajadores para Instagram"
   - Conteúdo: "Crie um post sobre {{topic}} com tom {{tone}}"
   - Modelo: "gpt-4o"
   - Idioma: "pt"
   - Workspace: "Marketing"
   - Tags: ["social", "marketing"]
4. Frontend detecta variáveis no conteúdo: {{topic}}, {{tone}}
5. Mostra seção de configuração de variáveis
6. Usuário configura:
   - topic (type: text)
   - tone (type: select, options: ["profissional", "casual"])
7. Submit → POST /api/v1/prompts
8. Backend:
   - Valida DTO
   - Verifica ownership de workspace e tags
   - Transação:
     a) Cria Prompt
     b) Cria PromptVersion (versionNumber: 1)
     c) Não cria TemplateVariables ainda (requer sync)
9. Retorna prompt criado
10. Frontend redireciona para /prompts/:id
11. Usuário sincroniza variáveis → POST /api/v1/prompts/:id/variables/sync
12. Backend cria TemplateVariables
13. Marca prompt como isTemplate: true
```

### 3. Fluxo de Execução de Prompt

```
1. Usuário abre prompt /prompts/:id
2. Clica "Executar"
3. Abre modal de execução
4. Se prompt tem variáveis:
   - Mostra formulário para preencher
   - topic: "Inteligência Artificial"
   - tone: "profissional"
5. Seleciona modelo: "gpt-4o"
6. Seleciona credencial (API key)
7. Ajusta parâmetros:
   - temperature: 0.7
   - maxTokens: 1000
8. Clica "Executar"
9. Frontend chama POST /api/bff/executions/stream/prompt/:id
10. Backend:
    - Valida usuário e prompt
    - Valida credencial pertence ao usuário
    - Extrai variáveis do conteúdo
    - Substitui variáveis:
      "Crie um post sobre Inteligência Artificial com tom profissional"
    - Descriptografa API key
    - Inicia stream com OpenAI
11. Streaming:
    - Backend envia chunks via SSE
    - Frontend recebe eventos 'token'
    - Renderiza palavra por palavra em tempo real
12. Conclusão:
    - Backend calcula:
      * inputTokens, outputTokens
      * latencyMs
      * estimatedCost (via ProviderModelPricing)
    - Salva Execution no banco
    - Envia evento 'done' com metadata
13. Frontend:
    - Mostra resposta completa
    - Mostra métricas (tokens, latência, custo)
    - Botão "Salvar" (já salvo automaticamente)
```

### 4. Fluxo de Experimento A/B

```
CRIAR:
1. Usuário navega para /experiments
2. Clica "Novo Experimento"
3. Seleciona:
   - Prompt A: "Post Instagram v1"
   - Prompt B: "Post Instagram v2"
   - Traffic Split: 50% / 50%
   - Sample Size Target: 100 (opcional)
4. Submit → POST /api/v1/experiments
5. Backend:
   - Valida que A ≠ B
   - Valida ownership dos prompts
   - Cria PromptExperiment (status: running)
6. Redireciona para /experiments/:id

EXECUTAR:
1. Usuário clica "Executar Experimento"
2. Preenche variáveis (se houver)
3. POST /api/v1/experiments/:id/run
4. Backend:
   - Gera número aleatório 0-100
   - Se < trafficSplitA → escolhe variante A
   - Se >= trafficSplitA → escolhe variante B
   - Executa prompt da variante escolhida
   - Cria PromptExperimentExposure
   - Retorna: {output, variant, exposureId}
5. Frontend mostra:
   - Resposta gerada
   - Badge indicando qual variante foi (A ou B)
   - Botão "Esta foi a melhor" (para votar)

VOTAR:
1. Usuário executa novamente (outra variante pode ser escolhida)
2. Agora tem 2 respostas (uma de cada execution)
3. Clica "Esta foi a melhor" na que preferir
4. POST /api/v1/experiments/:id/vote
   Body: {exposureId, winnerVariant}
5. Backend:
   - Valida exposure pertence ao experimento
   - Cria PromptExperimentVote
   - Unique constraint garante 1 voto por exposure
   - Incrementa contadores no Redis:
     * exp:{id}:votes:A
     * exp:{id}:votes:B
     * exp:{id}:votes:total
6. Retorna resultados atualizados

ANALISAR:
1. GET /api/v1/experiments/:id/results
2. Backend:
   - Busca contadores do Redis
   - Se Redis indisponível, agrega do PostgreSQL
   - Calcula percentuais
   - Retorna:
     * votesA, votesB, totalVotes
     * percentA, percentB
     * winRate de cada variante
3. Frontend renderiza:
   - Barras de progresso
   - Percentuais
   - Recomendação
   - Histórico de execuções

PARAR:
1. POST /api/v1/experiments/:id/stop
2. Backend:
   - Atualiza status: stopped
   - Define endedAt: now()
3. Não permite mais execuções ou votos
4. Análise final disponível
```

### 5. Fluxo de Analytics

```
1. Usuário navega para /dashboard
2. Frontend:
   - Lê período do Zustand store (default: 7 dias)
   - useQuery chama GET /api/bff/analytics?period=7d
3. Backend:
   - Parse do período (7d, 30d, 90d)
   - Calcula startDate e endDate
   - Queries agregadas:
     a) Total execuções (COUNT)
     b) Custo total (SUM estimatedCost)
     c) Total prompts (COUNT distinct promptId)
     d) Latência média (AVG latencyMs)
     e) Execuções por dia (GROUP BY date)
     f) Custo por modelo (GROUP BY model, SUM)
     g) Top 5 prompts (GROUP BY promptId, ORDER BY count)
4. Retorna JSON estruturado
5. Frontend:
   - Renderiza cards com métricas principais
   - Gráfico de área (Recharts) para execuções/dia
   - Gráfico de barras para custo/modelo
   - Lista de top prompts com links
6. Usuário troca período:
   - Clica "30 dias"
   - Zustand atualiza período
   - React Query refetch automaticamente
   - Dashboard atualiza
```

---

## 🧠 Decisões Técnicas e Justificativas

### 1. Por que Next.js 16 (App Router)?

**Alternativas Consideradas:**
- Next.js Pages Router
- Create React App
- Vite + React Router
- Remix

**Escolha:** Next.js 16 App Router

**Justificativas:**
1. **React Server Components**: Busca de dados no servidor reduz bundle JS do cliente
2. **Streaming**: Suporte nativo a Suspense e streaming
3. **Rotas baseadas em arquivos**: Convenção sobre configuração
4. **Otimizações automáticas**: Image, Font, Script optimization
5. **Server Actions**: Mutações sem criar endpoints REST
6. **Melhor SEO**: SSR out-of-the-box
7. **Ecossistema maduro**: Vercel, Railway, Netlify suportam bem

**Trade-offs:**
- ❌ Complexidade maior (Server vs Client Components)
- ✅ Performance superior
- ✅ DX (Developer Experience) melhor

### 2. Por que NestJS no Backend?

**Alternativas Consideradas:**
- Express.js puro
- Fastify
- Koa
- Hono

**Escolha:** NestJS 11

**Justificativas:**
1. **Arquitetura Modular**: Organização clara e escalável
2. **Dependency Injection**: Testabilidade e desacoplamento
3. **TypeScript-first**: Type safety nativo
4. **Decorators**: Código declarativo e limpo
5. **Ecossistema**: Swagger, Passport, Throttling já integrados
6. **Opiniões fortes**: Menos decisões, mais código
7. **Enterprise-ready**: Usado por empresas grandes

**Trade-offs:**
- ❌ Mais pesado que Express
- ✅ Menos boilerplate no longo prazo
- ✅ Manutenibilidade superior

### 3. Por que Prisma e não outro ORM?

**Alternativas Consideradas:**
- TypeORM
- Sequelize
- Drizzle
- Kysely

**Escolha:** Prisma 6

**Justificativas:**
1. **Type-safety completa**: Autocompletion perfeito
2. **Prisma Schema**: Declarativo, fácil de ler
3. **Migrations**: Gerenciamento robusto
4. **Prisma Studio**: UI para visualizar dados
5. **Performance**: Queries otimizadas
6. **Developer Experience**: Melhor DX do mercado
7. **Introspection**: Gera schema a partir do DB existente

**Trade-offs:**
- ❌ Queries complexas podem requerer raw SQL
- ✅ 95% dos casos são cobertos elegantemente
- ✅ Zero chance de SQL injection

### 4. Por que React Query?

**Alternativas Consideradas:**
- SWR
- Apollo Client (GraphQL)
- RTK Query (Redux)
- Fetch direto com useState

**Escolha:** React Query (TanStack Query)

**Justificativas:**
1. **Cache inteligente**: Deduplicação automática de requests
2. **Background refetch**: Dados sempre frescos
3. **Optimistic updates**: UX instantânea
4. **Pagination/Infinite Scroll**: Suporte nativo
5. **DevTools**: Debug de queries visual
6. **Framework-agnostic**: Não dependente de Next.js
7. **Invalidação granular**: Controle fino de cache

**Trade-offs:**
- ❌ Curva de aprendizado
- ✅ Elimina bugs de sincronização
- ✅ Menos código boilerplate

### 5. Por que Tailwind CSS v4?

**Alternativas Consideradas:**
- CSS Modules
- Styled Components
- Emotion
- Tailwind v3
- Vanilla Extract

**Escolha:** Tailwind CSS v4

**Justificativas:**
1. **Utility-first**: Velocidade de desenvolvimento
2. **Sem naming**: Não precisa inventar nomes de classes
3. **Purge automático**: Bundle CSS mínimo
4. **Responsivo**: Mobile-first por padrão
5. **Dark mode**: Suporte nativo
6. **Customização**: Tema customizado fácil
7. **v4 Beta**: @theme, performance melhorada

**Trade-offs:**
- ❌ HTML "feio" (muitas classes)
- ✅ Velocidade de desenvolvimento
- ✅ Consistência visual garantida

### 6. Por que PostgreSQL?

**Alternativas Consideradas:**
- MySQL
- MongoDB
- SQLite
- Supabase (PostgreSQL managed)

**Escolha:** PostgreSQL 16

**Justificativas:**
1. **ACID completo**: Transações confiáveis
2. **Relacional**: Dados estruturados com integridade
3. **Performance**: Otimizações avançadas
4. **JSON support**: Campos JSONB para flexibilidade
5. **Full-text search**: Busca nativa
6. **Extensões**: PostGIS, pg_trgm, etc.
7. **Open source**: Sem vendor lock-in

**Trade-offs:**
- ❌ Setup mais complexo que SQLite
- ✅ Produção-ready
- ✅ Escalabilidade comprovada

### 7. Por que Redis é Opcional?

**Justificativa:**

**Sem Redis:**
- Aplicação funciona 100%
- Contadores de A/B vão direto pro PostgreSQL
- Simplicidade de deploy
- Menos custos

**Com Redis:**
- Contadores de A/B ultra-rápidos (< 1ms)
- Cache de queries pesadas
- Sessões distribuídas (futuro)
- Pub/Sub para real-time (futuro)

**Decisão:** **Graceful degradation**
- Redis disponível → usa
- Redis indisponível → fallback PostgreSQL
- Zero downtime

### 8. Por que JWT e não Sessions?

**Alternativas Consideradas:**
- Sessions em banco
- Sessions em memória (Express Session)
- OAuth2

**Escolha:** JWT + Refresh Tokens

**Justificativas:**
1. **Stateless**: Backend não mantém sessões
2. **Escalabilidade**: Fácil load balancing
3. **Microservices-ready**: Token pode ser validado por qualquer serviço
4. **Mobile-friendly**: Mesma autenticação web e mobile
5. **Refresh rotation**: Segurança equivalente a sessions

**Trade-offs:**
- ❌ Não pode revogar access token (solução: curta duração)
- ✅ Refresh token pode ser revogado
- ✅ Simplicidade de infra

### 9. Por que BFF Pattern?

**Problema:**
- Frontend precisa fazer auth
- Cookies httpOnly não podem ser lidos por JS
- localStorage é vulnerável a XSS

**Solução:** **Backend for Frontend**

```
Frontend → /api/bff/* (Next.js API Routes) → Backend
                ↓
         Adiciona cookies automaticamente
         Frontend não vê tokens
         Proteção XSS
```

**Benefícios:**
1. Cookies httpOnly (seguro)
2. Frontend não manipula tokens
3. CORS simplificado
4. Proxy transparente

### 10. Por que Soft Delete?

**Alternativa:** Hard delete (apagar de verdade)

**Escolha:** Soft delete

**Justificativas:**
1. **Auditoria**: Rastrear o que foi deletado e quando
2. **Recuperação**: Usuário pode desfazer
3. **Integridade referencial**: Foreign keys continuam válidas
4. **Análise histórica**: Dados antigos disponíveis

**Implementação:**
```prisma
model Prompt {
  deletedAt DateTime?
}

// Queries sempre filtram:
where: { deletedAt: null }
```

**Trade-offs:**
- ❌ Banco cresce mais
- ✅ Segurança e confiança
- ✅ Conformidade (LGPD/GDPR permite hard delete posterior)

---

## 🚀 Infraestrutura e DevOps

### Containerização (Docker)

**Backend (Dockerfile):**
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["node", "dist/main.js"]
```

**Benefícios:**
- Imagem otimizada (multi-stage)
- Cache de layers (build rápido)
- Consistência dev/prod

**Docker Compose:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5434:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  backend:
    build: ./backend
    depends_on: [postgres, redis]
    env_file: .env
```

### CI/CD (GitHub Actions)

**Workflow: `.github/workflows/deploy-production-railway.yml`**

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  lint-and-test:
    - Checkout código
    - Setup Node.js
    - Install dependencies
    - Lint backend
    - Lint frontend
    - Test backend
    - Test frontend
  
  deploy-backend:
    needs: lint-and-test
    - Deploy via Railway CLI
    - Run migrations
    - Health check
  
  deploy-frontend:
    needs: deploy-backend
    - Deploy via Railway CLI
    - Health check
```

**Benefícios:**
- **Automação total**: Push → Deploy
- **Validação**: Lint + tests antes de deploy
- **Segurança**: Não faz deploy se testes falharem
- **Feedback**: Notificação de sucesso/erro

### Deploy na Railway

**Por que Railway?**
1. **Zero config**: Detecta Next.js e NestJS automaticamente
2. **PostgreSQL managed**: Provisiona DB automaticamente
3. **Migrations automáticas**: Roda `prisma migrate deploy`
4. **Environment variables**: UI amigável
5. **Logs centralizados**: Fácil debug
6. **SSL gratuito**: HTTPS out-of-the-box
7. **Rollback fácil**: Um clique para voltar deploy

**Alternativas Consideradas:**
- Vercel (não suporta backend NestJS bem)
- Heroku (mais caro)
- AWS (mais complexo)
- DigitalOcean (requer mais config)

### Monitoramento (Prometheus)

**Métricas Expostas:**

Endpoint: `GET /metrics`

```
# Contador de requisições por rota
http_requests_total{method="GET",route="/api/v1/prompts",status="200"} 150

# Histograma de latência
http_request_duration_seconds_bucket{le="0.1"} 120
http_request_duration_seconds_bucket{le="0.5"} 145
http_request_duration_seconds_bucket{le="1.0"} 150

# Gauge de conexões ativas
active_connections 5
```

**Integração com Grafana:**
1. Prometheus scrape /metrics a cada 15s
2. Grafana lê do Prometheus
3. Dashboards customizados:
   - Request rate (req/s)
   - Error rate (%)
   - Latência P50, P95, P99
   - Throughput por endpoint

### Logs Estruturados

**Formato JSON:**
```json
{
  "requestId": "abc-123",
  "method": "POST",
  "url": "/api/v1/prompts",
  "statusCode": 201,
  "duration": 145,
  "userId": "user-xyz",
  "timestamp": "2024-03-20T10:30:00Z"
}
```

**Benefícios:**
- Fácil parsing (Logstash, Datadog)
- Correlação via requestId
- Queries eficientes

**Request ID:**
- Gerado no middleware
- Passa por toda a stack
- Permite rastrear requisição end-to-end

---

## 📈 Métricas de Qualidade

### Zero Erros de Linting

```bash
# Backend
npm run lint
✓ 0 errors, 0 warnings

# Frontend
npm run lint
✓ 0 errors, 0 warnings
```

### TypeScript Strict Mode

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

**Resultado:** Zero `any` desnecessários

### Cobertura de Testes

**Backend:**
- Testes unitários: Services principais
- Testes E2E: Fluxos críticos (auth, CRUD, execução)

**Frontend:**
- Testes unitários: Lógica de streaming
- Testes E2E: Fluxos de usuário (login, criar prompt, executar)

### Documentação

| Arquivo | Linhas | Conteúdo |
|---------|--------|----------|
| README.md | 1164 | Documentação principal |
| DOCS/FRONTEND.md | 1474 | Guia completo do frontend |
| DOCS/BACKEND.md | 3213 | Guia completo do backend |
| Swagger | 100% | Todos os endpoints documentados |

### Git Hooks Funcionando

```bash
# Pre-commit
husky + lint-staged
→ Formata código (Prettier)
→ Roda linting (ESLint)
→ Falha se houver erros

# Commit-msg
commitlint
→ Valida conventional commits
→ Exemplos: feat:, fix:, docs:
```

### Commits Padronizados

100% dos commits seguem Conventional Commits:

```
feat: adiciona versionamento automático de prompts
fix: corrige cálculo de custo para GPT-4o
docs: atualiza README com seção de analytics
refactor: extrai lógica de streaming para service
test: adiciona testes E2E para experimentos
chore: atualiza dependências do Prisma
```

---

## 🎬 Demonstração Prática

### Cenário 1: Criando e Executando um Prompt

**Passo a passo:**

1. **Login**
   - Email: admin@promptvault.com
   - Senha: Password@123

2. **Criar Workspace "Redes Sociais"**
   - Dashboard → Workspaces → Novo
   - Nome: "Redes Sociais"
   - Cor: Verde
   - Salvar

3. **Criar Prompt com Template**
   - Prompts → Novo Prompt
   - Título: "Gerador de Legendas Instagram"
   - Descrição: "Cria legendas engajadoras para posts do Instagram"
   - Conteúdo: `Crie uma legenda criativa para Instagram sobre {{tema}} com {{n_emojis}} emojis, tom {{tom}} e call-to-action {{cta}}`
   - Modelo: gpt-4o-mini
   - Workspace: Redes Sociais
   - Salvar

4. **Configurar Variáveis**
   - Sincronizar Variáveis
   - tema (type: text)
   - n_emojis (type: select, options: ["3", "5", "10"])
   - tom (type: select, options: ["profissional", "casual", "humorístico"])
   - cta (type: text, default: "Comente abaixo!")

5. **Adicionar API Key**
   - Settings → Provedores → Adicionar
   - Provider: OpenAI
   - API Key: sk-...
   - Label: "Produção"
   - Marcar como padrão

6. **Executar Prompt**
   - Voltar ao prompt
   - Executar
   - Preencher:
     * tema: "Inteligência Artificial no Marketing"
     * n_emojis: "5"
     * tom: "profissional"
     * cta: "O que você acha? 💬"
   - Executar
   - Ver streaming em tempo real
   - Resultado:
     ```
     🚀 A Inteligência Artificial está revolucionando o marketing! 
     
     De personalização em massa a análise preditiva, a IA nos permite 
     entender nosso público como nunca antes. 🎯
     
     Chatbots inteligentes, segmentação precisa e otimização de campanhas 
     em tempo real são apenas o começo. 💡
     
     As marcas que abraçam a IA hoje serão as líderes de amanhã. 📈✨
     
     O que você acha? 💬
     
     ⚙️ Métricas:
     • Tokens: 285 (input: 65, output: 220)
     • Latência: 3.2s
     • Custo: $0.000043
     ```

### Cenário 2: Experimento A/B

**Contexto:** Testar duas variações de prompt de email frio

1. **Criar Prompt A: "Cold Email Formal"**
   ```
   Escreva um email de prospecção B2B para {{empresa}} sobre {{produto}}.
   Tom formal e direto.
   ```

2. **Criar Prompt B: "Cold Email Casual"**
   ```
   Escreva um email de prospecção B2B para {{empresa}} sobre {{produto}}.
   Tom casual e amigável, como se fosse de pessoa para pessoa.
   ```

3. **Criar Experimento**
   - Experiments → Novo
   - Prompt A: "Cold Email Formal"
   - Prompt B: "Cold Email Casual"
   - Traffic Split: 50% / 50%
   - Salvar

4. **Executar 10 vezes**
   - empresa: "TechCorp"
   - produto: "Software de CRM"
   - Metade escolhe A, metade escolhe B
   - Votar na melhor resposta a cada vez

5. **Analisar Resultados**
   ```
   Resultados:
   • Total de votos: 10
   • Prompt A: 3 votos (30%)
   • Prompt B: 7 votos (70%)
   
   Recomendação: Prompt B está vencendo com confiança!
   
   Métricas:
   • Latência A: 2.8s | Latência B: 3.1s
   • Custo A: $0.0005 | Custo B: $0.0006
   
   Conclusão: Prompt B gera respostas mais apreciadas,
   com custo e latência similar.
   ```

6. **Parar Experimento**
   - Adotar Prompt B como padrão
   - Arquivar Prompt A

### Cenário 3: Analytics

1. **Navegar para Dashboard**
   - Ver métricas dos últimos 7 dias

2. **Visualizações:**
   ```
   📊 Visão Geral (7 dias):
   • 127 execuções
   • $1.84 custo total
   • 42 prompts criados
   • 2.8s latência média
   
   📈 Execuções por Dia:
   Seg: 15 | Ter: 22 | Qua: 18 | Qui: 25 | Sex: 20 | Sáb: 14 | Dom: 13
   
   💰 Custo por Modelo:
   1. gpt-4o: $0.85 (46%)
   2. gpt-4o-mini: $0.42 (23%)
   3. claude-3-5-sonnet: $0.35 (19%)
   4. gemini-2.0-flash: $0.22 (12%)
   
   ⭐ Top Prompts:
   1. Gerador de Legendas Instagram (34 exec)
   2. Cold Email B2B (28 exec)
   3. Artigo de Blog SEO (22 exec)
   4. Resposta de Suporte (18 exec)
   5. Release Notes (15 exec)
   ```

3. **Trocar para 30 dias**
   - Dashboard atualiza automaticamente
   - Ver tendências de longo prazo
   - Identificar crescimento de uso

---

## 🎯 Conclusão

### O que Construímos

PromptZero é uma **plataforma completa e profissional** para gerenciamento de prompts de IA que:

✅ **Resolve problemas reais** de equipes que usam IA
✅ **Implementa todos os requisitos obrigatórios** com excelência
✅ **Vai além** com 10+ diferenciais técnicos
✅ **Segue as melhores práticas** de desenvolvimento
✅ **É escalável** e pronto para produção
✅ **Tem qualidade enterprise** em código e arquitetura

### Diferenciais Principais

1. ✨ **Versionamento Automático**: Nunca perca o histórico de um prompt
2. 🌍 **Multi-Provider**: Liberdade para escolher o melhor modelo
3. 🧪 **Experimentos A/B**: Decisões baseadas em dados, não achismos
4. ⚡ **Streaming Real-Time**: UX superior com feedback instantâneo
5. 📊 **Analytics Integrado**: Visibilidade completa de custos e performance
6. 🔒 **Segurança Enterprise**: Criptografia, JWT rotation, rate limiting
7. 🌐 **Multilíngue**: Alcance global com 3 idiomas
8. 🎨 **UX Moderna**: Interface bonita, responsiva e acessível
9. 🚀 **DevOps Profissional**: CI/CD, testes, Docker, deploy automatizado
10. 📚 **Documentação Exemplar**: +5000 linhas de documentação técnica

### Tecnicamente Sólido

- ✅ TypeScript strict mode (type safety total)
- ✅ Zero erros de linting
- ✅ Testes automatizados (unitários + E2E)
- ✅ Git hooks funcionando
- ✅ Conventional commits
- ✅ Documentação completa
- ✅ API REST versionada
- ✅ Swagger/OpenAPI
- ✅ Clean Architecture
- ✅ SOLID principles

### Pronto para Escalar

- ✅ Arquitetura modular
- ✅ PostgreSQL (ACID, confiável)
- ✅ Redis para cache
- ✅ Circuit breaker para resiliência
- ✅ Métricas Prometheus
- ✅ Logs estruturados
- ✅ Containerizado (Docker)
- ✅ Deploy automatizado
- ✅ Horizontal scaling ready

### Impacto

Esta plataforma permite que:

- **Equipes de Marketing** criem bibliotecas de prompts organizadas por campanha
- **Desenvolvedores** versionem prompts como versionam código
- **Empresas** tenham visibilidade de custos de IA
- **Pesquisadores** experimentem cientificamente com A/B testing
- **Comunidades** compartilhem conhecimento via prompts públicos

### Próximos Passos

**Roadmap Futuro:**
- [ ] Webhooks para notificações
- [ ] API GraphQL
- [ ] WebSockets para updates em tempo real
- [ ] Background jobs com queue
- [ ] PWA (Progressive Web App)
- [ ] Mobile app (React Native)
- [ ] Sistema de plugins
- [ ] Colaboração em tempo real
- [ ] Audit log completo
- [ ] 2FA

---

## 📞 Contato

**Desenvolvedor:** Paulo Alves  
**Email:** ph23.alves@gmail.com  
**LinkedIn:** https://www.linkedin.com/in/ph-alves/?locale=en

---

**PromptZero** - Gerenciamento Inteligente de Prompts de IA 🚀
