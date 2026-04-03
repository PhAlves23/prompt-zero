# Próximas features — PromptZero

Planejamento sugerido após o MVP Q1 (ordem ajustável conforme feedback).

## Curto prazo (4–8 semanas)

1. **OAuth end-to-end no browser** — Hoje o callback devolve JSON; fluxo ideal: redirect para `FRONTEND_URL` com tokens seguros (httpOnly cookies via rota Next ou fragment PKCE).
2. **Traces** — Waterfall de latência, árvore de spans alinhada ao Langfuse, ingestão OpenTelemetry opcional.
3. **Datasets** — Upload CSV com mapeamento de colunas, página de resultados side-by-side, export.
4. **Evaluation** — Dashboard de scores por prompt/período; juiz em batch sobre dataset runs.
5. **Webhooks** — Fila (BullMQ) + retries + assinatura HMAC documentada; retry manual na UI.
6. **SAML real** — `passport-saml`, metadata XML, ACS, UI Team/Enterprise.

## Médio prazo

7. **Prompts “runtime”** — Publicar versão ativa sem redeploy (cache cliente + polling/SDK).
8. **Organizações / multi-tenant** — Billing por org, convites com link de aceite, SCIM (futuro).
9. **Docs e DX** — Site MDX (quickstart, referência OpenAPI gerada), exemplos por stack (Vercel AI SDK, OpenAI).
10. **Segurança** — MFA, política de sessão, IP allowlist (Enterprise).

## Diferenciação vs Langfuse

- Foco em **prompt lifecycle + execução + billing** num único produto open-source com caminho SaaS claro.
- **Self-host** simples (Docker) com feature parity documentada vs cloud.

## Métricas de priorização

- Tempo até primeiro trace útil no painel.
- Tempo até primeira execução via API key.
- Ativação: utilizador que criou prompt + executou + (trace ou evaluation).
