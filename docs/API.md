# PromptZero API (resumo)

- **Base:** `{ORIGIN}/api/v1`
- **Autenticação app:** `Authorization: Bearer <access_token>` (cookie session no frontend via BFF).
- **API pública:** header `X-PromptZero-Api-Key` nos endpoints em `/public/...`.

## Endpoints úteis

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| POST | `/public/prompts/:id/execute` | API key | Executa prompt |
| POST | `/billing/checkout` | JWT | Stripe Checkout |
| POST | `/billing/portal` | JWT | Portal Stripe |
| GET | `/billing/usage` | JWT | Uso do período |
| POST | `/datasets` | JWT | Cria dataset + linhas |
| POST | `/datasets/:id/run/:promptId` | JWT | Batch |
| POST | `/evaluation/judge` | JWT | LLM-as-judge |
| POST | `/traces/ingest` | JWT | Ingestão de traces |
| GET | `/enterprise/saml/status` | — | Stub SAML |
| GET | `/auth/google` | — | Inicia OAuth Google (se `GOOGLE_*` definidos) |
| GET | `/auth/google/callback` | — | Callback Google → redirect 302 para `{FRONTEND_URL}/{BILLING_UI_LOCALE}/auth/oauth-callback#…` |
| GET | `/auth/github` | — | Inicia OAuth GitHub (se `GITHUB_*` definidos) |
| GET | `/auth/github/callback` | — | Callback GitHub → redirect 302 para `{FRONTEND_URL}/{BILLING_UI_LOCALE}/auth/oauth-callback#…` |

## SDKs

- `sdk/javascript` — `@promptzero/sdk`
- `sdk/python` — `promptzero-sdk` + callback LangChain opcional

Configure variáveis conforme `backend/.env.example` e `NEXT_PUBLIC_BACKEND_API_URL` no frontend.

**OAuth:** no GitHub, a **Authorization callback URL** deve ser a do API (ex.: `http://localhost:3001/api/v1/auth/github/callback`). Após sucesso, o backend redireciona para o Next em `FRONTEND_URL` com `access_token` e `refresh_token` no *fragment* da URL; a página `/{locale}/auth/oauth-callback` chama o BFF `POST /api/session/oauth` e grava cookies httpOnly.
