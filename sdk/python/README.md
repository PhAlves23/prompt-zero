# promptzero-sdk (Python)

```bash
pip install -e ".[langchain]"
```

## Cliente HTTP (API pública)

```python
from promptzero import PromptZeroClient

client = PromptZeroClient(
    base_url="https://your-host/api/v1",
    api_key="pz_...",
)
print(client.execute_prompt("prompt-uuid", {"variables": {"topic": "AI"}}))
```

## Callback LangChain (`POST /traces/ingest`, JWT)

O callback regista **chains** e **LLMs** (início/fim), usa os `run_id` do LangChain como `id` dos spans e `parent_run_id` como `parentId`, para o backend montar a hierarquia.

```python
from promptzero.langchain_callback import PromptZeroLangChainCallback

handler = PromptZeroLangChainCallback(
    base_url="https://your-host/api/v1",
    jwt_bearer_token="...",
    name="my-app",
    flush_on_chain_end=True,  # opcional: POST automático ao fim da chain raiz
)

# chain.invoke(..., config={"callbacks": [handler]})

# Se não usar flush_on_chain_end:
handler.flush()
```

Parâmetros úteis:

- `flush_on_chain_end` — envia traces quando a chain termina (útil em scripts curtos).
- `clear_spans_after_flush` — limpa a lista após `flush` com sucesso (default `True`).

Erros de rede ou HTTP são registados com `logging` e re-lançados em `flush()`.
