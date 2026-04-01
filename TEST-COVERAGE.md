# Mapa de cobertura de testes

Legenda: **Sim** = há testes automatizados cobrindo o módulo; **Parcial** = apenas parte dos fluxos; **Não** = sem testes dedicados nesta camada.

## Backend — unitários (`npm test`)

| Módulo | Arquivo(s) | Cobertura | Prioridade |
|--------|------------|-----------|------------|
| Auth | `auth.service.spec.ts` | Parcial (registro/login) | Crítica |
| Prompts | `prompts.service.spec.ts` | Parcial (create, find, update, remove, fork, sync, versões) | Crítica |
| Workspaces | `workspaces.service.spec.ts` | Sim (CRUD + default delete) | Alta |
| Tags | `tags.service.spec.ts` | Sim (CRUD) | Alta |
| Executions | `executions.service.spec.ts` | Parcial (provider inference) | Alta |
| Experiments | `experiments.service.spec.ts` | Sim (fluxo A/B, Redis) | Média |
| App | `app.controller.spec.ts` | Básico | Baixa |

| Módulo | Testes unitários |
|--------|------------------|
| AnalyticsService | Não |
| SettingsService | Não |
| ExploreService | Não |
| UsersService | Não |
| LlmService | Não |
| ProviderPricingService | Não |
| RedisService | Não |

## Backend — E2E (`npm run test:e2e`)

| Área | Arquivo | Cobertura |
|------|---------|-----------|
| Health + métricas | `app.e2e-spec.ts` | Sim |
| Auth, prompts, explore, execuções, experimentos | `auth-prompts.e2e-spec.ts` | Parcial (mocks de serviço) |
| Workspaces | `workspaces.e2e-spec.ts` | Sim |
| Tags | `tags.e2e-spec.ts` | Sim |
| Analytics | `analytics.e2e-spec.ts` | Sim (rotas overview, per-day, cost, top, A/B) |
| Settings / users | `settings.e2e-spec.ts` | Sim (profile, api-keys, provider-credentials) |

## Frontend — unitários (`pnpm test`)

| Área | Arquivo | Cobertura |
|------|---------|-----------|
| Streaming SSE | `tests/stream-execution.test.ts` | Sim |
| Credenciais (helpers) | `tests/provider-credentials.test.ts` | Sim |
| Zustand UI | `tests/stores/ui-store.test.ts` | Sim |
| `bffFetch` | `tests/api/client.test.ts` | Sim |
| `cn()` | `tests/lib/utils.test.ts` | Sim |

## Frontend — E2E (`pnpm test:e2e`)

| Arquivo | Cobertura |
|---------|-----------|
| `smoke.spec.ts` | Locale, explore público |
| `features.e2e.spec.ts` | Fluxos autenticados principais |
| `auth-flow.e2e.spec.ts` | Login/register UI; sessão no dashboard |
| `prompts-crud.e2e.spec.ts` | Lista, criar prompt, link para detalhe |
| `prompt-execution.e2e.spec.ts` | Card e botão Executar no detalhe |

## Metas sugeridas

- Aumentar testes unitários de `AnalyticsService`, `SettingsService` e `ExploreService` no backend.
- E2E frontend: editar/deletar prompt, fluxo completo de execução com mock de SSE (se necessário evitar chamadas reais a LLM).
- Opcional: relatório `npm run test:cov` no backend com threshold mínimo em CI.

Última atualização: alinhado à implementação atual do repositório.
