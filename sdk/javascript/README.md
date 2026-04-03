# @promptzero/sdk

Cliente mínimo para a API pública (`X-PromptZero-Api-Key`).

```ts
import { PromptZero } from "@promptzero/sdk"

const client = new PromptZero({
  baseUrl: process.env.PROMPTZERO_API_BASE!, // …/api/v1
  apiKey: process.env.PROMPTZERO_API_KEY!,
})

const result = await client.prompts.execute("prompt-uuid", {
  variables: { topic: "AI" },
})
```

Gere uma chave em **Configurações → Dev & avaliação** no app.
